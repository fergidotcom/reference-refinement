# Query Evolution Project - Overnight Research Run

**Objective:** Test 3,000+ query/ranking combinations to discover optimal URL discovery algorithms for Reference Refinement v21.0

**Status:** 🎯 Ready for Claude Code Web execution

---

## 📋 Quick Start for Claude Code Web

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with actual API keys

# 3. Run experiments
node experiment-runner.js

# 4. Generate reports (after experiments complete)
node analysis-framework.js
```

---

## 🎯 Project Scope (Adapted)

### Original Plan (from Claude.ai)
- Test new query/ranking strategies on 35 MANUAL_REVIEW references
- Discover optimal algorithms for difficult references
- Budget: $630-900 over 6-8 hours

### Actual Implementation
- **30 MANUAL_REVIEW references** (not 35)
- **61 edge cases** (long titles, complex references)
- **Comparison mode:** Test if new strategies find BETTER URLs than current v20.1 selections
- **Ground truth:** We have current v20.1 URLs to compare against

This adaptation is actually **more valuable** because we can validate improvements against known baselines.

---

## 📊 Experiment Tiers

### Tier 1: MANUAL_REVIEW References (Priority 1)
- **References:** 30 flagged for manual review
- **Strategies:** 8 query strategies × 5 ranking algorithms
- **Total:** 1,200 experiments
- **Cost:** ~$240
- **Goal:** Find strategies that work for these difficult refs

### Tier 2: Edge Cases (Priority 2)
- **References:** 40 sampled from 61 edge cases
- **Strategies:** 6 query strategies × 5 ranking algorithms
- **Total:** 1,200 experiments
- **Cost:** ~$240
- **Goal:** Handle long titles and complex references better

### Tier 3: Validation (Priority 3)
- **References:** 30 random sample
- **Strategies:** 2 query strategies × 5 ranking algorithms
- **Total:** 300 experiments
- **Cost:** ~$60
- **Goal:** Ensure improvements don't hurt already-good refs

### Tier 4: Adaptive (Optional)
- **Conditional:** Run only if budget > $200 remaining
- **References:** Dynamic based on early results
- **Total:** Variable (300-600 experiments)
- **Cost:** Variable ($60-120)

---

## 🧠 Query Strategies to Test (30+ strategies)

### Category: Title Variations
- `unquoted_full_title` - Current v20.1 baseline
- `quoted_full_title` - Exact match with quotes
- `title_first_60_chars` - Truncated for long titles
- `title_keywords_5_terms` - Claude-powered keyword extraction
- `title_no_subtitle` - Remove subtitle after colon

### Category: Context Additions
- `title_author_year` - Add publication year
- `title_journal` - Include journal name
- `doi_search` - Direct DOI search
- `isbn_search` - Direct ISBN search

### Category: Special Strategies
- `government_site_specific` - Government database search
- `free_pdf_search` - Explicitly search for free versions
- `institutional_repository` - University repositories
- `preprint_arxiv` - Preprint servers
- `author_website` - Personal websites
- `archive_org_search` - Internet Archive

See `strategies-catalog.yaml` for complete list (30+ strategies).

---

## 🏆 Ranking Algorithms to Test (5 approaches)

1. **current_v20** - Current production algorithm (baseline)
2. **accessibility_first** - Prioritize free, accessible sources
3. **title_match_heavy** - Prioritize close title matches
4. **domain_authority** - Trust established sources
5. **balanced_v21** - Proposed optimal balance for v21.0

See `strategies-catalog.yaml` for detailed weights and scoring.

---

## 💰 Budget & Cost Management

- **Available:** $900
- **Target:** $630 (conservative)
- **Cost per experiment:** ~$0.20 (query gen + search + ranking + validation)
- **Checkpoints:** Every 100 experiments
- **Auto-stop:** If budget < $50

### Budget Breakdown
- Query generation (Claude API): $0.05
- Google Custom Search: $0.02
- Ranking (Claude API): $0.10
- URL validation: $0.03
- **Total:** $0.20 per experiment

---

## 📊 Success Metrics

### Primary Goals
1. **Improve MANUAL_REVIEW success rate:** Find URLs scoring 80+ for 30%+ of difficult refs
2. **Identify optimal ranking weights:** Determine if different weights outperform v20.1
3. **Build domain intelligence database:** Expand from ~75 to 500+ domains
4. **Project success rate improvement:** 88% (v20.1) → 93%+ (v21.0 projected)

### Secondary Goals
- Understand query generation patterns
- Classify reference types automatically
- Document edge case handling strategies
- Create v21.0 implementation roadmap

### Minimum Viable Outcome
- **Experiments:** 1,500+ completed
- **Tiers:** Tier 1 + Tier 2 complete
- **Findings:** Actionable improvements for ≥2 reference categories
- **Cost:** ≤ $900

---

## 🔄 Adaptive Strategy

### Checkpoints Every 100 Experiments
After each checkpoint, analyze:
- Top 5 performing strategies
- Bottom 5 performing strategies
- Improvement rates by reference type
- Domain-specific patterns

### Adaptive Actions
- Reallocate budget to top performers
- Skip bottom performers in remaining tiers
- If clear winners emerge: increase testing on similar strategies
- If budget running low: focus only on Tier 1 completion

---

## 📂 File Structure

```
query-evolution-project/
├── inputs/
│   ├── decisions.txt              # 288 references (30 MANUAL_REVIEW)
│   ├── manual-review-refs.json    # Extracted MANUAL_REVIEW refs
│   ├── v20.1-baseline.json        # Current state snapshot
│   └── all-reference-sets.json    # All sets (edge cases, etc.)
├── outputs/
│   ├── experiments.db             # SQLite database (all results)
│   ├── results/                   # Generated reports
│   └── checkpoints/               # Checkpoint files
├── strategies-catalog.yaml        # 30+ query strategies
├── experiment-matrix.yaml         # Experiment definitions
├── experiment-runner.js           # Main execution engine ⭐
├── analysis-framework.js          # Report generation
├── extract-references.js          # Reference parser
├── domain-database.json           # Domain intelligence (75 → 500+)
├── package.json                   # Dependencies
├── .env.example                   # Environment template
└── README.md                      # This file
```

---

## 🚀 Execution Sequence

### Phase 1: Tier 1 (3 hours)
- Run 1,200 experiments on MANUAL_REVIEW refs
- Checkpoints at: 100, 200, 500, 800, 1000, 1200
- Output: Top 5 strategies identified

### Phase 2: Adapt (15 minutes)
- Analyze Tier 1 results
- Rank strategies
- Adapt plan for Tier 2

### Phase 3: Tier 2 (3 hours)
- Run 1,200 experiments on edge cases
- Checkpoints at: 100, 200, 500, 800, 1000, 1200
- Output: Edge case strategies

### Phase 4: Validation (45 minutes)
- Run 300 validation experiments
- Confirm no regression on good refs

### Phase 5: Adaptive (0-1.5 hours)
- Optional: Deep dive if budget allows
- 0-600 experiments

### Phase 6: Analysis (30 minutes)
- Generate comprehensive reports
- Executive summary
- v21.0 implementation specification

**Total Time:** 6-8 hours
**Total Experiments:** 2,700-3,300
**Total Cost:** $540-660

---

## 📝 Implementation Notes for Claude Code Web

### Critical TODOs in experiment-runner.js

The experiment-runner.js has several `TODO` comments where you need to implement:

1. **Query Generation (`generateQuery` method):**
   - Implement strategy template system
   - Call Claude API for intelligent query generation
   - Use endpoint: `CONFIG.API_ENDPOINTS.queryGen`

2. **URL Search (`searchUrls` method):**
   - Call Google Custom Search API
   - Use endpoint: `CONFIG.API_ENDPOINTS.search`
   - Parse and return search results

3. **URL Ranking (`rankUrls` method):**
   - Implement ranking algorithm weights
   - Call Claude API for ranking
   - Use endpoint: `CONFIG.API_ENDPOINTS.ranking`

4. **URL Scoring (`scoreUrl` method):**
   - Implement comprehensive URL scoring
   - Check accessibility, authority, content quality, title match
   - Use domain database for boost/penalty values

### API Integration Pattern

```javascript
// Example: Calling Netlify function
const response = await fetch(CONFIG.API_ENDPOINTS.queryGen, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    reference: reference,
    strategy: strategy
  })
});
const data = await response.json();
```

### Error Handling
- Network errors: retry up to 3 times
- API rate limits: exponential backoff
- Budget exhausted: stop gracefully
- Failed experiments: record as 'error', charge $0.05

### Performance Optimization
- Run experiments sequentially (avoid rate limiting)
- Cache domain lookups
- Reuse API connections
- Progress updates every 10 experiments

---

## 🎯 Expected Outputs

### outputs/experiments.db (SQLite)
- All experiment results
- Strategy performance metrics
- Domain intelligence data
- Budget tracking

### outputs/results/
- `executive-summary.md` - 2-page summary
- `strategy-analysis.md` - Detailed strategy comparison
- `ranking-comparison.md` - Ranking algorithm analysis
- `domain-database-expanded.json` - 500+ domains
- `v21.0-implementation-spec.md` - Implementation roadmap

---

## ⚠️ Important Warnings

### DO NOT
- ❌ Modify files outside `query-evolution-project/`
- ❌ Touch `decisions.txt` in parent directory
- ❌ Modify `batch-processor.js` or `index.html` in parent
- ❌ Commit changes to main branch

### DO
- ✅ Work only in `query-evolution-research` branch
- ✅ Track budget in real-time
- ✅ Stop if approaching $900
- ✅ Generate comprehensive reports at end
- ✅ Create checkpoint every 100 experiments

---

## 🆘 Troubleshooting

### API Errors
- Check `.env` file has correct API keys
- Verify Netlify functions are deployed and accessible
- Check API rate limits (Claude: 10,000 req/min, Google: 10,000 req/day)

### Database Errors
- Ensure `outputs/` directory exists
- Check SQLite3 is installed: `npm list better-sqlite3`
- Delete `experiments.db` and restart if corrupted

### Budget Overrun
- Experiment runner should auto-stop at $900
- Check budget tracking table for accuracy
- Adjust cost estimates in CONFIG if needed

---

## 📞 Questions?

This is a **research experiment**. The goal is to discover what works, not build production code.

**Quality over quantity:** Better to deeply understand 2,000 experiments than superficially run 3,500.

**Adapt as you go:** If clear winners emerge early, pivot. If strategies fail consistently, skip them.

**Let the data guide you!**

---

**Created:** 2025-11-11
**Branch:** query-evolution-research
**Budget:** $630-900
**Timeline:** 6-8 hours
**Status:** 🎯 Ready for execution
