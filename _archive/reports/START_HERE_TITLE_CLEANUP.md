# Title Cleanup Plan - Quick Start

**Date:** November 5, 2025
**Issue:** Publisher/location/ISBN contaminating titles → breaks search/autorank
**Status:** Plan Ready, Implementation Pending

---

## 🔥 THE PROBLEM

**141 out of 288 references (49%)** have contaminated titles that include publisher information, making it impossible for AI to generate good search queries or match titles.

### Example

**Reference [102] - What's stored now:**
```
Title: "Televised Presidential Debates and Public Policy. (2nd ed) Routledge, New York/London, ISBN: 9780805816037"
```

**What AI generates as search query:**
```
"Televised Presidential Debates and Public Policy Routledge New York"
```

**Why this breaks everything:**
- ❌ Google searches for "Title + Publisher" (doesn't exist as a string)
- ❌ Autorank looks for exact title match (never finds it because search results have clean titles)
- ❌ Override rate: 25-50% (you have to manually fix most recommendations)

**What it SHOULD be:**
```
Title: "Televised Presidential Debates and Public Policy"
Publisher: "Routledge"
Location: "New York/London"
```

---

## 📊 IMPACT ANALYSIS

I ran a diagnostic and found:

- **141 references** with contaminated titles (49% of all references)
- **88 references** include publisher names
- **39 references** include location names
- **35 references** include ISBN numbers
- **6 references** include edition information

**Full analysis:** See `publisher-contamination-report.json`

---

## ✅ THE SOLUTION

### New Function: `extractCleanTitle()`

This function will:
1. Split the text on periods to get segments
2. Identify where bibliographic metadata starts (publisher, location, ISBN)
3. Return only the title portion (before metadata)

### Detection Patterns

```javascript
// Stop extracting title when we hit:
- Publisher keywords: "Press", "Publishers", "University Press", "Media", "Publishing"
- Location names: "New York", "London", "Oxford", "Cambridge", "Chicago", etc.
- ISBN patterns: "ISBN: 123456"
- Edition info: "(2nd ed)", "Updated Edition", "Revised Edition"
```

### Result

**Before Fix:**
```
[102] Title: "Televised Presidential Debates and Public Policy. (2nd ed) Routledge, New York/London, ISBN: 9780805816037"
```

**After Fix:**
```
[102] Title: "Televised Presidential Debates and Public Policy"
      Other: "(2nd ed) Routledge, New York/London, ISBN: 9780805816037"
```

---

## 📋 IMPLEMENTATION PLAN

### Phase 1: Core Fix (30 min)
1. ✅ Analyze problem (DONE - found 141 contaminated titles)
2. ✅ Design solution (DONE - see PUBLISHER_CONTAMINATION_FIX_PLAN.md)
3. ⏳ Implement `extractCleanTitle()` in `batch-utils.js`
4. ⏳ Implement `extractCleanTitle()` in `index.html`

### Phase 2: Testing (30 min)
5. ⏳ Create unit tests (10 test cases)
6. ⏳ Run validation on all 288 references
7. ⏳ Verify no regressions (clean titles stay clean)

### Phase 3: Deploy (15 min)
8. ⏳ Backup decisions.txt
9. ⏳ Deploy to production
10. ⏳ Verify with test batch run

---

## 🎯 EXPECTED IMPROVEMENTS

### Query Generation
**Before:** "Lincoln Douglas Slavery University of Chicago Press Chicago Illinois"
**After:** "Lincoln Douglas Slavery"

### Title Matching in Autorank
**Before:** Search result "Lincoln, Douglas, and Slavery" vs reference "Lincoln, Douglas, and Slavery. University of Chicago Press..." → NO MATCH ❌
**After:** Search result "Lincoln, Douglas, and Slavery" vs reference "Lincoln, Douglas, and Slavery" → EXACT MATCH ✅

### Override Rate
**Before:** 25-50% (you manually override half the recommendations)
**After:** <10% (AI recommendations are accurate)

---

## 📁 KEY FILES

**Analysis & Planning:**
- ✅ `analyze-publisher-contamination.js` - Diagnostic tool (run with `node analyze-publisher-contamination.js`)
- ✅ `publisher-contamination-report.json` - Full list of 141 affected references
- ✅ `PUBLISHER_CONTAMINATION_FIX_PLAN.md` - Complete technical plan (350+ lines)
- ✅ `START_HERE_TITLE_CLEANUP.md` - This quick reference

**Implementation (To Do):**
- ⏳ `batch-utils.js` - Add `extractCleanTitle()` function
- ⏳ `index.html` - Add `extractCleanTitle()` function
- ⏳ `test-clean-title-extraction.js` - Unit tests
- ⏳ `validate-title-extraction.js` - Integration tests

---

## 🚀 NEXT STEPS

### Option 1: I implement it now (45-60 min total)
```bash
# Say "Yes, implement the fix"
# I'll create the functions, tests, and deploy
```

### Option 2: Review plan first
```bash
# Read PUBLISHER_CONTAMINATION_FIX_PLAN.md
# Verify approach makes sense
# Then say "proceed with implementation"
```

### Option 3: Modify approach
```bash
# Review the plan
# Tell me what to change
# I'll update and re-implement
```

---

## ❓ QUESTIONS TO CONSIDER

1. **Should we preserve metadata?**
   - Yes - Store in `ref.other` field (publisher, location, ISBN)
   - Display in iPad app separately from title

2. **How to handle edge cases?**
   - Titles with commas: "Lincoln, Douglas, and Slavery" → Keep comma (not location separator)
   - Titles with colons: "Title: Subtitle" → Keep both (subtitle is part of title)
   - Legitimate periods: "U.S. Foreign Policy" → Keep (not sentence boundary)

3. **What about already-clean titles?**
   - Don't touch them - only extract clean title when bibliographic metadata detected

---

## 📞 WHAT YOU NEED TO DECIDE

**Quick decision:** Do you want me to:
1. **Implement now** (45-60 min) - I'll code, test, and deploy
2. **Review plan first** - Read the detailed plan, then decide
3. **Modify approach** - Discuss changes before implementing

---

**Status:** ✅ Analysis Complete, Plan Ready
**Action Required:** User decision on next steps
**Time Estimate:** 45-60 minutes to implement and test
**Expected Impact:** Override rate drops from 25-50% to <10%

---

**Document Version:** 1.0
**Last Updated:** November 5, 2025
**Author:** Claude Code
