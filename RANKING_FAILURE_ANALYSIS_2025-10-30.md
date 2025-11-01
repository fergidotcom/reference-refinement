# Ranking Failure Analysis - October 30, 2025

**Issue Reported:** Ranking failed when using Autorank feature on RID 115
**Screenshot:** Reference Refinement v15.11.png
**Status:** Under investigation - Summary before fixes

---

## 📊 Issue Summary

### Primary Issue: Ranking Failure
**Symptom:** Red error banner "Ranking failed. Check Debug tab (Tab 3) for details."
**Reference:** [115] "The Digital Architectures of Social Media: Comparing Political Campaigning on Facebook, Twitter, Instagram, and Snapchat in the 2016 U"
**User Action:** Clicked "Autorank Candidates (AI)" button
**Result:** Ranking failed to complete

### Secondary Issue: Quality Problem
**User Feedback (from Notes):** "The recommended primary was actually not the full text, but rather quotations from it. The full title was " PETER BERGER QUOTATIONS — THE SOCIAL CONSTRUCTION OF REALITY". Easy mistake. The original secondary was excellent."

**Interpretation:**
- When ranking DOES work, it sometimes selects incorrect URLs
- AI is confusing partial content (quotations) with full text
- This is a ranking criteria/prompt quality issue, not a technical failure

---

## 🔍 Technical Analysis

### Ranking Flow
1. **User clicks "Autorank Candidates (AI)"** in Edit modal (Tab 2)
2. **Frontend (`index.html:3265`)** calls `rankCandidates()` function
3. **Batching logic** splits candidates into batches of 15 (to avoid timeouts)
4. **API call** to `/api/llm-rank` (Netlify function)
5. **Backend (`llm-rank.ts`)** sends prompt to Claude API
6. **Claude responds** with pipe-delimited rankings
7. **Parser** converts response to JSON
8. **Frontend displays** rankings in Tab 2

### Possible Failure Points

#### 1. **Timeout (Most Likely)**
**Location:** `llm-rank.ts:254`
**Code:**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 18000); // 18 second timeout
```

**Error Response:**
```json
{
  "rankings": [],
  "error": "API timeout - try with fewer candidates or simpler reference"
}
```

**Likelihood:** HIGH - If there are many candidates or complex reference text

#### 2. **Parse Error**
**Location:** `llm-rank.ts:396-446`
**Issue:** Claude returns wrong format (not pipe-delimited)

**Expected Format:**
```
INDEX|PRIMARY|SECONDARY|PRIMARY_REASON|SECONDARY_REASON|TITLE_MATCH|AUTHOR_MATCH|RECOMMEND
0|100|40|Free PDF from archive.org|Not a review|exact|yes|primary
1|80|95|Publisher paywalled|Scholarly review of this work|exact|yes|secondary
```

**Error Response:**
```json
{
  "rankings": [],
  "error": "Failed to parse rankings (expected pipe-delimited format)",
  "raw_response": "..."
}
```

**Likelihood:** MEDIUM - Claude Sonnet 4 is usually reliable with format

#### 3. **Anthropic API Error**
**Location:** `llm-rank.ts:289-299`
**Issue:** API returns error status

**Possible Causes:**
- Rate limiting
- API key issues
- Service outage

**Likelihood:** LOW - Would affect all users

#### 4. **Network Error**
**Issue:** Fetch fails before reaching API
**Likelihood:** LOW - Would show different error

---

## 🐛 Code Analysis

### Batch Processing
**Current Settings (`index.html:3283`):**
```javascript
const batchSize = 15;  // Process 15 candidates at a time
```

**Timeout:**
```javascript
setTimeout(() => controller.abort(), 18000); // 18 seconds
```

**History:**
- v13.6: Disabled search tool (was causing timeouts)
- v13.7: Increased batch to 35 (still had timeout issues)
- v13.8: Reduced to 15 + 18s timeout + 1500 max tokens (still timing out at 19s)
- v13.9: Reduced to 10 + 800 max tokens + simplified prompt
- v13.12: Increased to 15 with improved prompt

**Current Status:** 15 candidates per batch, 18s timeout, 800 max tokens

### Error Handling
**Frontend (`index.html:3551-3555`):**
```javascript
} catch (error) {
    const errorMsg = error.message || error.toString();
    this.addDebugPanel('Exception: Autorank Failed', `<strong>Error:</strong> ${errorMsg}`, 'error');
    this.showToast('Ranking failed. Check Debug tab (Tab 3) for details.', 'error');
    console.error('Ranking error:', error);
}
```

**This is the code that showed the error in the screenshot.**

---

## 📝 User Feedback on Quality

### Issue: Wrong Primary Selection
**User's note:**
```
The recommended primary was actually not the full text, but rather quotations from it.
The full title was " PETER BERGER QUOTATIONS — THE SOCIAL CONSTRUCTION OF REALITY".
Easy mistake. The original secondary was excellent.
```

### Root Cause Analysis

**What Happened:**
1. AI received multiple candidates including:
   - Option A: Full text of the actual work
   - Option B: "PETER BERGER QUOTATIONS — THE SOCIAL CONSTRUCTION OF REALITY"
2. AI scored Option B (quotations) higher than Option A (full text)
3. User recognized this was wrong

**Why This Happens:**
Current scoring criteria in `llm-rank.ts:126-151` may not adequately distinguish:
- Full text of the work
- Excerpts/quotations from the work
- Anthologies containing parts of the work

**Current Detection Logic:**
```
FULL-TEXT SOURCE INDICATORS (95-100):
✓ Title/URL matches book title (no "review" language)
✓ Snippet mentions "full text", "complete", "entire work", "read online"
✓ PDF/HTML from academic repository (.edu/.gov/archive.org/researchgate)
✓ No reviewer or different author mentioned in snippet
```

**Problem:** This doesn't explicitly penalize:
- URLs with "quotations" in the title
- URLs with "excerpts" in the title
- Partial collections or anthologies

---

## 🔧 Proposed Solutions

### For Ranking Failure (Technical Issue)

#### Option 1: Increase Timeout
**Change:** Increase from 18s to 26s (Netlify max)
**Pros:** May prevent timeout failures
**Cons:** Longer wait time for users
**Risk:** LOW

#### Option 2: Reduce Batch Size
**Change:** Reduce from 15 to 10 candidates per batch
**Pros:** Faster processing per batch
**Cons:** More batches needed, longer total time
**Risk:** LOW

#### Option 3: Reduce Max Tokens
**Change:** Reduce from 800 to 600
**Pros:** Faster Claude response
**Cons:** May affect quality of reasoning
**Risk:** MEDIUM

#### Option 4: Add Better Error Logging
**Change:** Include more details in Debug tab (Tab 3)
**Pros:** Easier to diagnose future failures
**Cons:** Doesn't prevent failures
**Risk:** NONE

#### Option 5: Retry Logic
**Change:** Auto-retry failed batches once
**Pros:** May recover from transient errors
**Cons:** Doubles time on failure
**Risk:** LOW

### For Quality Issue (Wrong URL Selection)

#### Option 1: Add Explicit Exclusions
**Change:** Add to scoring criteria:
```
QUOTATIONS/EXCERPTS/ANTHOLOGIES (max 65):
⚠️ CRITICAL: If URL or title contains "quotations", "excerpts", "anthology", "selections" → MAX SCORE 65
⚠️ These are partial content, not full text
⚠️ Example: "Peter Berger Quotations" ≠ Full text of the work
⚠️ Even from .edu or as PDF, still not the complete work
```

**Pros:** Directly addresses the reported issue
**Cons:** May exclude legitimate sources
**Risk:** LOW

#### Option 2: Improve Title Matching
**Change:** Require exact title match (not partial) for high scores
**Pros:** More precise matching
**Cons:** May miss valid alternatives (e.g., subtitle variations)
**Risk:** MEDIUM

#### Option 3: Add Confirmation Indicators
**Change:** Require multiple positive signals for 95-100 scores:
- Exact title match AND
- Exact author match AND
- No exclusion keywords ("quotations", "excerpts", "review", etc.)

**Pros:** More conservative, fewer mistakes
**Cons:** May give lower scores to valid sources
**Risk:** LOW

---

## 🎯 Recommended Actions

### Immediate (High Priority)

**1. Add Better Error Logging**
- Capture full error details in Debug tab
- Include API response preview
- Show timeout vs parse error vs API error
- **Benefit:** Understand exact failure mode
- **Risk:** None
- **Effort:** LOW

**2. Add Quotations/Excerpts Detection**
- Add explicit exclusion for "quotations", "excerpts", "anthology"
- Max score 65 for these types
- **Benefit:** Prevents the exact error user reported
- **Risk:** Low - these are genuinely not full text
- **Effort:** LOW

### Short-term (Medium Priority)

**3. Increase Timeout to 26 Seconds**
- Change from 18s to 26s (Netlify max)
- **Benefit:** May prevent timeout failures
- **Risk:** Low - just longer wait time
- **Effort:** MINIMAL

**4. Add Retry Logic**
- Retry failed batches once (with exponential backoff)
- **Benefit:** Recover from transient errors
- **Risk:** Low - user just waits longer on failure
- **Effort:** MEDIUM

### Long-term (Nice to Have)

**5. Streaming Progress Updates**
- Show per-batch progress in UI
- **Benefit:** Better UX during long operations
- **Risk:** None
- **Effort:** MEDIUM

**6. User Override System**
- Allow user to flag bad recommendations
- Learn from corrections
- **Benefit:** Improve quality over time
- **Risk:** Complexity
- **Effort:** HIGH

---

## 📋 Questions for User

Before implementing fixes, need to understand:

**About the Failure:**
1. **Check Debug tab (Tab 3)** - What does it say in the debug panel?
   - Error message text?
   - Any API response preview?
   - Any timing information?

2. **How many candidates** were being ranked when it failed?
   - Small set (<15)?
   - Medium set (15-30)?
   - Large set (30+)?

3. **Does it happen consistently** with this reference?
   - First time?
   - Happens every time?
   - Works sometimes?

**About the Quality Issue:**
4. **Was the quotations issue from a DIFFERENT reference** than the failure?
   - Did ranking actually complete but give wrong results?
   - Or is this a separate observation from earlier use?

5. **How often do you see quality issues?**
   - Rare (1 in 10 references)?
   - Common (>50%)?
   - This was first time?

---

## 🚦 Next Steps

**Step 1: Gather More Info**
- User checks Debug tab (Tab 3) for error details
- User provides number of candidates
- User confirms if this is a recurring issue

**Step 2: Implement Quick Wins**
- Add better error logging (no risk, high value)
- Add quotations/excerpts detection (fixes reported quality issue)
- Increase timeout to 26s (may prevent failures)

**Step 3: Test**
- User retries RID 115 ranking
- Check if error persists
- Check if error details are clearer

**Step 4: Iterate**
- Based on test results, implement additional fixes
- May need to adjust batch size, timeout, or prompts further

---

## 💡 Key Insights

1. **Two Separate Issues:**
   - Technical failure (ranking didn't complete)
   - Quality issue (ranking selected wrong URL)

2. **Technical Failure Most Likely:**
   - Timeout (18s limit hit)
   - Parse error (Claude returned wrong format)

3. **Quality Issue is Fixable:**
   - Add explicit exclusions for "quotations", "excerpts"
   - Require multiple positive signals for high scores

4. **Error Logging is Insufficient:**
   - Current error message is generic
   - Need to show actual error details in Debug tab

5. **Batch Processing Works:**
   - Current approach (batches of 15) is reasonable
   - May need to tune timeout and token limits

---

## 📊 Summary Table

| Issue | Type | Severity | Likelihood | Fix Difficulty | Priority |
|-------|------|----------|------------|----------------|----------|
| Ranking timeout | Technical | HIGH | HIGH | EASY | P0 |
| Parse error | Technical | HIGH | MEDIUM | EASY | P1 |
| Poor error logging | UX | MEDIUM | HIGH | EASY | P0 |
| Quotations selected as primary | Quality | MEDIUM | MEDIUM | EASY | P1 |
| No retry logic | Reliability | MEDIUM | N/A | MEDIUM | P2 |

---

**Analysis completed:** October 31, 2025, 1:30 AM
**Next:** Awaiting user feedback from Debug tab to confirm root cause
**Status:** Ready to implement fixes once issue is confirmed
