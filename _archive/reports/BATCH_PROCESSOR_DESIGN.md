# Batch Processor Design - Reference Refinement Tool

**Version:** 1.0
**Created:** October 27, 2025
**Purpose:** Automate bulk reference processing without UI interaction

---

## Overview

A Node.js script that runs locally on Mac to process multiple references in batch:
1. **Generate Queries** (AI-powered)
2. **Search** (Google Custom Search)
3. **Autorank** (AI-powered candidate ranking)
4. **Auto-Finalize** (optional, based on confidence criteria)

Uses the **same logic** as the web UI by calling existing Netlify Functions.

---

## 🔑 Shared Logic Architecture (Critical!)

**PRINCIPLE:** The batch processor does NOT duplicate any logic from the iPad app. Instead, it calls the **exact same Netlify Functions** that the iPad app uses.

### Why This Matters

When you improve the iPad app (e.g., better query generation, enhanced ranking criteria, improved detection rules), those improvements **automatically apply** to the batch processor.

### What Gets Shared (Automatically)

✅ **Query Generation Logic** (`llm-chat.ts`)
- Simple vs. Standard query modes
- Query structure and prompts
- Work type detection
- All future improvements

✅ **Search Logic** (`search-google.ts`)
- Google Custom Search queries
- Result deduplication
- Error handling

✅ **Ranking Logic** (`llm-rank.ts`)
- All scoring rules (primary/secondary)
- Content-type detection (books vs reviews)
- Paywall detection
- Review website detection
- Language detection
- Full-text detection
- All future enhancements

✅ **File Format** (decisions.txt / Final.txt)
- Reference parsing
- URL designation
- Finalization markers
- Query storage

### What's Different (UI-Specific)

❌ **iPad-Only Features** (NOT in batch processor)
- Modal windows, tabs, buttons
- Toast notifications
- Interactive candidate selection
- Manual override tracking
- Debug panels
- Dropbox OAuth flow (batch uses direct file I/O)

### Implementation Pattern

**iPad App:**
```javascript
// In index.html
const response = await this.apiRequest('/api/llm-chat', {
  method: 'POST',
  body: JSON.stringify({ prompt, model })
});
```

**Batch Processor:**
```javascript
// In batch-processor.js
const response = await fetch('https://rrv521-1760738877.netlify.app/.netlify/functions/llm-chat', {
  method: 'POST',
  body: JSON.stringify({ prompt, model })
});
```

**Both call the SAME function** → Changes to `llm-chat.ts` affect both instantly.

### Update Workflow

```
┌─────────────────────────────────────────────┐
│  Make improvement to Netlify Function      │
│  (e.g., enhance llm-rank.ts detection)     │
└─────────────────┬───────────────────────────┘
                  │
                  ├──→ Deploy to Netlify
                  │
    ┌─────────────┴─────────────┐
    │                           │
    ▼                           ▼
┌─────────┐              ┌──────────────┐
│ iPad UI │              │ Batch Script │
│         │              │              │
│ ✓ Gets  │              │ ✓ Gets       │
│ update  │              │ update       │
│ auto    │              │ auto         │
└─────────┘              └──────────────┘
```

### Version Sync Examples

**Example 1: Language Detection (v14.2)**
```typescript
// Enhancement made to llm-rank.ts
if (domain.includes('.de') || domain.includes('.fr') || domain.includes('.li')) {
  primaryScore = Math.min(primaryScore, 70);
}
```
✅ **iPad app:** Immediately uses new detection
✅ **Batch processor:** Immediately uses new detection
✅ **No code changes needed to batch script**

**Example 2: Query Generation (v14.3)**
```typescript
// Added simple queries mode to llm-chat.ts
if (simpleQueries) {
  // Generate 3 queries instead of 8
}
```
✅ **iPad app:** New checkbox enables feature
✅ **Batch processor:** Config flag enables feature
✅ **Same logic, different trigger**

### Maintenance Guidelines

When updating the app, ask:

**🤔 Is this a logic improvement?**
- YES → Update Netlify Function (both interfaces benefit)
- NO → Update iPad UI only

**Examples:**

| Change | Where to Update | Shared? |
|--------|----------------|---------|
| Better paywall detection | `llm-rank.ts` | ✅ YES |
| Improved query prompts | `llm-chat.ts` | ✅ YES |
| Enhanced scoring rules | `llm-rank.ts` | ✅ YES |
| New UI tab | `index.html` | ❌ NO |
| Toast notification position | `index.html` | ❌ NO |
| Modal styling | `index.html` | ❌ NO |
| Batch progress bar | `batch-processor.js` | ❌ NO |

### Configuration Parity

Settings that should match:

**iPad App → Batch Config Mapping:**
```yaml
# iPad checkbox "Simple Queries"
batch_processor:
  query_mode: "simple"  # or "standard"

# iPad finalization requirements
finalize_criteria:
  min_primary_score: 85    # Same threshold
  min_secondary_score: 85   # Same threshold
  require_title_match: true # Same logic

# (Future) iPad model selector
api_settings:
  model: "claude-sonnet-4-20250514"  # Same model
```

### Testing Strategy

When making changes:

1. **Test in iPad app first** (interactive, immediate feedback)
2. **If logic change, test batch processor** (ensure same results)
3. **Compare outputs** (same reference should produce same URLs/scores)

**Example Test:**
```bash
# Process reference #105 in iPad app
Primary: https://archive.org/details/inventinginterne00jane (P:95)
Secondary: https://journals.sagepub.com/doi/10.1057/jit.2013.4 (S:95)

# Process same reference #105 in batch
node batch-processor.js --range 105-105

# Should produce IDENTICAL results ✓
```

---

## Architecture

### Script Location
```
References/
├── batch-processor.js       # Main batch script
├── batch-config.yaml        # Configuration file
├── batch-progress.json      # Resume/progress tracking
└── batch-logs/              # Log directory
    └── batch_TIMESTAMP.log
```

### Dependencies
```json
{
  "node-fetch": "^3.3.0",      // HTTP requests to Netlify
  "yaml": "^2.3.0",            // Config file parsing
  "chalk": "^5.3.0"            // Colored console output
}
```

### Data Flow
```
decisions.txt
     ↓
[Read & Parse]
     ↓
[Filter References] ← batch-config.yaml
     ↓
[For Each Reference]
     ├─→ [Generate Queries] → Netlify llm-chat
     ├─→ [Search]           → Netlify search-google
     ├─→ [Autorank]         → Netlify llm-rank
     └─→ [Update decisions.txt]
     ↓
[Auto-Finalize?] ← finalize_criteria
     ↓
[Write Final.txt]
```

---

## Configuration File (batch-config.yaml)

```yaml
# Batch Processing Configuration
batch_processor:
  # INPUT FILES
  input_file: "decisions.txt"
  output_file: "decisions.txt"  # Overwrites input with enhanced refs

  # REFERENCE SELECTION (choose ONE method)
  selection_mode: "range"  # Options: range | tags | criteria | all_incomplete

  # Option 1: Process by ID range
  reference_range:
    start: 101
    end: 150

  # Option 2: Process by tags/flags (NOT IMPLEMENTED YET)
  # tags:
  #   - "needs_urls"
  #   - "priority"

  # Option 3: Process by criteria
  criteria:
    missing_primary_url: true
    missing_secondary_url: false
    not_finalized: true
    has_queries: false  # Only process refs without queries

  # QUERY GENERATION
  query_mode: "simple"  # Options: simple (3 queries) | standard (8 queries)

  # AUTO-FINALIZATION
  auto_finalize: true  # Automatically finalize refs meeting criteria
  finalize_criteria:
    min_primary_score: 85      # Primary score threshold
    min_secondary_score: 85    # Secondary score threshold
    require_title_match: true  # Must have title match
    require_author_match: false # Must have author match (optional)
    max_warnings: 0            # Max acceptable warning flags

  # RATE LIMITING & PERFORMANCE
  rate_limiting:
    delay_between_refs: 3000   # Milliseconds between each reference
    delay_after_search: 1000   # Milliseconds after search before autorank
    max_retries: 3             # Retry count for failed API calls
    timeout: 30000             # Request timeout in milliseconds

  # API ENDPOINTS
  api_base_url: "https://rrv521-1760738877.netlify.app/.netlify/functions"

  # LOGGING
  logging:
    verbose: true              # Detailed console output
    save_logs: true            # Save to log file
    log_directory: "batch-logs"
    include_api_responses: false  # Save full API responses (debug)

  # RESUME CAPABILITY
  resume:
    enabled: true              # Save progress, allow resume
    checkpoint_frequency: 5    # Save progress every N references
```

---

## Reference Selection Modes

### Mode 1: Range (Simplest)
```yaml
selection_mode: "range"
reference_range:
  start: 101
  end: 150
```
Process references 101 through 150.

### Mode 2: Criteria (Most Flexible)
```yaml
selection_mode: "criteria"
criteria:
  missing_primary_url: true
  missing_secondary_url: false  # Allow refs with secondary but no primary
  not_finalized: true
  has_queries: false
```
Process references that match ALL criteria.

### Mode 3: All Incomplete (Catch-All)
```yaml
selection_mode: "all_incomplete"
```
Process any reference missing URLs or queries, not finalized.

---

## Auto-Finalization Logic

### Decision Flow
```
After Autorank completes:
  ↓
Check finalize_criteria:
  - Primary score >= 85? ✓
  - Secondary score >= 85? ✓
  - Title match confirmed? ✓
  - Author match confirmed? (optional) ✓
  - No warning flags? ✓
  ↓
YES → Mark as [FINALIZED], add to Final.txt
NO  → Leave as incomplete, log reason
```

### Finalization Requirements
**MUST HAVE:**
- Primary URL with score >= threshold
- (Optional) Secondary URL with score >= threshold

**CANNOT HAVE:**
- Warning flags (low score badges, mismatches)
- Missing required match criteria

### Logging Finalization Decisions
```
✓ REF [105] Auto-finalized: P:95, S:92, title match
✗ REF [106] Skipped finalize: P:75 (below threshold 85)
✗ REF [107] Skipped finalize: No title match
```

---

## Script Workflow (Detailed)

### 1. Initialization
```javascript
// Load configuration
const config = loadYamlConfig('batch-config.yaml');

// Load progress (if resume enabled)
const progress = loadProgress('batch-progress.json');

// Parse decisions.txt
const references = parseDecisionsFile(config.input_file);

// Filter references based on selection mode
const selectedRefs = filterReferences(references, config);

// Display summary
console.log(`Found ${selectedRefs.length} references to process`);
console.log(`Mode: ${config.selection_mode}`);
console.log(`Auto-finalize: ${config.auto_finalize ? 'YES' : 'NO'}`);
```

### 2. Process Each Reference
```javascript
for (const ref of selectedRefs) {
  // Skip if already processed (resume capability)
  if (progress.completed.includes(ref.id)) {
    console.log(`⏭️  REF [${ref.id}] Already processed, skipping`);
    continue;
  }

  console.log(`\n🔄 Processing REF [${ref.id}]: ${ref.title}`);

  try {
    // Step 1: Generate Queries
    console.log(`  1️⃣  Generating queries...`);
    const queries = await generateQueries(ref, config.query_mode);
    ref.queries = queries.split('\n');
    console.log(`      ✓ Generated ${ref.queries.length} queries`);

    // Step 2: Search
    console.log(`  2️⃣  Searching...`);
    const searchResults = await runSearch(ref.queries);
    console.log(`      ✓ Found ${searchResults.length} unique candidates`);

    // Delay before autorank
    await sleep(config.rate_limiting.delay_after_search);

    // Step 3: Autorank
    console.log(`  3️⃣  Ranking candidates...`);
    const rankings = await autorank(ref, searchResults);
    console.log(`      ✓ Ranked ${rankings.length} candidates`);

    // Extract top recommendations
    const topPrimary = rankings.find(r => r.primary_score >= 75);
    const topSecondary = rankings.find(r => r.secondary_score >= 75);

    if (topPrimary) {
      ref.urls.primary = topPrimary.url;
      console.log(`      ✓ Primary: ${topPrimary.url} (P:${topPrimary.primary_score})`);
    } else {
      console.log(`      ⚠️  No suitable primary URL found`);
    }

    if (topSecondary) {
      ref.urls.secondary = topSecondary.url;
      console.log(`      ✓ Secondary: ${topSecondary.url} (S:${topSecondary.secondary_score})`);
    }

    // Step 4: Auto-Finalize (if enabled)
    if (config.auto_finalize) {
      const shouldFinalize = checkFinalizeCriteria(ref, rankings, config.finalize_criteria);
      if (shouldFinalize.ok) {
        ref.finalized = true;
        console.log(`      ✅ Auto-finalized: ${shouldFinalize.reason}`);
      } else {
        console.log(`      ⏸️  Not finalized: ${shouldFinalize.reason}`);
      }
    }

    // Update progress
    progress.completed.push(ref.id);
    progress.lastProcessed = ref.id;
    saveProgress(progress);

    // Write updated decisions.txt
    writeDecisionsFile(references, config.output_file);

    console.log(`✓ REF [${ref.id}] Complete\n`);

  } catch (error) {
    console.error(`❌ REF [${ref.id}] Error: ${error.message}`);
    progress.errors.push({ id: ref.id, error: error.message });
    saveProgress(progress);
  }

  // Rate limiting delay
  await sleep(config.rate_limiting.delay_between_refs);
}
```

### 3. Finalization & Summary
```javascript
// Generate Final.txt if auto-finalize enabled
if (config.auto_finalize) {
  const finalized = references.filter(r => r.finalized);
  writeFinalFile(finalized);
  console.log(`\n📄 Final.txt written (${finalized.length} references)`);
}

// Summary statistics
console.log(`\n📊 Batch Processing Complete`);
console.log(`   Processed: ${progress.completed.length}`);
console.log(`   Finalized: ${references.filter(r => r.finalized).length}`);
console.log(`   Errors: ${progress.errors.length}`);
console.log(`   Total Time: ${calculateElapsedTime()}`);
console.log(`   Average per Reference: ${calculateAvgTime()}`);
```

---

## Finalization Check Logic

```javascript
function checkFinalizeCriteria(ref, rankings, criteria) {
  const primary = rankings.find(r => r.primary_score >= 75);
  const secondary = rankings.find(r => r.secondary_score >= 75);

  // Must have primary URL
  if (!primary) {
    return { ok: false, reason: 'No primary URL' };
  }

  // Check primary score threshold
  if (primary.primary_score < criteria.min_primary_score) {
    return { ok: false, reason: `Primary score ${primary.primary_score} below threshold ${criteria.min_primary_score}` };
  }

  // Check secondary score threshold (if secondary exists)
  if (secondary && secondary.secondary_score < criteria.min_secondary_score) {
    return { ok: false, reason: `Secondary score ${secondary.secondary_score} below threshold ${criteria.min_secondary_score}` };
  }

  // Check title match requirement
  if (criteria.require_title_match && primary.title_match === 'none') {
    return { ok: false, reason: 'No title match' };
  }

  // Check author match requirement
  if (criteria.require_author_match && !primary.author_match) {
    return { ok: false, reason: 'No author match' };
  }

  // Check warning flags
  const warnings = countWarnings(primary, secondary);
  if (warnings > criteria.max_warnings) {
    return { ok: false, reason: `${warnings} warnings (max: ${criteria.max_warnings})` };
  }

  // All checks passed
  return {
    ok: true,
    reason: `P:${primary.primary_score}, S:${secondary?.secondary_score || 'N/A'}, matches confirmed`
  };
}
```

---

## Progress Tracking (batch-progress.json)

```json
{
  "batch_id": "batch_2025-10-27_22-30-00",
  "config_file": "batch-config.yaml",
  "started_at": "2025-10-27T22:30:00Z",
  "last_updated": "2025-10-27T22:45:00Z",
  "status": "in_progress",
  "total_refs": 50,
  "completed": [101, 102, 103, 104, 105],
  "lastProcessed": 105,
  "errors": [
    {
      "id": 103,
      "error": "Search timeout",
      "timestamp": "2025-10-27T22:35:00Z"
    }
  ],
  "stats": {
    "queries_generated": 5,
    "searches_run": 5,
    "autoranks_completed": 5,
    "auto_finalized": 3
  }
}
```

### Resume Capability
If script is interrupted:
```bash
node batch-processor.js --resume
```
Will:
1. Load `batch-progress.json`
2. Skip already completed references
3. Continue from last checkpoint

---

## Cost Estimation

### Per Reference Cost
```
SIMPLE QUERIES (3 queries):
- Query Generation: ~$0.004 (Claude)
- Search: 3 × $0.005 = $0.015 (Google)
- Autorank: ~3 batches × $0.015 = $0.045 (Claude)
TOTAL: ~$0.064 per reference

STANDARD QUERIES (8 queries):
- Query Generation: ~$0.005 (Claude)
- Search: 8 × $0.005 = $0.040 (Google)
- Autorank: ~5 batches × $0.015 = $0.075 (Claude)
TOTAL: ~$0.120 per reference
```

### Batch Cost Projections
```
50 references (simple):   ~$3.20
100 references (simple):  ~$6.40
500 references (simple):  ~$32.00

50 references (standard):  ~$6.00
100 references (standard): ~$12.00
500 references (standard): ~$60.00
```

---

## Error Handling & Retry Logic

### Retry Strategy
```javascript
async function callWithRetry(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.warn(`    ⚠️  Attempt ${attempt} failed: ${error.message}`);
      console.warn(`    🔄 Retrying in ${attempt * 2}s...`);
      await sleep(attempt * 2000);
    }
  }
}
```

### Error Types
1. **Network Errors** → Retry with exponential backoff
2. **API Timeout** → Retry with longer timeout
3. **Invalid Response** → Log and skip reference
4. **Rate Limit** → Wait and retry
5. **Parse Error** → Log error, continue to next reference

---

## Example Usage

### Basic Batch Run
```bash
# Process references 101-150 with defaults
node batch-processor.js

# Use custom config
node batch-processor.js --config my-batch-config.yaml

# Resume interrupted batch
node batch-processor.js --resume

# Dry run (show what would be processed, don't execute)
node batch-processor.js --dry-run
```

### Example Output
```
📦 Reference Refinement - Batch Processor
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Config: batch-config.yaml
Mode: range (101-150)
Query Mode: simple (3 queries)
Auto-finalize: YES (P≥85, S≥85)

Found 50 references to process
Estimated time: ~15 minutes
Estimated cost: ~$3.20

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 Processing REF [101]: Fireside Politics
  1️⃣  Generating queries...
      ✓ Generated 3 queries
  2️⃣  Searching...
      ✓ Found 23 unique candidates
  3️⃣  Ranking candidates...
      ✓ Ranked 23 candidates
      ✓ Primary: https://muse.jhu.edu/book/16011 (P:85)
      ✓ Secondary: https://academic.oup.com/jah/... (S:90)
      ✅ Auto-finalized: P:85, S:90, title match
✓ REF [101] Complete

🔄 Processing REF [102]: Televised Presidential Debates
  1️⃣  Generating queries...
      ✓ Generated 3 queries
  2️⃣  Searching...
      ✓ Found 35 unique candidates
  3️⃣  Ranking candidates...
      ✓ Ranked 35 candidates
      ✓ Primary: https://api.pageplace.de/preview/... (P:70)
      ⚠️  No suitable secondary URL found
      ⏸️  Not finalized: Primary score 70 below threshold 85
✓ REF [102] Complete

...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Batch Processing Complete
   Processed: 50
   Finalized: 42
   Errors: 0
   Total Time: 14m 32s
   Average per Reference: 17.4s

   Cost Summary:
   Google Searches: 150 queries = $0.75
   Claude API: $2.51
   Total: $3.26

📄 Files Updated:
   ✓ decisions.txt (50 references enhanced)
   ✓ Final.txt (42 finalized references)
   ✓ batch-logs/batch_2025-10-27_22-30-00.log

✅ Batch complete!
```

---

## Implementation Plan

### Phase 1: Core Functionality
- [ ] Parse decisions.txt
- [ ] Filter references by range
- [ ] Call Netlify functions for each step
- [ ] Write back to decisions.txt
- [ ] Basic logging

### Phase 2: Auto-Finalization
- [ ] Implement finalization criteria checks
- [ ] Generate Final.txt
- [ ] Enhanced logging for finalization decisions

### Phase 3: Progress & Resume
- [ ] Save progress to JSON
- [ ] Resume capability
- [ ] Error tracking and retry logic

### Phase 4: Configuration & Flexibility
- [ ] YAML config file
- [ ] Multiple selection modes
- [ ] Rate limiting controls
- [ ] Cost estimation

### Phase 5: Polish
- [ ] Colored console output
- [ ] Progress bar
- [ ] Summary statistics
- [ ] Dry-run mode

---

## Questions for User

1. **Selection Mode Priority:** Which selection mode is most important?
   - Range (101-150)
   - Criteria (missing URLs, not finalized)
   - All incomplete

2. **Auto-Finalize Thresholds:** Are 85/85 good defaults, or prefer higher (90/90)?

3. **Rate Limiting:** Is 3 seconds between refs acceptable, or prefer faster/slower?

4. **Resume Capability:** Important feature, or okay to re-run from scratch?

5. **Dry-Run Mode:** Want to see what would be processed before actually running?

6. **Logging Level:** Verbose output to console, or minimal with file logs?

---

## Next Steps

Once you approve this design:
1. Create `batch-processor.js` with core functionality
2. Create default `batch-config.yaml`
3. Test on small range (5-10 refs)
4. Iterate based on results
5. Document usage in README

**Ready to proceed?**
