# API Cost Tracker - Reference Refinement Tool

**Last Updated:** October 27, 2025

---

## 🎉 v14.2 Enhancement: Real-Time Cost Tracking

**As of v14.2 (Oct 27, 2025)**, the application now includes **built-in real-time cost tracking** in the Debug tab:

- **Per-Operation Costs:** Query generation and autorank panels show tokens used and cost
- **Session Cost Summary Panel:** Displays cumulative session totals with:
  - Google search count and cost
  - Claude API calls, tokens, and cost breakdown
  - Average cost per reference
  - Projections for batch runs (100 and 500 references)

**Location:** Debug tab (Tab 3) → Shows "💰 Session Cost Summary" panel after each operation

This document continues to serve as historical tracking, but live sessions now have real-time visibility.

---

## Current Totals (User Reported)

**As of:** October 27, 2025, ~8:30 PM

| API | Current Total | Rate |
|-----|--------------|------|
| **Claude (Anthropic)** | **$4.16** | $0.003/1K input, $0.015/1K output |
| **Google Custom Search** | **$84.39** | $0.005/query |

**Combined Total:** **$88.55**

---

## Cost Breakdown by Session

### Session: 2025-10-28T02-33-00.txt (Oct 27, 20:33)
- **References processed:** 2 (Searle 2010, Hacking 1999)
- **Google API:**
  - Searches: 16
  - Cost: $0.08
- **Claude API (Sonnet 4):**
  - Query Generation: 2 calls (1,616 input + 275 output tokens)
  - Ranking: 8 calls (15,474 input + 2,637 output tokens)
  - Total: 20,002 tokens
  - Cost: $0.095
- **Session Total:** $0.175

### Session: 2025-10-28T01-43-46.txt (Oct 27, 19:43)
- **References processed:** 2 (Searle 2010, Hacking 1999 - initial test)
- **Cost:** (Need to extract from log - TODO)

---

## Historical Tracking (TODO)

To get a complete picture, I need to analyze all session logs and extract:
1. Number of searches per session
2. Token usage per session
3. Per-reference costs

**Estimated based on current totals:**
- Google searches executed: ~16,878 searches ($84.39 / $0.005)
- Claude tokens used: ~389,333 tokens estimated (rough calculation from $4.16)

---

## Cost Analysis

### Google Custom Search Cost Drivers

**At $84.39 with $0.005/query:**
- **Total searches:** ~16,878 queries
- **Average per reference:** Depends on query count (typically 8 queries per reference)
- **Estimated references processed:** ~2,110 references (16,878 / 8)

**High Google cost indicates:**
- Large volume of references processed
- OR multiple retry/regeneration cycles
- Majority of total API cost (95% Google, 5% Claude)

### Claude API Cost Drivers

**At $4.16:**
- Query generation (shorter prompts, smaller token usage)
- Ranking (longer prompts with candidate lists)
- Sonnet 4 rates: $3 input / $15 output per 1M tokens

**Token usage estimate:**
- Input: ~$1.25 worth = ~417K input tokens
- Output: ~$2.91 worth = ~194K output tokens

### Cost Per Reference (Estimated)

Assuming ~2,110 references processed:
- **Per reference:** ~$0.042 total
  - Google: ~$0.040 (8 searches × $0.005)
  - Claude: ~$0.002 (query gen + ranking)

---

## Cost Optimization Opportunities

### 1. Query Deduplication
If the same reference is processed multiple times (testing, refinement), could cache:
- Generated queries
- Search results
- Rankings

**Savings:** Up to 50% on retry cycles

### 2. Batch Query Generation
Generate queries for multiple references in one API call
**Current:** 1 reference per call
**Proposed:** 5-10 references per call
**Savings:** ~30-40% on Claude query generation costs

### 3. Search Result Caching
Cache Google search results for common queries
**Example:** "Searle 2010 filetype:pdf" likely returns same results
**Savings:** Minimal (search results change over time)

### 4. Ranking Optimization
Already optimized:
- ✅ Batch size: 15 candidates per ranking call
- ✅ Reduced max_tokens: 800 (from 1500 in earlier versions)
- ✅ Simplified prompt in v13.9

---

## Cost Projections

### Scenario: 100 References (Batch Run)

**Google:**
- 8 queries × 100 references = 800 searches
- 800 × $0.005 = **$4.00**

**Claude:**
- Query Generation: 100 calls × ~1,000 tokens avg = ~100K tokens
  - Cost: ~$0.30 (mostly input)
- Ranking: ~400 calls (100 refs × 4 batches avg) × ~2,500 tokens avg = ~1M tokens
  - Cost: ~$3.00 (input) + ~$6.00 (output) = ~$9.00
- **Total Claude: ~$9.30**

**Estimated Total for 100 refs:** ~$13.30

### Scenario: Remaining References

If you've processed ~2,110 references so far at $88.55:
- **Cost per reference:** $0.042
- **For 100 more references:** ~$4.20
- **For 500 more references:** ~$21.00
- **For 1,000 more references:** ~$42.00

---

## Monitoring Recommendations

### 1. Add Cost Tracking to UI
Display running costs in Debug tab:
```
Session Cost: $0.18
- Google: $0.08 (16 searches)
- Claude: $0.10 (20K tokens)
```

### 2. Budget Alerts
Set thresholds:
- Warning at $100 total
- Critical at $150 total

### 3. Per-Reference Cost Display
Show in each reference card:
```
API Cost: $0.04
- Queries: $0.04 (8 searches)
- Ranking: $0.002 (4 batches)
```

---

## Cost Trend Analysis (TODO)

Track costs over time to identify:
- Increasing costs (more complex references?)
- Decreasing costs (optimizations working?)
- Anomalies (failed requests, retries)

**Next steps:**
1. Parse all historical session logs
2. Extract cost data
3. Generate trend charts
4. Identify optimization opportunities

---

## Notes

- Google cost dominates (95% of total) due to high search volume
- Claude cost is relatively low (5% of total)
- Main cost driver: Number of references processed
- v13.9-v14.1 optimizations should reduce per-reference Claude costs
- Consider caching strategies for batch processing

---

**Would you like me to:**
1. Parse all historical logs and build complete cost history?
2. Add real-time cost tracking to the UI?
3. Create cost projection models for batch runs?
