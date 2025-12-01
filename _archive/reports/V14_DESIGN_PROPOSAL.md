# v14.0 Design Proposal - Query Generation & Ranking Enhancement

**Status:** Awaiting user approval
**Based on:** System log `session_2025-10-28T01-43-46.txt` analysis
**Date:** October 27, 2025

---

## Problem Statement

**Current behavior (v13.12):**
- Query generation creates 8 generic queries without specific targeting
- Queries are roughly balanced between primary and secondary purposes
- No explicit emphasis on full-text sources vs. publisher pages
- No distinction between "reviews of the work" vs. "discussions of the topic"

**Example from Reference #7 (Searle 2010):**
```
Current queries (8 total):
1. "Making the Social World" Searle 2010 filetype:pdf
2. Searle 2010 "Structure of Human Civilization" Oxford Press
3. John Searle "Making the Social World" site:.edu
4. Searle social reality construction collective agreement
5. "Making the Social World" review academic journal
6. Searle 2010 social construction language meaning
7. John Searle Oxford University Press 2010 civilization
8. Searle social reality patriotism cultural context identity
```

**Result:** Primary recommendation was publisher page (P:95) instead of full-text source

---

## User Requirements

From system log analysis:

> "The searle primary is the best candidate but a full text source would be better. It doesn't have to be pdf but it should not be paywalled. Enhance the query generator to focus on full source in any form (3 queries out of 4) for primaries and reviews or analyses of the reference work for the secondaries (3 of 4)."

**Breakdown:**
1. **PRIMARY URLs:** Emphasize full-text sources (PDF preferred, not paywalled)
2. **Query ratio for primaries:** 3 out of 4 queries targeting full sources, 1 out of 4 for publisher/purchase pages
3. **SECONDARY URLs:** Emphasize reviews/analyses of the specific work
4. **Query ratio for secondaries:** 3 out of 4 queries for reviews of work, 1 out of 4 for topic discussions

---

## Proposed Solution

### **Query Generation Strategy (8 queries total)**

#### **PRIMARY-focused queries (4 queries):**

**Q1-Q3: Full-text source queries (3 queries)**
- Query 1: PDF search with exact title + author + year + filetype:pdf
- Query 2: .edu/.gov site search for academic hosting
- Query 3: Free archive search (archive.org, ResearchGate, Academia.edu)

**Examples:**
```
Q1: "Making the Social World" Searle 2010 filetype:pdf
Q2: John Searle "Making the Social World" site:.edu OR site:.gov
Q3: Searle "Making the Social World" 2010 site:archive.org OR site:researchgate.net OR site:academia.edu
```

**Q4: Publisher/purchase page query (1 query)**
- Query 4: Publisher name + title + year (to find official purchase page)

**Example:**
```
Q4: Oxford University Press "Making the Social World" Searle 2010
```

---

#### **SECONDARY-focused queries (4 queries):**

**Q5-Q7: Reviews/analyses of the work (3 queries)**
- Query 5: Title + "review" + academic journal
- Query 6: Title + author + "analysis" OR "critique"
- Query 7: Title + author + "summary" OR "overview" + academic context

**Examples:**
```
Q5: "Making the Social World" Searle review academic journal
Q6: "Making the Social World" Searle 2010 analysis critique philosophy
Q7: Searle "Making the Social World" summary overview social ontology
```

**Q8: Topic discussion query (1 query)**
- Query 8: Key concepts from title + relevance text (for topic-related material)

**Example:**
```
Q8: Searle social reality construction collective intentionality institutional facts
```

---

### **Ranking Criteria Updates**

Update the ranking prompt in `llm-rank.ts` to align with new query priorities:

**PRIMARY SCORE (0-100):**
```
1. FREE full-text source (PDF/HTML from .edu/.gov/archive.org): 95-100
2. FREE full-text source (PDF/HTML from other domains): 85-95
3. Paywalled full-text source or publisher page with preview: 70-85
4. Publisher/purchase page (official source): 60-75
5. Review/citation of the work (not the source itself): 35-55
6. Wrong work or unrelated: 0-30
```

**Key change:** Demote paywalled sources and publisher pages below free full-text

**SECONDARY SCORE (0-100):**
```
1. Scholarly review/analysis of THIS SPECIFIC WORK (title appears): 90-100
2. Academic discussion/critique of THIS SPECIFIC WORK: 75-90
3. Analysis of same concepts/ideas (if no specific reviews available): 55-70
4. Related work by same author: 35-50
5. Different work, different author: 0-30
```

**Key change:** More granular distinction between work-specific vs. topic-general

---

## Implementation Plan

### **Phase 1: Backend Changes**

**File:** `netlify/functions/llm-chat.ts` (query generation)

**Current prompt structure:**
```typescript
const prompt = `Generate 8 search queries for: "${title}" by ${authors} (${year})
- Use diverse approaches
- Include filetype:pdf, site:.edu, publisher name
- Generate review/analysis queries
...`
```

**New prompt structure:**
```typescript
const prompt = `Generate 8 search queries for: "${title}" by ${authors} (${year})

STRUCTURE (IMPORTANT - follow exactly):

PRIMARY-FOCUSED (4 queries):
Q1-Q3 (3 queries): Full-text sources (free PDF/HTML preferred)
  - Use filetype:pdf, site:.edu, site:.gov, site:archive.org, site:researchgate.net
  - Prioritize free/open access sources
  - Exact title in quotes + author + year

Q4 (1 query): Publisher/purchase page
  - Publisher name + title + year
  - Official source for purchase information

SECONDARY-FOCUSED (4 queries):
Q5-Q7 (3 queries): Reviews/analyses of THIS WORK
  - Include "review", "analysis", "critique", "summary"
  - Must reference the specific work, not just the topic
  - Academic/scholarly context preferred

Q8 (1 query): Topic discussions
  - Key concepts from title/relevance text
  - Broader topic exploration if no work-specific reviews exist

Return queries in order Q1-Q8.`
```

---

**File:** `netlify/functions/llm-rank.ts` (ranking)

Update the ranking criteria as shown in "Ranking Criteria Updates" section above.

---

### **Phase 2: Frontend Changes (Minor)**

**File:** `index.html`

**Change 1: Add RID to edit window header**
```javascript
// Current:
<h2>Edit Reference</h2>

// New:
<h2>Edit Reference [${ref.id}]</h2>
```

**Change 2: Update query generation prompt** (calls llm-chat.ts)
- No changes needed - backend handles new structure

---

### **Phase 3: Testing Strategy**

**Test cases:**
1. **Reference #7 (Searle 2010)** - Re-run to verify full-text PDF prioritized over OUP page
2. **Reference #5 (Tversky & Kahneman 1974)** - Verify free PDF beats publisher page
3. **Reference with no free sources** - Verify graceful fallback to publisher page
4. **Obscure reference** - Verify topic queries (Q8) work when no reviews exist

**Expected outcomes:**
- Primary URLs: Free full-text sources ranked 95-100
- Secondary URLs: Reviews of the work ranked 90-100
- Publisher pages: Appropriate for Primary if no free source exists (60-75 range)

---

## Migration Notes

**Version bump:** v13.12 → v14.0 (major query strategy change)

**Backward compatibility:**
- Existing decisions.txt files: No impact
- Existing queries: Will be regenerated with new strategy when user clicks "Generate Queries"
- Existing rankings: Will be re-ranked with new criteria when user clicks "Autorank"

**Deployment:**
```bash
# Copy new version to index.html
cp rr_v14X.html index.html

# Deploy
netlify deploy --prod --dir="." --message "v14.0 - Redesigned query generation (3:1 ratio for primary/secondary)"
```

---

## Open Questions for User

1. **Query count:** Keep at 8 total (4 primary-focused + 4 secondary-focused)?
   - Alternative: Increase to 12 (6+6) for more coverage?

2. **Free source emphasis:** Should we COMPLETELY exclude paywalled sources, or just deprioritize them?
   - Current proposal: Deprioritize (70-85 range) but don't exclude

3. **Publisher pages:** Should Q4 always search for publisher page, or only if primary queries fail?
   - Current proposal: Always include Q4 as one of the 8 queries

4. **Archive.org vs ResearchGate:** Priority order for Q3?
   - Current proposal: Equal weighting (OR search)

5. **Topic fallback (Q8):** Should this be adaptive based on whether Q5-Q7 find reviews?
   - Current proposal: Always include Q8, let ranking decide relevance

---

## Success Metrics

**After v14.0 deployment:**
- % of references with free full-text primary URLs should increase
- % of overrides on autorank recommendations should decrease
- User satisfaction with secondary URLs (reviews) should improve

**Tracking:**
- Monitor override decisions in session logs
- Compare P/S scores before and after for same reference types

---

## Summary

**Core change:** Shift from generic "8 diverse queries" to structured "3:1 ratio within primary/secondary purposes"

**Benefits:**
1. More free full-text sources found
2. Better distinction between work-specific reviews vs. topic discussions
3. Predictable query structure (easier to debug)
4. Aligns ranking criteria with query intent

**Risk:** May reduce diversity if all 3 primary queries fail (but Q4 provides fallback to publisher page)

---

**Ready for user approval?** Please review and confirm before implementation.
