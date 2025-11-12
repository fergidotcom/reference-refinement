# Claude Code Web - Query Evolution Project Handoff

**Created:** 2025-11-11, 11:40 PM
**Branch:** query-evolution-research
**GitHub:** https://github.com/fergidotcom/reference-refinement/tree/query-evolution-research
**Status:** ✅ Ready for execution

---

## 🎯 Quick Start (For User)

**When you're ready to run the overnight experiment:**

1. **Start Claude Code Web** (via web interface or API)

2. **Clone the repository:**
   ```bash
   git clone https://github.com/fergidotcom/reference-refinement.git
   cd reference-refinement
   git checkout query-evolution-research
   cd query-evolution-project
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Verify API keys** (already configured in .env):
   ```bash
   cat .env
   # Should show Claude API, OpenAI API, Google API keys
   ```

5. **Start the experiment:**
   ```bash
   node experiment-runner.js
   ```

6. **Let it run overnight** (6-8 hours)

7. **When complete, generate reports:**
   ```bash
   node analysis-framework.js
   ```

---

## 📋 What Claude Code Web Will Do

### Phase 1: Tier 1 Experiments (3 hours)
- Test 1,200 query/ranking combinations on 30 MANUAL_REVIEW references
- Try 8 different query strategies × 5 ranking algorithms
- Compare results against current v20.1 URLs
- Identify which strategies work best for difficult references

### Phase 2: Adaptive Analysis (15 minutes)
- Analyze Tier 1 results
- Identify top 5 performing strategies
- Identify bottom 5 strategies to skip
- Adapt execution plan for Tier 2

### Phase 3: Tier 2 Experiments (3 hours)
- Test 1,200 combinations on 40 edge case references (long titles, complex)
- Use best strategies from Tier 1 + specialized edge case strategies
- Build domain intelligence database

### Phase 4: Validation (45 minutes)
- Test 300 combinations on 30 random references
- Ensure improvements don't hurt already-good references

### Phase 5: Analysis & Reports (30 minutes)
- Generate executive summary
- Create detailed strategy analysis
- Compare ranking algorithms
- Export expanded domain database (500+ domains)
- Write v21.0 implementation specification

---

## 📊 Expected Results

### What You'll Get

1. **SQLite Database** (`outputs/experiments.db`)
   - Every experiment result
   - Strategy performance metrics
   - Domain intelligence data
   - Budget tracking

2. **Executive Summary** (`outputs/results/executive-summary.md`)
   - Key findings (2 pages)
   - Top performing strategies
   - Success rates
   - Recommendations for v21.0

3. **Detailed Reports**
   - Strategy analysis
   - Ranking algorithm comparison
   - Domain database (75 → 500+ domains)
   - v21.0 implementation roadmap

### Success Metrics

- **Improve MANUAL_REVIEW success rate:** Find quality URLs for 30%+ of difficult refs
- **Identify optimal weights:** Determine best ranking algorithm
- **Domain intelligence:** Build comprehensive domain database
- **Project improvement:** 88% (v20.1) → 93%+ (v21.0 projected)

---

## 💰 Budget & Cost

- **Available:** $900
- **Target:** $630 (conservative)
- **Cost per experiment:** ~$0.20
- **Expected experiments:** 2,700-3,300
- **Expected cost:** $540-660

**Safety:** Auto-stops if budget reaches $900

---

## ⚠️ Critical Notes for Claude Code Web

### Implementation TODOs

The `experiment-runner.js` has several `TODO` comments where Claude Code Web needs to implement actual API calls:

1. **Query Generation** (`generateQuery` method):
   - Parse strategy templates from `strategies-catalog.yaml`
   - Call Claude API for intelligent query generation
   - Use endpoint: `https://rrv521-1760738877.netlify.app/api/llm-chat`

2. **URL Search** (`searchUrls` method):
   - Call Google Custom Search API
   - Use endpoint: `https://rrv521-1760738877.netlify.app/api/search-google`
   - Parse and return top 10 results

3. **URL Ranking** (`rankUrls` method):
   - Implement ranking algorithm weights from `strategies-catalog.yaml`
   - Call Claude API for semantic ranking
   - Use endpoint: `https://rrv521-1760738877.netlify.app/api/llm-rank`

4. **URL Scoring** (`scoreUrl` method):
   - Implement comprehensive scoring: accessibility + authority + content + title match
   - Use `domain-database.json` for boost/penalty values
   - Validate URLs (HEAD request, soft 404 detection)

### API Integration Pattern

```javascript
// Example Netlify Function call
const response = await fetch('https://rrv521-1760738877.netlify.app/api/llm-chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    reference: {
      title: reference.title,
      author: reference.author,
      year: reference.year
    },
    strategy: strategyId
  })
});

if (!response.ok) {
  throw new Error(`API call failed: ${response.statusText}`);
}

const data = await response.json();
return data.query;
```

### Error Handling Strategy

- **Network errors:** Retry up to 3 times with exponential backoff
- **API rate limits:** Pause 60 seconds, then retry
- **Failed experiments:** Record as 'error', charge $0.05, continue
- **Budget exhausted:** Stop gracefully, save checkpoint

### Progress Reporting

Expected console output every 10 experiments:
```
  📄 REF [649]: Deaths of Despair and the Future of Capitalism...
    ✅ title_keywords_5_terms + accessibility_first: +32.5 (WIN)
    ⚪ government_site_specific + current_v20: -5.2
    ✅ free_pdf_search + balanced_v21: +28.1 (WIN)
    ...

💾 CHECKPOINT @ 100 experiments
   Total Spent: $20.15
   Remaining: $879.85

   Top 3 Strategies:
   1. free_pdf_search: 42/100 wins (22.3 avg)
   2. title_keywords_5_terms: 38/100 wins (18.7 avg)
   3. institutional_repository: 35/100 wins (15.2 avg)
```

---

## 🔍 Quality Comparison Logic

### For Each Experiment

1. Generate query using selected strategy
2. Search for URLs via Google Custom Search
3. Rank results using selected algorithm
4. Score top new URL:
   - Accessibility score (free=100, paywall=0)
   - Authority score (gov=100, edu=90, etc.)
   - Content score (full-text=100, abstract=40, etc.)
   - Title match score (exact=100, no match=0)
   - **Composite:** `(accessibility×0.35) + (authority×0.25) + (content×0.25) + (match×0.15)`

5. Score current v20.1 URL (same formula)
6. Calculate improvement: `new_score - current_score`
7. **Winner:** New URL wins if improvement ≥ 20 points AND validated

---

## 📂 Repository Structure

```
reference-refinement/
├── (main branch files - DO NOT TOUCH)
│   ├── batch-processor.js (v20.1 production)
│   ├── index.html (v17.5 iPad app)
│   └── decisions.txt (user's working file)
│
└── query-evolution-project/ (ALL WORK HERE)
    ├── inputs/
    │   ├── decisions.txt (30 MANUAL_REVIEW refs)
    │   ├── manual-review-refs.json
    │   ├── all-reference-sets.json
    │   └── v20.1-baseline.json
    ├── outputs/
    │   ├── experiments.db (SQLite)
    │   ├── results/ (generated reports)
    │   └── checkpoints/
    ├── strategies-catalog.yaml (30+ strategies)
    ├── experiment-matrix.yaml (experiment plan)
    ├── experiment-runner.js ⭐ MAIN FILE
    ├── analysis-framework.js
    ├── extract-references.js
    ├── domain-database.json (75 domains)
    ├── package.json
    ├── .env (API keys configured)
    └── README.md (comprehensive guide)
```

---

## ✅ Pre-Flight Checklist

Before starting, verify:

- [ ] Git branch: `query-evolution-research` (not main)
- [ ] Dependencies installed: `npm install` successful
- [ ] API keys in `.env` file
- [ ] Netlify functions accessible (test with curl)
- [ ] SQLite database can be created: `touch outputs/experiments.db`
- [ ] Budget tracking initialized
- [ ] Console output visible (for monitoring)

---

## 🚨 Critical Warnings

### DO NOT
- ❌ Modify files outside `query-evolution-project/`
- ❌ Touch `decisions.txt` in parent directory
- ❌ Modify `batch-processor.js` or `index.html` in parent
- ❌ Commit changes to main branch
- ❌ Exceed $900 budget

### DO
- ✅ Work only in `query-evolution-research` branch
- ✅ Work only in `query-evolution-project/` directory
- ✅ Track budget in real-time
- ✅ Create checkpoints every 100 experiments
- ✅ Generate comprehensive reports at end
- ✅ Stop gracefully if budget approaches $900

---

## 📞 After Completion

### What to Send Back

1. **Branch URL:** https://github.com/fergidotcom/reference-refinement/tree/query-evolution-research
2. **Database:** `outputs/experiments.db` (commit or share separately)
3. **Reports:** All files in `outputs/results/`
4. **Summary:** Executive summary content
5. **Recommendations:** Top 5 strategies and v21.0 implementation plan

### Next Steps (User)

1. Review executive summary
2. Examine detailed analysis
3. Decide whether to implement v21.0
4. If yes: Create v21-commercial branch and implement
5. If no: Extract useful insights for future iterations

---

## 🎯 Success Definition

**This experiment is successful if:**

1. ✅ Completed 1,500+ experiments
2. ✅ Tier 1 (MANUAL_REVIEW) and Tier 2 (edge cases) complete
3. ✅ Identified strategies that improve difficult refs by 20%+
4. ✅ Built domain intelligence database (500+ domains)
5. ✅ Generated actionable v21.0 implementation roadmap
6. ✅ Cost ≤ $900

**Quality over quantity:** Better to deeply understand 2,000 experiments than superficially run 3,500.

---

## 📚 Additional Resources

- **README.md** - Comprehensive project documentation
- **strategies-catalog.yaml** - All 30+ query strategies with templates
- **experiment-matrix.yaml** - Complete experiment plan and budget
- **domain-database.json** - 75 seed domains with metadata

---

**Branch:** query-evolution-research
**GitHub:** https://github.com/fergidotcom/reference-refinement/tree/query-evolution-research
**Created:** 2025-11-11 by Mac Claude Code
**Ready for:** Claude Code Web overnight execution
**Estimated Duration:** 6-8 hours
**Budget:** $630-900

✅ **Everything is ready. Just clone, install, and run!**
