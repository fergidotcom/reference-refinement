# v14.2 Design - Query Control + Cost Tracking + Detection Improvements

**Based on:** System log `session_2025-10-28T02-59-26.txt` (Oct 27, 20:59)
**Date:** October 27, 2025
**Status:** ✅ IMPLEMENTED - v14.2 deployed to production

---

## Test Results from v14.1

### **Reference #8 (Hacking) - Retest:**

**PRIMARY:** ✅ **SUCCESS!**
```
AI Recommended: WordPress PDF (P:95)
User: ACCEPTED (no override)
```
v14.1's content-type detection worked! AI correctly identified WordPress PDF as the book.

**SECONDARY:** ❌ **Still needs work**
```
AI Recommended: complete-review.com (P:55, S:95) - "Review site discussing the work"
User Overrode: SAGE journal PDF (P:55, S:95) - "This is a book review, as it states on the first page"
User Comment: "THE SUGGESTED SECONDARY WAS clearly not. Refine the ai analysis in Autorank.
This is sonnet doing the analysis. Surely sonnet can do this well if it has a big enough
bite of each candidate site to analyze. Do better."
```

**Problem:** complete-review.com is a book review *website* (general site about books), not a scholarly book review. AI scored both S:95.

---

### **Reference #100 (Zarefsky):**

**PRIMARY:** ❌ **Language detection needed**
```
AI Recommended: books.google.li (P:85) - "Google Books preview access"
User Overrode: UChicago Press (P:65) - "The suggested primary was a German language site."
```

**Problem:** AI didn't detect that `books.google.li` (Liechtenstein domain) likely shows German language content.

---

### **v14.1 Results Summary:**

**Override Rate:**
- Reference #8: 1 override (secondary only) - **50% success**
- Reference #100: 1 override (primary only) - **50% success**
- **Total: 2/4 recommendations accepted** (50% override rate)

**Improvement from v14.0:** 100% override → 50% override ✅ (but goal is <25%)

---

## User Requests for v14.2

### **1. Query Allocation Control**

User wants to:
> "Give me a control just above the Queries window that allow me to specify the number of queries
> to be devoted to primary entries and the number to secondary entries. This will allow me to
> gauge the value of queries."

**Purpose:** Experiment with different query allocations to optimize results

**Current:** Fixed 8 queries (4 primary + 4 secondary)

**Requested:** Configurable split (e.g., 6 primary + 2 secondary, or 3 primary + 5 secondary)

---

### **2. Enhanced Cost Tracking**

User wants:
> "If you are not keeping track of the stats that will allow you to analyze cost (and estimate
> it for the batch run) put it in the next update to include in the debug log."

**Current:** Cost summary at end of session log

**Requested:**
- More detailed per-operation cost tracking
- Cumulative totals
- Projection for remaining batch

---

### **3. Better Content Detection**

User wants:
> "Surely sonnet can do this well if it has a big enough bite of each candidate site to analyze."

**Implication:** Need better heuristics or more context for AI to judge secondary URLs

---

## v14.2 Solution Design

### **Feature 1: Query Allocation Control**

**UI Location:** Above the "Queries" textarea in Tab 1 (Suggest & Query)

**Design:**
```
┌──────────────────────────────────────────────────────┐
│ Query Allocation                                     │
│ ┌──────────────────┐  ┌──────────────────┐          │
│ │ Primary: [4]  ▼  │  │ Secondary: [4] ▼ │  Total: 8│
│ └──────────────────┘  └──────────────────┘          │
│                                                      │
│ Queries:                                             │
│ ┌────────────────────────────────────────────────┐  │
│ │ (generated queries here)                       │  │
│ │                                                 │  │
│ └────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

**Options:**
- Primary: 0-8 (dropdown)
- Secondary: 0-8 (dropdown)
- Total: Must equal 8 (constrained)
- Default: 4 + 4 (current behavior)

**Presets:**
```
Balanced (4+4) - default
Primary Focus (6+2) - more primaries
Secondary Focus (2+6) - more reviews
Primary Only (8+0) - all primaries
Secondary Only (0+8) - all reviews
```

**Logic:**
- When user changes Primary, Secondary auto-adjusts to keep total = 8
- When user clicks "Suggest Queries", prompt uses the specified allocation

---

### **Feature 2: Enhanced Cost Tracking**

**Add to debug log panels:**

**A. Per-Operation Costs (real-time):**
```
[8:50:34 PM] Query Generation (AI)
--------------------------------------------------------------------------------
Model: claude-sonnet-4-20250514
Queries Generated: 8
Tokens: 1,234 input + 150 output
Cost: $0.0062
```

**B. Running Session Total (after each operation):**
```
[8:51:22 PM] Autorank Results
--------------------------------------------------------------------------------
Candidates Ranked: 60
Batches: 4
Tokens: 15,234 input + 2,100 output
Cost: $0.0776

SESSION TOTALS SO FAR:
- Google Searches: 16 ($0.08)
- Claude API: 22,471 tokens ($0.1015)
- Session Total: $0.1815
```

**C. Batch Projection Panel (new debug panel):**
```
[8:59:11 PM] Batch Cost Projection
--------------------------------------------------------------------------------
CURRENT SESSION:
- References processed: 2
- Avg cost per reference: $0.09
- Session total: $0.18

PROJECT TOTALS (user-reported):
- Claude API: $4.16
- Google API: $84.39
- Combined: $88.55

ESTIMATED FOR NEXT 100 REFERENCES:
- Google: ~$40.00 (800 searches)
- Claude: ~$9.00 (query gen + ranking)
- Total: ~$49.00

ESTIMATED PROJECT COMPLETION:
- Assuming 500 more references to process
- Estimated cost: ~$245.00
- New project total: ~$333.55
```

**D. Save to dedicated cost log:**
Create `cost_tracking.json` with cumulative stats:
```json
{
  "last_updated": "2025-10-27T20:59:26",
  "totals": {
    "google": 84.39,
    "claude": 4.16,
    "combined": 88.55
  },
  "sessions": [
    {
      "timestamp": "2025-10-28T02-59-26",
      "references": [8, 100],
      "google_searches": 16,
      "google_cost": 0.08,
      "claude_tokens": 22471,
      "claude_cost": 0.1015,
      "session_total": 0.1815
    }
  ],
  "averages": {
    "cost_per_reference": 0.042,
    "searches_per_reference": 8,
    "tokens_per_reference": 11236
  }
}
```

---

### **Feature 3: Improved Content Detection**

**Issue #1: Review site vs scholarly review**

Current prompt detects:
- ✅ "review" in title
- ✅ Journal domains
- ❌ Doesn't distinguish review *website* from review *article*

**Enhancement:**
```
SECONDARY SCORE - Enhanced review detection:

SCHOLARLY BOOK REVIEW (90-100):
✓ PDF format AND title contains "review"
✓ Journal domain (.edu, sagepub, oxford, etc.) AND title contains "review"
✓ Snippet mentions specific pages, chapters, or quotes from the book

NON-ACADEMIC REVIEW (75-90):
✓ Blog/magazine review with critical analysis
✓ Title: "review", "critique", "thoughts on"
✓ Author discusses book's arguments

REVIEW WEBSITE/AGGREGATOR (max 60):
⚠️ CRITICAL: Sites like complete-review.com, goodreads.com → MAX SCORE 60
⚠️ These are ABOUT reviews, not reviews themselves
⚠️ URL patterns: complete-review.com/reviews/*, goodreads.com/book/*
⚠️ Typically just show excerpts or summaries of other reviews
```

**Issue #2: Language detection**

Current prompt doesn't check:
- Domain country codes (.li, .de, .fr)
- Language signals in snippet

**Enhancement:**
```
PRIMARY SCORE - Enhanced language detection:

LANGUAGE MISMATCH (max 70):
⚠️ CRITICAL: If URL domain suggests non-English (.de, .fr, .li, .es, etc.) → MAX SCORE 70
⚠️ Even if from Google Books or academic source
⚠️ Exception: If snippet clearly shows English text, score normally
⚠️ books.google.li likely German
⚠️ books.google.fr likely French
⚠️ books.google.de likely German

COUNTRY-SPECIFIC DOMAINS:
• .com, .edu, .org, .gov, .uk → Assume English
• .li, .de, .fr, .es, .it, .jp, .cn → Likely not English
• Check snippet for language indicators
```

---

## v14.2 Implementation Plan

### **Backend Changes:**

**1. netlify/functions/llm-chat.ts** (query generation)
- No changes needed - accepts any query count
- Frontend will pass query allocation in prompt

**2. netlify/functions/llm-rank.ts** (ranking)
- Add language detection rules
- Add review website detection rules
- Enhanced secondary scoring for review sites

### **Frontend Changes:**

**1. index.html - UI (Tab 1):**
```html
<!-- NEW: Query Allocation Control -->
<div class="query-allocation-control" style="margin-bottom: 1rem;">
    <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">
        Query Allocation (Total: 8)
    </label>
    <div style="display: flex; gap: 1rem; align-items: center;">
        <div>
            <label>Primary:</label>
            <select id="primaryQueryCount" onchange="app.updateQueryAllocation('primary')"
                    style="margin-left: 0.5rem; padding: 0.25rem;">
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4" selected>4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
            </select>
        </div>
        <div>
            <label>Secondary:</label>
            <select id="secondaryQueryCount" onchange="app.updateQueryAllocation('secondary')"
                    style="margin-left: 0.5rem; padding: 0.25rem;">
                <option value="0">0</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4" selected>4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
            </select>
        </div>
        <div style="margin-left: auto;">
            <button onclick="app.setPreset('balanced')" style="padding: 0.25rem 0.5rem;">Balanced (4+4)</button>
            <button onclick="app.setPreset('primary')" style="padding: 0.25rem 0.5rem;">Primary (6+2)</button>
            <button onclick="app.setPreset('secondary')" style="padding: 0.25rem 0.5rem;">Secondary (2+6)</button>
        </div>
    </div>
    <div id="allocationWarning" style="color: var(--danger-color); margin-top: 0.5rem; display: none;">
        ⚠️ Total must equal 8 queries
    </div>
</div>
```

**2. index.html - JavaScript:**
```javascript
// Query allocation state
queryAllocation: {
    primary: 4,
    secondary: 4
},

// Update allocation
updateQueryAllocation(changed) {
    const primary = parseInt(document.getElementById('primaryQueryCount').value);
    const secondary = parseInt(document.getElementById('secondaryQueryCount').value);

    // Auto-adjust the other to keep total = 8
    if (changed === 'primary') {
        this.queryAllocation.primary = primary;
        this.queryAllocation.secondary = 8 - primary;
        document.getElementById('secondaryQueryCount').value = this.queryAllocation.secondary;
    } else {
        this.queryAllocation.secondary = secondary;
        this.queryAllocation.primary = 8 - secondary;
        document.getElementById('primaryQueryCount').value = this.queryAllocation.primary;
    }

    // Validate
    const total = this.queryAllocation.primary + this.queryAllocation.secondary;
    const warning = document.getElementById('allocationWarning');
    warning.style.display = total !== 8 ? 'block' : 'none';
},

// Preset buttons
setPreset(preset) {
    switch(preset) {
        case 'balanced':
            this.queryAllocation = {primary: 4, secondary: 4};
            break;
        case 'primary':
            this.queryAllocation = {primary: 6, secondary: 2};
            break;
        case 'secondary':
            this.queryAllocation = {primary: 2, secondary: 6};
            break;
    }
    document.getElementById('primaryQueryCount').value = this.queryAllocation.primary;
    document.getElementById('secondaryQueryCount').value = this.queryAllocation.secondary;
},
```

**3. index.html - Query Generation:**
Modify the prompt to use allocated counts:
```javascript
const prompt = `Generate ${this.queryAllocation.primary + this.queryAllocation.secondary} search queries.

PRIMARY-FOCUSED QUERIES (${this.queryAllocation.primary} queries):
${this.queryAllocation.primary > 0 ? `
Q1-Q${Math.min(this.queryAllocation.primary - 1, 3)} (${Math.min(this.queryAllocation.primary - 1, 3)} queries): FULL-TEXT SOURCES
  ... (same as v14.1)

Q${this.queryAllocation.primary} (1 query): PUBLISHER PAGE
  ... (same as v14.1)
` : '(No primary queries)'}

SECONDARY-FOCUSED QUERIES (${this.queryAllocation.secondary} queries):
${this.queryAllocation.secondary > 0 ? `
Q${this.queryAllocation.primary + 1}-Q${this.queryAllocation.primary + Math.min(this.queryAllocation.secondary - 1, 3)} (${Math.min(this.queryAllocation.secondary - 1, 3)} queries): REVIEWS
  ... (same as v14.1)

Q${this.queryAllocation.primary + this.queryAllocation.secondary} (1 query): TOPIC DISCUSSION
  ... (same as v14.1)
` : '(No secondary queries)'}

Return ONLY ${this.queryAllocation.primary + this.queryAllocation.secondary} queries.`;
```

**4. Cost Tracking:**
```javascript
// Track cumulative costs
sessionCosts: {
    google: 0,
    claude: 0,
    searches: 0,
    tokens: 0
},

// Update after each operation
trackSearchCost(searchCount) {
    this.sessionCosts.google += searchCount * 0.005;
    this.sessionCosts.searches += searchCount;
    this.updateCostDisplay();
},

trackClaudeCost(inputTokens, outputTokens) {
    const cost = (inputTokens * 0.003 / 1000) + (outputTokens * 0.015 / 1000);
    this.sessionCosts.claude += cost;
    this.sessionCosts.tokens += (inputTokens + outputTokens);
    this.updateCostDisplay();
},

// Display in debug panel
updateCostDisplay() {
    const panel = `<strong>Session Cost Summary:</strong>
Google: ${this.sessionCosts.searches} searches = $${this.sessionCosts.google.toFixed(4)}
Claude: ${this.sessionCosts.tokens} tokens = $${this.sessionCosts.claude.toFixed(4)}
Total: $${(this.sessionCosts.google + this.sessionCosts.claude).toFixed(4)}

<strong>Average Per Reference:</strong>
Cost: $${((this.sessionCosts.google + this.sessionCosts.claude) / this.processedReferences).toFixed(4)}`;

    // Add to debug tab
    this.addDebugPanel('Cost Tracking', panel, 'info');
},
```

---

## Expected Improvements (v14.2)

### **Query Allocation:**
- Users can experiment: "Does 6 primary + 2 secondary work better than 4+4?"
- Find optimal balance for their reference types
- Save Google search costs if fewer queries needed

### **Cost Tracking:**
- Real-time visibility into costs
- Accurate projections for batch runs
- Identify cost anomalies (retries, errors)

### **Detection:**
- Review websites (complete-review.com) → S:60 max (not 95)
- Language mismatches (books.google.li) → P:70 max (not 85)
- Better distinction between review articles and review sites

---

## Testing Strategy

**Test Case 1: Query Allocation**
1. Set allocation to 6 primary + 2 secondary
2. Generate queries - should get 6 primary-focused, 2 secondary-focused
3. Verify ranking still works with unbalanced split

**Test Case 2: Cost Tracking**
1. Process 2 references
2. Check cost panel shows accurate totals
3. Verify projection math is correct

**Test Case 3: Review Website Detection**
1. Retest Reference #8 (Hacking)
2. complete-review.com should now score S:60 (not 95)
3. SAGE journal review should score S:95

**Test Case 4: Language Detection**
1. Retest Reference #100 (Zarefsky)
2. books.google.li should now score P:70 (not 85)
3. English UChicago Press should score higher

---

## Success Metrics

**Query Allocation:**
- Users able to change allocation and generate queries
- Query generation respects the specified split

**Cost Tracking:**
- Real-time cost display updates after each operation
- Projections within 10% of actual costs

**Detection:**
- Override rate drops from 50% (v14.1) to <25% (v14.2 goal)
- Specifically:
  - Review websites score lower (S:60)
  - Non-English sources score lower (P:70)

---

## Implementation Notes

**Status:** ✅ COMPLETED October 27, 2025

All features designed in this document have been successfully implemented and deployed to production.

**See:** `V14_2_IMPLEMENTATION.md` for complete implementation details, deployment info, and testing recommendations.

**Production URL:** https://rrv521-1760738877.netlify.app
