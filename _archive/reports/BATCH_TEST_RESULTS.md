# Batch Processor Test Results - Refs 102-106

**Goal:** Get high-quality Primary and Secondary URLs for all 5 test references

---

## Test Results Summary

### Test 1: 3 Queries (Simple Mode)

| Ref | Title | Primary Score | Secondary Score | Result |
|-----|-------|---------------|-----------------|--------|
| 102 | Televised Presidential Debates | P:95 ✅ | S:90 ✅ | SUCCESS |
| 103 | President Reagan | P:95 ✅ | S:90 ✅ | SUCCESS |
| 104 | News That Matters | P:80 ✅ | S:20 ❌ | PARTIAL |
| 105 | Inventing the Internet | P:95 ✅ | S:90 ✅ | SUCCESS |
| 106 | The Web of Politics | P:40 ❌ | S:55 ❌ | FAILED |

**Success Rate:** 3/5 both URLs (60%), 4/5 at least primary (80%)

### Test 2: 8 Queries (Standard Mode)

| Ref | Title | Primary Score | Secondary Score | Result |
|-----|-------|---------------|-----------------|--------|
| 102 | Televised Presidential Debates | NONE ❌ | S:90 ✅ | PARTIAL |
| 103 | President Reagan | P:100 ✅ | S:90 ✅ | SUCCESS |
| 104 | News That Matters | P:85 ✅ | NONE ❌ | PARTIAL |
| 105 | Inventing the Internet | P:95 ✅ | S:95 ✅ | SUCCESS |
| 106 | The Web of Politics | NONE ❌ | NONE ❌ | FAILED |

**Success Rate:** 2/5 both URLs (40%), 3/5 at least primary (60%)

**Observation:** MORE queries ≠ BETTER results. 3 queries performed better overall.

---

## Problem References

### REF 102: Televised Presidential Debates
- **Issue:** With 8 queries, primary dropped below 75 (or wasn't found)
- **3-query primary:** https://api.pageplace.de/preview/... (P:95)
- **Best strategy:** 3 queries found it, 8 queries lost it

### REF 104: News That Matters
- **Issue:** Hard to find secondary URL (review/analysis)
- **3-query:** P:80, no secondary
- **8-query:** P:85 (better!), no secondary
- **Need:** Better secondary-focused queries

### REF 106: The Web of Politics
- **Issue:** No high-scoring URLs found with either query count
- **Best scores:** P:40, S:55 (both below threshold)
- **Need:** Completely different query strategy

---

## Experiments to Try

### Experiment 1: Hybrid Query Strategy (5 queries)
- 3 primary-focused queries (proven to work)
- 2 secondary-focused queries (reviews/analyses)
- **Rationale:** Balance between coverage and quality

### Experiment 2: Targeted Query Improvements
For REF 106 specifically:
- Add publisher-specific queries (Oxford University Press)
- Add year-specific queries (2003)
- Add author-specific queries (Richard Davis)

### Experiment 3: Query Specialization by Work Type
- **Books:** Focus on archive.org, Google Books, publisher sites
- **Articles:** Focus on journal sites, academic databases
- **Chapters:** Focus on book previews, chapter PDFs

### Experiment 4: Lower Thresholds for Difficult Refs
- Current threshold: P≥75, S≥75
- Test threshold: P≥70, S≥70 for refs that repeatedly fail
- **Risk:** Lower quality URLs
- **Benefit:** Get SOME URL rather than none

---

## Next Steps

1. **Test Hybrid 5-Query Strategy** on all 5 refs
2. **Create targeted queries** for REF 106 (worst performer)
3. **Analyze what makes 103 & 105 succeed** (both got 95+ consistently)
4. **Test ref-specific query customization** based on available metadata

---

## Current Batch Processor Status

✅ **Working Features:**
- Automatic backup before each run
- Query generation (3 or 8 queries)
- Search and deduplication
- Ranking with scores
- URL mapping from rankings
- Progress tracking and resume
- Detailed logging with scores

⚠️ **Needs Improvement:**
- Query strategy (3 vs 8 vs hybrid?)
- Secondary URL discovery (reviews/analyses)
- Handling difficult references (REF 106)

---

**Date:** October 28, 2025
**Version:** Batch Processor v1.0
