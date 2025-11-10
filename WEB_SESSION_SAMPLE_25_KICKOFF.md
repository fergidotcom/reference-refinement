# WEB SESSION: 25-Reference Sample with Enhanced Quality Framework

**Repository:** https://github.com/fergidotcom/reference-refinement.git
**Branch:** main
**Session Type:** Quality Test - Apply Enhanced Criteria to 25 Unfinalized References
**Expected Duration:** 2-3 hours
**Expected Searches:** 400-600 web searches (25 refs × 16-24 searches each)

---

## MISSION SUMMARY

Apply the **Production_Quality_Framework.py** you developed in Session V1 to enhance 25 unfinalized references as a quality test sample.

**Goal:** Demonstrate URL selection quality using the refined criteria learned from 288 finalized references.

---

## CRITICAL CONTEXT FROM SESSION V1

You previously completed a comprehensive analysis and created:

1. **Production_Quality_Framework.py** ✅ (already in repo)
   - URLQualityScorer with learned domain tier hierarchy
   - DOI preferred (95), .edu (85), publishers (80), purchase (60)
   - Content type modifiers (DOI link +10, PDF +5)
   - Relationship type scoring for secondaries
   - Auto-finalize threshold: 85+ score

2. **Quality Patterns Discovered** ✅
   - Primary URLs: 28% DOI links, 100% coverage
   - Secondary URLs: Reviews (95) > Scholarly (90) > Reference (85)
   - Preference: DOI > .edu > gov > archive.org > publishers > purchase

3. **Search Strategy** ✅
   - 8 queries per reference (4 primary-focused, 4 secondary-focused)
   - Primary queries: 75% free full-text, 25% publisher fallback
   - Secondary queries: 75% work-specific reviews, 25% topic discussions

---

## SESSION OBJECTIVES

### 1. Select 25 Unfinalized References
- Start with first 25 unfinalized references in decisions.txt (sorted by RID)
- These are references that currently have:
  - ❌ No URLs, OR
  - ❌ Poor quality URLs (purchase pages, non-scholarly), OR
  - ❌ Missing secondary URLs

### 2. Apply Enhanced Quality Framework
For each of the 25 references:
1. **Generate 8 search queries** using Session V1 strategy
2. **Search Google** for top 20-25 candidates per reference
3. **Score ALL candidates** using Production_Quality_Framework.py
4. **Select best primary URL** (score ≥ 75, prefer ≥ 85)
5. **Select best secondary URL** (unique, score ≥ 70, prefer ≥ 85)
6. **Flag as WEB_SAMPLE25** (so user can identify them)

### 3. Demonstrate Quality Improvements
- Show before/after URL comparison
- Display quality scores for selected URLs
- Prove the framework works in production

---

## KEY FILES IN REPOSITORY

**Input Files:**
- `decisions.txt` - Original 288 refs (150 finalized, 138 unfinalized)
- `Production_Quality_Framework.py` - Your quality scoring system (already present)

**Expected Output Files:**
- `SAMPLE25_decisions.txt` - Enhanced version with 25 refs updated
- `SAMPLE25_QUALITY_REPORT.md` - Before/after comparison with scores
- `SAMPLE25_SEARCH_LOG.json` - Search queries and candidates evaluated

---

## SAMPLE SELECTION CRITERIA

**Select first 25 unfinalized references** (by RID number, ascending)

Example RIDs to process (actual list depends on current decisions.txt):
- If unfinalized refs start at RID 10, process [10-34]
- If unfinalized refs scattered, take first 25 by RID order

**DO NOT PROCESS:**
- Finalized references (FLAGS[FINALIZED])
- References that already have both primary + secondary URLs with scores ≥ 85

---

## ENHANCED QUALITY FRAMEWORK APPLICATION

### Step 1: Load Quality Framework
```python
from Production_Quality_Framework import URLQualityScorer

scorer = URLQualityScorer()
```

### Step 2: Generate Queries (8 per reference)
Use Session V1 strategy:
- **Primary-focused (4 queries):**
  - Q1-Q3: Free full-text (PDF, .edu, archive.org, ResearchGate)
  - Q4: Publisher/purchase fallback
- **Secondary-focused (4 queries):**
  - Q5-Q7: Reviews/analyses of THIS SPECIFIC WORK
  - Q8: Topic discussion (broader context)

### Step 3: Search & Collect Candidates
- Google Custom Search: 20-25 results per reference
- Total candidates: ~500-625 URLs for 25 references

### Step 4: Score ALL Candidates
```python
for url in candidates:
    primary_score = scorer.score_primary_url(url, biblio_data)
    secondary_score = scorer.score_secondary_url(url, parent_primary_url, biblio_data)

    print(f"URL: {url}")
    print(f"  Primary: {primary_score.total_score}/100 ({primary_score.domain_tier})")
    print(f"  Secondary: {secondary_score.total_score}/100 ({secondary_score.relationship_type})")
```

### Step 5: Select Best URLs

**Primary Selection Logic:**
1. Score all candidates as primary
2. Sort by score (high to low)
3. Select top URL with score ≥ 75 (prefer ≥ 85)
4. If no URL ≥ 75, select best available and flag for human review

**Secondary Selection Logic:**
1. Score all candidates as secondary (excluding selected primary)
2. Filter for relationship types: review, scholarly_discussion, reference, archive
3. Sort by score (high to low)
4. Select top URL with score ≥ 70 (prefer ≥ 85)
5. Ensure uniqueness (different from primary)

---

## OUTPUT FORMAT REQUIREMENTS

### SAMPLE25_decisions.txt Format

**Enhanced references get WEB_SAMPLE25 flag:**

```
[115] Author, A. (2020). Title. Publisher. Relevance: Short 150-200 char description. FLAGS[WEB_SAMPLE25 BATCH_v17.2] PRIMARY_URL[https://doi.org/...] SECONDARY_URL[https://jstor.org/...]
```

**Unmodified references stay exactly the same.**

**Format Rules:**
- ✅ Single-line format (no internal linefeeds)
- ✅ Relevance text: 150-200 characters max
- ✅ FLAGS[WEB_SAMPLE25 BATCH_v17.2] for all 25 enhanced refs
- ✅ All other 263 references unchanged

---

## SAMPLE25_QUALITY_REPORT.md Format

For each of the 25 references, document:

### Reference [RID]: Title

**BEFORE:**
- Primary URL: [url or "NONE"]
- Secondary URL: [url or "NONE"]
- Issues: [why it needed enhancement]

**AFTER:**
- Primary URL: [new url]
  - Score: 92/100
  - Domain: doi.org (tier1_doi)
  - Content: DOI link (+10)
  - Reasoning: Persistent identifier, stable, scholarly
- Secondary URL: [new url]
  - Score: 95/100
  - Relationship: review
  - Domain: jstor.org (tier1_jstor)
  - Reasoning: Academic review analyzing this specific work

**Improvement:**
- Primary: NONE → DOI (92/100) ✅
- Secondary: NONE → JSTOR Review (95/100) ✅
- Auto-finalize: NO (requires human confirmation)

**Search Summary:**
- Queries: 8 (4 primary, 4 secondary)
- Candidates: 22 URLs evaluated
- Best primary: 92/100
- Best secondary: 95/100

---

## SUCCESS CRITERIA

**URL Quality:**
- ✅ All 25 references have primary URL (score ≥ 75)
- ✅ At least 20/25 have secondary URL (score ≥ 70)
- ✅ At least 15/25 have URLs scoring ≥ 85 (high quality)
- ✅ No purchase pages unless no better option exists

**Framework Validation:**
- ✅ Production_Quality_Framework.py correctly scores all URLs
- ✅ Scores correlate with URL quality (DOI > .edu > purchase)
- ✅ Selection logic produces scholarly sources

**Format Compliance:**
- ✅ 100% single-line format
- ✅ All 25 refs flagged with WEB_SAMPLE25
- ✅ iPad app can parse immediately

---

## STARTUP CHECKLIST

Before starting:
- [ ] Clone repository: `git clone https://github.com/fergidotcom/reference-refinement.git`
- [ ] Verify decisions.txt: 288 refs (150 finalized, 138 unfinalized)
- [ ] Verify Production_Quality_Framework.py exists and is functional
- [ ] Identify first 25 unfinalized references by RID
- [ ] Set up web search: 400-600 searches available
- [ ] Confirm single-line output format understanding

---

## WEB SESSION PROMPT (Ready to Copy/Paste)

```
I need you to apply the Production Quality Framework you developed to enhance 25 unfinalized references as a quality demonstration.

REPOSITORY: https://github.com/fergidotcom/reference-refinement.git
BRANCH: main

CONTEXT:
- You previously analyzed 288 finalized references and created Production_Quality_Framework.py
- The framework learned quality criteria: DOI preferred (95), .edu (85), publishers (80)
- Current decisions.txt has 138 unfinalized references needing URL enhancement

YOUR TASK:
1. Load Production_Quality_Framework.py (already in repo)
2. Select first 25 unfinalized references (sorted by RID, ascending)
3. For each reference:
   - Generate 8 search queries (4 primary, 4 secondary)
   - Search Google for 20-25 candidates
   - Score ALL candidates using your URLQualityScorer
   - Select best primary (≥75) and secondary (≥70)
   - Flag with WEB_SAMPLE25 BATCH_v17.2
4. Create SAMPLE25_decisions.txt (288 refs, 25 enhanced)
5. Create SAMPLE25_QUALITY_REPORT.md (before/after with scores)
6. Create SAMPLE25_SEARCH_LOG.json (queries and candidates)

CRITICAL FORMAT:
- Single-line format mandatory (no linefeeds in references)
- Relevance text: 150-200 characters max
- Format: [RID] Biblio. Relevance: ... FLAGS[WEB_SAMPLE25 BATCH_v17.2] PRIMARY_URL[...] SECONDARY_URL[...]

START BY:
1. Clone repo and read WEB_SESSION_SAMPLE_25_KICKOFF.md (this file)
2. Verify Production_Quality_Framework.py loads correctly
3. Identify first 25 unfinalized references
4. Test quality scorer on one reference
5. Proceed with all 25 references

Execute the sample enhancement and deliver all 3 outputs.
```

---

**Ready for quality demonstration with enhanced criteria! 🚀**
