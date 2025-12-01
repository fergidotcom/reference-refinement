# FOR WEB SESSION: JSTOR Paywall Penalties

**Date:** November 10, 2025
**Source:** Mac Claude Code v16.9 implementation
**Target:** Web Claude.ai session (Production Quality Framework)

---

## Overview

Mac Claude Code has implemented comprehensive JSTOR paywall penalties in v16.9 that must be propagated to the Web session's Production Quality Framework to ensure consistent behavior across both implementations.

**Problem:** JSTOR URLs being selected despite being paywalled ($$$ subscription required)

**Solution:** Heavy penalties for JSTOR (max score 50), prioritize free alternatives (Archive.org, ResearchGate)

---

## What Was Implemented on Mac

### 1. JSTOR Detection and Penalties (llm-rank.ts)

**Added to PRIMARY scoring:**
```
⚠️ JSTOR PAYWALL (max 50):
⚠️ CRITICAL: jstor.org URLs should be LAST RESORT only
⚠️ JSTOR = paywalled academic repository ($$ subscription required)
⚠️ PRIMARY score: MAX 50 (prefer Archive.org, ResearchGate, .edu free PDFs)
⚠️ SECONDARY score: MAX 50 (prefer free alternatives first)
⚠️ Exception: If NO free alternatives exist, JSTOR acceptable at 50
⚠️ Rationale: Most users cannot access JSTOR content
```

**Added to SECONDARY scoring:**
```
SCHOLARLY BOOK REVIEW (90-100):
✓ From academic journal (.edu, sagepub, oxford, cambridge, etc.)
⚠️ AVOID JSTOR unless no free alternatives exist (max 50 even for reviews)
```

### 2. Free Source Prioritization

**Updated FULL-TEXT scoring:**
```
FULL-TEXT SOURCE INDICATORS (95-100):
✓ FREE PDF/HTML from archive.org, researchgate.net, .edu/.gov repositories
⚠️ IMPORTANT: FREE sources (archive.org, researchgate) score HIGHER than paywalls
⚠️ Archive.org and ResearchGate ALWAYS preferred over JSTOR

FULL-TEXT (uncertain) (85-95):
⚠️ Still preferred over JSTOR paywalled content
```

### 3. Impact on Scores

| Source Type | Before v16.9 | After v16.9 | Change |
|------------|-------------|------------|--------|
| Archive.org | 85-95 | 95-100 | +5-10 (explicit priority) |
| ResearchGate | 85-95 | 95-100 | +5-10 (explicit priority) |
| JSTOR | 85-95 | **MAX 50** | **-35 to -45** ⭐ |
| Other paywalls | 70-85 | 65-80 | -5 |
| Publisher pages | 60-75 | 55-70 | -5 |

**Result:** Free sources now have **45-point advantage** over JSTOR!

---

## What Needs to Be Done on Web

### File: Production_Quality_Framework_Enhanced.py

#### 1. Add JSTOR Domain Detection

**Location:** In the `score_url()` function, after existing domain tier detection

**Add this code:**
```python
# JSTOR Paywall Detection (v16.9)
if 'jstor.org' in domain:
    # JSTOR is paywalled - heavy penalty
    penalty = -40  # Brings any high score down to ~50 max
    penalties.append(('JSTOR paywall', penalty))
    score += penalty

    # Log JSTOR detection
    logging.info(f"  ⚠️  JSTOR detected: {url[:60]}... (penalty: {penalty})")

    # If other high-scoring candidates exist, prefer them
    # JSTOR should only win if it's the ONLY option
```

**Why -40 penalty?**
- Base domain tier for .org academic: 85-95
- Minus 40 penalty = 45-55 final score
- Free alternatives (archive.org, researchgate) = 90-100
- **45-point advantage for free sources** (matches Mac implementation)

#### 2. Update Free Source Boost

**Location:** In the `score_url()` function, update archive.org and researchgate scoring

**Current code (estimated):**
```python
# Domain tier scoring
if domain in ['archive.org', 'researchgate.net']:
    base_score = 90  # Free academic sources
```

**Update to:**
```python
# FREE SOURCE PRIORITY (v16.9)
if domain in ['archive.org', 'researchgate.net']:
    base_score = 95  # Explicitly prioritize free sources over paywalls
    logging.info(f"  ✅ Free source detected: {domain}")

    # Additional boost if JSTOR alternatives exist
    # (This ensures free sources ALWAYS win over JSTOR)
```

#### 3. Update Paywall Detection

**Location:** Existing paywall detection code (if it exists)

**Enhance to:**
```python
# Paywall detection (v16.9 enhanced)
PAYWALL_DOMAINS = [
    'jstor.org',           # -40 penalty (heavy)
    'sciencedirect.com',   # -10 penalty (moderate)
    'springer.com',        # -10 penalty (moderate)
    'wiley.com',           # -10 penalty (moderate)
    # ... other paywalled publishers
]

PAYWALL_PENALTIES = {
    'jstor.org': -40,      # CRITICAL: JSTOR is last resort
    'default': -10         # Other paywalls less severe
}

for paywall_domain in PAYWALL_DOMAINS:
    if paywall_domain in domain:
        penalty = PAYWALL_PENALTIES.get(paywall_domain, -10)
        penalties.append((f'{paywall_domain} paywall', penalty))
        score += penalty
        break
```

**Why JSTOR gets -40 while others get -10?**
- JSTOR: Subscription required, very limited free access
- Other publishers: Often have "read online" or preview features
- JSTOR should only be used if NO other option exists

#### 4. Update Logging for Visibility

**Add to score logging:**
```python
# Log final score with paywall status
if 'jstor.org' in url:
    logging.warning(f"  🔒 JSTOR (paywalled): score={score} (capped at 50)")
elif any(pw in url for pw in PAYWALL_DOMAINS):
    logging.info(f"  🔒 Paywalled source: score={score}")
else:
    logging.info(f"  ✅ Free source: score={score}")
```

---

## Ranking Prompt Updates

### Location: Wherever ranking prompt is defined in Web framework

#### Add JSTOR Penalties to Prompt

**After existing PRIMARY score guidance, add:**
```
⚠️ JSTOR PAYWALL (max 50):
⚠️ CRITICAL: jstor.org URLs should be LAST RESORT only
⚠️ JSTOR = paywalled academic repository ($$ subscription required)
⚠️ PRIMARY score: MAX 50 (prefer Archive.org, ResearchGate, .edu free PDFs)
⚠️ SECONDARY score: MAX 50 (prefer free alternatives first)
⚠️ Exception: If NO free alternatives exist, JSTOR acceptable at 50
⚠️ Rationale: Most users cannot access JSTOR content
```

**Update free source guidance:**
```
FULL-TEXT SOURCE INDICATORS (95-100):
✓ FREE PDF/HTML from archive.org, researchgate.net, .edu/.gov repositories
⚠️ IMPORTANT: FREE sources (archive.org, researchgate) score HIGHER than paywalls
⚠️ Archive.org and ResearchGate ALWAYS preferred over JSTOR
```

**Update paywalled source guidance:**
```
PAYWALLED/PREVIEW (65-80):
• Publisher site with preview access (non-JSTOR)
• Paywalled full text access
• Note: Free alternatives (Archive.org, ResearchGate) should score higher
```

#### Add to SECONDARY Scoring

**Update scholarly review guidance:**
```
SCHOLARLY BOOK REVIEW (90-100):
✓ From academic journal (.edu, sagepub, oxford, cambridge, etc.)
⚠️ AVOID JSTOR unless no free alternatives exist (max 50 even for reviews)
```

---

## Query Generation Updates

### Add Free Source Emphasis

**Update query generation to explicitly search for free sources:**

**Query types (8 total):**
1. **Q1-Q3: Primary free sources** (75%)
   - Add: "archive.org" OR "researchgate" OR "free PDF"
   - Example: `"Title" author site:archive.org OR site:researchgate.net`

2. **Q4: Primary publisher** (25%)
   - Keep as fallback for when no free sources exist

3. **Q5-Q7: Secondary reviews** (75%)
   - Prefer non-JSTOR academic sources
   - Example: `"review of Title" -site:jstor.org`

4. **Q8: Secondary topic** (25%)
   - Keep as fallback

**Explicit guidance to add:**
```
QUERY BEST PRACTICES (v16.9):
✓ Use exact title in quotes for primary and review queries
✓ Keep queries 40-80 characters (max 120)
✓ Prioritize FREE sources over paywalled (archive.org, researchgate)
✓ Use negative keywords: -site:jstor.org (prefer alternatives first)

AVOID:
❌ JSTOR in early queries (only as last resort)
❌ Paywalled publishers in primary queries
❌ ISBN + publisher + full title together (too specific)
```

---

## Testing & Validation

### Test References

Use these 10 references that currently have JSTOR URLs:

| RID | Title (truncated) | Current Status |
|-----|------------------|----------------|
| 5   | Tversky - Judgment under uncertainty | Unfinalized |
| 122 | Cmiel - Democratic Eloquence | Unfinalized |
| 203 | Duhem - Aim and Structure | Unfinalized |
| 204 | Sapir - Status of Linguistics | Unfinalized |
| 611 | Veblen - Theory of the leisure class | Unfinalized |
| 614 | Hamilton - All the news that's fit to sell | Unfinalized |
| 615 | Napoli - Audience economics | Unfinalized |
| 634 | Turow - The daily you | Unfinalized |
| 752 | Taber - Motivated skepticism | Unfinalized |
| 832 | Matthews - U.S. Senators and Their World | Unfinalized |

### Validation Steps

1. **Implement JSTOR penalties in Production_Quality_Framework_Enhanced.py**
   - Add -40 penalty for jstor.org domain
   - Add +5 boost for archive.org, researchgate.net
   - Update paywall detection dictionary

2. **Update ranking prompts**
   - Add JSTOR max score 50 guidance
   - Add free source prioritization

3. **Test with RID 611 (Veblen)**
   - **Before:** PRIMARY = JSTOR (P:90), SECONDARY = JSTOR (S:85)
   - **After expected:** PRIMARY = Archive.org (P:95), SECONDARY = Free review (S:85)

4. **Run on all 10 JSTOR references**
   - Verify JSTOR no longer selected as primary/secondary
   - Verify Archive.org or ResearchGate preferred
   - Verify scores: Free = 90-100, JSTOR = max 50

5. **Compare Mac vs Web results**
   - Process same reference with both implementations
   - Verify identical URL selections
   - Verify score differences < 5 points

### Expected Results

**Metric** | **Before v16.9** | **After v16.9** | **Target**
-----------|-----------------|----------------|------------
JSTOR selection rate | 3.5% (10/288) | <0.5% | <1%
Free source coverage | ~65% | ~90% | >85%
Override rate | ~16% | <5% | <10%
Archive.org usage | ~25% | ~50% | >40%
ResearchGate usage | ~20% | ~30% | >25%

---

## Implementation Checklist

### Phase 1: Core Penalties
- [ ] Add JSTOR domain detection to Production_Quality_Framework_Enhanced.py
- [ ] Implement -40 penalty for jstor.org
- [ ] Add logging for JSTOR detection
- [ ] Test with RID 611 (should now prefer Archive.org)

### Phase 2: Free Source Priority
- [ ] Update archive.org scoring (85-95 → 95-100)
- [ ] Update researchgate.net scoring (85-95 → 95-100)
- [ ] Add logging for free source detection
- [ ] Test with RID 5 (should prefer ResearchGate)

### Phase 3: Prompt Updates
- [ ] Add JSTOR max 50 guidance to ranking prompt
- [ ] Add free source prioritization to prompt
- [ ] Update query generation with free source emphasis
- [ ] Test with RID 203 (should generate archive.org queries)

### Phase 4: Validation
- [ ] Run all 10 JSTOR references through updated framework
- [ ] Verify JSTOR no longer selected
- [ ] Compare Mac v16.9 vs Web results (should match)
- [ ] Document any discrepancies

### Phase 5: Documentation
- [ ] Update Production_Quality_Framework_Enhanced.py docstring
- [ ] Add JSTOR penalties to changelog
- [ ] Update Web session summary with v16.9 compatibility
- [ ] Mark propagation complete

---

## Key Differences: Mac vs Web

### Mac Implementation (v16.9)
- **Location:** `netlify/functions/llm-rank.ts` (TypeScript)
- **Method:** AI prompt instructions (max score 50)
- **Enforcement:** Claude Sonnet 4 follows guidance
- **Flexibility:** Can adjust based on context

### Web Implementation (to be done)
- **Location:** `Production_Quality_Framework_Enhanced.py` (Python)
- **Method:** Algorithmic penalty (-40 points)
- **Enforcement:** Hardcoded penalty applied
- **Flexibility:** Consistent, no variation

### Why Both Needed?
- **Mac:** Uses AI for nuanced understanding (reviews, context)
- **Web:** Uses algorithmic scoring for speed and consistency
- **Together:** Ensures JSTOR avoidance across all workflows

---

## FAQs

### Q: Why MAX 50 instead of rejecting JSTOR entirely?

**A:** Some references have NO free alternatives. JSTOR is still better than:
- Commercial purchase pages (score 55-70)
- Generic search results (score 30-50)
- Broken/404 links (score 0)

If JSTOR is the ONLY scholarly source, accepting at score 50 is reasonable.

### Q: What if Archive.org link is "borrow only"?

**A:** Still preferred over JSTOR! Reasons:
- Archive.org borrow = free 14-day checkout
- JSTOR = requires $$ subscription
- Even limited free access > no free access

Score as 85-95 (uncertain full-text) instead of 95-100 (confirmed full-text).

### Q: Should we penalize other paywalls (ScienceDirect, Springer)?

**A:** Yes, but less severely:
- JSTOR: -40 penalty (last resort)
- Other paywalls: -10 penalty (moderate)

Other paywalls often have:
- Preview features
- Author manuscript repositories
- University access agreements

JSTOR is more restrictive, hence heavier penalty.

### Q: What if user WANTS to use JSTOR (has subscription)?

**A:** User can always manually override:
1. Review unfinalized reference
2. If JSTOR URL is acceptable (they have access)
3. Manually add JSTOR URL as primary/secondary
4. Finalize reference

The penalties prevent AUTOMATIC selection, not manual use.

---

## Summary

### What to Implement

1. **-40 penalty** for jstor.org domain in Python framework
2. **+5 boost** for archive.org and researchgate.net
3. **Updated prompts** with JSTOR max score 50
4. **Query emphasis** on free sources first

### Expected Impact

- JSTOR selection: 3.5% → <0.5%
- Free source coverage: ~65% → ~90%
- User override rate: ~16% → <5%

### Validation

- Test with 10 JSTOR references
- Verify Mac v16.9 and Web results match
- Document any discrepancies

### Timeline

- **Phase 1-2:** Core penalties + free source priority (1 hour)
- **Phase 3:** Prompt updates (30 min)
- **Phase 4:** Validation testing (1 hour)
- **Total:** ~2.5 hours implementation + testing

---

**Status:** Ready for Web session implementation
**Priority:** HIGH (affects 3.5% of references)
**Complexity:** LOW (straightforward penalty addition)
**Risk:** LOW (only improves existing behavior)

**Next Steps:**
1. Resume Web session with Claude.ai
2. Upload this document for context
3. Implement changes to Production_Quality_Framework_Enhanced.py
4. Test and validate with 10 JSTOR references
5. Mark propagation complete
