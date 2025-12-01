# For v30.0: Query & Validation Criteria from v18.1/v21.0

**CRITICAL:** When building v30.0, adopt these query generation and URL validation criteria that were finalized in v18.1/v21.0.

---

## 📋 Query Generation Criteria (8-Query Mode)

### Structure:

```
PRIMARY-FOCUSED QUERIES (4 queries):

Q1 (1 query): UNQUOTED TITLE SEARCH
  - Title WITHOUT quotes + author + year + filetype:pdf
  Goal: Broad match allowing flexible word order. Finds documents even when
        title words appear in different order or with minor variations.

Q2-Q3 (2 queries): QUOTED FULL-TEXT SOURCES (free preferred)
  - "Exact title in quotes" + author + site:.edu OR site:.gov (academic repositories)
  - "Exact title in quotes" + site:archive.org OR site:researchgate.net OR site:academia.edu (free archives)
  Goal: Find FREE full-text PDFs or HTML versions. Prioritize open access.

Q4 (1 query): PUBLISHER/PURCHASE PAGE
  - Publisher name + title + author + year
  Goal: Official source where the work can be purchased or previewed.

SECONDARY-FOCUSED QUERIES (4 queries):

Q5-Q7 (3 queries): REVIEWS/ANALYSES OF THIS SPECIFIC WORK
  - Title + "review" + academic journal or scholarly
  - Title + author + "analysis" OR "critique" OR "discussion"
  - Title + author + "summary" OR "overview" + academic context
  Goal: Find scholarly reviews, critiques, or analyses of THIS SPECIFIC WORK (not just the topic).

Q8 (1 query): SCHOLARLY TOPIC ANALYSIS (fallback)
  - Use proper phrases, NOT keyword strings: "scholarly analysis of [key concepts]" OR
    "empirical research on [key concepts]" OR "theoretical frameworks for [key concepts]"
  - Add qualifiers like "peer-reviewed", "academic discussion", "research perspectives"
  Goal: Find academic discussions using complete phrases, not just keyword lists.
```

### Key Principle:

**Q1 MUST be unquoted** - This was missing in "v21.0" batch runs and caused the user to override queries 3 times in a single session. The unquoted title query finds documents with:
- Word order variations
- Minor title differences
- Partial title matches

---

## 🔍 URL Ranking Criteria

### Pre-Scoring Validation (CRITICAL):

```
⚠️ CRITICAL MATCHING RULES - VERIFY BEFORE SCORING:

1. ALWAYS check title AND author match TOGETHER before giving high scores
2. Partial title match + WRONG AUTHOR → MAX SCORE 30 (this is a different work)
3. NO title keywords in URL/title/snippet → MAX PRIMARY SCORE 40 (probably irrelevant)
4. Author name absent from URL/title/snippet → Investigate carefully, likely wrong work

Example validation sequence:
- Step 1: Does the URL/title/snippet contain key words from the reference title?
          If NO → max 40
- Step 2: Does the URL/title/snippet mention the correct author?
          If NO → max 30
- Step 3: Only if BOTH match → proceed with full scoring
```

**Why this matters:** In v18.0, AI gave a PRIMARY SCORE of 95 to a completely irrelevant URL because it skipped title/author validation.

### EPUB Downloads:

```
EPUB DOWNLOADS (max 40):
⚠️ CRITICAL: URLs ending in .epub or containing /epub/ → MAX SCORE 40
⚠️ EPUB files are ebook downloads that require special readers
⚠️ Not accessible directly in browser like PDF/HTML
⚠️ Prefer PDF or HTML versions for better accessibility
⚠️ Example: muse.jhu.edu/book/84763/epub → MAX SCORE 40
```

**Why this matters:** User had to manually reject EPUB downloads because they're not browser-accessible.

### Full Scoring Rules:

Keep all existing v18.1 ranking criteria from `netlify/functions/llm-rank.ts`:
- Language mismatch penalties (non-English domains)
- Quotations/excerpts/anthologies (max 65)
- Reviews vs primary sources (mutual exclusivity)
- Publisher pages vs full text
- News about research (max 55 for coverage)
- Title+author matching requirements

---

## 📌 Implementation Checklist for v30.0

When building v30.0 query and ranking logic:

### Query Generation:
- [ ] Q1 is ALWAYS unquoted title search
- [ ] Q2-Q3 are quoted title searches with site: operators
- [ ] Q4 is publisher/purchase page
- [ ] Q5-Q7 are review/analysis queries
- [ ] Q8 is scholarly topic fallback with complete phrases
- [ ] Queries are 40-120 characters
- [ ] Prioritize free sources over paywalled

### URL Ranking:
- [ ] Validate title match BEFORE scoring (step 1)
- [ ] Validate author match BEFORE scoring (step 2)
- [ ] Only proceed to full scoring if both match
- [ ] EPUB URLs get max score 40
- [ ] Non-English domains get max score 70 (unless snippet shows English)
- [ ] Reviews cannot have high primary scores (mutual exclusivity)
- [ ] Primary sources cannot have high secondary scores (mutual exclusivity)

### Testing:
- [ ] Test with references that have title variations
- [ ] Test with EPUB URLs in candidate set
- [ ] Test with irrelevant URLs (should score < 40)
- [ ] Test with wrong author, right title (should score < 30)
- [ ] Test with no title keywords (should score < 40)

---

## 🎯 Why These Criteria Matter

### User Evidence (Nov 13, 2025 iPad Session):

**Missing Unquoted Title Query:**
- User overrode query generation 3 times
- Specifically noted: "I thought we were going with at least one unquoted title query"
- Shows this pattern is critical for document discovery

**EPUB Downloads:**
- User rejected EPUB recommendation: "we don't want epub downloads"
- EPUB requires special readers, not browser-accessible
- Prefer PDF/HTML for better UX

**Irrelevant URL Rankings:**
- REF [707]: AI gave PRIMARY SCORE 95 to completely unrelated article
- User noted: "The suggested primary is completely irrelevant"
- Shows validation must happen BEFORE scoring

**Suggested Secondary Off-Topic:**
- REF [702]: User noted "Suggested secondary url is not on topic"
- Shows ranking criteria need refinement

---

## 📚 Reference Implementation

**Current implementation locations:**
- iPad app: `index.html` lines 3324-3357 (query generation)
- Batch processor: `batch-processor.js` lines 522-555 (query generation)
- Ranking: `netlify/functions/llm-rank.ts` lines 113-247 (validation + scoring)

**Copy these implementations directly into v30.0** - they're battle-tested with real user feedback.

---

## 🚨 Critical Warning

The batch processor was flagging references with `FLAGS[BATCH_v21.0]` but was actually running v20.0 code without:
- Unquoted title query
- Query evolution strategies

**For v30.0:** Ensure version numbers match actual code logic. Don't flag references with a version unless the code actually implements that version's features.

---

**Last Updated:** November 13, 2025
**Based on:** v18.1 iPad app + v21.0 batch processor
**User Feedback Source:** iPad session log 2025-11-13T22-26-29.txt
