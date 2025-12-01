# TODO: iPad App v14.7 Implementation

**Priority:** HIGH
**Status:** ✅ COMPLETED
**Date Created:** October 29, 2025
**Date Completed:** October 29, 2025

## Required Changes

### Feature: Remove MANUAL_REVIEW Flag on Finalization

**Background:**
The batch processor (v14.7) now automatically flags references with `FLAGS[MANUAL_REVIEW]` when it cannot find suitable URLs (no primary URL with score ≥75).

**Problem:**
When user manually reviews and finalizes a reference in the iPad app, the MANUAL_REVIEW flag should be removed since the issue is resolved.

**Implementation Required:**

**File:** `index.html`

**Location:** Finalize button click handler (look for code that sets FLAGS[FINALIZED])

**Change Needed:**
```javascript
// Current behavior (simplified):
function finalizeReference(refId) {
    reference.finalized = true;
    // Add FLAGS[FINALIZED] to decisions.txt
    saveToDropbox();
}

// NEW behavior needed:
function finalizeReference(refId) {
    reference.finalized = true;
    reference.manual_review = false;  // <-- ADD THIS LINE
    // Add FLAGS[FINALIZED] and REMOVE FLAGS[MANUAL_REVIEW] from decisions.txt
    saveToDropbox();
}
```

**Testing:**
1. Create a test reference with `FLAGS[MANUAL_REVIEW]`
2. Load it in iPad app
3. Add URLs and click Finalize
4. Check decisions.txt - should show `FLAGS[FINALIZED]` but NOT `FLAGS[MANUAL_REVIEW]`

## Context

**Batch Processor Behavior (v14.7):**
- ✅ Success: Finds URLs, leaves unfinalized (no flags)
- ❌ Failure: No URLs found, adds `FLAGS[MANUAL_REVIEW]`

**User Workflow:**
1. Batch processor processes references
2. Failed ones get `FLAGS[MANUAL_REVIEW]`
3. User opens iPad app
4. User manually researches and adds URLs
5. User clicks Finalize
6. **Bug:** MANUAL_REVIEW flag persists even though issue is resolved
7. **Fix:** Remove MANUAL_REVIEW when finalizing

## Related Files

- `batch-processor.js` - Sets manual_review flag
- `batch-utils.js` - Reads/writes FLAGS[MANUAL_REVIEW]
- `V14_7_SUMMARY.md` - Full documentation

## Status

✅ **COMPLETED** - iPad app updated to v14.7
✅ MANUAL_REVIEW flag removal implemented (index.html lines 2428-2432)
✅ Quick Finalize button added to reference panels (index.html line 2207)
✅ Redundant URL buttons removed from reference panels

See `V14_7_IPAD_APP_SUMMARY.md` for complete implementation details.
