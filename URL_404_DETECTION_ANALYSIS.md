# URL 404 Detection Issue Analysis

**Date:** October 31, 2025
**Issue:** Batch processor and autorank recommend URLs that return 404 errors
**Status:** Root cause identified, solution designed

---

## Problem Summary

The batch processor and autorank feature sometimes recommend URLs that:
- **Look structurally valid** (.edu domains, PDF paths, scholarly appearance)
- **Appear in Google search results** (Google found them)
- **Have good metadata** (titles, snippets match the reference)
- **But return 404 errors** when actually accessed (page not found)

This is NOT a retrieval failure (server down) but a **broken link** - the site responds but doesn't have the document.

---

## Evidence

### Session Log (2025-11-01T02-55-57.txt)
User notes mention two specific cases:

1. **RID 222** (Anderson, "Imagined Communities"):
   - "suggested another full text primary but the host site did not find the paper, like several others"

2. **RID 248** (Pariser, "The Filter Bubble"):
   - "had an inaccessible site, when there were others that the iPad suggest, search and Autorank got right"

### Screenshot Evidence
`404  University of Kentucky.png` shows:
- University of Kentucky website (uky.edu)
- "Page not found" error
- Site responds normally but document doesn't exist at that URL

---

## Root Cause Analysis

### Current Workflow
1. Google Custom Search returns candidate URLs with metadata (title, snippet, domain)
2. LLM ranks candidates based on:
   - URL structure (domain authority, path patterns)
   - Metadata quality (title match, snippet relevance)
   - Domain type (.edu, .gov, .org)
3. **NO VALIDATION** that URL actually returns 200 OK
4. Broken links rank highly if metadata looks good

### Why This Happens
- **Dead links persist in Google index** - URLs that once worked but are now 404
- **Moved content** - Document relocated, old URL doesn't redirect
- **Incorrect indexing** - Google thinks URL has content it doesn't
- **Temporary content** - Conference papers, drafts removed after publication

---

## Impact

### User Experience
- High-scoring recommendations (P:95+) fail when clicked
- User must manually test URLs and find alternatives
- Reduces trust in AI recommendations
- Increases manual override rate

### Data Quality
- References saved with broken URLs
- Batch processor finalizes with invalid primaries
- Manual cleanup required later

---

## Existing Infrastructure

### URL Resolution Function EXISTS
File: `netlify/functions/resolve-urls.ts`

```typescript
const r = await fetch(input, { method: "HEAD", redirect: "follow" });
const final = r.url;
const type = (r.headers.get("content-type") || "").includes("pdf") ||
             final.toLowerCase().endsWith(".pdf") ? "pdf" : "html";
out.push({ input, final, type, status: r.status });
```

**Capabilities:**
- Makes HEAD request to URL
- Follows redirects
- Returns HTTP status code (200, 404, 403, 500, etc.)
- Detects content type (PDF vs HTML)
- Returns final URL after redirects

**BUT:** This function is NOT used by:
- ❌ Batch processor
- ❌ LLM ranking function (llm-rank.ts)

---

## Solution Design

### Phase 1: Batch Processor URL Validation

**Add validation step AFTER ranking, BEFORE finalization:**

```javascript
// After ranking candidates
const topCandidates = ranked.slice(0, 10); // Top 10 candidates

// Validate URLs
const validated = await validateUrls(topCandidates);

// Filter out failures
const working = validated.filter(c =>
  c.status >= 200 && c.status < 400 // Success or redirect
);

// If top candidate is 404, pick next best working URL
const bestPrimary = working.find(c => c.primaryScore >= 75) || working[0];
```

**Benefits:**
- Catches 404s before recommendation
- Falls back to next-best working URL
- Prevents finalizing with broken links

### Phase 2: LLM Ranking Penalty

**Update llm-rank.ts to validate AND penalize broken URLs:**

```typescript
// After getting candidates, validate them
const validationResults = await validateCandidates(candidates);

// Add validation status to candidate metadata
const enrichedCandidates = candidates.map((c, i) => ({
  ...c,
  httpStatus: validationResults[i].status,
  accessible: validationResults[i].status >= 200 && validationResults[i].status < 400
}));

// Include in ranking prompt
const prompt = `
...
Candidate accessibility:
${enrichedCandidates.map(c =>
  `${c.url}: ${c.accessible ? '✓ Accessible' : '❌ ' + c.httpStatus}`
).join('\n')}

CRITICAL: URLs returning 404, 403, or 500 should receive PRIMARY and SECONDARY scores of 0.
`;
```

**Benefits:**
- AI knows which URLs actually work
- Broken links automatically scored 0
- No manual filtering needed

### Phase 3: Smart Caching

**Cache validation results to avoid redundant checks:**

```javascript
const urlCache = new Map(); // URL -> {status, timestamp}

async function validateWithCache(url) {
  const cached = urlCache.get(url);
  if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour
    return cached;
  }

  const result = await validateUrl(url);
  urlCache.set(url, { ...result, timestamp: Date.now() });
  return result;
}
```

**Benefits:**
- Faster batch processing
- Reduces API calls
- Same URL validated once per session

---

## Implementation Priority

### CRITICAL (Implement Now)
1. ✅ Add URL validation to batch processor
2. ✅ Filter out 404s before finalization
3. ✅ Fall back to next-best working URL

### HIGH (Next Sprint)
1. Update llm-rank.ts with validation
2. Pass status to AI for informed ranking
3. Add caching to reduce redundant checks

### NICE TO HAVE (Future)
1. Retry failed URLs after delay (temporary failures)
2. Check for soft-404s (200 but error page)
3. Validate content-type matches expectation

---

## Testing Plan

### Test Cases

**RID 222** - Anderson, "Imagined Communities"
- Current: Recommends URL that 404s
- Expected: Skip 404, find next working URL

**RID 248** - Pariser, "The Filter Bubble"
- Current: Recommends inaccessible site
- Expected: Validate accessibility, pick working alternative

### Validation
1. Re-run batch processor with validation enabled
2. Check that no 404 URLs are recommended
3. Verify working URLs ranked higher than broken ones
4. Confirm manual override rate decreases

---

## Success Metrics

- **Manual override rate:** Target <10% (currently ~25-50%)
- **404 recommendations:** Target 0 (currently 2+ per batch)
- **User confidence:** Fewer "host site did not find paper" reports
- **Batch quality:** Higher percentage of working URLs

---

## Related Files

- `batch-processor.js` - Main batch processing logic
- `netlify/functions/llm-rank.ts` - AI ranking function
- `netlify/functions/resolve-urls.ts` - URL validation (underutilized!)
- `index.html` - iPad app (uses resolve-urls correctly)

---

## Next Steps

1. ✅ Create this analysis document
2. ⏳ Implement URL validation in batch-processor.js
3. ⏳ Add fallback logic for 404s
4. ⏳ Test with problematic references
5. ⏳ Update llm-rank.ts if needed
6. ⏳ Deploy and monitor results
