# Batch Test Results - v14.5 with Mutual Exclusivity Rules

**Date:** October 28, 2025
**Test Group:** References 102-106
**Query Mode:** Standard (8 queries)
**Enhancement:** Primary/Secondary mutual exclusivity rules
**Duration:** 2m 38s
**Cost:** $0.60 (estimated)

---

## Summary

| Ref | Title | Primary | Secondary | Result |
|-----|-------|---------|-----------|--------|
| 102 | Televised Presidential Debates | (kept existing) | ✅ NEW | Partial ⚠️ |
| 103 | President Reagan | ✅ NEW | ✅ NEW | Complete ✅ |
| 104 | News That Matters | ✅ NEW | ❌ None | Partial ⚠️ |
| 105 | Inventing the Internet | ✅ NEW | ✅ NEW | Complete ✅ |
| 106 | The Web of Politics | ❌ None | ❌ None | Failed ❌ |

**Success Rate:**
- Complete (P+S): 2/5 (40%)
- Partial (P or S): 2/5 (40%)
- Failed (none): 1/5 (20%)

---

## Detailed Results

### REF [102]: Televised Presidential Debates and Public Policy

**Batch Processor Output:**
```
Top candidates:
P:25 S:90 - https://academic.oup.com/book/27776/chapter/198012...
P:25 S:80 - https://www.jstor.org/stable/10.1111/1468-2508.t01...
P:25 S:75 - https://journals.akademicka.pl/adamericam/article/...

⚠️  No suitable primary URL found (max P:25)
✓ Secondary: https://academic.oup.com/book/27776/chapter/198012757 (S:90)
```

**Final URLs in decisions.txt:**
- **Primary:** `https://api.pageplace.de/preview/DT0400.9781135447588_A23802868/preview-9781135447588_A23802868.pdf` (KEPT EXISTING)
- **Secondary:** `https://academic.oup.com/book/27776/chapter/198012757` (NEW - OUP book chapter)

**Analysis:**
- ✅ Mutual exclusivity working: No P:90 S:90 candidates
- ✅ Secondary correctly identified as review/analysis (S:90)
- ⚠️ Couldn't find better primary URL (max score P:25)
- ✅ Batch processor preserved existing primary URL

**Reason for Low Primary Scores:**
All candidates were either:
1. Reviews/analyses (score high for secondary, low for primary) ✅ Correct!
2. Wrong work or unrelated content

---

### REF [103]: President Reagan: The Role of a Lifetime

**Batch Processor Output:**
```
Top candidates:
P:95 S:10 - https://archive.org/details/presidentreagan000cann
P:40 S:90 - https://www.nytimes.com/1991/04/24/books/books-of-...
P:45 S:85 - https://www.jstor.org/stable/2151744
P:75 S:15 - https://www.amazon.com/President-Reagan-Lifetime-L...

✓ Primary: https://archive.org/details/presidentreagan000cann (P:95)
✓ Secondary: https://www.nytimes.com/1991/04/24/books/books-of-the-times-... (S:90)
```

**Final URLs in decisions.txt:**
- **Primary:** `https://archive.org/details/presidentreagan000cann` (NEW - Archive.org full text)
- **Secondary:** `https://www.nytimes.com/1991/04/24/books/books-of-the-times-damning-a-president-with-fairness.html` (NEW - NYT book review)

**Analysis:**
- ✅ Perfect mutual exclusivity: P:95 S:10 vs P:40 S:90
- ✅ Full-text source scored high for PRIMARY, low for SECONDARY
- ✅ Book review scored low for PRIMARY, high for SECONDARY
- ✅ Both URLs are high quality and appropriate

---

### REF [104]: News That Matters

**Batch Processor Output:**
```
Top candidates:
P:95 S:25 - https://archive.org/details/newsthatmatterst0000iy...
P:85 S:25 - https://www.uvm.edu/~dguber/POLS293/articles/iyeng...
P:75 S:25 - https://press.uchicago.edu/ucp/books/book/chicago/...

✓ Primary: https://archive.org/details/newsthatmatterst0000iyen (P:95)
```

**Final URLs in decisions.txt:**
- **Primary:** `https://archive.org/details/newsthatmatterst0000iyen` (NEW - Archive.org full text)
- **Secondary:** (none)

**Analysis:**
- ✅ Mutual exclusivity working: All full-text sources scored low for secondary (S:25)
- ✅ Archive.org full text correctly identified as primary
- ⚠️ No review/analysis candidates found
- ✅ Batch processor correctly left secondary empty

---

### REF [105]: Inventing the Internet

**Batch Processor Output:**
```
Top candidates:
P:95 S:25 - https://nissenbaum.tech.cornell.edu/papers/Inventi...
P:95 S:25 - https://seeingcollaborations.files.wordpress.com/2...
P:15 S:95 - https://muse.jhu.edu/article/33635/pdf
P:20 S:85 - https://quod.lib.umich.edu/j/jahc/3310410.0003.321...

✓ Primary: https://nissenbaum.tech.cornell.edu/papers/Inventingtheinter... (P:95)
✓ Secondary: https://muse.jhu.edu/article/33635/pdf (S:95)
```

**Final URLs in decisions.txt:**
- **Primary:** `https://nissenbaum.tech.cornell.edu/papers/Inventingtheinternet.pdf` (NEW - Cornell .edu PDF)
- **Secondary:** `https://muse.jhu.edu/article/33635/pdf` (NEW - MUSE review article PDF)

**Analysis:**
- ✅ Perfect mutual exclusivity: P:95 S:25 vs P:15 S:95
- ✅ Full-text PDF scored high for PRIMARY, low for SECONDARY
- ✅ Review article scored low for PRIMARY, high for SECONDARY
- ✅ Both URLs are excellent quality

**This is the ideal outcome!**

---

### REF [106]: The Web of Politics

**Batch Processor Output:**
```
Top candidates:
P:30 S:50 - https://www.dhi.ac.uk/san/waysofbeing/data/citizen...
P:25 S:40 - https://pages.gseis.ucla.edu/faculty/agre/real-tim...
P:25 S:40 - https://www.ipr.northwestern.edu/documents/working...

⚠️  No suitable primary URL found
```

**Final URLs in decisions.txt:**
- **Primary:** (none)
- **Secondary:** (none)

**Analysis:**
- ❌ No candidates scored above threshold
- ⚠️ Max primary score: P:30 (below P:60 threshold)
- ⚠️ Max secondary score: S:50 (below S:60 threshold)
- ✅ Batch processor correctly didn't assign low-quality URLs

**Reason for Failure:**
- Likely an obscure or out-of-print work
- May need different query strategy
- Consider manual search with more specific queries

---

## Mutual Exclusivity Rules - Working as Intended ✅

### Before v14.5 (Hypothetical):
- Full-text PDFs could score: P:95 S:60
- Reviews could score: P:70 S:95
- Result: Same URL could be selected for both slots

### After v14.5 (Actual):
- Full-text PDFs score: **P:95 S:10-25** ✅
- Reviews score: **P:15-40 S:85-95** ✅
- Result: Clear separation, no duplication

### Evidence from This Run:

**REF 103 Example:**
```
P:95 S:10 - archive.org (full text) → Selected as PRIMARY
P:40 S:90 - nytimes.com (review) → Selected as SECONDARY
```

**REF 105 Example:**
```
P:95 S:25 - cornell.edu (full text) → Selected as PRIMARY
P:15 S:95 - muse.jhu.edu (review) → Selected as SECONDARY
```

**Perfect mutual exclusivity!**

---

## Key Insights

### What Worked Well:

1. **Mutual Exclusivity Rules** ✅
   - Full-text sources no longer compete for secondary slot
   - Reviews no longer score high for primary slot
   - Clear separation prevents duplication

2. **Archive.org Discovery** ✅
   - REF 103: Found Reagan biography
   - REF 104: Found News That Matters
   - Archive.org is a goldmine for older academic works

3. **Review Identification** ✅
   - REF 103: NYT book review (S:90)
   - REF 105: MUSE review article (S:95)
   - System correctly distinguishes reviews from source material

4. **Preservation of Existing URLs** ✅
   - REF 102: Kept existing primary URL when no better option found
   - Smart behavior prevents data loss

### What Needs Improvement:

1. **Primary URL Discovery for REF 102** ⚠️
   - All 51 candidates scored low for primary (max P:25)
   - Need to investigate why full-text sources weren't found
   - May need more targeted queries for Routledge books

2. **Secondary URL Discovery for REF 104** ⚠️
   - Found excellent primary URL
   - But no reviews/analyses found
   - May need broader thematic queries

3. **Complete Failure for REF 106** ❌
   - No suitable candidates at all
   - Max scores: P:30 S:50
   - Needs manual intervention or different strategy

---

## Comparison to Previous Test

### Previous Test (Before v14.5):
- Had full-text PDFs scoring high for both P and S
- ResearchGate PDF was selected as secondary for REF 102
- Problem: Same type of content in both slots

### This Test (After v14.5):
- Full-text PDFs: HIGH primary, LOW secondary
- Reviews/analyses: LOW primary, HIGH secondary
- Result: Appropriate content in each slot

**Improvement: ✅ Mutual exclusivity successfully enforced**

---

## Next Steps

### For REF 102:
- Investigate why primary candidates scored so low
- Check if queries are finding the full text
- May need manual override or custom queries

### For REF 104:
- Need better secondary query strategies
- Try queries focused on book reception and critique
- Consider thematic queries about television and public opinion

### For REF 106:
- Manual search required
- Try different query formulations
- Check if work is available online at all

### General Improvements:
1. Analyze query effectiveness (which queries found the best URLs)
2. Consider adaptive query strategies
3. Fine-tune scoring thresholds
4. Add domain-specific query templates

---

## Scoring Statistics

### Primary Scores Distribution:
- **90-100 (Excellent):** 3 candidates (REF 103, 104, 105)
- **70-89 (Good):** 1 candidate (Amazon seller page - not selected)
- **60-69 (Acceptable):** 0 candidates
- **< 60 (Poor):** Majority of candidates

### Secondary Scores Distribution:
- **90-100 (Excellent):** 2 candidates (REF 102, 105)
- **70-89 (Good):** Multiple review articles
- **60-69 (Acceptable):** Some thematic discussions
- **< 60 (Poor):** Most full-text sources (as intended!)

**Observation:** The mutual exclusivity rules are creating a clear bimodal distribution, which is exactly what we want.

---

## Cost Analysis

**Actual Costs (estimated):**
- Google searches: 40 searches × $0.005 = $0.20
- Claude API: Query gen + ranking ≈ $0.40
- **Total: $0.60**

**Per Reference:** $0.12 (standard mode, 8 queries)

**Success Rate Value:**
- 2 complete references (P+S): $0.30 each
- 2 partial references (P or S): $0.30 each
- 1 failed reference: $0.60 (no results)

**Effective cost per successful URL:** $0.15

---

## Conclusion

The v14.5 mutual exclusivity enhancement is **working as intended**:

✅ Full-text sources → PRIMARY only
✅ Reviews/analyses → SECONDARY only
✅ Clear separation, no duplication
✅ Both iPad app and batch processor benefit

**Success Rate:** 40% complete, 40% partial = **80% at least partially successful**

**Ready for:** Larger batch runs with ongoing monitoring and refinement

---

**Version:** v14.5
**Test Date:** October 28, 2025
**Batch Log:** batch-logs/batch_2025-10-28T16-22-26.log
**Backup:** decisions_backup_2025-10-28T16-22-26.txt
