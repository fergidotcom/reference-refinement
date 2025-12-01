# Claude Code Web Session Quick Start - Deep URL Validation

**For:** Claude Code Web (NOT Claude.ai)
**Goal:** Complete ALL 288 references tonight! (139 unfinalized → finalized)
**Time:** 6-8 hours
**Status:** Ready to begin

## ⚠️ CRITICAL: ACTUALLY VIEW THE DOCUMENTS

**Before assigning any URL, you MUST:**
- Fetch the URL and download content
- Use AI to analyze what you retrieved
- Verify you can SEE the actual document (full text, images, body)
- NOT just an abstract, preview, or paywall
- Use as many queries/fetches as needed to be certain

**If you cannot VIEW the target document, DO NOT assign that URL.**

---

## What You Need to Know in 2 Minutes

### The Problem Mac Made

❌ **Mac tried to penalize JSTOR domain** → WRONG!
- Assumed `jstor.org` = always paywalled
- Reality: JSTOR hosts BOTH free AND paywalled content
- Example: `sites.socsci.uci.edu/...pdf` = FREE but looks like JSTOR

### The Correct Solution

✅ **Validate by actually fetching and analyzing content**
1. Fetch the URL (GET request, not HEAD)
2. Download first 50-100KB
3. Detect barriers: "Subscribe to read", "Sign in to continue", "Preview only"
4. Score based on accessibility (0-100), NOT domain name

### Tonight's Mission

**Phase 1:** Implement deep validation (2-3 hours)
**Phase 2:** Test with 25-50 refs (1-2 hours)
**Phase 3:** If reliable, reprocess ALL 139 unfinalized refs (3-4 hours)
**Result:** 288/288 Caught In The Act references COMPLETE!

---

## Files You Need

### Must Read First
1. **`ReferenceRefinementClaudePerspective.yaml`** ← START HERE
   - Complete roadmap
   - All validation patterns
   - Success criteria

2. **`FOR_WEB_DEEP_VALIDATION_SESSION.md`** ← Full instructions
   - Code examples
   - Pattern detection
   - Integration steps

3. **`DEEP_URL_VALIDATION_ARCHITECTURE.md`** ← Technical details
   - Architecture
   - Performance considerations
   - Edge cases

### Reference Files
- `decisions.txt` - Current data (149 finalized, 139 unfinalized)
- `Production_Quality_Framework_Enhanced.py` - Add deep validation here

---

## The Test Case (RID 5)

**Must pass this test before proceeding!**

Reference: Tversky (1974) - Judgment under uncertainty

**URL 1:** `https://sites.socsci.uci.edu/~bskyrms/bio/readings/tversky_k_heuristics_biases.pdf`
- Expected: ACCESSIBLE (free PDF)
- Score: 90-100
- Note: Domain looks like JSTOR but is FREE!

**URL 2:** `https://www.science.org/doi/10.1126/science.185.4157.1124`
- Expected: LOGIN REQUIRED
- Score: 60-70

**Validation:** UCI PDF MUST score higher than Science.org

---

## Implementation Checklist

### Phase 1: Implement (2-3 hours)

```python
async def validate_url_deep(url: str, reference: dict) -> dict:
    # 1. Fetch with redirects
    response = await fetch_with_redirects(url, max_redirects=5)

    # 2. Download first 50KB
    content = await fetch_partial_content(response, 50000)

    # 3. Detect barriers
    if 'subscribe to continue' in content.lower():
        return {'accessible': False, 'reason': 'Paywall', 'score': 50}
    if 'sign in to continue' in content.lower():
        return {'accessible': False, 'reason': 'Login required', 'score': 60}

    # 4. Verify content matches
    title_match = reference['title'].lower() in content.lower()
    if not title_match:
        return {'accessible': False, 'reason': 'Wrong content', 'score': 0}

    return {'accessible': True, 'reason': 'Free full-text', 'score': 95}
```

**Patterns to detect:** See `ReferenceRefinementClaudePerspective.yaml` lines 103-130

**Test:** Run RID 5 validation → UCI PDF scores 90-100, Science.org scores 60-70

### Phase 2: Test (1-2 hours)

**Sample 25:** RID 611-635
**Additional:** 25 diverse refs

**Measure:**
- Paywall detection accuracy
- Login detection accuracy
- False positive rate
- Processing time per URL

**Go/No-Go Criteria:**
- Paywall detection: >90% ✓
- Login detection: >90% ✓
- False positives: <5% ✓
- Free sources score higher: 100% ✓
- Processing time: <2 sec/URL ✓

### Phase 3: Full Reprocess (3-4 hours)

**IF Phase 2 criteria met:**
- Reprocess ALL 139 unfinalized refs
- Batches of 25-30
- Log every change
- Generate reports

**Result:** 288/288 references complete!

---

## Success Criteria

### Technical
- ✅ Deep validation function works
- ✅ Paywall detection: 95%+ accurate
- ✅ Login detection: 95%+ accurate
- ✅ Free sources score 90-100
- ✅ Paywalled sources score <60

### Completion
- ✅ ALL 139 unfinalized references reprocessed
- ✅ 288/288 total references finalized
- ✅ Accessibility rate >85%
- ✅ Free source coverage >90%

### Documentation
- ✅ Implementation doc created
- ✅ Reprocessing reports generated
- ✅ Mac propagation guide written

---

## What NOT to Do

❌ Don't penalize by domain (`jstor.org`, `science.org`, etc.)
❌ Don't assume all JSTOR is paywalled
❌ Don't touch the 149 finalized references
❌ Don't skip validation testing before full reprocess

## What TO Do

✅ Fetch content and analyze it
✅ Detect actual access barriers in page content
✅ Score based on accessibility
✅ Test thoroughly with Sample 25 first
✅ Complete all 288 references tonight!

---

**LET'S FINISH THIS!**

Upload `ReferenceRefinementClaudePerspective.yaml` to Claude.ai and begin!
