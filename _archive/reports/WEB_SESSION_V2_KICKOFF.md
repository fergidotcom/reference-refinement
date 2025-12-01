# WEB SESSION V2 KICKOFF: Corrected Instance Expansion + URL Enhancement

**Repository:** https://github.com/fergidotcom/reference-refinement.git
**Branch:** main
**Session Type:** Corrected Manuscript Analysis with Range Expansion + Quality Framework
**Expected Duration:** 8-12 hours
**Expected Searches:** 2,000-3,000+ web searches

---

## CRITICAL CORRECTION FROM V1

**V1 Problem:** Citation mapper only found exact matches like `[102]`, missing ranged citations like `[107-117]`.

**V1 Result:** Only 11 instances created (should have been ~300+)

**V2 Fix:** Expand ALL ranged citations before counting instances.

**Example:**
```
Manuscript text: "cable news [118-121] would fragment and social media [107-117] would weaponize"

V1 Parser (WRONG):
- Saw [118-121] as one citation
- Saw [107-117] as one citation
- Result: 0 matches for refs 107-121 individually

V2 Parser (CORRECT):
- Expand [118-121] → 118, 119, 120, 121 (4 citations)
- Expand [107-117] → 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117 (11 citations)
- Result: Each ref gets proper citation count
```

---

## MISSION SUMMARY

Analyze "Caught In The Act" manuscript against current decisions.txt to:

1. **CRITICAL FIX:** Expand ranged citations `[X-Y]` to individual refs before counting
2. **Extract quality criteria** from 230-250 finalized references (gold standard)
3. **Enhance unfinalized references** with better URLs and relevance text
4. **Create ~300+ instance references** for all truly multi-cited references
5. **Generate PERFECTED_decisions.txt** with proper instance coverage
6. **Deliver production quality framework** - automated scoring code

---

## KEY FILES IN REPOSITORY

**Core Inputs:**
- `250916CaughtInTheAct.docx` - Full manuscript (2.3MB)
- `decisions.txt` - Current production (299 refs: 288 parent + 11 instances from V1)
- This file (`WEB_SESSION_V2_KICKOFF.md`) - Corrected specifications

**V1 Deliverables (for reference only):**
- Files in branch `claude/manuscript-analysis-instance-expansion-011CUzdJdDS5fpqCqZiFYbXE`
- These had the ranged citation bug - use as reference but re-do Phase 1

---

## PHASE 1: CORRECTED Citation Instance Mapping

**Goal:** Accurately map ALL manuscript citations with range expansion

**CRITICAL IMPLEMENTATION:**

```python
def extract_citations_from_text(text):
    """Extract all citations, expanding ranges to individual references"""
    import re
    from collections import Counter

    # Find all citation patterns: [102] or [107-117]
    citation_patterns = re.findall(r'\[(\d+(?:-\d+)?)\]', text)

    citation_counts = Counter()

    for citation in citation_patterns:
        if '-' in citation:
            # CRITICAL: Expand ranged citation
            start, end = map(int, citation.split('-'))
            for ref_num in range(start, end + 1):
                citation_counts[str(ref_num)] += 1
        else:
            citation_counts[citation] += 1

    return citation_counts

# Usage
full_text = extract_manuscript_text()
citation_counts = extract_citations_from_text(full_text)

# Now we get accurate counts:
# [107]: 5 citations (from multiple uses including [107-117] range)
# [118]: 4 citations (from multiple uses including [118-121] range)
# etc.
```

**Expected Results:**
- **Total unique refs cited:** ~337
- **Refs with 1x citation:** ~35
- **Refs with 2x citation:** ~70
- **Refs with 3+ citations:** ~232
- **Total refs needing instances:** ~302 (2+ citations)
- **Total instance references to create:** ~400-500 (each additional citation = instance)

**Example Multi-Citation Reference:**
```
Reference [305]: 7 citations in manuscript
→ Create 6 instances: [305.1], [305.2], [305.3], [305.4], [305.5], [305.6]

Reference [102]: 5 citations in manuscript
→ Create 4 instances: [102.1], [102.2], [102.3], [102.4]
```

---

## OUTPUT FORMAT REQUIREMENTS ⭐ CRITICAL

**SINGLE-LINE FORMAT MANDATORY**

Each reference MUST be exactly one line with NO internal linefeeds.

**Parent Reference Format:**
```
[102] Kraus, S. (2000). Televised Presidential Debates and Public Policy (2nd ed.). Routledge. Relevance: [original relevance text] FLAGS[FINALIZED] PRIMARY_URL[https://...] SECONDARY_URL[https://...]
```

**Instance Reference Format:**
```
[102.1] Kraus, S. (2000). Televised Presidential Debates and Public Policy (2nd ed.). Routledge. Relevance: Context-specific relevance for this manuscript usage. [Context: evidence, background] FLAGS[INSTANCE BATCH_v17.2 WEB_CREATED] PARENT_RID[102] INSTANCE_NUMBER[1] PRIMARY_URL[https://...] SECONDARY_URL[https://...]
```

**Format Rules:**
- ✅ One reference per line
- ✅ NO line breaks within reference
- ✅ All fields space-separated on same line
- ✅ Maximum ~1000 characters per line (soft limit)
- ❌ NO multi-line format like V1 used
- ❌ NO "Bibliographic:" label prefix
- ❌ NO "Parent RID:" prefix
- ❌ NO "Manuscript Context:" multi-line blocks

**Required Fields for Instances:**
- `[RID]` - Instance ID with dot notation (e.g., `[102.1]`)
- Bibliographic data (Author, Year, Title, Publisher, ISBN/DOI)
- `Relevance:` - Context-specific description
- `[Context: ...]` - Usage type (evidence, background, critique, etc.)
- `FLAGS[INSTANCE BATCH_v17.2 WEB_CREATED]`
- `PARENT_RID[###]` - Link to parent
- `INSTANCE_NUMBER[#]` - Sequential number
- `PRIMARY_URL[...]` - Same as parent (shared source)
- `SECONDARY_URL[...]` - UNIQUE per instance (context-specific)

---

## PHASE 2-5: Same as V1 with Corrections

Use the same quality pattern extraction, URL enhancement, and validation from V1, but with corrected instance data.

**Phase 2:** Quality Pattern Learning (400-600 searches)
**Phase 3:** Differential Processing (finalized preserved, unfinalized enhanced)
**Phase 4:** Instance Creation (1,000-1,500 searches for ~400-500 instances)
**Phase 5:** Production Framework Validation (300-500 searches)

---

## DELIVERABLES REQUIRED

### 1. PERFECTED_decisions.txt (SINGLE-LINE FORMAT)

**Expected Content:**
- 288 parent references (preserved or enhanced)
- ~400-500 instance references (**NOT 11!**)
- Total: ~700-800 references
- Format: 100% single-line (one reference per line, NO linefeeds)

### 2. Production_Quality_Framework.py

URLQualityScorer and ContextAwareRanker with discovered selection criteria.

### 3. Context_Analysis_Report.md

**Must include:**
- Corrected citation distribution (with range expansion)
- Breakdown of 302 multi-cited references
- Top 20 most-cited references (e.g., [305]: 7 citations)
- Chapter-by-chapter instance breakdown

### 4. Relevance_Text_Improvement_Report.md

Quality metrics for ~400-500 instances.

### 5. COMPREHENSIVE_SESSION_SUMMARY.md

Final report with corrected statistics.

### 6. WEB_SESSION_V2_CORRECTIONS.md

Document comparing V1 vs V2 results:
- V1: 11 instances (ranged citations not expanded)
- V2: ~400-500 instances (ranged citations correctly expanded)
- Impact on URL selection quality
- Lessons learned

---

## CRITICAL SUCCESS METRICS

**Citation Accuracy:**
- ✅ All ranged citations `[X-Y]` expanded to individual refs
- ✅ ~302 refs identified with 2+ citations (not 11!)
- ✅ ~400-500 instance references created
- ✅ Top refs like [305] get 6 instances (7 citations - 1 parent)

**Format Compliance:**
- ✅ 100% single-line format
- ✅ NO multi-line instance references
- ✅ All fields on one line per reference
- ✅ iPad app can parse immediately without conversion

**URL Quality:**
- ✅ Parent references: Best URLs selected from quality patterns
- ✅ Instance secondaries: Unique per instance, context-matched
- ✅ No duplicate secondary URLs within parent+instances
- ✅ All meet discovered quality criteria (DOI preferred, .edu, etc.)

---

## SESSION STARTUP CHECKLIST

Before starting Phase 1:
- [ ] Clone repository: `git clone https://github.com/fergidotcom/reference-refinement.git`
- [ ] Verify manuscript: `250916CaughtInTheAct.docx` (2.3MB)
- [ ] Load decisions.txt: 299 references (ignore V1 instances, will replace)
- [ ] **CRITICAL:** Implement ranged citation expansion in Phase 1 parser
- [ ] Test expansion: `[107-117]` → 11 individual refs counted
- [ ] Verify citation counts match expected (~302 multi-cited refs)
- [ ] Set up web search: 2,000-3,000+ searches available
- [ ] Confirm single-line output format for ALL references

---

## V1 vs V2 Comparison

| Metric | V1 (Incorrect) | V2 (Corrected) |
|--------|----------------|----------------|
| Citation parsing | Exact matches only | Ranges expanded |
| Multi-cited refs found | 11 | ~302 |
| Instance refs created | 11 | ~400-500 |
| Total output size | 299 refs | ~700-800 refs |
| Format | Multi-line instances | 100% single-line |
| Top reference instances | [102]: 1 instance | [305]: 6 instances |

---

## WEB SESSION PROMPT

```
I need you to perform a CORRECTED comprehensive manuscript analysis for Reference Refinement.
This is V2 - fixing critical bugs from V1 session.

REPOSITORY: https://github.com/fergidotcom/reference-refinement.git
BRANCH: main

CRITICAL V1 BUG TO FIX:
- V1 didn't expand ranged citations like [107-117] and [118-121]
- V1 found only 11 instances (should be ~400-500)
- V2 MUST expand ranges BEFORE counting citations

START BY:
1. Clone the repository
2. Read WEB_SESSION_V2_KICKOFF.md (this file - complete specifications)
3. Load 250916CaughtInTheAct.docx (manuscript)
4. Load decisions.txt (current 299 refs - 288 parent + 11 V1 instances)
5. Implement CORRECTED Phase 1 with range expansion
6. Verify you find ~302 multi-cited refs (not 11!)

CRITICAL FORMAT REQUIREMENT:
- ALL output MUST be single-line format
- NO multi-line instance references
- Each reference = exactly one line, no linefeeds

Execute all 5 phases with corrections and deliver all 6 required outputs.

Begin by confirming you understand the range expansion fix and expected ~400-500 instances.
```

---

## POST-SESSION INTEGRATION

**Mac Claude Code will:**
- Test PERFECTED_decisions.txt in iPad app v17.1
- Verify ~700-800 references parse correctly
- Confirm all ~400-500 instances display with purple theme
- Deploy to production after validation

**Future Production System will:**
- Integrate URLQualityScorer into batch processor
- Implement ranged citation expansion in all parsers
- Add automated instance creation for new manuscripts
- Enable quality-based auto-finalization

---

**Ready for corrected V2 session with proper instance expansion! 🚀**
