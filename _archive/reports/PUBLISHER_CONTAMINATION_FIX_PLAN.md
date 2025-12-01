# Publisher Contamination Fix Plan

**Date:** November 5, 2025
**Issue:** Bibliographic metadata (publisher, location, ISBN, edition) contaminating title field
**Impact:** CRITICAL - Compromises query generation, search, and autorank functions
**Status:** Analysis Complete, Fix Design in Progress

---

## 🎯 Problem Summary

### Current State
The title parsing logic extracts **too much** bibliographic information as the "title". This causes:

1. **Query Generation Failure** - AI generates search queries with publisher/location in title
2. **Search Results Mismatch** - Google searches for "Title. Publisher, Location, ISBN" (doesn't exist)
3. **Autorank Failure** - AI looks for exact title match but never finds it (contaminated vs clean)
4. **User Confusion** - Displayed titles are cluttered with metadata

### Scope of Problem

**Analysis Results:**
- **141 out of 288 references** (49%) have contaminated titles
- **88 references** include publisher names
- **39 references** include location names
- **35 references** include ISBN numbers
- **6 references** include edition information

### Example Cases

**Reference [102]:**
```
Current (contaminated):
"Televised Presidential Debates and Public Policy. (2nd ed) Routledge, New York/London, ISBN: 9780805816037"

Should be:
"Televised Presidential Debates and Public Policy"
```

**Reference [7]:**
```
Current (contaminated):
"Making the Social World: The Structure of Human Civilization. Oxford: Oxford University Press"

Should be:
"Making the Social World: The Structure of Human Civilization"
```

**Reference [100]:**
```
Current (contaminated):
"Lincoln, Douglas, and Slavery: In the Crucible of Public Debate. University of Chicago Press, Chicago, Illinois. ISBN: 9780226978765"

Should be:
"Lincoln, Douglas, and Slavery: In the Crucible of Public Debate"
```

---

## 🔍 Root Cause Analysis

### Current Parsing Logic (Flawed)

**Location:** `batch-utils.js` lines 248-256

```javascript
// After year: extract title and other
const titleMatch = afterYear.match(/^\.?\s*([^.]+)\./);
if (titleMatch) {
    result.title = cleanTitle(titleMatch[1].trim());
    // ↑ Captures first sentence only, but that sentence includes publisher/location!
}
```

**Problem:** The regex `([^.]+)\.` captures everything up to the first period, but bibliographic citations often have format:

```
Author (Year). Title. Publisher, Location. ISBN: 123.
                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                All captured as "title"
```

### Why cleanTitle() Doesn't Fix This

The existing `cleanTitle()` function (lines 178-211) only removes:
1. Date prefixes (e.g., "November 10) ")
2. Trailing ellipsis (e.g., "...")
3. **Short** publisher names at the end (e.g., "Census.gov")

But it **doesn't remove:**
- Long publisher names (e.g., "Johns Hopkins University Press, Baltimore, Maryland")
- Location information (e.g., "Cambridge, UK")
- ISBN numbers (e.g., "ISBN: 9780805816037")
- Edition information (e.g., "(2nd ed)")

---

## ✅ Solution Design

### Strategy: Enhanced Bibliographic Parsing

Create a new function `extractCleanTitle()` that:

1. **Splits on periods** to get sentences
2. **Identifies title sentence** (first substantial sentence after year)
3. **Detects bibliographic metadata** using patterns:
   - Publisher names (ends with "Press", "Publishers", "Media", etc.)
   - Locations (city names like "New York", "Oxford", "Cambridge")
   - ISBN patterns (ISBN: followed by digits)
   - Edition patterns ((2nd ed), Updated Edition)
4. **Truncates before metadata** appears
5. **Returns clean title only**

### Detection Patterns

```javascript
const BIBLIOGRAPHIC_PATTERNS = {
  // Publisher indicators
  publisher: /(?:University Press|Press|Publishers?|Books|Media|Publishing|Inc\.|Ltd\.|LLC|Corp\.?|Corporation)/i,

  // Location patterns (cities commonly in academic publishing)
  location: /(?:^|,\s*)(?:New York|London|Oxford|Cambridge|Chicago|Boston|Baltimore|Los Angeles|San Francisco|Washington|Philadelphia|Albany|Princeton|New Haven|Berkeley|Ann Arbor|Madison|Austin|Seattle|Portland|Durham|Ithaca|Providence|Charlottesville)(?:\s*,\s*(?:NY|MA|UK|IL|MD|CA|DC|PA|NJ|CT|MI|WI|TX|WA|OR|NC|RI|VA))?/i,

  // ISBN patterns
  isbn: /ISBN:\s*\d+/i,

  // Edition patterns
  edition: /(?:\(?\d+(?:st|nd|rd|th)\s+ed\.?\)?|Updated Edition|Revised Edition|Second Edition)/i
};
```

### Algorithm

```javascript
function extractCleanTitle(afterYear) {
  // Split on periods to get segments
  const segments = afterYear.split(/\.\s+/);

  // Build title from segments until we hit bibliographic metadata
  let cleanTitle = '';

  for (const segment of segments) {
    const combined = cleanTitle ? `${cleanTitle}. ${segment}` : segment;

    // Check if this segment contains bibliographic metadata
    if (containsBibliographicMetadata(combined)) {
      // Don't include this segment - we've hit the publisher/location
      break;
    }

    cleanTitle = combined;
  }

  return cleanTitle.trim();
}

function containsBibliographicMetadata(text) {
  // Check for publisher, location, ISBN, edition
  return BIBLIOGRAPHIC_PATTERNS.publisher.test(text) ||
         BIBLIOGRAPHIC_PATTERNS.location.test(text) ||
         BIBLIOGRAPHIC_PATTERNS.isbn.test(text) ||
         BIBLIOGRAPHIC_PATTERNS.edition.test(text);
}
```

### Edge Cases to Handle

1. **Subtitle colons** - "Title: Subtitle" should stay together
2. **Years in title** - "America 1920-1940" should not be confused with publication location
3. **Author names in title** - "Lincoln, Douglas, and Slavery" (comma is NOT a location separator)
4. **Legitimate periods in title** - "U.S. Politics" or "Dr. Smith's Theory"

---

## 🔧 Implementation Plan

### Phase 1: Enhanced Parsing Function

**File:** `batch-utils.js`

**Add new function** (after existing `cleanTitle()` around line 212):

```javascript
/**
 * Extract clean title by removing bibliographic metadata
 * Handles publisher names, locations, ISBNs, and edition info
 */
function extractCleanTitle(afterYear) {
  // [Implementation as designed above]
}
```

**Modify `parseReferenceLine()`** (line 248):

```javascript
// OLD
const titleMatch = afterYear.match(/^\.?\s*([^.]+)\./);
if (titleMatch) {
    result.title = cleanTitle(titleMatch[1].trim());
}

// NEW
result.title = extractCleanTitle(afterYear);
```

### Phase 2: iPad App Sync

**File:** `index.html`

**Add same function** to iPad app parsing logic (around line 2007):
- Copy `extractCleanTitle()` function
- Update `extractReferenceInfo()` to use new function

### Phase 3: Testing

**Create test suite:**
1. Unit tests for `extractCleanTitle()` (15 test cases from analysis)
2. Regression tests (ensure previously clean titles stay clean)
3. Full validation (all 288 references parse correctly)

### Phase 4: Documentation

**Update docs:**
- `CLAUDE.md` - Add to "Recent Issues and Fixes"
- Create `PUBLISHER_CONTAMINATION_FIX_SUMMARY.md`
- Update version to v16.8 (batch processor) and v16.7 (iPad app)

---

## 📊 Expected Impact

### Before Fix
- ❌ 141 contaminated titles (49%)
- ❌ Search queries include publisher/location
- ❌ Autorank rarely finds title matches
- ❌ Override rate: 25-50%

### After Fix
- ✅ All titles clean (0% contamination)
- ✅ Search queries use clean titles only
- ✅ Autorank finds exact title matches
- ✅ Expected override rate: <10%

### Quality Improvements

**Query Generation:**
```
BEFORE: "Lincoln, Douglas, and Slavery University of Chicago Press"
AFTER:  "Lincoln, Douglas, and Slavery"
```

**Title Matching in Autorank:**
```
BEFORE: Search result title "Lincoln, Douglas, and Slavery"
        vs reference title "Lincoln, Douglas, and Slavery. University of Chicago Press, Chicago, Illinois. ISBN: 9780226978765"
        → NO MATCH ❌

AFTER:  Search result title "Lincoln, Douglas, and Slavery"
        vs reference title "Lincoln, Douglas, and Slavery"
        → EXACT MATCH ✅
```

---

## 🧪 Testing Strategy

### Unit Tests

**Test file:** `test-clean-title-extraction.js`

Test cases:
1. ✅ Simple case: "Title. Publisher."
2. ✅ With location: "Title. Publisher, Location."
3. ✅ With ISBN: "Title. Publisher. ISBN: 123."
4. ✅ With edition: "Title. (2nd ed) Publisher."
5. ✅ Multiple metadata: "Title. Publisher, City, State. ISBN: 123."
6. ✅ Subtitle with colon: "Title: Subtitle. Publisher."
7. ✅ Commas in title: "Lincoln, Douglas, and Slavery. Publisher."
8. ✅ Year in title: "Politics 1920-1940. Publisher."
9. ✅ Abbreviations in title: "U.S. Foreign Policy. Publisher."
10. ✅ Already clean: "Clean Title" (no period, no metadata)

### Integration Tests

**Test file:** `validate-title-extraction.js`

- Parse all 288 references with new logic
- Verify no contamination in any title
- Verify no legitimate content removed
- Compare before/after for all 141 affected references

### Regression Tests

- Ensure references that were clean remain clean
- Ensure no false positives (legitimate content removed)

---

## 📁 Files to Modify

### Core Logic
- ✅ `batch-utils.js` - Add `extractCleanTitle()`, modify `parseReferenceLine()`
- ✅ `index.html` - Add `extractCleanTitle()`, modify `extractReferenceInfo()`

### Testing
- ✅ `test-clean-title-extraction.js` - Unit tests
- ✅ `validate-title-extraction.js` - Integration tests
- ✅ `analyze-publisher-contamination.js` - Diagnostic tool (already created)

### Documentation
- ✅ `PUBLISHER_CONTAMINATION_FIX_SUMMARY.md` - Complete fix documentation
- ✅ `CLAUDE.md` - Update with v16.8/v16.7 fix details
- ✅ Version bump: batch-processor.js to v16.8, index.html to v16.7

---

## 🚀 Deployment Plan

### Step 1: Backup
```bash
cp decisions.txt decisions_backup_PRE_TITLE_CLEANUP_$(date +%Y%m%d_%H%M%S).txt
```

### Step 2: Implement Fix
1. Update `batch-utils.js` with new parsing logic
2. Update `index.html` with new parsing logic
3. Bump versions (v16.8 batch, v16.7 iPad)

### Step 3: Test
1. Run unit tests: `node test-clean-title-extraction.js`
2. Run validation: `node validate-title-extraction.js`
3. Verify all 288 references parse correctly
4. Verify 141 contaminated titles are now clean

### Step 4: Deploy
```bash
# Deploy iPad app
cp index.html /path/to/production/
netlify deploy --prod --dir="." --message "v16.7 - Clean Title Extraction (Publisher/Location/ISBN Removal)"

# Batch processor is already updated in-place
```

### Step 5: Verify
1. Open iPad app, verify titles display cleanly
2. Run batch processor on a test reference
3. Check query generation uses clean titles
4. Verify autorank finds title matches

---

## ✅ Success Criteria

- [ ] All 288 references have clean titles (no publisher/location/ISBN)
- [ ] No legitimate title content removed (no false positives)
- [ ] Unit tests: 10/10 passing
- [ ] Integration tests: 288/288 references valid
- [ ] Query generation uses clean titles
- [ ] Autorank title matching improves significantly
- [ ] Override rate drops below 10%
- [ ] Documentation complete
- [ ] Deployed to production

---

## 🎯 Next Steps

1. **Implement `extractCleanTitle()` function** in batch-utils.js
2. **Create comprehensive test suite** with 10+ test cases
3. **Validate on all 288 references** to ensure no regressions
4. **Deploy to iPad app** (index.html)
5. **Monitor first batch run** with new logic
6. **Track override rate improvement** (expect <10% vs current 25-50%)

---

**Document Version:** 1.0
**Last Updated:** November 5, 2025
**Author:** Claude Code
**Status:** Ready for Implementation
