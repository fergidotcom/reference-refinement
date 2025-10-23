# Query Generation Prompt Template: Remove Ineffective Patterns

**Use When:** Analysis shows high percentage of queries returning 0 results.

**Finding Pattern:**
- 10+ queries consistently return 0 results
- Queries are too specific (multiple ISBN + DOI + exact phrase)
- Queries contain URLs or special characters that don't work in search

**File to Update:** `netlify/functions/llm-chat.ts`

**Location in File:** Within query generation prompt, add constraints section

---

## Template Addition

```typescript
const prompt = `
Generate 10-15 diverse search queries for finding this reference online.

PROVEN EFFECTIVE PATTERNS:
1. "Exact Title" Author Year filetype:pdf
2. Author Year "key phrase from title" site:.edu
3. Author "publication venue" Year PDF
4. "Exact Title" Author publisher review
5. Author CV biography "title keyword"

AVOID (these patterns consistently return 0 results):
1. ❌ Queries combining ISBN + DOI + exact title (too specific)
   Bad: ISBN 9780262011723 DOI 10.1234/example "Exact Title"
   Good: "Exact Title" Author Year filetype:pdf

2. ❌ URLs or Spotify links as queries
   Bad: https://open.spotify.com/show/...
   Good: "Title" Author podcast interview

3. ❌ Overly long phrases (>100 characters)
   Bad: "This is a very long exact title with many specific words that probably won't match"
   Good: "Key Title Words" Author Year

4. ❌ Multiple quoted phrases in one query (too restrictive)
   Bad: "phrase one" "phrase two" "phrase three" author
   Good: "main phrase" author year context

5. ❌ Special characters that break search engines
   Bad: Author "Title: With Special Characters & Symbols"
   Good: Author "Title With Special Characters Symbols"

QUERY LENGTH GUIDELINES:
- Optimal: 40-80 characters
- Maximum: 120 characters
- Use quotes sparingly (1-2 phrases per query max)

BALANCE SPECIFICITY:
- Start with high-specificity queries (exact title + author)
- Include medium-specificity (author + year + keywords)
- Add broad queries (author name + general topic)

...rest of prompt
`;
```

---

## Specific Removals Based on Analysis

If analysis identified specific failing patterns, add them explicitly:

```typescript
// Example from your test batch analysis:
KNOWN INEFFECTIVE PATTERNS (remove from generation):
- Spotify podcast URLs
- ISBN queries without other context: "ISBN 9780803985735"
- Overly academic jargon: "tangible aspects existence biological"
```

---

## Verification Steps

1. **Generate queries for test reference**
2. **Run searches manually** to verify 0-result rate decreased
3. **Compare with previous batch:** Did unique results increase?
4. **Check query effectiveness** in next analysis

---

## Expected Impact

- **Ineffective Queries:** Should drop from 15-20% to <10%
- **Total Unique Results:** Should increase by 10-20%
- **Query Efficiency:** More results per query
- **Override Rate:** Indirect impact (better results = better AI recommendations)

---

## If No Improvement

Check if:
1. Constraints are too restrictive (limiting creativity)
2. Effective patterns are too narrow (only works for certain reference types)
3. Need reference-type-specific query strategies (books vs articles vs old works)
