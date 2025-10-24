# Learning Strategy: Reference Refinement System

## Overview

The Reference Refinement System uses an **iterative learning approach** to align AI-powered URL selection with user preferences. By analyzing debug logs from user sessions, the system identifies patterns, learns preferences, and automatically refines its query generation and ranking algorithms.

**Goal:** Reduce override rate from baseline (~50%) to automation-ready (<30%) through systematic learning and refinement.

---

## How the Learning System Works

### 1. Data Collection Phase

Every user interaction is logged to a **System Log File** (debug log) containing:
- Reference metadata (title, authors, year, publication info)
- Generated search queries
- Search results from Google Custom Search
- AI ranking decisions (primary/secondary URL recommendations with scores)
- User selections (which URLs were actually chosen)
- Finalization status and timestamps

### 2. Analysis Phase

The system runs a **4-stage analysis pipeline**:

#### Stage 1: Parsing (`parse_debug_log.py`)
- Converts chronological debug log into structured JSON
- Extracts reference-level data with complete workflow history
- Identifies override events (AI recommendation ≠ user selection)

#### Stage 2: Override Analysis (`analyze_overrides.py`)
- Calculates override rate and finalization rate
- Identifies domain preferences (AI vs user)
- Analyzes query effectiveness (which queries found selected URLs)
- Generates initial recommendations

#### Stage 3: Learning Pattern Analysis (`analyze_learning_patterns.py`)
- **Domain Preference Learning:** Scores domains based on selection frequency
- **URL Characteristic Analysis:** Identifies PDF preference, institutional vs commercial, free vs paywalled
- **AI Failure Mode Categorization:** Specific ways AI recommendations fail
- **Confidence Prediction:** Thresholds for auto-finalize vs flag-for-review
- **Automated Prompt Refinements:** Code-level changes to implement

#### Stage 4: Batch Comparison (`compare_batches.py`)
- Tracks improvement over multiple iterations
- Calculates trend lines for override rate
- Estimates batches needed to reach automation goal

### 3. Refinement Phase

Based on analysis results, prompts are manually refined:
- **Query Generation (`rr_v60.html`):** Add proven patterns, remove ineffective ones
- **Ranking Algorithm (`llm-rank.ts`):** Adjust scoring criteria, add domain bonuses, increase penalties

### 4. Deployment & Iteration

- Deploy refined version
- User processes next batch of references
- System analyzes new debug log
- Compare with previous batches to measure improvement
- Repeat until override rate < 30%

---

## Pattern Recognition

### Domain Preferences

The system learns which domains users prefer by calculating a **preference score**:

```
Preference Score = User Selections - AI Recommendations
```

- **Positive score:** User selects this domain more often than AI recommends it → BOOST
- **Negative score:** AI recommends this domain but user rejects it → PENALIZE

**Example from Production Batch 1:**

| Domain | User Selected | AI Recommended | Score | Action |
|--------|---------------|----------------|-------|--------|
| methods.sagepub.com | 1 | 0 | +1 | Boost by +40 points |
| archive.org | 1 | 0 | +1 | Boost by +30 points |
| cdn.bookey.app | 0 | 1 | -1 | Penalize by -30 points |
| us.macmillan.com | 0 | 1 | -1 | Penalize (paywalled publisher) |

### TLD (Top-Level Domain) Preferences

The system tracks preferences by TLD:
- `.edu` - Educational institutions (often free PDFs)
- `.gov` / `.mil` - Government archives (high authority, free)
- `.org` - Non-profit organizations (often free access)
- `.com` - Commercial (varies widely)

**Example Insight:** User prefers `.org` domains (100% selection rate) over `.com` domains.

### URL Characteristics

The system calculates percentages for key characteristics:

**PDF Preference:**
```
PDF % = (Selections with .pdf) / (Total Selections) × 100
```
*Production Batch 1: 100% PDF preference*

**Institutional Preference:**
```
Institutional % = (Selections from .edu/.gov/archives) / (Total Selections) × 100
```
*Production Batch 1: 33% institutional (1 of 3)*

**Direct vs Aggregator:**
```
Direct % = (Selections from direct sources) / (Total Selections) × 100
```
*Production Batch 1: 100% direct (no aggregators like Google Scholar)*

### AI Failure Modes

The system categorizes specific failure patterns:

1. **Recommended Aggregator**
   - AI suggests Google Scholar profile, user selects actual PDF
   - Solution: Hard cap aggregator scores at 40 points

2. **Missed Free Archive**
   - AI suggests paywalled publisher, user finds free archive.org version
   - Solution: Boost archive.org by +30 points

3. **Unknown CDN Over Publisher**
   - AI suggests cdn.bookey.app, user selects methods.sagepub.com
   - Solution: Penalize unknown CDN domains by -40 points

4. **Article ABOUT Work**
   - AI suggests book review, user selects the book itself
   - Solution: Add "THE WORK ITSELF vs ABOUT THE WORK" distinction in prompt

---

## Confidence Scoring System

The system predicts which references can be auto-finalized vs need manual review.

### Auto-Finalize Criteria

**Threshold:** A reference can be auto-finalized when:
- Primary Score ≥ **95**
- Secondary Score ≥ **80**
- Domain is in **preferred domain list**

**Logic:** High-confidence AI recommendations in known-good domains are likely to match user preferences.

### Flag-for-Review Criteria

**Threshold:** A reference should be flagged for manual review when:
- Primary Score < **70**
- OR Secondary Score < **60**
- OR Domain is unknown/not in learned preferences

**Logic:** Low-confidence AI recommendations or unknown domains have high override risk.

### Confidence Model Evolution

As the system learns, the confidence model improves:

| Batch | Override Rate | Auto-Finalize Threshold | Expected Auto-Finalize % |
|-------|---------------|-------------------------|--------------------------|
| 1 | 50% | P≥95, S≥80 | ~10% (too conservative) |
| 3 | 35% | P≥90, S≥75 | ~30% (balanced) |
| 5 | 25% | P≥85, S≥70 | ~50% (automation ready) |

---

## Automated Prompt Refinement Generation

The system generates **specific code changes** based on learned patterns.

### Example 1: Domain Bonuses

**Pattern Detected:** User prefers methods.sagepub.com (+1 score)

**Generated Refinement:**
```typescript
// In llm-rank.ts PRIMARY CRITERIA
if (url.includes('methods.sagepub.com')): +40 points
```

### Example 2: Penalty Increases

**Pattern Detected:** AI recommended aggregator 3 times, user rejected all

**Generated Refinement:**
```typescript
// In llm-rank.ts PENALTIES
if (url.includes('scholar.google.com') || url.includes('researchgate.net')):
  PRIMARY score = max(40)  // Hard cap, not just penalty
```

### Example 3: Query Pattern Refinement

**Pattern Detected:** Queries with ISBNs consistently return 0 results

**Generated Refinement:**
```javascript
// In rr_v60.html AVOID section
❌ Combining ISBN + full publisher name + exact title (too specific)
```

### Example 4: Characteristic Bonuses

**Pattern Detected:** 100% of user selections are PDFs

**Generated Refinement:**
```typescript
// In llm-rank.ts PRIMARY CRITERIA
if (url.endsWith('.pdf')):
  PRIMARY score += 15  // Increased from +10
```

---

## Iterative Improvement Process

### Workflow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ User processes batch of references                      │
│ - Generate queries, search, rank, select, finalize      │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ Debug log generated
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Run System Log Analysis                                 │
│ ./run_analysis.sh <debug_log> batch_N                   │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ├─► Parse log → JSON
                  ├─► Archive finalized references
                  ├─► Analyze overrides
                  ├─► Analyze learning patterns
                  ├─► Compare with previous batches
                  └─► Generate report
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Review Analysis Results                                 │
│ - Override rate: X%                                     │
│ - Domain preferences learned                            │
│ - AI failure modes identified                           │
│ - Recommended refinements generated                     │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Implement Refinements                                   │
│ - Update llm-rank.ts (ranking criteria)                 │
│ - Update rr_v60.html (query generation)                 │
│ - Deploy: netlify deploy --prod                         │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│ Process Next Batch                                      │
│ - Expect lower override rate                            │
│ - Repeat until override rate < 30%                      │
└─────────────────────────────────────────────────────────┘
```

### Measuring Success

**Key Metrics:**

1. **Override Rate**
   ```
   Override Rate = (References with Override) / (Total References) × 100
   ```
   - **Baseline:** ~50% (AI needs improvement)
   - **Target:** <30% (automation ready)

2. **Finalization Rate**
   ```
   Finalization Rate = (Finalized References) / (Total References) × 100
   ```
   - Measures workflow completion efficiency

3. **Query Effectiveness**
   ```
   Effectiveness = (Queries that found selected URLs) / (Total Queries)
   ```
   - Identifies which query patterns work

4. **Improvement Trend**
   ```
   Trend = (Override Rate Batch N) - (Override Rate Batch N-1)
   ```
   - Negative trend = improvement
   - Target: -10% per iteration

### Example Progression

| Batch | References | Override Rate | Trend | Status |
|-------|-----------|---------------|-------|--------|
| 1 | 6 | 50.0% | — | Baseline |
| 2 | 10 | 40.0% | -10.0% | Improving |
| 3 | 15 | 30.0% | -10.0% | On Track |
| 4 | 20 | 25.0% | -5.0% | Automation Ready ✓ |

---

## Usage Guide

### Running Analysis on a New Batch

```bash
# 1. Process references in the UI (rr_v60.html)
# Debug log automatically generated in Dropbox

# 2. Run complete analysis pipeline
cd system_log_analysis/
./run_analysis.sh ~/Library/CloudStorage/Dropbox/Apps/Reference\ Refinement/debug_logs/session_*.txt batch2

# 3. Review generated report
cat batch2_report.md

# 4. Review detailed learning patterns
cat batch2_parsed_learning_analysis.json | jq .

# 5. Check Finalized References Archive
cat ../Finalized_References.txt
```

### Interpreting Analysis Results

**High Priority Actions:**
- **Override Rate > 50%:** Query generation needs major refinement
- **Failure Mode > 3 occurrences:** Specific pattern to address
- **Preferred Domain Score > 0:** Boost this domain in ranking

**Medium Priority Actions:**
- **PDF Preference > 70%:** Increase PDF bonus
- **Institutional Preference > 60%:** Boost .edu/.gov domains
- **Query returns 0 results repeatedly:** Remove or refine query pattern

**Low Priority Actions:**
- **Override Rate 30-40%:** Minor tweaks only
- **Rare failure modes (1-2 cases):** Monitor in next batch

### Implementing Refinements

**Query Generation Refinements** (`rr_v60.html`):
1. Add proven patterns to "PROVEN EFFECTIVE QUERY PATTERNS" section (lines ~2122-2147)
2. Add failing patterns to "AVOID" section
3. Adjust query length guidelines based on effective queries

**Ranking Algorithm Refinements** (`llm-rank.ts`):
1. Add domain bonuses to PRIMARY CRITERIA section (lines ~41-66)
2. Increase penalties in PENALTIES section (lines ~68-74)
3. Add new failure mode checks as needed

**Deployment:**
```bash
cp ~/Downloads/rr_vXX.html rr_v60.html
netlify deploy --prod --message "vX.X - System Log Analysis Iteration N"
```

---

## Advanced Features

### Batch Comparison

The system automatically compares metrics across batches:

```json
{
  "comparison": {
    "override_rate_trend": -10.0,
    "query_effectiveness_trend": +15.2,
    "estimated_batches_to_goal": 2.3
  }
}
```

**Interpretation:**
- Override rate improving by 10% per batch
- Query effectiveness improving by 15% per batch
- ~2-3 more batches needed to reach <30% override rate

### Confidence Prediction

The system can predict which future references will need manual review:

```json
{
  "confidence_model": {
    "auto_finalize_threshold": {
      "primary_score": 95,
      "secondary_score": 80,
      "must_be_in_preferred_domains": true
    },
    "preferred_domain_list": [
      "methods.sagepub.com",
      "archive.org",
      "jstor.org"
    ]
  }
}
```

**Future Implementation:** Add auto-finalize button in UI that applies this logic.

### Learning Curve Visualization

Track progress over time:

```
Override Rate by Batch
50% │ ●
    │
40% │     ●
    │
30% │         ●  ← Target
    │
20% │             ●
    │
10% │                 ●
    │
 0% └─────────────────────
    B1  B2  B3  B4  B5
```

---

## Troubleshooting

### Override Rate Not Improving

**Possible Causes:**
- Refinements not deployed correctly
- User preferences changed
- Reference types changed (different domain of knowledge)

**Solutions:**
1. Verify deployment: Check netlify.com dashboard for latest deploy
2. Review learning patterns: Ensure preferred domains still consistent
3. Consider reference-type-specific rules

### Query Effectiveness Low

**Possible Causes:**
- Queries too specific (overly long, multiple exact phrases)
- Queries too broad (single common word)
- Search results don't contain target URLs

**Solutions:**
1. Review top_queries in analysis for effective patterns
2. Remove ineffective query patterns from llm-chat.ts
3. Add proven effective patterns to PROVEN EFFECTIVE QUERY PATTERNS

### High Finalized Count but High Override Rate

**Interpretation:** User is actively correcting AI errors (good for learning!)

**Action:** This is expected in early batches. Continue processing more batches.

---

## Future Enhancements

### 1. User Commentary Capture
- Add modal for user to explain why they overrode AI recommendation
- Capture reasoning in debug log
- Use NLP to extract preference rules from commentary

### 2. Reference-Type Specific Rules
- Academic journal articles vs books vs reports
- Different ranking criteria for different reference types
- Self-published vs traditional publisher rules

### 3. Automated Refinement Application
- Generate code patches automatically
- Deploy without manual intervention
- A/B test refinements

### 4. Multi-User Learning
- Aggregate patterns across multiple users
- Identify universal preferences vs user-specific quirks
- Collaborative filtering for URL recommendations

---

## Summary

The Reference Refinement System learning strategy is a **systematic, data-driven approach** to aligning AI recommendations with user preferences. Through iterative analysis of user decisions, the system:

1. **Learns** domain preferences, URL characteristics, and failure modes
2. **Predicts** which references can be auto-finalized with high confidence
3. **Generates** specific code refinements to implement improvements
4. **Measures** progress toward automation-ready performance

**Key Success Factors:**
- Consistent batch processing (10-20 references per batch)
- Thorough analysis after each batch
- Disciplined refinement implementation
- Patience through iterative improvement

**Expected Outcome:** After 3-5 batches, override rate should drop below 30%, enabling automated URL selection for majority of references with manual review only for edge cases.
