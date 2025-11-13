# Phase 1 Complete - Reference Refinement v30.0

## Overview

Phase 1 of Reference Refinement v30.0 is **complete**. This document describes the complete implementation of initial document processing with all 5 components.

**Pipeline Flow:**
```
.docx file
    ↓
1. Citation Parser → Convert citations to [123] format
    ↓
2. Context Extractor → Extract paragraph context
    ↓
3. Relevance Generator → Generate 200-word AI explanations
    ↓
4. URL Discoverer → Find and validate Primary/Secondary URLs
    ↓
5. Decisions Writer → Export to decisions.txt
    ↓
decisions.txt (ready for Phase 2 author refinement)
```

---

## Components Built

### Component 1: Citation Parser ✅

**File:** `v30/server/services/citation-parser.js`

**Purpose:** Convert various academic citation formats to standardized bracket notation [123]

**Features:**
- Detects 4 citation formats:
  - Superscript (¹²³) → [123]
  - Parenthetical ((Author, Year)) → [X]
  - Bracket ([123]) → preserved
  - Empty ([ ]) → preserved
- Bibliography extraction and parsing
- Paragraph-level context tracking
- Position mapping for database insertion
- HTML + TXT output generation

**Test:** `node v30/test-citation-parser.js <docx-file>`

**Status:** ✅ Complete and tested

---

### Component 2: Context Extractor ✅

**File:** `v30/server/services/context-extractor.js`

**Purpose:** Extract document context around each citation

**Features:**
- Parse document structure (sections, chapters, headings)
- Extract context at multiple levels:
  - Paragraph containing citation
  - Sentence before/after
  - Section title and number
  - Page number estimation
- Identify claim supported by citation
- Store all metadata for database

**Hierarchical Model:**
```
Context → Relevance → URLs
```

**Status:** ✅ Complete and ready for testing

---

### Component 3: Relevance Generator ✅

**File:** `v30/server/services/relevance-generator.js`

**Purpose:** Generate 200-word AI explanations using Claude API

**Features:**
- Call Anthropic Claude API (claude-3-5-sonnet-20241022)
- Batch processing with rate limiting
- Retry logic for failed API calls
- Token counting and cost tracking
- Cache responses to avoid duplicates
- Validate 200-word target (±10 words)

**Prompt Template:**
```
You are analyzing an academic citation in context.

CITATION: [123]
BIBLIOGRAPHIC INFO: Author (Year). Title.
DOCUMENT CONTEXT: [paragraph with section info]
CLAIM SUPPORTED: [identified claim]

Generate a 200-word explanation that explains:
1. How this reference supports the specific claim
2. What type of evidence it provides
3. Why this particular source is relevant
4. How it connects to the broader scholarly conversation
```

**API Costs:**
- Input: $3 per million tokens
- Output: $15 per million tokens
- Average cost: ~$0.002 per relevance
- 100 references: ~$0.20

**Status:** ✅ Complete and ready for testing

---

### Component 4: URL Discoverer ✅

**File:** `v30/server/services/url-discoverer.js`

**Purpose:** Find and validate Primary/Secondary URLs using v21.0 algorithms

**Features:**
- **3 Query Strategies** (from v21.0 with proven win rates):
  1. `title_first_60_chars` - Default (100% win rate, 82.3% usage)
  2. `title_keywords_5_terms` - MANUAL_REVIEW cases (91.4% win rate, 14.2% usage)
  3. `plus_best_2_from_tier_1` - Edge cases (100% win rate, 3.5% usage)

- **Deep 3-Level Validation:**
  - Level 1: HTTP Status Check (404, 403, 500 errors)
  - Level 2: Content-Type Validation (PDF mismatch detection)
  - Level 3: Content-Based Detection:
    - Paywall patterns (12 patterns)
    - Login requirements (10 patterns)
    - Soft 404s (8 patterns)

- **Ranking Algorithm:**
  - Relevance match (40%) - Does snippet contain key terms?
  - Domain authority (20%) - .edu, .gov, .org prioritized
  - Direct PDF link (20%) - PDF > HTML
  - Validation status (20%) - Must pass all checks

- **Selection:**
  - Primary URL: Highest score, valid
  - Secondary URL: Second highest score, valid

**Status:** ✅ Complete and ready for testing

---

### Component 5: Decisions Writer ✅

**File:** `v30/server/services/decisions-writer.js`

**Purpose:** Export all processed references to decisions.txt format

**Format:**
```
[123] Author, A. (2023). Title of Work. Journal Name, 45(2), 112-134.
[PROCESSING]
Relevance: [200-word explanation from relevance-generator...]
Context: "Full paragraph from manuscript where this citation appears..."
Location: Section 3.2 - Productivity Metrics, Paragraph 15, Page 47
Primary URL: https://doi.org/10.1234/example
Secondary URL: https://backup.com/example
Q: title_first_60_chars
FLAGS[STAGE_1_GENERATED][AUTO_CONTEXT][AUTO_RELEVANCE][AUTO_URLS]
```

**FLAGS System:**
- `STAGE_1_GENERATED` - Created by initial processing
- `AUTO_CONTEXT` - Context auto-extracted
- `AUTO_RELEVANCE` - Relevance auto-generated
- `AUTO_URLS` - URLs auto-discovered
- `MANUAL_REVIEW` - Requires manual review
- `EDGE_CASE` - Processed with edge case strategy
- `CONTEXT_MODIFIED` - Context overridden by author (Phase 2)
- `RELEVANCE_EDITED` - Relevance edited by author (Phase 2)
- `URLS_SELECTED` - URLs manually selected (Phase 2)

**Features:**
- Round-trip capable (can be read back and modified)
- Backward compatible with v18.0/v21.0 format
- Backup creation before overwriting
- Merge capability for updates

**Status:** ✅ Complete and ready for testing

---

### Orchestrator: Document Processor ✅

**File:** `v30/server/services/document-processor.js`

**Purpose:** Coordinate all 5 components into complete pipeline

**Function:**
```javascript
const { processDocument } = require('./server/services/document-processor');

const results = await processDocument(docxPath, {
    outputDir: './output',
    outputFileName: 'decisions.txt',
    enableRelevanceGeneration: true,
    enableUrlDiscovery: true
});
```

**Features:**
- Complete pipeline orchestration
- Progress tracking and reporting
- Error handling and recovery
- Detailed component statistics
- Comprehensive logging

**Status:** ✅ Complete and ready for testing

---

## Testing

### Prerequisites

```bash
cd ~/reference-refinement
npm install  # Installs all dependencies

# Set environment variables
export ANTHROPIC_API_KEY="your-key-here"
export GOOGLE_API_KEY="your-key-here"
export GOOGLE_CX="your-cx-here"
```

### Test Individual Components

```bash
# Component 1: Citation Parser
node v30/test-citation-parser.js v30/test-data/250714TheMythOfMaleMenopause.docx

# Component 1 only (other components tested via complete pipeline)
```

### Test Complete Pipeline

```bash
# Full pipeline (all 5 components)
node v30/test-complete-pipeline.js v30/test-data/250714TheMythOfMaleMenopause.docx

# Skip relevance generation (faster, cheaper testing)
node v30/test-complete-pipeline.js v30/test-data/250625AuthoritarianAscentInTheUSA.docx --no-relevance

# Skip URL discovery (no Google API calls)
node v30/test-complete-pipeline.js v30/test-data/250916CaughtInTheAct.docx --no-urls

# Custom output directory
node v30/test-complete-pipeline.js v30/test-data/manuscript.docx --output-dir=/tmp
```

### Expected Test Results

**Test 1: Myth of Male Menopause** (superscript citations)
- Citations: ~40-60
- Format: superscript
- Expected: 100% conversion, relevance for all, 70%+ URLs

**Test 2: Authoritarian Ascent** (superscript citations)
- Citations: ~100-150
- Format: superscript
- Expected: 100% conversion, relevance for all, 70%+ URLs

**Test 3: Caught In The Act** (bracket citations)
- Citations: ~288
- Format: bracket (already standardized)
- Expected: No conversion needed, relevance for all, 70%+ URLs

---

## Success Criteria

### Required (Must Have) ✅

- ✅ Pipeline completes successfully
- ✅ Citations parsed (> 0)
- ✅ Contexts extracted
- ✅ Output file created
- ✅ No critical errors

### Desirable (Should Have) ⚠️

- ⚠️ Relevance generation succeeded
- ⚠️ URL discovery succeeded
- ⚠️ Most references have relevance (>80%)
- ⚠️ Most references have URLs (>70%)
- ⚠️ Few warnings (<5)

---

## File Structure

```
v30/
├── CITATION_PARSER_README.md          # Component 1 docs
├── PHASE1_COMPLETE_README.md          # This file
├── HANDOFF_TO_MAC_CLAUDE.md           # Testing instructions (OLD - Component 1 only)
├── PHASE1_HANDOFF_TO_MAC.md           # Testing instructions (NEW - Complete pipeline)
├── SESSION_SUMMARY.md                 # Build session summary
│
├── test-citation-parser.js            # Component 1 test
├── test-complete-pipeline.js          # Complete pipeline test
│
├── test-data/                         # Test manuscripts go here
│   ├── 250714TheMythOfMaleMenopause.docx
│   ├── 250625AuthoritarianAscentInTheUSA.docx
│   └── 250916CaughtInTheAct.docx
│
├── cache/                             # Generated cache files
│   └── relevance-cache.json
│
└── server/
    └── services/
        ├── citation-parser.js         # Component 1 ✅
        ├── context-extractor.js       # Component 2 ✅
        ├── relevance-generator.js     # Component 3 ✅
        ├── url-discoverer.js          # Component 4 ✅
        ├── decisions-writer.js        # Component 5 ✅
        └── document-processor.js      # Orchestrator ✅
```

---

## Environment Variables

**Required:**

```bash
# Anthropic Claude API (for relevance generation)
export ANTHROPIC_API_KEY="sk-ant-..."

# Google Custom Search API (for URL discovery)
export GOOGLE_API_KEY="AIza..."
export GOOGLE_CX="0123456789..."
```

**Optional:**
- None currently

---

## API Costs (Estimated)

### Relevance Generation (Claude API)

**Per reference:**
- Input tokens: ~500
- Output tokens: ~250
- Cost per reference: ~$0.002

**For 100 references:**
- Total cost: ~$0.20

**For 300 references:**
- Total cost: ~$0.60

### URL Discovery (Google Custom Search API)

**Per reference:**
- Search queries: 1
- Cost per query: $5 per 1000 queries = $0.005

**For 100 references:**
- Total cost: ~$0.50

**For 300 references:**
- Total cost: ~$1.50

### Total Pipeline Cost

**100 references:** ~$0.70
**300 references:** ~$2.10

---

## Performance

### Component Timings (estimated)

1. **Citation Parser:** ~5-10 seconds
2. **Context Extractor:** ~5-10 seconds
3. **Relevance Generator:** ~60-120 seconds (100 refs)
4. **URL Discoverer:** ~120-240 seconds (100 refs)
5. **Decisions Writer:** ~1-2 seconds

**Total for 100 refs:** ~3-6 minutes
**Total for 300 refs:** ~9-18 minutes

### Optimization Options

**Skip relevance generation:**
```bash
node v30/test-complete-pipeline.js manuscript.docx --no-relevance
```
Time saved: ~60-120 seconds per 100 refs

**Skip URL discovery:**
```bash
node v30/test-complete-pipeline.js manuscript.docx --no-urls
```
Time saved: ~120-240 seconds per 100 refs

**Both skipped (citation + context only):**
```bash
node v30/test-complete-pipeline.js manuscript.docx --no-relevance --no-urls
```
Time: ~10-20 seconds total

---

## Troubleshooting

### "ANTHROPIC_API_KEY environment variable not set"

**Solution:**
```bash
export ANTHROPIC_API_KEY="sk-ant-your-key-here"
```

### "GOOGLE_API_KEY and GOOGLE_CX environment variables must be set"

**Solution:**
```bash
export GOOGLE_API_KEY="your-google-api-key"
export GOOGLE_CX="your-search-engine-id"
```

### High relevance generation failure rate

**Possible causes:**
- API key invalid or rate limited
- Network connectivity issues
- API endpoint unavailable

**Solutions:**
- Verify API key is valid
- Check rate limits (default is 50 requests/minute)
- Enable caching to reuse previous results
- Run with `--no-relevance` to skip this component

### Low URL discovery rate

**Possible causes:**
- Google API credentials invalid
- Search queries too specific or generic
- Many URLs fail validation (paywalls, soft 404s)

**Solutions:**
- Verify Google API credentials
- Check search query strategies
- Review validation results (may be correctly rejecting bad URLs)
- Run with `--no-urls` to skip this component

### Pipeline hangs or times out

**Possible causes:**
- Large document (>500 citations)
- API rate limits hit
- Network issues

**Solutions:**
- Process in smaller batches
- Increase timeout values
- Check network connectivity
- Use caching to resume partial runs

---

## Next Steps

### Phase 2: Author Refinement (Future)

Hierarchical cascade model:
- Context → Relevance → URLs
- Author can override at ANY level
- Changes cascade downstream with approval
- Web UI for interactive refinement

### Phase 3: Publication (Future)

- HTML, EPUB, Print generation
- QR code insertion for URLs
- Multiple output formats
- Professional styling

---

## Development Notes

### Adding New Query Strategies

Edit `url-discoverer.js`:
1. Add strategy to `QUERY_STRATEGIES` object
2. Implement query generation logic in `generateSearchQuery()`
3. Add selection logic in `selectQueryStrategy()`
4. Test with known references

### Modifying Validation Patterns

Edit `url-discoverer.js`:
1. Add patterns to `detectPaywall()`, `detectLogin()`, or `detectSoft404()`
2. Test with URLs that should match
3. Monitor false positive rate

### Customizing Relevance Prompts

Edit `relevance-generator.js`:
1. Modify `buildRelevancePrompt()` function
2. Adjust target word count in `TARGET_WORD_COUNT` constant
3. Test with sample citations

---

## Contact & Support

**Built by:** Claude Code Web (2025-11-13)
**Testing:** Mac Claude Code
**Platform:** Linode VPS (Node.js + Express + SQLite)
**Target:** Production-ready, well-tested, comprehensive

**For issues:**
1. Review test output carefully
2. Check this README for common issues
3. Report detailed results back for refinement

---

**Phase 1 Status:** ✅ Complete - Ready for Mac Claude Code Testing
