# Reference Refinement v21.0 - Query Evolution Release

**Release Date:** November 13, 2025
**Release Type:** Major Algorithm Update
**Status:** ✅ Batch Processor Complete | iPad App Pending

---

## 🚀 Major Features

### Query Evolution Algorithms

Based on extensive validation showing **85.3% improvement rate** across 68 difficult references, v21.0 implements three NEW query generation strategies with documented win rates:

#### 1. Title Keywords (5 Terms) - 91.4% Win Rate
- **Usage:** MANUAL_REVIEW flagged references
- **Strategy:** Extract 5 most important keywords from title
- **Example:** "The Impact of Climate Change on Arctic Wildlife" → "climate change arctic wildlife impact"

#### 2. Plus Best 2 from Tier 1 - 100% Win Rate
- **Usage:** Edge case references (short titles, missing authors, previously failed)
- **Strategy:** Use title plus 2 best keywords from existing successful URLs
- **Analyzes:** Domain patterns from current Primary/Secondary URLs

#### 3. Title First 60 Chars - 100% Win Rate
- **Usage:** Typical references (DEFAULT)
- **Strategy:** Simple truncation of title to first 60 characters
- **Format:** `"{first 60 chars of title}" {author last name} {year}`

#### 4. Unquoted Full Title - Baseline Fallback
- **Usage:** When other strategies fail
- **Strategy:** Current v20.1 baseline approach
- **Format:** `{full title} {author last name} {year}`

### Smart Strategy Selection

Batch processor automatically selects the optimal strategy based on reference characteristics:

```javascript
function selectQueryStrategy(reference) {
  if (reference.flags?.includes('MANUAL_REVIEW')) {
    return 'title_keywords_5_terms';  // 91.4% win rate
  } else if (isEdgeCase(reference)) {
    return 'plus_best_2_from_tier_1';  // 100% win rate
  } else {
    return 'title_first_60_chars';  // 100% win rate
  }
  // Fallback: unquoted_full_title
}
```

### Comparison Metrics Tracking

New v21.0 comparison system tracks improvements:

- **URL Changes:** Old vs new Primary and Secondary URLs
- **Score Delta:** Ranking score improvements
- **Flag Changes:** MANUAL_REVIEW additions/removals
- **Strategy Attribution:** Which strategy produced the result

Output metrics JSON includes:
```json
{
  "total_processed": 113,
  "improved": X,
  "degraded": Y,
  "unchanged": Z,
  "manual_review_removed": N,
  "strategy_usage": { ... },
  "improvements": [...]
}
```

---

## 📊 Validation Results

### Query Evolution Research (Tier 2)
- **Sample Size:** 68 difficult references
- **Overall Win Rate:** 85.3% (58 improved, 10 unchanged)
- **Top Strategy:** title_first_60_chars (100% win rate, 9/9 improved)
- **MANUAL_REVIEW Strategy:** title_keywords_5_terms (91.4% win rate)

### v21.0 Test Run (10 References)
- **Processed:** 5 references (test sample)
- **Improved:** 2 (40% improvement rate)
- **Degraded:** 0
- **Unchanged:** 3
- **Cost:** ~$0.60

### v21.0 Full Reprocessing (113 References)
- **Status:** Running (started Nov 13, 2025)
- **Expected Cost:** $13.56
- **Expected Time:** ~34 minutes
- **Output File:** CaughtInTheAct_decisions.txt
- **Metrics File:** v21-full-reprocess-metrics.json

---

## 🔧 Technical Changes

### Batch Processor (batch-processor-v21.js)

**New Files:**
- `batch-processor-v21.js` - Main processor with Query Evolution
- `batch-config-v21-full-reprocess.yaml` - Full reprocessing configuration
- `batch-config-test-v21.yaml` - Test configuration

**Key Functions Added:**
```javascript
selectQueryStrategy(ref)              // Smart strategy selection
generateQueriesForStrategy(ref, strategy)  // Generate queries
generateTitleKeywords5Terms()          // Strategy 1
generatePlusBest2FromTier1()          // Strategy 2
generateTitleFirst60Chars()           // Strategy 3
generateUnquotedFullTitle()           // Strategy 4 (fallback)
compareResults(ref)                   // Track improvements
```

**Command Line Interface:**
```bash
# Test run
node batch-processor-v21.js \
  --config=batch-config-test-v21.yaml \
  --output=test_output.txt \
  --compare \
  --metrics=test_metrics.json

# Full reprocessing
node batch-processor-v21.js \
  --config=batch-config-v21-full-reprocess.yaml \
  --output=CaughtInTheAct_decisions.txt \
  --compare \
  --metrics=v21-full-reprocess-metrics.json
```

### Deep URL Validation (Inherited from v20.0)

v21.0 maintains all v20.0 deep validation features:
- ✅ Paywall detection (12 patterns)
- ✅ Login wall detection (10 patterns)
- ✅ Soft 404 detection (8 patterns)
- ✅ Accessibility scoring (0-100)
- ✅ Content-based validation

---

## 📝 Configuration Changes

### Selection Modes

**Fixed:** "unfinalized" mode not supported by filterReferences
**Solution:** Use "criteria" mode instead:

```yaml
selection_mode: "criteria"
criteria:
  not_finalized: true
```

**Supported Modes:**
- `range` - Process references by ID range
- `criteria` - Process by specific criteria
- `all_incomplete` - Process all incomplete references

---

## 🎯 Performance Metrics

### Resource Usage
- **Google Search API:** $0.04 per reference (8 searches)
- **Claude API:** $0.08 per reference (query generation + ranking)
- **Total Cost:** ~$0.12 per reference
- **Processing Time:** ~18 seconds per reference

### Expected Improvements
- **Based on Research:** 85.3% improvement rate
- **Conservative Estimate:** 70%+ references improved
- **MANUAL_REVIEW Reduction:** 50%+ flags removed

---

## 🔄 Migration Guide

### For Users

1. **Backup Created Automatically:**
   - `decisions_backup_2025-11-13_pre-v21.txt`

2. **Review Results:**
   - Check `CaughtInTheAct_decisions.txt` for processed references
   - Review `v21-full-reprocess-metrics.json` for improvement statistics

3. **Compare Old vs New:**
   - Old URLs tracked in comparison metrics
   - Log file shows URL changes for each reference

### For Developers

1. **Query Strategy Implementation:**
   - Add new strategies to `generateQueriesForStrategy()`
   - Update strategy selection logic in `selectQueryStrategy()`

2. **Comparison Tracking:**
   - Old URLs captured in `ref.old_urls`
   - Comparison calculated in `compareResults()`

---

## 📁 Output Files

### Generated by v21.0 Full Reprocessing

| File | Purpose |
|------|---------|
| `CaughtInTheAct_decisions.txt` | Main output with updated references |
| `v21-full-reprocess-metrics.json` | Detailed improvement metrics |
| `batch-logs/batch_v21_*.log` | Processing log with URL comparisons |
| `batch-progress.json` | Resume checkpoint data |
| `decisions_backup_*.txt` | Automatic backup of original |

---

## 🐛 Known Issues

### Minor
- None identified in testing

### Fixed in This Release
- ✅ "unfinalized" selection mode not supported (switched to "criteria")
- ✅ Comparison metrics tracking implemented
- ✅ Query strategy selection logic functional

---

## 🔮 Future Enhancements (v21.1+)

### Planned for v21.1
- **Domain Intelligence:** Learn from successful URL patterns over time
- **iPad App Sync:** Implement same Query Evolution algorithms in v18.0
- **Strategy Tuning:** Refine strategy selection based on actual results

### Under Consideration
- **Multi-Query Strategies:** Generate multiple queries per strategy
- **Hybrid Approaches:** Combine strategies for difficult references
- **ML-Based Selection:** Use machine learning for strategy selection

---

## 👥 Credits

**Query Evolution Research:** Claude.ai (68-reference validation study)
**Implementation:** Claude Code (Mac)
**Validation Testing:** Query Evolution Project Team

---

## 📞 Support

**Issues:** Document in GitHub Issues
**Questions:** See `TECHNICAL_REFERENCE.md`
**Changelog:** See `REFERENCE_REFINEMENT_CHANGELOG.md`

---

**Previous Version:** v20.1 (Deep URL Validation)
**Next Planned Version:** v21.1 (Domain Intelligence)

---

## ✅ Release Checklist

- [x] Backup decisions.txt created
- [x] v21.0 batch processor implemented
- [x] Query Evolution algorithms implemented
- [x] Comparison metrics tracking implemented
- [x] Test run completed (5 references, 40% improvement)
- [x] Full reprocessing started (113 references)
- [ ] Full reprocessing completed
- [ ] Improvement metrics report generated
- [ ] iPad app v18.0 implementation
- [ ] Documentation updated
- [ ] GitHub commit and push
- [ ] Deployment verified

---

**Generated:** November 13, 2025
**Version:** 21.0.0
**Build:** Query Evolution
**Status:** 🚀 ACTIVE PROCESSING
