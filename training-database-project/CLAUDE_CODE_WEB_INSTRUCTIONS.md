# Training Database Project - Claude Code Web Launch Instructions

**For Claude Code Web Execution - Complete Setup and Launch Guide**

## Project Overview

**Objective:** Create 300-reference training database with rich contextual relevance text extracted from real source documents.

**Output:** `TrainingDecisions.txt` with 200-word relevance explanations for algorithm testing

**Branch:** `training-database` (isolated from `query-evolution-research` and `main`)

**Parallel Execution:** This project runs independently alongside Query Evolution experiments

---

## Setup

### 1. Clone and Checkout Training Database Branch

```bash
# Clone repository (if not already cloned)
git clone https://github.com/fergidotcom/reference-refinement.git
cd reference-refinement

# Checkout training-database branch
git checkout training-database

# Navigate to project directory
cd training-database-project

# Verify branch
git branch --show-current
# Should output: training-database
```

### 2. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Verify installation
node --version  # Should be 18.x or higher
npm list @anthropic-ai/sdk  # Should show installed
```

### 3. Set Environment Variables

```bash
# Set Anthropic API key
export ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Verify it's set
echo $ANTHROPIC_API_KEY
```

**⚠️ CRITICAL:** The API key must be set before running relevance-generator.js

---

## Execution

### Run Harvesting Pipeline

Execute phases sequentially:

```bash
# Phase 1: Document Collection
node harvesting/document-collector.js

# Phase 2: Citation Extraction
node harvesting/citation-extractor.js

# Phase 3: Context Analysis
node harvesting/context-analyzer.js

# Phase 4: Relevance Generation (uses Claude API)
node harvesting/relevance-generator.js
```

**Full Pipeline (All Phases):**

```bash
# Run all phases sequentially
npm run harvest
```

**Or manually:**

```bash
node harvesting/document-collector.js && \
node harvesting/citation-extractor.js && \
node harvesting/context-analyzer.js && \
node harvesting/relevance-generator.js
```

---

## What to Expect

### Timeline

- **Phase 1 (Document Collection):** Manual + ~10 minutes (provides collection guide)
- **Phase 2 (Citation Extraction):** ~5-10 minutes (depends on document count)
- **Phase 3 (Context Analysis):** ~10-15 minutes (context extraction)
- **Phase 4 (Relevance Generation):** ~50-60 minutes (300 × Claude API calls)

**Total Runtime:** 4-6 hours (mostly Phase 4 API calls)

### Web Credits Usage

**Significant web credit usage** for:
- Document analysis and parsing
- Context extraction and understanding
- **Relevance text generation** (300 × Claude API calls - dominates cost)

**Estimated Cost:** ~$5-10 for Claude API (Phase 4)

**Scale:** Similar to Query Evolution experiments (3,150+ combinations)

### Progress Monitoring

Phase outputs showing:

**Phase 1:**
```
📚 Training Database Document Collector
=====================================

📖 Phase 1: Collecting Academic Papers
---------------------------------------
  🔬 arXiv.org papers:
    • physics: Searching for papers...
    ...

✓ Collection log saved
📋 MANUAL COLLECTION GUIDE
...
```

**Phase 2:**
```
📚 Training Database Citation Extractor
=======================================

📂 Loading source documents...
✓ Found 100 source documents

🔍 Extracting citations from documents...
  Processing: arxiv_physics_12345.pdf
    ✓ Extracted 35 citations
  ...

📊 Extraction Summary
=======================================
Documents processed: 100
Citations extracted: 320
Unique citations: 300
```

**Phase 3:**
```
🔍 Training Database Context Analyzer
====================================

📂 Loading extracted citations...
✓ Loaded 300 citations

🔍 Analyzing citation contexts...
[1/300] Author, A. (2020)
  ✓ Context found (1845 chars)
[2/300] Author, B. (2021)
  ✓ Context found (2103 chars)
  ...

📊 Context Analysis Summary
====================================
Citations analyzed: 300
With context: 285
Without context: 15
Context rate: 95%
```

**Phase 4:**
```
✨ Training Database Relevance Generator
=======================================

📂 Loading citations with context...
✓ Loaded 300 citations with context

✨ Generating 200-word relevance text...
This may take a while (300 citations × ~10 seconds = ~50 minutes)

[1/300] Author, A. (2020)
  ✓ Generated (203 words)

[2/300] Author, B. (2021)
  ✓ Generated (198 words)

...

[300/300] Author, Z. (2025)
  ✓ Generated (201 words)

📝 Writing TrainingDecisions.txt...
  ✓ TrainingDecisions.txt saved

📊 Relevance Generation Summary
=======================================
Citations processed: 300
Successfully generated: 300
Failed: 0
Success rate: 100%

API Usage:
  Total tokens: 270,000
  Estimated cost: $4.50

Output file: outputs/TrainingDecisions.txt

✅ Training database ready for v21.0!
=======================================
```

---

## Output

### Primary Output File

**Location:** `training-database-project/outputs/TrainingDecisions.txt`

**Format:**
```
[001] Author, A. (2020). Title from Real Source. Publisher.
Relevance: Johnson's 2018 study provides comprehensive analysis of residential segregation patterns across 50 major U.S. cities from 1990-2015. This reference is crucial because it offers empirical evidence that zoning regulations systematically concentrate poverty and limit housing mobility. The study's longitudinal data directly supports the argument that urban planning policies have measurable social equity impacts, not just economic ones. Johnson's methodology of comparing census tract changes over 25 years provides the temporal scope needed to demonstrate causation rather than correlation. The reference strengthens the policy recommendation section by showing concrete examples where zoning reform led to improved integration outcomes in Seattle and Portland. This empirical foundation is essential for moving beyond theoretical discussions of equity to evidence-based urban planning proposals.
Primary URL:
Secondary URL:
Q:
FLAGS[TRAINING]

[002] Author, B. (2021). Another Title. Journal Name.
Relevance: [200 words of rich contextual explanation...]
Primary URL:
Secondary URL:
Q:
FLAGS[TRAINING]

...

[300] Author, Z. (2025). Final Reference. Publication.
Relevance: [200 words...]
Primary URL:
Secondary URL:
Q:
FLAGS[TRAINING]
```

**Key Features:**
- ✅ 300 complete references with bibliographic data
- ✅ All relevance texts 180-220 words (target: 200)
- ✅ All references tagged with `TRAINING` flag
- ✅ Empty URL/query fields (intentional - for v21.0 testing)
- ✅ Diverse distribution across categories

### Supporting Output Files

- `outputs/extracted-citations.json` - Phase 2 output
- `outputs/context-analysis.json` - Phase 3 output
- `inputs/citation-extraction-log.json` - Processing logs

---

## Quality Checks

After generation completes, verify output quality:

```bash
# Check reference count (should be 300)
grep -c "^\[" outputs/TrainingDecisions.txt

# Check all have relevance text
grep -c "^Relevance:" outputs/TrainingDecisions.txt

# Check all have TRAINING flag
grep -c "FLAGS\[TRAINING\]" outputs/TrainingDecisions.txt

# Sample relevance text word counts
grep "^Relevance:" outputs/TrainingDecisions.txt | head -10 | \
  while read line; do echo "$line" | wc -w; done
```

**Expected Output:**
```
300  # Reference count
300  # Relevance count
300  # TRAINING flag count
203  # Word counts should be ~180-220
198
201
...
```

---

## Troubleshooting

### Phase 1: Document Collection

**Issue:** No automatic collection
**Solution:** Phase 1 provides manual collection guide. Follow printed instructions to download documents to `inputs/source-documents/`

### Phase 2: Citation Extraction

**Issue:** "No source documents found"
**Solution:** Add documents to `inputs/source-documents/` directory first

**Issue:** Low citation count
**Solution:** Add more documents, prefer review articles with 30+ references

### Phase 3: Context Analysis

**Issue:** Low context rate (<80%)
**Solution:** Normal for some reference types. Proceed if rate >70%

**Issue:** "Failed to load citations"
**Solution:** Run Phase 2 first to generate `extracted-citations.json`

### Phase 4: Relevance Generation

**Issue:** "ANTHROPIC_API_KEY not set"
**Solution:** `export ANTHROPIC_API_KEY=your_key_here`

**Issue:** API rate limiting
**Solution:** Script has 1-second delay built in. If still rate limited, edit line to increase delay

**Issue:** Generation failures
**Solution:** Script continues on failures. Retry failed citations manually after main run

**Issue:** Cost concerns
**Solution:** Test with smaller subset first:
```bash
# Edit relevance-generator.js to process first 50 citations
# Or use cost estimation:
node harvesting/relevance-generator.js --estimate 50
```

---

## Cost Management

### Before Running Phase 4

```bash
# Estimate cost for 300 citations
node harvesting/relevance-generator.js --estimate 300

# Output:
# Citations: 300
# Estimated input tokens: 150,000
# Estimated output tokens: 120,000
# Estimated cost: $2.25
```

### Actual costs may vary based on:
- Context length per citation (more context = higher input tokens)
- Generation length (target 200 words = ~400 output tokens)
- API pricing changes

### Budget-Conscious Approach

Start with smaller subset to test pipeline:

```bash
# Phase 1-3: Collect 30 documents (~100 citations)
# Phase 4: Generate relevance for 100 citations
# Cost: ~$0.75 for testing

# If successful, scale to full 300
```

---

## Success Criteria

After completion, verify:

1. ✅ **300 references** in TrainingDecisions.txt
2. ✅ **All relevance texts** are 180-220 words
3. ✅ **All references** have `TRAINING` flag
4. ✅ **Diverse categories** represented (academic, government, news, edge cases)
5. ✅ **No duplicate references** (verified by unique author+year+title)

---

## Next Steps After Completion

### Immediate

1. **Validate output quality** - Run quality checks above
2. **Commit to branch** - Save TrainingDecisions.txt to git
3. **Upload to main** - Merge or cherry-pick to main branch

### Integration with v21.0

1. **Use for algorithm testing** - Test query generation and ranking strategies
2. **Measure success rates** - Compare performance vs production data
3. **Identify improvement areas** - Which reference types need better handling
4. **Iterate and expand** - Create additional training sets for specific domains

### Reporting

Create summary report:
- Total references processed
- Context analysis success rate
- Relevance generation success rate
- Token usage and costs
- Time taken per phase
- Quality metrics (word counts, diversity, etc.)

---

## Additional Notes

### Branch Isolation

- ✅ `training-database` branch is completely isolated
- ✅ No impact on `main` production branch
- ✅ No impact on `query-evolution-research` experiments
- ✅ Safe to run in parallel with Query Evolution

### Data Integrity

- All phases create backups and logs
- Resume capability for interrupted processes
- Output files are versioned and timestamped

### Manual Collection Phase

Phase 1 (document-collector.js) provides detailed manual collection guide because:
- Academic papers often require institutional access
- Government reports best downloaded directly from agencies
- News articles may require subscriptions or archive access

Follow the printed guide to collect ~100 source documents before Phase 2.

---

## Support

**Questions or Issues?**

1. Check README.md for detailed phase documentation
2. Review collection-strategy.yaml for source guidelines
3. Examine harvesting script comments for implementation details
4. Consult Claude.ai perspective for strategic context

**Branch Context:**
- Created: November 12, 2025
- For: Reference Refinement v21.0 development
- Parallel to: Query Evolution experiments
- Purpose: Context-aware training database

---

## Quick Reference Commands

```bash
# Setup
git checkout training-database && cd training-database-project
npm install
export ANTHROPIC_API_KEY=your_key_here

# Estimate costs
node harvesting/relevance-generator.js --estimate 300

# Run pipeline
node harvesting/document-collector.js
node harvesting/citation-extractor.js
node harvesting/context-analyzer.js
node harvesting/relevance-generator.js

# Validate output
grep -c "^\[" outputs/TrainingDecisions.txt  # Should be 300
grep -c "FLAGS\[TRAINING\]" outputs/TrainingDecisions.txt  # Should be 300

# Check context and costs
tail -100 outputs/context-analysis.json  # Review context quality
grep "estimated_cost" outputs/context-analysis.json  # Check costs
```

---

**Generated:** November 12, 2025
**For:** Claude Code Web Execution
**Branch:** `training-database`
**Estimated Runtime:** 4-6 hours
**Estimated Cost:** $5-10

**✅ Ready to launch!**
