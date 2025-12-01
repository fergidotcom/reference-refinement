# Soft 404 Detection - Technical Analysis

**Date:** October 31, 2025
**Issue Type:** Soft 404 (HTTP 200 but content indicates "not found")

---

## What is a Soft 404?

A "soft 404" occurs when:
- ✅ HTTP status code is 200 (OK)
- ✅ Server responds successfully
- ❌ Page content says "document not found" / "page not found" / "not available"
- ❌ Actual document is not there

### Why Sites Do This
- Better user experience (friendly error page vs browser error)
- SEO reasons (avoid 404s in search rankings)
- Legacy systems that can't return proper HTTP codes
- Dynamic systems that generate "not found" pages

### Common on .edu Sites
University repositories, library systems, and academic archives often:
- Generate custom "document not available" pages
- Return 200 status for all requests
- Display helpful "search our catalog" pages instead of errors

---

## Detection Challenges

### HTTP-Level Checks (Won't Work)
```javascript
const response = await fetch(url, { method: 'HEAD' });
console.log(response.status); // Returns 200 - looks fine!
```

This gives **false positive** - URL appears valid but isn't.

### Need Content Analysis
Must actually fetch and examine page content:

```javascript
const response = await fetch(url);
const html = await response.text();

// Check for error indicators
const isSoft404 =
  html.toLowerCase().includes('page not found') ||
  html.toLowerCase().includes('document not available') ||
  html.toLowerCase().includes('not found') ||
  html.toLowerCase().includes('error 404') ||
  html.length < 1000; // Very small pages often errors
```

---

## Detection Strategies

### Level 1: HTTP Status (Easy, catches ~30%)
```javascript
if (status === 404 || status === 403 || status >= 500) {
  return { valid: false, reason: 'HTTP error' };
}
```

### Level 2: Content-Type Check (Catches ~20%)
```javascript
const contentType = response.headers.get('content-type');
if (url.endsWith('.pdf') && !contentType.includes('pdf')) {
  return { valid: false, reason: 'Expected PDF, got HTML' };
}
```

### Level 3: Soft 404 Detection (Catches ~40%)
```javascript
// Only for non-PDF responses
if (!contentType.includes('pdf')) {
  const html = await response.text();
  const errorPatterns = [
    /page not found/i,
    /document not found/i,
    /not available/i,
    /404 error/i,
    /cannot find/i,
    /does not exist/i
  ];

  for (const pattern of errorPatterns) {
    if (pattern.test(html)) {
      return { valid: false, reason: 'Soft 404 detected' };
    }
  }
}
```

### Level 4: Content-Length Heuristic (Catches ~10%)
```javascript
const contentLength = response.headers.get('content-length');
if (contentLength && parseInt(contentLength) < 1000) {
  // Real academic pages are usually >1KB
  // Error pages are often very small
  return { valid: false, reason: 'Suspiciously small page' };
}
```

---

## Implementation Considerations

### Trade-offs

**Full Content Fetch (Comprehensive)**
- ✅ Catches soft 404s
- ✅ Most accurate
- ❌ Slow (must download full HTML)
- ❌ High bandwidth
- ❌ Expensive (50+ candidates × full HTML)

**HEAD Request Only (Fast)**
- ✅ Very fast
- ✅ Low bandwidth
- ✅ Scales well
- ❌ Misses soft 404s
- ❌ Less accurate

**Hybrid Approach (Recommended)**
- Use HEAD request first
- If status 200 and looks like .edu repository:
  - Fetch first 5KB of content
  - Check for error patterns
  - If error found, mark invalid

---

## Proposed Solution

### Phase 1: HEAD + Content-Type (Implement First)
```javascript
async function validateURL(url) {
  try {
    // HEAD request
    const response = await fetch(url, { method: 'HEAD' });

    // Check HTTP status
    if (response.status >= 400) {
      return { valid: false, status: response.status };
    }

    // Check content-type mismatch
    const contentType = response.headers.get('content-type') || '';
    if (url.toLowerCase().endsWith('.pdf')) {
      if (!contentType.includes('pdf')) {
        return { valid: false, reason: 'PDF expected, got HTML (likely error page)' };
      }
    }

    return { valid: true, status: response.status };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

**Catches:**
- Hard 404s ✅
- Connection failures ✅
- Wrong content-type ✅ (many soft 404s)

**Misses:**
- HTML soft 404s ❌
- Small error pages ❌

### Phase 2: Selective Content Check (Future Enhancement)
```javascript
async function validateURLDeep(url) {
  // ... HEAD request checks first ...

  // If HEAD looks OK but URL is .edu repository:
  if (isEduRepository(url) && !url.endsWith('.pdf')) {
    // Fetch first 5KB
    const response = await fetch(url);
    const reader = response.body.getReader();
    const { value } = await reader.read(); // First chunk
    const html = new TextDecoder().decode(value);

    // Check for soft 404 patterns
    if (/page not found|document not available/i.test(html)) {
      return { valid: false, reason: 'Soft 404 detected' };
    }
  }

  return { valid: true };
}
```

---

## URL Pattern Analysis

### High-Risk Patterns (More likely to have soft 404s)
- `*.edu/*/bitstream/*` - DSpace repositories
- `*.edu/handle/*` - Handle servers
- `*.edu/cgi/viewcontent.cgi` - Digital Commons
- `*.edu/etd/*` - Theses/dissertations

### Lower-Risk Patterns
- `doi.org/*` - Usually reliable
- `archive.org/*` - Usually reliable (but check for "borrow" pages)
- `*.pdf` direct links - Usually reliable if content-type matches

---

## Recommended Implementation Order

### Sprint 1 (This Session) ✅
1. Add HEAD request validation
2. Filter out HTTP 404/403/500 errors
3. Check content-type mismatch for PDFs
4. Deploy and test

**Expected Impact:** Catch 50-60% of broken URLs

### Sprint 2 (Next Session)
1. Identify high-risk URL patterns
2. Add selective content checking for those patterns
3. Implement soft 404 pattern matching
4. Deploy and test

**Expected Impact:** Catch 85-90% of broken URLs

### Sprint 3 (Future)
1. Build learning system to identify new soft 404 patterns
2. Add user feedback when URL fails to open
3. Automatically try alternative URLs
4. Deploy and test

**Expected Impact:** Catch 95%+ of broken URLs

---

## Testing Strategy

### Test References
- RID 222 - Anderson, "Imagined Communities" (user reported soft 404)
- RID 248 - Pariser, "The Filter Bubble" (user reported inaccessible)
- Plus any others user encounters during review

### Validation Checklist
1. Does validation catch the University of Kentucky URL?
2. Does it correctly pass working .edu URLs?
3. Is the performance acceptable (< 2sec per URL)?
4. Does it handle timeouts gracefully?

---

## Code Integration Points

### Batch Processor
```javascript
// After ranking (line 235)
const rankings = await callLLMRank(...);

// NEW: Validate top candidates
log.step('3.5', 'Validating top candidate URLs...');
const topCandidates = rankings.slice(0, 20); // Check top 20
const validated = await validateURLs(topCandidates);

// Filter out invalid URLs
const validRankings = validated.filter(r => r.valid);
log.result(`✓ ${validRankings.length}/${rankings.length} URLs validated`);

// Continue with valid rankings only
const topPrimary = validRankings.filter(...);
```

### LLM Rank (Future)
Could pass validation status to AI for better ranking.

---

## Success Metrics

- **Broken URL recommendations:** Target 0 (currently 2+ per batch)
- **False positives:** Target <5% (reject valid URLs)
- **Performance:** Target <500ms per URL validation
- **User satisfaction:** Reduce "host site did not find paper" reports

---

## Notes

- Content-type mismatch is surprisingly effective (many soft 404s return HTML for PDF URLs)
- Full content fetch too expensive for batch processing
- Hybrid approach balances accuracy and performance
- .edu sites are highest priority for soft 404 detection
