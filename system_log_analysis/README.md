# System Log Analysis Tools

Tools for analyzing Reference Refinement debug logs to improve query generation and autorank algorithms.

## Overview

These Python scripts parse debug logs and analyze user override patterns to identify opportunities for system improvement. The goal is to reduce the manual override rate from ~100% to <30% through iterative refinement.

## Files

- **`parse_debug_log.py`** - Parses debug log text files into structured JSON
- **`analyze_overrides.py`** - Analyzes parsed logs for override patterns
- **`README.md`** - This file

## Prerequisites

- Python 3.7+
- No external dependencies (uses only standard library)

## Usage

### Step 1: Get a Debug Log

Debug logs are saved to Dropbox when you click "Save Session Log to Dropbox" in the app.

**Location:** `Dropbox/Apps/Reference Refinement/debug_logs/session_TIMESTAMP.txt`

**Or download from the app:**
1. Process several references (10-20 recommended)
2. Open Debug tab (Tab 3)
3. Click "Save Session Log to Dropbox"
4. Find file in Dropbox

### Step 2: Parse the Log

```bash
python parse_debug_log.py session_2025-10-23T21-24-53.txt parsed_log.json
```

**Output:** Structured JSON with all reference data

### Step 3: Analyze Overrides

```bash
python analyze_overrides.py parsed_log.json
```

**Output:** Terminal report + `parsed_log_analysis.json`

## Example Workflow

```bash
# 1. Navigate to analysis directory
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/system_log_analysis/

# 2. Parse a debug log from Dropbox
python parse_debug_log.py \
  ~/Library/CloudStorage/Dropbox/Apps/Reference\ Refinement/debug_logs/session_2025-10-23T21-24-53.txt \
  batch1_parsed.json

# 3. Analyze the parsed log
python analyze_overrides.py batch1_parsed.json

# Output will show:
# - Override rate
# - Domain preferences
# - Query effectiveness
# - Specific recommendations
```

## Output Interpretation

### Override Rate

- **>80%**: Major misalignment - AI rankings don't match user preferences
- **50-80%**: Moderate misalignment - needs tuning
- **<30%**: Good alignment - ready for automation

### Query Effectiveness

Shows which queries successfully find selected URLs.

**Good queries** (high effectiveness):
- Bibliographic: `"Title" Author Year filetype:pdf`
- Site-specific: `Author work site:publisher.com`

**Bad queries** (0 results):
- Too specific with multiple constraints
- Overly long phrases that don't match any documents

### Domain Analysis

Reveals user preferences:
- **Institutional archives** (.edu, .gov, dtic.mil, jstor.org)
- **Publisher sites** (oup.com, mit.edu, cambridge.org)
- **Avoid**: Aggregators (scholar.google.com, researchgate.net)

### Recommendations

The analyzer generates prioritized recommendations:

**HIGH Priority:**
- Fundamental mismatches (e.g., AI prefers aggregators, user prefers archives)
- Requires prompt changes in `llm-rank.ts` or `llm-chat.ts`

**MEDIUM Priority:**
- Fine-tuning opportunities
- Query pattern improvements

**LOW Priority:**
- Minor optimizations

## Refinement Process

### Phase 1: Initial Analysis (10-20 references)

```bash
# Process 10-20 references manually
# Save debug log
# Run analysis

python parse_debug_log.py batch1.txt batch1.json
python analyze_overrides.py batch1.json

# Review recommendations
# Update prompts in codebase
```

### Phase 2: Validation (10 new references)

```bash
# Process 10 more references with updated system
# Compare override rate: Did it decrease?

python analyze_overrides.py batch2.json

# If improvement < 20%, iterate on prompts
# If improvement > 20%, continue to Phase 3
```

### Phase 3: Production Testing (20+ references)

```bash
# Process larger batch
# Measure final override rate
# If < 30%, enable confidence-based automation
```

## Prompt Refinement Examples

### Example 1: Prioritize Institutional Archives

**Finding:** User consistently selects .edu and .gov domains over publisher sites

**Action:** Update `llm-rank.ts` ranking prompt:

```typescript
const prompt = `...
DOMAIN PREFERENCES (in priority order):
1. Government/institutional archives: .gov, .mil, .edu repositories
2. Academic publishers with DOI: jstor.org, doi.org, oup.com
3. Publisher official sites: press.university.edu
4. PDF on academic websites: faculty.university.edu/~author
5. Commercial vendors: Amazon, Google Books (only for unavailable works)

PENALTIES:
- Aggregator sites (Google Scholar profiles, ResearchGate): -50 points
- Link aggregators without content: -100 points
...`;
```

### Example 2: Remove Ineffective Queries

**Finding:** Queries with multiple ISBN/DOI constraints return 0 results

**Action:** Update `llm-chat.ts` query generation prompt:

```typescript
const prompt = `...
AVOID:
- Queries combining ISBN + DOI + exact title (too specific)
- Queries > 100 characters
- Phrases with more than 3 quoted segments
...`;
```

### Example 3: Boost Winning Query Patterns

**Finding:** Queries like `"Title" Author Year filetype:pdf` are 80% effective

**Action:** Update `llm-chat.ts` to generate more of these:

```typescript
const prompt = `...
PROVEN PATTERNS (use frequently):
1. "Exact Title" Author Year filetype:pdf
2. Author Year "key phrase from title" site:.edu
3. Author "publication venue" Year PDF
...`;
```

## Continuous Improvement Cycle

```
Process Batch → Save Debug Log → Parse → Analyze
                                           ↓
                                    Recommendations
                                           ↓
                                   Update Prompts
                                           ↓
                                   Deploy & Test
                                           ↓
                                   Compare Metrics
                                           ↓
                                   Iterate ←──────┘
```

## Success Metrics

Track these across batches:

| Metric | Baseline | Target | Current |
|--------|----------|--------|---------|
| Override Rate | 100% | <30% | TBD |
| Avg Queries/Reference | 15 | 10-12 | 15 |
| Ineffective Queries | 20% | <10% | TBD |
| Time/Reference | 15min | <3min | 15min |

## Tips for Effective Analysis

1. **Batch Size**: Start with 10-20 references for initial analysis
2. **Reference Diversity**: Include different types (books, articles, old/new)
3. **Consistent Criteria**: Use same URL selection criteria across all references
4. **Document Decisions**: Note why you override AI recommendations
5. **Iterate Quickly**: Small prompt changes, test, measure, repeat

## Next Steps After Analysis

Once override rate is <30%:

1. **Implement Confidence Thresholds**
   - High confidence (>90): Auto-finalize
   - Medium (70-90): Flag for review
   - Low (<70): Manual workflow

2. **Build Exception Handling**
   - Self-published works
   - Pre-1970 references
   - Non-English works
   - Unusual formats

3. **Monitor Production**
   - Track auto-finalized vs manual
   - Weekly review of edge cases
   - Continue logging for further refinement

## Troubleshooting

**Parser fails with regex error:**
- Log format may have changed
- Update regex patterns in `parse_debug_log.py`
- Check for special characters in reference text

**Analysis shows 0 overrides:**
- Ensure references are finalized in the log
- Check that AI autorank was actually run
- Verify log contains "Autorank Results" sections

**Recommendations seem generic:**
- Need larger sample size (>20 references)
- Ensure variety in reference types
- Check that user selections are actually different from AI

## Version History

- **v1.0** (Oct 23, 2025): Initial release with parse + analyze scripts
- Parser supports v11.2+ log format with query traceability

## Contact

For questions or issues with these tools, see main project documentation.
