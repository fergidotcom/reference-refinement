# Reference Refinement - Version History

Complete version history and detailed fix documentation for historical reference.

## v15.x Versions

### ✅ CRITICAL FIX - v15.11 Dropbox Save 400 Error (Oct 30, 2025)

**Issue:** When finalizing references, users received green "finalized" banner followed by red error "File save failed with code 400"

**Root Cause:** Two bugs in bulletproof save system discovered via Safari Web Inspector:

**Bug 1 (Fixed in v15.10):** Missing Blob conversion for temp file upload
- Line 4411: Content passed as raw string instead of Blob
- Large files (315KB+) with special characters caused 400 errors
- **Fix:** Convert content to Blob with UTF-8 encoding

**Bug 2 (Fixed in v15.11):** Invalid Dropbox API call in commit step
- Line 4442: Used `filesCopyV2` with invalid `mode` parameter
- Dropbox API does NOT accept `mode` parameter for `filesCopyV2`
- Only `filesUpload` accepts `mode: 'overwrite'`
- Console showed: `DropboxResponseError: Response failed with a 400 code`
- **Fix:** Replace `filesCopyV2` with `filesUpload` using verified content

**Code Changes (v15.11):**
```javascript
// Step 5: Temp file upload - Add Blob conversion
const contentBlob = new Blob([content], { type: 'text/plain; charset=utf-8' });

// Step 8: Commit - Replace filesCopyV2 with filesUpload
const verifiedBlob = new Blob([verifiedContent], { type: 'text/plain; charset=utf-8' });
await this.dropboxClient.filesUpload({
    path: '/decisions.txt',
    contents: verifiedBlob,
    mode: 'overwrite',  // Valid for filesUpload
    autorename: false
});
```

**Status:** ✅ Production ready, all critical bugs resolved

---

### 📋 IN PROGRESS - Virgin decisions.txt Search (Oct 29, 2025 Evening)

**Objective:** Find cleanest virgin decisions.txt file with complete 288 references and full (un-truncated) relevance text for "Caught In The Act" manuscript.

**Analysis Completed:**
- Created `analyze-all-decisions.js` - Comprehensive quality analysis tool
- Created `analyze-virgin.js` - Virgin vs contaminated reference checker
- Analyzed 8 versions of decisions.txt across Dropbox directories

**Best Virgin File Found:**
- `caught_in_the_act_CLEAN_intermediate.txt`
- ✅ 288 references
- ✅ 100% virgin (no FLAGS/URLs)
- ⚠️ Only 152 refs have relevance text
- ⚠️ Relevance text is truncated

**Status:** ⏸️ Awaiting clean source file from user

---

### ✅ CRITICAL FIX - v15.3 Parser Bug + Production Data Load (Oct 29, 2025 Evening)

**Issue:** v15.2 completely failed to parse ANY references, showing "Loaded 0 refs (288 skipped due to errors)"

**Root Cause:** Line 1643 in parseDecisions() called `this.parseOneline(ref, trimmed)` - a function that **doesn't exist!**

**Fix Implemented (v15.3):**
1. **Changed function call** (Line 1643, 4299):
   - ❌ BEFORE: `this.parseOneline(ref, trimmed);`
   - ✅ AFTER: `this.extractReferenceInfo(ref);`
2. **Enhanced console logging**

**Status:** ✅ v15.3 deployed

---

## v14.x Versions

### ✅ ENHANCEMENT - Batch Processor v14.7 Manual Review Mode (Oct 28-29, 2025)

**Changes:**
1. **Disabled Auto-Finalization** - References remain unfinalized for manual review in iPad app
2. **Enhanced Logging** - Detailed batch recommendations with space for user review notes
3. **MANUAL_REVIEW Flagging** - References without suitable URLs automatically flagged with `FLAGS[MANUAL_REVIEW]`
4. **Parser Bug Fixed** - Relevance text was being truncated at first capital 'F' (now fixed)

**Status:** ✅ Batch processor ready, ✅ iPad app v14.7 deployed

---

### ✅ ENHANCEMENT - iPad App v14.7 Quick Finalize (Oct 29, 2025)

**Changes:**
1. **Quick Finalize Button** - Added "Finalize" button to reference panels in main window
2. **Removed Redundant Buttons** - Removed "Primary URL" and "Secondary URL" buttons
3. **Auto-Clear MANUAL_REVIEW Flag** - Automatically removes flag when finalizing

**Status:** Deployed to production

---

### ✅ CRITICAL FIX - Dropbox OAuth Data Synchronization (v14.5 - Oct 28, 2025)

**Issue:** URLs displayed in main window didn't match URLs in Edit modal for the same reference after clearing cache and re-authenticating to Dropbox.

**Root Cause:**
- After cache clear, app loaded stale data from localStorage
- After Dropbox OAuth completed, app intentionally SKIPPED loading fresh data
- Multiple versions of data displayed simultaneously

**Fix Implemented:**
1. **After Dropbox OAuth:** Immediately load fresh data from Dropbox
2. **Clear stale localStorage:** Prevent future conflicts
3. **Re-render UI:** Ensure main window shows current Dropbox data

**Status:** Fixed and deployed to production

---

### ✅ ENHANCEMENT - Primary/Secondary Mutual Exclusivity (v14.5 - Oct 28, 2025)

**Issue:** Full-text sources were being considered as both PRIMARY and SECONDARY candidates, causing inappropriate URL selections.

**Fix Implemented:**
Added explicit mutual exclusivity rules to the ranking prompt in `llm-rank.ts`:

**Impact:**
- ✅ Full-text sources → PRIMARY only
- ✅ Reviews/analyses → SECONDARY only
- ✅ Clear separation prevents confusion

**Status:** Fixed and deployed to production

---

### ✅ ENHANCEMENT - Query Control + Cost Tracking + Enhanced Detection (v14.2 - Oct 27, 2025)

**New Features:**

**1. Query Allocation Control**
- User-configurable split between primary and secondary queries (0-8 each, total must = 8)
- UI dropdowns above Queries textarea with preset buttons (4+4, 6+2, 2+6)

**2. Enhanced Cost Tracking**
- Real-time cost display in debug panels
- Session Cost Summary panel with projections

**3. Improved Detection**
- **Language Detection:** Non-English domains capped at P:70
- **Review Website vs Review Article:** Review aggregator sites capped at S:60

**Status:** Deployed and ready for testing

---

### ✅ ENHANCEMENT - Content-Type Detection & UI Fix (v14.1 - Oct 27, 2025)

**Problem:** AI could not distinguish between actual sources and reviews, or between actual reviews and bibliography listings.

**v14.1 Solution - Enhanced Content-Type Detection:**

**PRIMARY Detection:**
- Added heuristics to detect review language
- Max score 55 for reviews, even from .edu domains
- Full-text indicators: mentions "complete", "full text", matching author

**SECONDARY Detection:**
- Detect PhilPapers, WorldCat, library catalogs → Max score 55
- Require evaluative/analytical language for high scores

**UI Fix:**
- Toast notifications moved from bottom to top

**Goal:** Reduce override rate from 100% to <25%

---

### ✅ ENHANCEMENT - Query Generation & Ranking Strategy (v14.0 - Oct 27, 2025)

**Change:** Redesigned query generation to use structured 3:1 ratio for targeted search results.

**New Query Structure (8 queries total):**

**PRIMARY-focused (4 queries):**
- Q1-Q3 (75%): Full-text sources - FREE PDFs/HTML
- Q4 (25%): Publisher/purchase page fallback

**SECONDARY-focused (4 queries):**
- Q5-Q7 (75%): Reviews/analyses of THIS SPECIFIC WORK
- Q8 (25%): Topic discussions

**Result:** Free sources and work-specific reviews now prioritized

---

## v13.x Versions

### ✅ RESOLVED - Autorank Issues (v13.9-v13.11 - Oct 26, 2025)

**Issue 1: Timeout (FIXED in v13.9)**
- Autorank taking 19+ seconds and timing out at 18s limit
- **Solution:** Simplified prompt from 118 → 20 lines
- **Result:** Reduced to 10-13 seconds ✅

**Issue 2: JSON Parsing (FIXED in v13.11)**
- Claude returned invalid JSON
- **Solution:** Switched from JSON to pipe-delimited text format
- **Result:** Much more reliable parsing ✅

**Status:** Autorank working reliably

---

### ✅ RESOLVED - CDN Redirect Caching (v13.12 - Oct 27, 2025)

**Issue:** Netlify CDN was caching 301 redirects indefinitely, causing deployments to show old versions.

**Solution:** Switch to `index.html` (no redirect needed)
- Netlify automatically serves `index.html` at root `/`
- No redirect = nothing to cache

**Deployment Pattern Now:**
```bash
cp rr_vXXX.html index.html
netlify deploy --prod --dir="." --message "vX.X - [description]"
```

---

### ✅ RESOLVED - Version Display Bug (v13.7 - Oct 26, 2025)

**Issue:** Page showed "v13.4" in header despite deploying v13.7.

**Root Cause:** Forgotten `<h1>` tag during version bump.

**Solution:** Updated both `<title>` and `<h1>` tags.

**Lesson Learned:** Search for ALL version occurrences when bumping versions.
