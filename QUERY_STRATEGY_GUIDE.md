# Query Strategy Experimentation Guide

**Date:** October 28, 2025
**Purpose:** Document query strategy options for batch processing and manual ranking

---

## Available Query Modes

Both the iPad app and batch processor support different query strategies:

### Simple Mode (3 queries)
**Config:** `query_mode: "simple"`
**Cost:** ~$0.06 per reference
**Best for:** Quick tests, known items, clear titles

**Query breakdown:**
1. Title + author + year + filetype:pdf
2. Title + author + site:.edu OR site:.gov
3. Title + review OR analysis

### Standard Mode (8 queries)
**Config:** `query_mode: "standard"`
**Cost:** ~$0.12 per reference
**Best for:** Comprehensive coverage, difficult references

**Query breakdown:**
1-4: Primary-focused (75% full-text, 25% publisher)
5-8: Secondary-focused (75% reviews, 25% themes)

---

## Configuration Files

### Test on Refs 102-106
**File:** `batch-config-test5.yaml`
**Current setting:** standard (8 queries)
**To change:** Edit line 19: `query_mode: "simple"` or `"standard"`

### Production Batch
**File:** `batch-config.yaml`
**Refs:** 101-110
**To change:** Edit `query_mode` field

### Auto-select Unfinalized
**File:** `batch-config-unfinalized.yaml`
**Automatically processes refs without FINALIZED flag**
**To change:** Edit `query_mode` field

---

## iPad App Query Control

**Location:** Main screen, above Queries textarea
**Controls:**
- Primary queries: Dropdown (0-8)
- Secondary queries: Dropdown (0-8)
- **Constraint:** Total must equal 8

**Preset buttons:**
- **4+4:** Balanced (default)
- **6+2:** Primary-focused (more full-text candidates)
- **2+6:** Secondary-focused (more review candidates)

**Custom:** Adjust dropdowns manually for any split (e.g., 7+1, 3+5)

---

## Experimentation Workflow

### Test Different Query Counts

1. **Edit config file:**
   ```bash
   nano batch-config-test5.yaml
   # Change line 19: query_mode: "simple" or "standard"
   ```

2. **Run batch:**
   ```bash
   node batch-processor.js --config=batch-config-test5.yaml
   ```

3. **Review results in iPad app:**
   - Terminate Safari
   - Reload app
   - Check URL quality for refs 102-106

4. **Repeat with different settings**

### Test Different Query Allocations (iPad Only)

1. Open reference in Edit modal
2. Adjust Primary/Secondary query dropdowns
3. Click "Suggest Queries (AI)"
4. Click "Query & Search"
5. Review candidates
6. Compare with different allocations

---

## Query Strategy Comparison

| Strategy | Queries | Cost/Ref | Time | Best For |
|----------|---------|----------|------|----------|
| Simple | 3 | $0.06 | Fast | Known items, clear titles |
| Standard | 8 | $0.12 | Slower | Comprehensive, obscure works |
| 6+2 | 8 | $0.12 | Slower | When reviews are hard to find |
| 2+6 | 8 | $0.12 | Slower | When primary is easy, need reviews |

---

## Previous Test Results

**From initial batch test (refs 102-106):**

### Simple Mode (3 queries):
- Success rate: 60% (3/5 complete)
- Found good primary URLs
- Struggled with secondary URLs

### Standard Mode (8 queries):
- Success rate: 40% (2/5 complete) initially
- Improved with mutual exclusivity rules
- Better secondary URL coverage

**Lesson:** More queries isn't always better. Quality > quantity.

---

## Current Enhancements (v14.5)

Both systems now have:

### 1. Mutual Exclusivity Rules
- Full-text sources → PRIMARY only
- Reviews/analyses → SECONDARY only
- Prevents duplication

### 2. Language Detection
- Non-English domains capped at P:70
- Prevents German/French books from scoring too high

### 3. Content-Type Detection
- Distinguishes actual sources from reviews
- Distinguishes scholarly reviews from review websites
- Distinguishes reviews from bibliography listings

---

## Recommendation

**For batch processing:**
- Start with **standard mode (8 queries)** for comprehensive coverage
- Monitor results for first 10 refs
- If > 80% success rate: Continue
- If < 50% success rate: Review query generation prompts

**For manual refinement:**
- Use **4+4 (balanced)** as default
- Switch to **6+2** if can't find full-text
- Switch to **2+6** if can't find reviews

---

## How to Change Query Strategy

### Batch Processor
```bash
# Edit config file
nano batch-config-test5.yaml

# Change query_mode
query_mode: "simple"    # 3 queries
# or
query_mode: "standard"  # 8 queries

# Save and run
node batch-processor.js --config=batch-config-test5.yaml
```

### iPad App
1. Open reference in Edit modal
2. Click "Suggest & Query" tab
3. Adjust dropdowns above Queries textarea:
   - Primary: 0-8
   - Secondary: 0-8
   - (Total must = 8)
4. Click preset button or adjust manually
5. Generate queries and search

---

## Future Enhancements

**Planned:**
- Custom query templates by work type (book, article, chapter)
- Adaptive query strategy (start simple, escalate if needed)
- Query quality scoring (which queries found the best URLs)
- Hybrid 5-query mode (balance speed and coverage)

---

**Status:** Both systems support query experimentation
**Last Updated:** October 28, 2025
**Version:** v14.5
