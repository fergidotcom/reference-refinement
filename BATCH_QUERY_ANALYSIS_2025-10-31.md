# Batch Query Generation Analysis

**Date:** October 31, 2025, 2:15 PM
**Issue:** Manual query generation in iPad app produces better results than batch processor
**Analysis By:** Claude Code

---

## 🔍 ISSUE SUMMARY

**User Observation:**
When manually using the iPad app workflow (Generate Queries → Search → Autorank), the results are significantly better than what the batch processor recommends. In several cases, the manual workflow produced excellent URLs that required no overrides, while the batch processor's recommendations needed changes.

**Expected Behavior:**
The batch processor should produce the same quality results as the manual iPad app workflow, since they should be using identical logic.

**Actual Behavior:**
Batch processor recommendations are inferior to manual iPad app workflow.

---

## 🔬 ROOT CAUSE ANALYSIS

### Code Comparison

I compared the query generation prompts between:
1. **iPad App** (index.html, lines 2753-2800)
2. **Batch Processor** (batch-processor.js, lines 460-503)

### CRITICAL DIFFERENCE FOUND

**iPad App Prompt (Standard 8-query mode):**
```javascript
prompt = `You are helping find URLs for an academic reference. Generate 8 search queries using the structured approach below.

REFERENCE:
Title: ${ref.title || 'Unknown'}
Authors: ${ref.authors || 'Unknown'}
Year: ${ref.year || 'Unknown'}
Other Info: ${ref.other || 'None'}

RELEVANCE (why this matters):
${ref.relevance_text || 'No context provided'}

STRUCTURE (follow exactly - 8 queries total, 4 primary + 4 secondary):

PRIMARY-FOCUSED QUERIES (4 queries):
Q1-Q3 (3 queries): FULL-TEXT SOURCES (free preferred)
  - Exact title + author + year + filetype:pdf
  - Title/author + site:.edu OR site:.gov (academic repositories)
  - Title/author + site:archive.org OR site:researchgate.net OR site:academia.edu (free archives)
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
  - Use proper phrases, NOT keyword strings: "scholarly analysis of [key concepts]" OR "empirical research on [key concepts]" OR "theoretical frameworks for [key concepts]"
  - Add qualifiers like "peer-reviewed", "academic discussion", "research perspectives"
  Goal: Find academic discussions using complete phrases, not just keyword lists.

QUERY BEST PRACTICES:
✓ Use exact title in quotes for primary and review queries
✓ Keep queries 40-80 characters (max 120)
✓ Use 1-2 quoted phrases per query max
✓ Prioritize free sources over paywalled

AVOID:
❌ URLs or domain names in queries (except site: operator)
❌ Overly specific jargon combinations
❌ ISBN + publisher + full title together (too specific)

Return ONLY 8 queries, one per line, in order. No labels, categories, or explanations.`;
```

**Batch Processor Prompt (Standard 8-query mode):**
```javascript
return `You are helping find URLs for an academic reference. Generate 8 search queries using the structured approach below.

REFERENCE:
Title: ${ref.title || 'Unknown'}
Authors: ${ref.authors || 'Unknown'}
Year: ${ref.year || 'Unknown'}
Other Info: ${ref.other || 'None'}

RELEVANCE (why this matters):
${ref.relevance_text || 'No context provided'}

STRUCTURE (follow exactly - 8 queries total, 4 primary + 4 secondary):

PRIMARY-FOCUSED QUERIES (4 queries):
Q1-Q3 (3 queries): FULL-TEXT SOURCES (free preferred)
  - Exact title + author + year + filetype:pdf
  - Title/author + site:.edu OR site:.gov (academic repositories)
  - Title/author + site:archive.org OR site:researchgate.net OR site:academia.edu (free archives)
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
  - Use proper phrases, NOT keyword strings: "scholarly analysis of [key concepts]" OR "empirical research on [key concepts]" OR "theoretical frameworks for [key concepts]"
  - Add qualifiers like "peer-reviewed", "academic discussion", "research perspectives"
  Goal: Find academic discussions using complete phrases, not just keyword lists.

IMPORTANT:
- Return ONLY the 8 queries, one per line
- No labels, numbering, or explanations
- Each query should be a Google search string`;
```

### THE DIFFERENCE

**iPad App has ADDITIONAL GUIDANCE** (11 lines) that Batch Processor LACKS:

```javascript
QUERY BEST PRACTICES:
✓ Use exact title in quotes for primary and review queries
✓ Keep queries 40-80 characters (max 120)
✓ Use 1-2 quoted phrases per query max
✓ Prioritize free sources over paywalled

AVOID:
❌ URLs or domain names in queries (except site: operator)
❌ Overly specific jargon combinations
❌ ISBN + publisher + full title together (too specific)
```

**Batch Processor only has:**

```javascript
IMPORTANT:
- Return ONLY the 8 queries, one per line
- No labels, numbering, or explanations
- Each query should be a Google search string
```

---

## 💡 WHY THIS MATTERS

### Impact on Query Quality

The additional guidance in the iPad app helps Claude (the AI) generate better search queries by:

1. **Length Constraints:** "Keep queries 40-80 characters (max 120)"
   - Prevents overly long, over-specified queries that miss results
   - Prevents overly short queries that are too broad

2. **Quotation Usage:** "Use 1-2 quoted phrases per query max"
   - Prevents over-quoting which makes queries too strict
   - Ensures exact title matching where needed

3. **Free Source Priority:** "Prioritize free sources over paywalled"
   - Reinforces the goal of finding accessible content
   - Matches the PRIMARY query structure emphasis

4. **Explicit Avoidance Rules:**
   - "❌ Overly specific jargon combinations" - Prevents queries like "post-broadcast democracy media fragmentation political polarization electoral participation inequality" (too many concepts)
   - "❌ ISBN + publisher + full title together" - Prevents over-specification that finds nothing

### Example of Impact

**Without Guidance (Batch Processor):**
Claude might generate:
```
"Post-Broadcast Democracy: How Media Choice Increases Inequality in Political Involvement and Polarizes Elections" Markus Prior Cambridge University Press 2007 ISBN 9780521675338
```
(Too specific - 150+ characters, too many exact elements, likely finds nothing or only publisher page)

**With Guidance (iPad App):**
Claude generates:
```
"Post-Broadcast Democracy" Prior site:.edu filetype:pdf
```
(Optimal - 48 characters, quoted title, author, targets academic PDFs)

---

## 🔄 WORKFLOW COMPARISON

### iPad App Manual Workflow
1. **Generate Queries** - Uses enhanced prompt with best practices
2. **Search** - Sends queries to Google Custom Search API
3. **Autorank** - Calls llm-rank to score results
4. **Result** - User reviews top recommendations

### Batch Processor Workflow
1. **Generate Queries** - Uses basic prompt WITHOUT best practices
2. **Search** - Sends queries to Google Custom Search API (SAME AS IPAD)
3. **Autorank** - Calls llm-rank to score results (SAME AS IPAD)
4. **Result** - Writes recommendations to decisions.txt

**The ONLY difference is Step 1: Query Generation Prompt**

---

## 📊 OTHER DIFFERENCES CHECKED

### Search Logic
✅ **IDENTICAL**
- Both call `search-google` function with same parameters
- Both iterate through queries individually
- Both deduplicate by URL

**Code Location:**
- iPad app: index.html lines 2884-2944
- Batch processor: batch-processor.js lines 538-572

### Ranking Logic
✅ **IDENTICAL**
- Both call `llm-rank` function with same parameters
- Both pass reference text and candidates
- Both use same model (claude-sonnet-4-20250514)

**Code Location:**
- iPad app: calls `/api/llm-rank` (index.html lines 2946-3060)
- Batch processor: calls `llm-rank` (batch-processor.js lines 575-617)

### URL Selection Logic
✅ **IDENTICAL**
- Both select top primary (highest primary_score ≥75)
- Both select top secondary (highest secondary_score ≥75)
- Both use same scoring thresholds

---

## 🎯 SOLUTION

### Recommendation

**Synchronize the query generation prompts** by copying the iPad app's enhanced prompt to the batch processor.

**Changes Required:**
1. Update `batch-processor.js` lines 460-503
2. Add the "QUERY BEST PRACTICES" and "AVOID" sections
3. Keep everything else identical

**Expected Impact:**
- ✅ Batch processor will generate better queries
- ✅ Better queries → better search results
- ✅ Better search results → better autorank recommendations
- ✅ Reduced override rate (goal: <25%)

**Risk:**
- ⚠️ Minimal - Only changing prompt text, not logic
- ⚠️ Query parsing already handles variations
- ⚠️ May need to test with a small batch (3-5 refs) first

---

## 🧪 VERIFICATION PLAN

### Before Implementation
1. Document current batch processor prompt
2. Identify exact line numbers for changes
3. Create backup of batch-processor.js

### After Implementation
1. Run dry-run with 3-5 references
2. Manually verify queries look better quality
3. Compare with iPad app output for same references
4. Run small batch (5 refs) and check override rate

### Success Criteria
- ✅ Queries generated by batch match iPad app quality
- ✅ Queries are 40-120 characters (mostly)
- ✅ Queries use 1-2 quoted phrases max
- ✅ Queries avoid over-specification
- ✅ Override rate decreases

---

## 📝 IMPLEMENTATION DETAILS

### File to Modify
`batch-processor.js`

### Line Range
Lines 460-503 (function `buildQueryPrompt`)

### Specific Change
Replace the "IMPORTANT:" section (lines 498-502) with the iPad app's "QUERY BEST PRACTICES:" and "AVOID:" sections (lines 2789-2800 from index.html)

**Before (lines 498-502):**
```javascript
IMPORTANT:
- Return ONLY the 8 queries, one per line
- No labels, numbering, or explanations
- Each query should be a Google search string`;
```

**After:**
```javascript
QUERY BEST PRACTICES:
✓ Use exact title in quotes for primary and review queries
✓ Keep queries 40-80 characters (max 120)
✓ Use 1-2 quoted phrases per query max
✓ Prioritize free sources over paywalled

AVOID:
❌ URLs or domain names in queries (except site: operator)
❌ Overly specific jargon combinations
❌ ISBN + publisher + full title together (too specific)

Return ONLY 8 queries, one per line, in order. No labels, categories, or explanations.`;
```

---

## 🔬 ANALYSIS CONCLUSION

**Root Cause:** The batch processor's query generation prompt is missing critical guidance that helps Claude generate high-quality search queries.

**Evidence:**
- iPad app prompt has 11 additional lines of "QUERY BEST PRACTICES" and "AVOID" rules
- Batch processor prompt has only 3 lines of basic instructions
- All other logic (search, ranking, selection) is identical

**Confidence Level:** 🟢 **HIGH**
- Direct code comparison shows clear difference
- User observation confirms iPad app produces better results
- Logic chain is clear: Better prompt → Better queries → Better results

**Recommendation:** Synchronize prompts immediately. This is a simple, low-risk fix that should significantly improve batch processor quality.

---

**Next Step:** Await user approval before implementing the fix.
