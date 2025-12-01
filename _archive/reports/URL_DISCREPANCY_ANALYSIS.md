# Secondary URL Discrepancy - Bug Analysis

**Date:** October 28, 2025
**Issue:** URLs displayed in main window don't match URLs in Edit modal for REF 102
**Status:** 🔴 CRITICAL BUG - Data Display Inconsistency

---

## The Problem

You observed REF 102 showing **completely different URLs** in two places:

### Screenshot 1: Main Window Display
```
PRIMARY:   https://muse.jhu.edu/book/16011
SECONDARY: https://academic.oup.com/jah/issue/89/1
```

### Screenshot 2: Edit Modal Display
```
Field 1: https://www.routledge.com/Routledge-Communication-Series/book-series/RCS
Field 2: https://academic.oup.com/ijpor/article-pdf/12/3/333/1962857/120333.pdf
```

### Actual File Content (decisions.txt)
```
PRIMARY:   https://api.pageplace.de/preview/DT0400.9781135447588_A23802868/preview-9781135447588_A23802868.pdf
SECONDARY: https://academic.oup.com/book/27776/chapter/198012757
```

**NONE OF THESE MATCH!** 😱

---

## Root Cause Analysis

### Hypothesis 1: Stale LocalStorage (MOST LIKELY)

**Problem:** iPad app caches reference data in localStorage, which persists even after cache clear.

**Evidence:**
- You cleared browser cache
- Cache clears don't always clear localStorage
- App loads from localStorage before Dropbox

**Code Location (index.html ~line 1492):**
```javascript
// Fallback to localStorage if Dropbox failed or not connected
const savedDecisions = localStorage.getItem('rr_decisions_backup');
const savedTimestamp = localStorage.getItem('rr_decisions_timestamp');
```

**What happens:**
1. App loads
2. Dropbox auth required (you had to reconnect)
3. During auth, app shows stale data from localStorage
4. Main window populated from OLD localStorage data
5. When you click Edit, it reads from NEW Dropbox data
6. **Result:** Two different data sources displayed simultaneously!

---

### Hypothesis 2: Reference Index Mismatch

**Problem:** Main window showing URLs from wrong reference index.

**Evidence:**
- The URLs in Screenshot 1 (muse.jhu.edu, academic.oup.com/jah) don't exist in ANY reference in current decisions.txt
- Suggests these are from a previous version of the file

**What happens:**
1. Array index confusion between old/new data
2. Display logic showing reference N's URLs for reference N+1
3. Edit modal loads correct data but display is wrong

---

### Hypothesis 3: Async Data Loading Race Condition

**Problem:** Main window renders before Dropbox sync completes.

**Evidence:**
- You had to re-authenticate to Dropbox
- App loads in stages
- Different components may load from different sources

**What happens:**
1. Page loads → Shows localStorage data (old)
2. User clicks Edit → Triggers fresh Dropbox read (new)
3. Modal shows current data
4. Main list never updates after Dropbox loads

---

## The Fix

### Immediate Solution: Force Full Reload

```javascript
// Add to index.html after Dropbox load
if (dropboxDataLoaded) {
    // Clear localStorage to prevent stale data
    localStorage.removeItem('rr_decisions_backup');
    localStorage.removeItem('rr_decisions_timestamp');

    // Force UI refresh
    this.renderAllReferences();
}
```

### Better Solution: Synchronize Data Sources

```javascript
async loadReferences() {
    let references = null;

    // Try Dropbox first
    if (this.dropboxAccessToken) {
        references = await this.loadFromDropbox();
    }

    // If Dropbox succeeds, UPDATE localStorage
    if (references) {
        localStorage.setItem('rr_decisions_backup', references);
        localStorage.setItem('rr_decisions_timestamp', Date.now());
        return references;
    }

    // Only use localStorage if Dropbox fails
    return localStorage.getItem('rr_decisions_backup');
}
```

### Best Solution: Single Source of Truth

**Never show data until fully loaded:**

```javascript
async init() {
    // Show loading spinner
    this.showLoadingState();

    // Load from Dropbox (or fail)
    const data = await this.loadFromDropbox();

    if (!data) {
        this.showError("Please connect to Dropbox");
        return;
    }

    // Parse and render (single source)
    this.references = this.parseDecisions(data);
    this.renderAllReferences();

    // NOW update localStorage as backup
    localStorage.setItem('rr_decisions_backup', data);
}
```

---

## Why This is Dangerous

### Data Integrity Risk

If the app shows different data in different places:
- ❌ User makes edit based on wrong information
- ❌ Saves changes to wrong reference
- ❌ Data corruption in decisions.txt
- ❌ Loss of batch processor's work

### User Trust Impact

- User can't trust what they see
- Must verify everything
- Slows down workflow
- Frustrating experience

---

## Testing the Fix

### Test Scenario 1: Fresh Load After Cache Clear
1. Clear all browser data (cache + localStorage)
2. Load app
3. Authenticate to Dropbox
4. Verify main window matches edit modal
5. Verify both match decisions.txt

### Test Scenario 2: Offline → Online
1. Disconnect WiFi
2. Load app (shows localStorage)
3. Reconnect WiFi
4. Verify UI updates to Dropbox data

### Test Scenario 3: After Batch Run
1. Run batch processor
2. Wait for Dropbox sync
3. Reload iPad app
4. Verify shows batch processor's URLs

---

## Recommended Action Plan

### Immediate (Today)
1. ✅ Document the bug (this file)
2. ⏭️ Add localStorage.clear() after Dropbox load
3. ⏭️ Test with your workflow
4. ⏭️ Deploy fix as v14.5

### Short-term (Next Release)
1. Implement "Single Source of Truth" pattern
2. Add data validation (check localStorage timestamp)
3. Add UI indicator when showing stale data
4. Force refresh after Dropbox reconnect

### Long-term (Future)
1. Remove localStorage fallback entirely
2. Require Dropbox connection to use app
3. Show clear error if offline
4. Consider IndexedDB for better persistence

---

## Temporary Workaround for User

**Until fixed, always:**

1. After reloading app → **Don't trust main window initially**
2. Click Edit on any reference to verify URLs
3. If URLs don't match → **Reload page completely**
4. If still mismatched → **Re-authenticate Dropbox**
5. After batch runs → **Force reload (not just refresh)**

---

## Code Locations to Fix

### File: index.html

**Line ~1436:** Initial token load
```javascript
this.dropboxAccessToken = localStorage.getItem('rr_dropbox_token');
```

**Line ~1492:** Fallback to localStorage
```javascript
const savedDecisions = localStorage.getItem('rr_decisions_backup');
// ADD: Check if this data is stale!
```

**Line ~1898:** Save to localStorage
```javascript
localStorage.setItem('rr_decisions_backup', content);
// ADD: Also set version/timestamp
```

**Line ~3762:** After Dropbox OAuth
```javascript
localStorage.setItem('rr_dropbox_token', response.access_token);
// ADD: Force reload of references here!
```

---

## Impact Assessment

**Severity:** 🔴 CRITICAL
**Frequency:** Medium (happens after cache clear or Dropbox re-auth)
**User Impact:** High (data integrity risk)
**Fix Complexity:** Low (add localStorage clear + UI refresh)

---

## Next Steps

1. ✅ Analysis complete
2. ⏭️ Implement localStorage.clear() after Dropbox load
3. ⏭️ Test with fresh cache scenario
4. ⏭️ Deploy as v14.5
5. ⏭️ Verify in production on iPad

---

**Status:** Documented, ready for fix
**Assignee:** Claude (me!)
**Priority:** HIGH - Fix before next batch run
