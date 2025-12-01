# Validation Testing Required

## What We Need to Verify

The v16.2 validation catches:
✅ PDF URLs that return HTML (content-type mismatch)
❓ HTML URLs that show error pages (need to check actual problematic URLs)

## Test Plan

### Option 1: Test on Actual Batch Run
```bash
# Run batch on refs 220-230 (includes RID 222)
node batch-processor.js --config=batch-config.yaml

# Watch for:
# - Does validation catch problematic URLs?
# - Are they PDF URLs or HTML URLs?
# - What reasons are logged?
```

### Option 2: Manual URL Test
If you remember the problematic URLs, we can test them directly:

```javascript
// Test a specific URL
const url = 'https://uky.edu/...'; // Your problematic URL
const response = await fetch(url, { method: 'HEAD' });
console.log('Status:', response.status);
console.log('Content-Type:', response.headers.get('content-type'));
```

## Potential Enhancement Needed

If problematic URLs are NOT .pdf URLs, we may need to add:

```javascript
// For HTML URLs, check if it's very small (likely error page)
if (!url.endsWith('.pdf')) {
  const contentLength = response.headers.get('content-length');
  if (contentLength && parseInt(contentLength) < 1000) {
    return { valid: false, reason: 'Suspiciously small page (likely error)' };
  }
}
```

Or:

```javascript
// For top 3 candidates, actually fetch and check content
if (ranking.primary_score >= 90) {
  const response = await fetch(url);
  const html = await response.text();
  if (/page not found|document not available/i.test(html)) {
    return { valid: false, reason: 'Soft 404 detected in content' };
  }
}
```

## Recommendation

**Start with v16.2 as-is**, which will catch:
- Hard 404s (100%)
- PDF→HTML soft 404s (~60-70%)

**Then observe:**
- Which problematic URLs still get through?
- Are they PDF or HTML URLs?
- Can we detect pattern from validation logs?

**Then enhance** if needed based on what we learn.

This iterative approach is better than guessing.
