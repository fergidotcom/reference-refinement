# Fix for Next Release - Finalize Should Not Auto-Advance

**Issue Identified:** November 11, 2025
**To Be Fixed In:** v17.6 or later
**Priority:** High - User workflow issue

## Problem

When user clicks "Finalize" button (either in Tab 2 or modal footer), the Edit Reference modal closes BUT immediately opens the next unfinalized reference's Edit modal after 100ms.

**User never sees the main window between references.**

### Current Behavior (v17.5):
1. Click Finalize
2. Reference finalized and saved
3. Modal closes
4. **After 100ms delay, next reference Edit modal opens automatically**
5. User stuck in Edit modal loop

### Desired Behavior:
1. Click Finalize
2. Reference finalized and saved
3. Modal closes
4. **Return to main window**
5. User stays on main window
6. User can manually click Edit on next reference when ready

## Root Cause

**File:** `index.html`
**Function:** `finalizeReference(refId = null)`
**Lines:** 2911-2915

```javascript
if (nextRef) {
    // Small delay to let modal close animation complete
    setTimeout(() => {
        this.editReference(nextRef.id);  // ← This auto-opens next reference!
    }, 100);
}
```

The auto-advance feature was implemented in v16.9 (see comment on line 2902), but the user doesn't want this behavior. They want to manually control when to edit the next reference.

## Solution for v17.6

### Option 1: Remove Auto-Advance Entirely (RECOMMENDED)

Simply remove the auto-advance logic:

```javascript
// v16.9: Auto-close modal and auto-advance to next unfinalized reference
// Only if finalized from Edit modal (not from quick finalize button in main window)
if (!refId) {
    // Close the modal
    this.closeModal();

    // REMOVED: Auto-advance logic
    // User wants to return to main window, not jump to next reference

    // Show completion message if no more unfinalized refs
    const nextRef = this.findNextReference(ref.id);
    if (!nextRef) {
        const showFinalized = document.getElementById('showFinalizedToggle').checked;
        if (!showFinalized) {
            this.showToast('✅ All unfinalized references completed!', 'success');
        } else {
            this.showToast('✅ Reached end of references', 'success');
        }
    }
}
```

### Option 2: Make Auto-Advance Optional (User Preference)

Add a checkbox in settings:
- "Auto-advance to next reference after finalize"
- Default: OFF (user must manually advance)
- If ON: Current v17.5 behavior
- Store in localStorage

### Option 3: Different Buttons for Different Actions

- "Finalize" button: Finalize + close + return to main window
- "Finalize & Next" button: Finalize + close + open next reference

**RECOMMENDATION: Option 1** - Just remove auto-advance. User can quickly navigate via main window.

## Implementation for v17.6

### Code Changes Required:

**index.html - finalizeReference() function (lines 2902-2926):**

```javascript
// BEFORE (v17.5):
if (!refId) {
    this.closeModal();
    const nextRef = this.findNextReference(ref.id);
    if (nextRef) {
        setTimeout(() => {
            this.editReference(nextRef.id);
        }, 100);
    } else {
        // Show completion message
    }
}

// AFTER (v17.6):
if (!refId) {
    this.closeModal();

    // Show completion message only if all done
    const nextRef = this.findNextReference(ref.id);
    if (!nextRef) {
        const showFinalized = document.getElementById('showFinalizedToggle').checked;
        if (!showFinalized) {
            this.showToast('✅ All unfinalized references completed!', 'success');
        } else {
            this.showToast('✅ Reached end of references', 'success');
        }
    }
}
```

**Lines to modify:** 2908-2915
**Lines to remove:** 2911-2915 (the setTimeout auto-advance)
**Lines to keep:** 2917-2923 (completion message) but move outside the else

## Testing Plan for v17.6

1. ✅ Load references file with multiple unfinalized refs
2. ✅ Click Edit on first unfinalized ref
3. ✅ Click Finalize (Tab 2)
   - Reference should finalize
   - Modal should close
   - **Should return to main window**
   - **Should NOT open next reference automatically**
4. ✅ Verify user can click Edit on next ref manually
5. ✅ Repeat test with Finalize button in modal footer
6. ✅ Finalize last unfinalized reference
   - Should show "✅ All unfinalized references completed!" toast
   - Should stay on main window

## User Workflow After Fix

**Efficient review workflow:**
1. Main window shows all unfinalized references
2. Click Edit on first reference
3. Review, autorank, finalize
4. **Modal closes → back to main window**
5. Next unfinalized reference is right there (scroll if needed)
6. Click Edit on next reference
7. Repeat

**Benefits:**
- User controls pace
- Can review multiple references at once in main window
- Can skip references if needed
- Can see overall progress
- Natural, predictable behavior

## Notes

- The "Done" button already has the desired behavior (closes modal, returns to main window)
- "Finalize" should behave the same way
- Auto-advance was well-intentioned but not what user wants
- This is a simple fix - just remove 5 lines of code

## Related Files

- `V17_3_UI_CLEANUP.md` - Where Finalize button was added to Tab 2
- `V17_4_WORKFLOW_IMPROVEMENTS.md` - Where finalize behavior was verified
- `V17_5_SCROLLING_FIX.md` - Current version

## Version History

- **v16.9:** Auto-advance feature added (thought to be helpful)
- **v17.3:** Finalize button added to Tab 2
- **v17.4:** Finalize behavior verified (but didn't test auto-advance)
- **v17.5:** Current version - auto-advance still active
- **v17.6:** Will remove auto-advance per user request

---

**Status:** Documented, ready to implement in v17.6
**Assigned:** Next session
**Effort:** 5 minutes (simple code removal)
