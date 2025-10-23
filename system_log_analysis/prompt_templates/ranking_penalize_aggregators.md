# Ranking Prompt Template: Penalize Aggregator Sites

**Use When:** AI consistently recommends Google Scholar profiles, ResearchGate listings, or other aggregator sites that don't contain the actual work.

**Finding Pattern:**
- AI recommendations include scholar.google.com/citations, researchgate.net, academia.edu
- User always overrides these with direct source URLs
- High override rate specifically for aggregator domains

**File to Update:** `netlify/functions/llm-rank.ts`

**Location in File:** Add explicit aggregator detection and penalties

---

## Template Addition

```typescript
const prompt = `
You are ranking URL candidates for an academic reference.

CRITICAL: Distinguish between DIRECT SOURCES and AGGREGATORS.

AGGREGATORS (penalize heavily):
These are NOT the work itself - they only LIST or LINK to the work:
- scholar.google.com/citations (Google Scholar author profiles)
- researchgate.net/profile or /publication (ResearchGate listings)
- academia.edu (Academia.edu paper pages)
- philpapers.org/rec (PhilPapers catalog entries)
- worldcat.org (library catalog, not the book)
- goodreads.com (book reviews, not the book)

PENALTY FOR AGGREGATORS:
- If URL contains above domains: PRIMARY score = max 40
- Exception: If it's the ONLY option and links to downloadable PDF: PRIMARY score = max 60

DIRECT SOURCES (prioritize):
- Publisher sites with the actual article/book
- Institutional repositories with PDFs
- Author websites hosting the paper
- Government archives with documents
- Library databases with full text

URL ANALYSIS CHECKLIST:
1. Does this URL GO TO the work itself? (high PRIMARY score)
2. Does this URL just MENTION the work? (low PRIMARY score)
3. Does this URL AGGREGATE many works? (very low PRIMARY score)

EXAMPLES:

❌ BAD (Aggregator):
  URL: https://scholar.google.com/citations?user=ImhakoAAAAAJ
  This is an author profile page, not the article.
  PRIMARY: 30, SECONDARY: 50

✓ GOOD (Direct Source):
  URL: https://apps.dtic.mil/sti/tr/pdf/AD0767426.pdf
  This is the actual PDF of the work.
  PRIMARY: 95, SECONDARY: 85

❌ BAD (Aggregator):
  URL: https://www.researchgate.net/publication/12345_Title
  This is a listing page with citation info, may have PDF behind login.
  PRIMARY: 40, SECONDARY: 60

✓ GOOD (Publisher):
  URL: https://academic.oup.com/book/5336
  This is the publisher's official page for the book.
  PRIMARY: 90, SECONDARY: 90

...rest of prompt
`;
```

---

## Additional Detection Logic

If needed, add domain pattern matching:

```typescript
// In the ranking function, before calling AI:
function penalizeAggregators(candidates) {
  const aggregatorDomains = [
    'scholar.google.com',
    'researchgate.net',
    'academia.edu',
    'philpapers.org',
    'goodreads.com',
    'worldcat.org'
  ];

  return candidates.map(candidate => {
    const domain = new URL(candidate.url).hostname;
    const isAggregator = aggregatorDomains.some(agg => domain.includes(agg));

    if (isAggregator) {
      candidate.metadata = { ...candidate.metadata, isAggregator: true };
    }
    return candidate;
  });
}
```

Then in prompt:
```typescript
${candidates.map(c => `
  URL: ${c.url}
  ${c.metadata?.isAggregator ? '[WARNING: This appears to be an aggregator site]' : ''}
`).join('\n')}
```

---

## Verification Steps

1. **Test on reference that previously had aggregator recommendation**
2. **Check if AI now ranks direct sources higher**
3. **Verify aggregators still appear in results** (as backup options)
4. **Confirm they're ranked lower** (not completely excluded)

---

## Expected Impact

- **Override Rate:** Should decrease by 30-50% for references where aggregators were the issue
- **AI Recommendations:** Shift from profiles to actual works
- **User Satisfaction:** Less frustration with obvious wrong choices

---

## Calibration Notes

**Too Aggressive?** If AI now misses legitimate aggregator uses:
- Reduce penalty from -60 to -40
- Add exception: "If no other option available, aggregator with PDF is acceptable"

**Not Aggressive Enough?** If aggregators still recommended:
- Increase penalty to -80
- Add hard cap: "Aggregators can never score >50 on PRIMARY"
- Consider filtering them out entirely before ranking

---

## Known Edge Cases

**Google Books Preview:**
- Is it an aggregator? Yes (doesn't have full book)
- Should we use it? Only if no better option
- Scoring: PRIMARY 50-60, SECONDARY 70

**ResearchGate with Full PDF:**
- Is it an aggregator? Yes (user-uploaded, not official)
- Should we use it? As secondary/tertiary option
- Scoring: PRIMARY 60, SECONDARY 50 (lower secondary due to unofficial)
