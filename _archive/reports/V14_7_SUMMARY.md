# Version 14.7 - Batch Processor Testing & Review Mode

**Date:** October 28-29, 2025
**Type:** Batch Processor Enhancement

## Summary

Enhanced batch processor for manual review workflow, URL change tracking, and automatic flagging of references requiring manual research.

## Key Changes

### 1. ✅ **Disabled Auto-Finalization**

**Configuration Change:**
- Set `auto_finalize: false` in `batch-config.yaml`

**Rationale:**
- Keeps processed references unfinalized (appear at top of main window)
- Allows manual review in iPad interface
- User maintains full control over finalization

**User Workflow:**
1. Batch processor suggests URLs and scores
2. References remain unfinalized → appear at top of iPad window
3. User reviews suggestions in iPad app
4. User manually finalizes after confirming URLs

### 2. ✅ **Enhanced Batch Logging**

**Improvements to `formatReferenceLog()` in `batch-processor.js`:**

**Log Format Now Includes:**
```
================================================================================
[ID] Reference Title
================================================================================
Queries Generated: N

--- BATCH PROCESSOR RECOMMENDATIONS ---
PRIMARY (Score: XX):
  URL: https://...
  Reason: [AI reasoning]

SECONDARY (Score: XX):
  URL: https://...
  Reason: [AI reasoning]

Auto-Finalized: NO (manual review required)

--- USER REVIEW NOTES (fill in after iPad review) ---
Final PRIMARY URL:
Final SECONDARY URL:
URL Changes:
Override Reason:
Commentary:
================================================================================
```

**Benefits:**
- Clear separation between batch recommendations and user decisions
- Space for documenting URL changes and override reasons
- Tracks when iPad autorank suggests different URLs than batch processor
- Provides audit trail for quality assessment

### 3. ✅ **Automatic MANUAL_REVIEW Flagging**

**Feature:** References where batch processor cannot find suitable URLs are automatically flagged for manual research.

**Implementation:**
- When no primary URL with score ≥75 is found → `FLAGS[MANUAL_REVIEW]` added
- When suitable URLs are found → MANUAL_REVIEW flag cleared
- Parser in `batch-utils.js` reads/writes MANUAL_REVIEW flag
- Flag appears in decisions.txt alongside other metadata

**Example:**
```
[110] CNBC (2023). Article title... FLAGS[MANUAL_REVIEW]
```

**Benefits:**
- Easy identification of references needing manual research
- Can filter/sort by MANUAL_REVIEW flag in future
- Provides clear signal which references batch processor struggled with
- User can prioritize manual research efforts

**Note for iPad App v14.7 (Future):**
- When user finalizes a reference, remove any MANUAL_REVIEW flag
- Finalization overrides the "needs review" status

### 4. ✅ **Fixed Critical Parser Bug**

**Issue:** Relevance text was being truncated at first capital 'F'
**Cause:** Regex pattern `[^F]*?` stopped at any capital F
**Fix:** Changed to `.+?` to capture full text until FLAGS[ marker
**Impact:** All Relevance text now preserved correctly

## Testing Protocol

**Small Batch Testing:**
1. Process references in small batches (5-10 at a time)
2. Review batch log for recommendations
3. Open iPad app to manually review URLs
4. Compare iPad autorank suggestions vs batch recommendations
5. Document any URL changes in batch log
6. Manually finalize approved references

## Files Modified

- `batch-config.yaml` - Disabled auto_finalize
- `batch-processor.js` - Enhanced formatReferenceLog(), added MANUAL_REVIEW flag logic
- `batch-utils.js` - Fixed Relevance text regex bug, added MANUAL_REVIEW flag parsing/writing

## Usage

```bash
# Run batch processor (refs stay unfinalized)
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/
node batch-processor.js

# Check log for recommendations
cat batch-logs/batch_TIMESTAMP.log

# Review in iPad app (unfinalized refs at top)
# Manually finalize after confirming URLs
```

## Quality Metrics to Track

- **Override Rate:** % of batch URLs changed during iPad review
- **Score Correlation:** Do high-scoring batch URLs get accepted?
- **URL Change Patterns:** Which types of URLs get overridden most?
- **Batch vs iPad Differences:** When does iPad autorank find better results?

## Next Steps

1. Run small batch tests (5-10 references)
2. Document URL changes in batch logs
3. Analyze override patterns
4. Adjust batch processor based on findings
5. Scale up to larger batches when confident

## Known Limitations

- URL change tracking is manual (fill in log after review)
- No automated comparison between batch and iPad suggestions
- User must remember to document overrides

## Status

✅ Ready for testing with manual review workflow
✅ Parser bug fixed - data integrity restored
✅ Enhanced logging for quality tracking
✅ MANUAL_REVIEW flag system implemented

## Future iPad App Changes (v14.7)

**Required Implementation:**

When user clicks "Finalize" button in iPad app:
1. Set `FLAGS[FINALIZED]`
2. **Remove `FLAGS[MANUAL_REVIEW]` if present**
3. Update decisions.txt in Dropbox

**Rationale:**
- Finalization means user has approved the reference
- MANUAL_REVIEW flag indicates "needs attention"
- Once finalized, the "needs attention" status is resolved
- Prevents references from having both FINALIZED and MANUAL_REVIEW flags

**Code Location to Update:**
- `index.html` - Finalize button handler
- Should clear `manual_review` flag before saving to decisions.txt
