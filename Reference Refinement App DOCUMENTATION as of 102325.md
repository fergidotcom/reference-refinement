# Reference Refinement Tool - Complete Documentation

**Version:** 11.1
**Last Updated:** October 23, 2025
**Author:** Joe Ferguson
**Live URL:** https://rrv521-1760738877.netlify.app/rr_v60.html
**GitHub Repository:** https://github.com/fergidotcom/reference-refinement.git

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Functional Goals](#functional-goals)
3. [Reference Refinement Process](#reference-refinement-process)
4. [Technical Architecture](#technical-architecture)
5. [Implementation Details](#implementation-details)
6. [File Formats & Data Structures](#file-formats--data-structures)
7. [Deployment & Operations](#deployment--operations)
8. [System Log Analysis (Future)](#system-log-analysis-future)
9. [Troubleshooting](#troubleshooting)
10. [Version History](#version-history)

---

## Project Overview

### Purpose

The Reference Refinement Tool is a web-based application designed to help researchers validate and enhance bibliographic references by finding and ranking authoritative URLs for academic works. The tool combines AI-powered search query generation with Google Custom Search and Claude-based ranking to identify the best online sources for each reference.

### Key Innovation

Rather than manually searching for each reference URL, the tool:
1. Generates intelligent search queries using AI (15 queries per reference)
2. Executes parallel Google searches across all queries
3. Ranks results using AI with dual scoring (Primary + Secondary metrics)
4. Provides semi-automated workflow with human oversight
5. Maintains comprehensive debug logs for continuous improvement

### Target User

Academic researchers and authors who need to:
- Validate bibliographic references for manuscripts
- Find authoritative URLs for citations
- Maintain a decision log of reference research
- Track relevance justifications for each source

### Current Status

- **288 references** in active bibliography
- **4 references** fully processed and finalized (as of Oct 23, 2025)
- **Dropbox integration** deployed for automatic cloud sync
- **iPad-optimized** for mobile research workflow
- **Production-ready** for manual URL curation phase

---

## Functional Goals

### Primary Objectives

1. **URL Discovery & Validation**
   - Find authoritative URLs for academic references
   - Distinguish between primary (canonical) and secondary (backup) sources
   - Validate URL accessibility and quality

2. **Research Documentation**
   - Maintain `decisions.txt` with all reference metadata
   - Track relevance justifications for manuscript integration
   - Generate clean `Final.txt` with only finalized references

3. **Workflow Efficiency**
   - Reduce time per reference from hours to minutes
   - Automate repetitive search tasks
   - Provide AI-assisted ranking to focus human judgment

4. **Quality Assurance**
   - Comprehensive debug logging for every action
   - Session logs exportable to Dropbox
   - Iterative improvement through System Log Analysis

### Secondary Objectives

1. **Cross-Device Accessibility**
   - iPad Safari compatibility for mobile research
   - Desktop browser support for intensive work
   - Cloud sync via Dropbox for seamless transitions

2. **Data Persistence**
   - Auto-save to localStorage (browser backup)
   - Auto-save to Dropbox (cloud backup)
   - Version control via Git (codebase backup)

3. **Transparency & Reproducibility**
   - Every AI interaction logged with model version
   - Every search query and result tracked
   - Every manual override recorded with timestamp

---

## Reference Refinement Process

### Overview Workflow

```
Raw Reference → Parse → Generate Queries → Search → Rank → Manual Review → Finalize
```

### Detailed Steps

#### **1. Load References** (`decisions.txt`)

**Input Format:**
```
[123] Author, A. (2020). Title. Journal/Publisher.
Relevance: [Optional previous text]
Primary URL: [Optional previous URL]
Secondary URL: [Optional previous URL]
Q: [Optional previous query]
Q: [Optional previous query]
```

**Process:**
- File loaded from Dropbox (or localStorage as fallback)
- Parser extracts: ID, Authors, Year, Title, Publication details
- Existing URLs and queries preserved
- Finalized status detected via `FLAGS[FINALIZED]`

**Output:**
- In-memory reference objects
- Displayed in main interface with filter options

---

#### **2. Edit Reference** (Modal Dialog)

**Three-Tab Interface:**

**Tab 1: Suggest & Query**
- Edit parsed fields: RID, Authors, Year, Title, Other
- View/edit relevance justification text
- View/edit Primary/Secondary URLs
- Generate search queries using AI (15 mixed queries)
- Manual search capability
- Edit generated queries before searching

**Tab 2: Candidates & Autorank**
- Display all search results (deduplicated)
- Run AI autorank to score candidates
- View dual scores: Primary (0-100), Secondary (0-100)
- Set URLs as Primary/Secondary/Tertiary
- Preview URLs in new tab

**Tab 3: Debug**
- Real-time debug log for current reference
- System logs consolidate consecutive entries
- Copy entire session log to clipboard
- Download session log to Dropbox

---

#### **3. Generate Queries** (AI-Powered)

**Prompt Strategy:**
Generate 10-15 mixed queries combining:
- **Bibliographic queries:** Exact title, author, year, ISBN
- **Relevance-driven queries:** Author CV, biography, reviews, related work

**AI Model:** Claude Sonnet 4 (`claude-sonnet-4-20250514`)

**Example Output:**
```
"Judgment under Uncertainty: Heuristics and Biases" Tversky Kahneman 1974 filetype:pdf
Tversky Kahneman 1974 Science 185 "heuristics and biases" site:science.org
"Amos Tversky" "Daniel Kahneman" 1974 judgment uncertainty heuristics PDF
Daniel Kahneman curriculum vitae biography "judgment under uncertainty"
```

**Key Feature:** No PRIMARY:/SECONDARY: labels (cleaned up in v10.6)

---

#### **4. Execute Searches** (Google Custom Search API)

**Process:**
- Execute all 15 queries in parallel via Netlify Function
- Each query returns up to 10 results
- Deduplicate across all results
- Typical yield: 60-120 unique URLs per reference

**Result Data:**
```javascript
{
  title: "Article Title",
  link: "https://example.com/article",
  snippet: "Preview text...",
  query: "Original search query"
}
```

**Performance:**
- 15 searches complete in ~8-10 seconds
- Results displayed immediately in Candidates tab

---

#### **5. Autorank Candidates** (AI-Powered)

**Ranking Prompt:**
Evaluate each URL on two dimensions:
- **Primary Score (0-100):** How well does this represent the actual work?
- **Secondary Score (0-100):** How authoritative/credible is this source?

**AI Model:** Claude Sonnet 4 (`claude-sonnet-4-20250514`)

**Ranking Criteria:**
- Publisher official sites
- DOI links and academic repositories
- PDF availability
- Domain authority (.edu, .gov, recognized publishers)
- Relevance to reference metadata

**Output:**
Top 20 candidates ranked with scores, displayed in Candidates tab

**Combined Score Formula:** `(Primary * 0.5) + (Secondary * 0.5)`

---

#### **6. Manual Review & Selection**

**Human Judgment:**
- Review AI recommendations
- Override if necessary (commonly done currently)
- Select Primary URL (required)
- Select Secondary URL (optional)
- Select Tertiary URL (optional)
- Preview URLs before finalizing

**Why Override AI?**
- AI may prefer aggregators (Google Scholar profiles)
- User may prefer official PDFs over product pages
- Domain-specific knowledge about source quality
- Accessibility considerations (free vs paywalled)

---

#### **7. Save or Finalize**

**Save Button:**
- Updates reference in memory
- Preserves existing `[FINALIZED]` flag if present
- Auto-saves to localStorage
- Auto-saves to Dropbox (if connected)
- Keeps modal open for continued editing

**Finalize Button:**
- Updates reference in memory
- Adds `FLAGS[FINALIZED]` marker
- Validates Primary URL exists
- Auto-saves to localStorage
- Auto-saves to Dropbox (if connected)
- Keeps modal open for review

**Done Button:**
- Closes modal without changes
- Returns to main reference list

---

#### **8. Export Files**

**decisions.txt** (Auto-generated):
```
[5] Tversky, A., & Kahneman, D. (1974). Judgment under Uncertainty: Heuristics and Biases. Science, 185(4157), 1124–1131. Relevance: Tversky and Kahneman's seminal work... FLAGS[FINALIZED] PRIMARY_URL[https://apps.dtic.mil/sti/tr/pdf/AD0767426.pdf] SECONDARY_URL[https://www.jstor.org/stable/1738360]
```

**Final.txt** (Clean format, finalized only):
```
[5] Tversky, A., & Kahneman, D. (1974). Judgment under Uncertainty: Heuristics and Biases. Science, 185(4157), 1124–1131.
Primary URL: https://apps.dtic.mil/sti/tr/pdf/AD0767426.pdf
Secondary URL: https://www.jstor.org/stable/1738360
```

**Session Log** (Debug export):
- Comprehensive audit trail of all actions
- Saved to `/debug_logs/session_TIMESTAMP.txt` in Dropbox
- Cleared from localStorage after successful save

---

## Technical Architecture

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (iPad/Desktop)                  │
│                    Single HTML File (rr_v60.html)            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Reference   │  │    Edit      │  │    Debug     │      │
│  │     List     │  │    Modal     │  │     Panel    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           State Management (JavaScript)               │  │
│  │  - references[]  - localStorage  - Dropbox SDK       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Netlify Edge (CDN)                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Serverless Functions                     │  │
│  │  /health  /llm-chat  /llm-rank  /search-google       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    External APIs                             │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Anthropic  │  │    Google    │  │   Dropbox    │      │
│  │    Claude    │  │   Custom     │  │     API      │      │
│  │     API      │  │   Search     │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- Pure HTML5/CSS3/JavaScript (ES6+)
- No external dependencies (except Dropbox SDK)
- Single-page application architecture
- Responsive design for iPad Safari

**Backend:**
- Netlify Functions (TypeScript)
- Node.js 18 runtime
- esbuild bundler

**APIs:**
- Anthropic Claude API (claude-sonnet-4-20250514)
- Google Custom Search API
- Dropbox API v2 (OAuth 2.0)

**Data Storage:**
- Browser localStorage (primary cache)
- Dropbox App Folder (cloud persistence)
- Git repository (version control)

**Deployment:**
- Netlify CDN (global distribution)
- Automatic HTTPS
- Environment variable management

---

## Implementation Details

### Frontend Architecture

#### **File Structure**

```
rr_v60.html (single file, ~3000 lines)
├── HTML Structure (lines 1-1100)
│   ├── Header & Controls
│   ├── Reference List
│   ├── Edit Reference Modal (3 tabs)
│   └── Toast Notifications
│
├── CSS Styles (lines 15-900)
│   ├── Layout & Grid
│   ├── Modal Styling
│   ├── Dark/Light Theme Variables
│   └── Responsive Breakpoints
│
└── JavaScript Application (lines 1100-3000)
    ├── App State Management
    ├── Reference Parser
    ├── UI Event Handlers
    ├── API Communication
    ├── Dropbox Integration
    └── Debug Logging System
```

#### **Core JavaScript Object**

```javascript
const app = {
    // State
    references: [],           // All loaded references
    currentEditId: null,      // Currently editing reference
    candidates: [],           // Search results
    sessionLog: [],          // Debug entries

    // Dropbox
    dropboxAppKey: 'q4ldgkwjmhxv6w2',
    dropboxAccessToken: null,
    dropboxClient: null,

    // Methods
    init(),                  // Initialize app
    parseDecisions(),        // Parse decisions.txt
    editReference(),         // Open edit modal
    generateQueries(),       // AI query generation
    runSearches(),          // Google searches
    autorank(),             // AI ranking
    saveReference(),        // Save changes
    finalizeReference(),    // Mark as finalized
    saveDecisionsToDropbox(), // Auto-save to cloud
    loadDecisionsFromDropbox(), // Auto-load from cloud
    // ... 50+ more methods
}
```

#### **Key Features**

**1. Reference Parser** (lines 1400-1600)
- Regex-based parsing of `[ID] Author (YEAR). Title. Other.` format
- Handles edge cases: missing years, complex titles, punctuation
- Extracts FLAGS, URLs, queries from decisions.txt format
- Critical for data integrity

**2. Modal System** (lines 1700-2000)
- Three-tab interface with dynamic content
- Tab switching preserves state
- Form validation on finalization
- Auto-save on every Save/Finalize action

**3. Debug Logging** (lines 2500-2700)
- Panel-based stack system
- System Log consolidation (groups consecutive entries)
- Per-reference session tracking
- Exportable to Dropbox with timestamp

**4. Dropbox Integration** (lines 2750-2920)
- OAuth 2.0 authentication flow
- Token persistence in localStorage
- Auto-load on app startup
- Auto-save on every Save/Finalize
- Manual session log export

---

### Backend Architecture

#### **Netlify Functions**

All functions are TypeScript, deployed to `/.netlify/functions/`

**1. health.ts** - Health Check
```typescript
export default async (req: Request) => {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**2. llm-chat.ts** - Query Generation
- **Purpose:** Generate search queries using Claude
- **Model:** claude-sonnet-4-20250514
- **Input:** Reference metadata (title, author, year, etc.)
- **Output:** 10-15 search query strings
- **Timeout:** 10 seconds
- **Error Handling:** Returns error JSON if AI fails

**3. llm-rank.ts** - Candidate Ranking
- **Purpose:** Rank URLs with dual scoring
- **Model:** claude-sonnet-4-20250514
- **Input:** Array of candidate URLs with metadata
- **Output:** Array of ranked candidates with P/S scores
- **Scoring:** JSON format with Primary/Secondary scores
- **Error Handling:** Detailed error messages for JSON parse failures

**4. search-google.ts** - Google Custom Search
- **Purpose:** Execute Google searches
- **API:** Google Custom Search JSON API
- **Input:** Query string
- **Output:** Array of {title, link, snippet, query}
- **Rate Limiting:** Managed by Google API quotas
- **Deduplication:** Happens client-side

**5. resolve-urls.ts** - URL Validation (unused currently)
- **Purpose:** Validate URL accessibility
- **Future:** Could check for 404s, redirects

**6. proxy-fetch.ts** - CORS Proxy (unused currently)
- **Purpose:** Fetch external URLs for preview
- **Future:** Could enable URL content analysis

#### **API Communication Pattern**

All API calls from frontend:
```javascript
async function callNetlifyFunction(functionName, body) {
  const url = `${window.location.origin}/.netlify/functions/${functionName}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  return await response.json();
}
```

**Key Design Decision:** Always use absolute URLs to avoid 404 errors in SPA context.

---

### Data Flow Diagrams

#### **Query Generation Flow**

```
User clicks "Generate Queries"
         ↓
Frontend: app.generateQueries()
         ↓
POST /.netlify/functions/llm-chat
  Body: { title, authors, year, other, relevanceText }
         ↓
llm-chat.ts: Call Anthropic API
         ↓
Claude Sonnet 4: Generate 15 queries
         ↓
Response: { queries: [...] }
         ↓
Frontend: Update textarea, enable Search button
         ↓
Debug Log: Record queries with timestamp
```

#### **Search & Rank Flow**

```
User clicks "Run Searches"
         ↓
Frontend: app.runSearches()
         ↓
For each query (parallel):
  POST /.netlify/functions/search-google
    Body: { query }
         ↓
  search-google.ts: Call Google Custom Search API
         ↓
  Google: Return up to 10 results
         ↓
Frontend: Deduplicate all results → candidates[]
         ↓
User clicks "Autorank"
         ↓
POST /.netlify/functions/llm-rank
  Body: { candidates, reference metadata, model }
         ↓
llm-rank.ts: Call Anthropic API with ranking prompt
         ↓
Claude Sonnet 4: Score each candidate (P/S scores)
         ↓
Response: { rankings: [...] }
         ↓
Frontend: Sort by combined score, display top 20
         ↓
User manually selects Primary/Secondary URLs
         ↓
User clicks "Finalize"
         ↓
Frontend: app.finalizeReference()
  - Add FLAGS[FINALIZED]
  - Save to localStorage
  - Save to Dropbox
  - Update debug log
```

#### **Dropbox Sync Flow**

```
App Startup:
  init() → Check OAuth callback
       → Load token from localStorage
       → Initialize Dropbox client
       → loadDecisionsFromDropbox()
       → Parse and display references

User clicks "Save" or "Finalize":
  saveReference() or finalizeReference()
       → Update reference in memory
       → autoSave() → localStorage.setItem()
       → saveDecisionsToDropbox()
            → Generate full decisions.txt content
            → dropboxClient.filesUpload('/decisions.txt')
            → Show toast notification

User clicks "Save Session Log to Dropbox":
  saveSessionLogToDropbox()
       → Format session log as text
       → dropboxClient.filesUpload('/debug_logs/session_TIMESTAMP.txt')
       → localStorage.removeItem('rr_session_log')
       → Show toast notification
```

---

## File Formats & Data Structures

### decisions.txt Format

**Structure:** One reference per line (can be very long)

**Format:**
```
[RID] Authors (Year). Title. Other. Relevance: [text] FLAGS[FINALIZED] PRIMARY_URL[url] SECONDARY_URL[url] TERTIARY_URL[url]
Q: query 1
Q: query 2
```

**Example:**
```
[5] Tversky, A., & Kahneman, D. (1974). Judgment under Uncertainty: Heuristics and Biases. Science, 185(4157), 1124–1131. Relevance: Tversky and Kahneman's seminal work on heuristics and biases fundamentally reshapes our understanding of human judgment and decision-making under uncertainty, offering a cognitive framework that reveals the systematic ways in which our perceptions can deviate from rationality. FLAGS[FINALIZED] PRIMARY_URL[https://apps.dtic.mil/sti/tr/pdf/AD0767426.pdf] SECONDARY_URL[https://www.jstor.org/stable/1738360]
```

**Parsing Rules:**
1. Extract `[ID]` via regex
2. Extract `(YEAR)` via regex, handle missing year
3. Split on `. ` to find title and other
4. Extract FLAGS, URLs via regex
5. Extract queries on following lines starting with `Q:`

**Critical:** Parser is sensitive to exact formatting, especially punctuation after year.

---

### Final.txt Format

**Structure:** Clean, human-readable format with only finalized references

**Format:**
```
[RID] Authors (Year). Title. Other.
Primary URL: url
Secondary URL: url
Tertiary URL: url

[Next RID] ...
```

**Example:**
```
[5] Tversky, A., & Kahneman, D. (1974). Judgment under Uncertainty: Heuristics and Biases. Science, 185(4157), 1124–1131.
Primary URL: https://apps.dtic.mil/sti/tr/pdf/AD0767426.pdf
Secondary URL: https://www.jstor.org/stable/1738360

[6] Searle, J. R. (1995). The Construction of Social Reality. Free Press, New York. ISBN: 9780684831792.
Primary URL: http://www.protosociology.de/Rubrum/Burman-Searle.pdf
Secondary URL: https://epistemh.pbworks.com/f/6.+The+Construction+of+Social+Reality+(SCAN).pdf
```

**Generation:** Automatically created on export, filters for `FLAGS[FINALIZED]` only.

---

### Debug Log Format

**Structure:** Chronological log of all actions for a reference

**Entry Types:**
- Raw Reference from decisions.txt
- Parsed Reference Fields
- System Log (generic messages)
- Query Generation (AI)
- Search Results
- Autorank Results
- Manual URL Selection
- Finalization

**Example:**
```
Reference Refinement Debug Log
Generated: 10/23/2025, 3:24:53 PM
Total Entries: 236
================================================================================

================================================================================
REFERENCE ID: 5
================================================================================

[1:17:28 PM] Raw Reference from decisions.txt
--------------------------------------------------------------------------------
[No raw data available]

[1:17:28 PM] Parsed Reference Fields
--------------------------------------------------------------------------------
<strong>ID:</strong> 5
<strong>Title:</strong> Judgment under Uncertainty: Heuristics and Biases
<strong>Authors:</strong> Tversky, A., & Kahneman, D.
<strong>Year:</strong> 1974
<strong>Other:</strong> Science, 185(4157), 1124–1131
<strong>Primary URL:</strong> Not set
<strong>Secondary URL:</strong> Not set
<strong>Queries:</strong> 0 queries loaded

[1:17:29 PM] System Log
--------------------------------------------------------------------------------
Generating search queries...

[1:17:38 PM] Query Generation (AI)
--------------------------------------------------------------------------------
<strong>AI Model:</strong> claude-sonnet-4-20250514
<strong>Queries Generated:</strong>
"Judgment under Uncertainty: Heuristics and Biases" Tversky Kahneman 1974 filetype:pdf
Tversky Kahneman 1974 Science 185 "heuristics and biases" site:science.org
...

[1:17:39 PM] System Log
--------------------------------------------------------------------------------
Running searches for 15 queries...

[1:17:48 PM] System Log
--------------------------------------------------------------------------------
Total unique results: 119

[1:18:20 PM] Autorank Results
--------------------------------------------------------------------------------
<strong>Candidates Ranked:</strong> 20
<strong>Primary Recommendation:</strong>
URL: https://scholar.google.com/citations?user=ImhakoAAAAAJ&hl=en
Primary Score: 70
Secondary Score: 50
Combined Score: 60

[1:18:38 PM] System Log
--------------------------------------------------------------------------------
Selected as primary URL: https://apps.dtic.mil/sti/tr/pdf/AD0767426.pdf

[1:19:14 PM] System Log
--------------------------------------------------------------------------------
=== FINALIZED REFERENCE ===
```

**Storage:**
- localStorage: `rr_session_log` (array of objects)
- Dropbox: `/debug_logs/session_TIMESTAMP.txt` (formatted text)

---

### In-Memory Data Structures

**Reference Object:**
```javascript
{
  id: 5,
  text: "[5] Tversky, A., & Kahneman, D. (1974)...",
  authors: "Tversky, A., & Kahneman, D.",
  year: "1974",
  title: "Judgment under Uncertainty: Heuristics and Biases",
  other: "Science, 185(4157), 1124–1131",
  relevance_text: "Tversky and Kahneman's seminal work...",
  urls: {
    primary: "https://apps.dtic.mil/sti/tr/pdf/AD0767426.pdf",
    secondary: "https://www.jstor.org/stable/1738360",
    tertiary: ""
  },
  queries: [
    "query 1",
    "query 2"
  ],
  finalized: true
}
```

**Candidate Object:**
```javascript
{
  title: "Judgment under uncertainty: Heuristics and biases",
  link: "https://apps.dtic.mil/sti/tr/pdf/AD0767426.pdf",
  snippet: "Tversky A, Kahneman D. Science. 1974 Sep 27;185(4157):1124-31...",
  query: "\"Judgment under Uncertainty: Heuristics and Biases\" Tversky Kahneman 1974 filetype:pdf",
  primaryScore: 95,
  secondaryScore: 85,
  combinedScore: 90
}
```

**Debug Log Entry:**
```javascript
{
  timestamp: "1:17:28 PM",
  referenceId: 5,
  title: "Parsed Reference Fields",
  content: "<strong>ID:</strong> 5\n<strong>Title:</strong> Judgment under Uncertainty..."
}
```

---

## Deployment & Operations

### Netlify Deployment

#### **Configuration** (netlify.toml)

```toml
[build]
  command = ""
  publish = "."

[build.environment]
  NODE_VERSION = "18"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

  [functions."*"]
    timeout = 10

# API endpoint redirects
[[redirects]]
  from = "/api/health"
  to = "/.netlify/functions/health"
  status = 200

[[redirects]]
  from = "/api/llm/chat"
  to = "/.netlify/functions/llm-chat"
  status = 200

[[redirects]]
  from = "/api/llm/rank"
  to = "/.netlify/functions/llm-rank"
  status = 200

[[redirects]]
  from = "/api/search/google"
  to = "/.netlify/functions/search-google"
  status = 200

# Default redirect
[[redirects]]
  from = "/"
  to = "/rr_v60.html"
  status = 200

# CORS headers for functions
[[headers]]
  for = "/.netlify/functions/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Methods = "GET, POST, OPTIONS"
    Access-Control-Allow-Headers = "Content-Type, Authorization"
```

#### **Environment Variables** (Netlify Dashboard)

Required environment variables (never commit to Git):
- `GOOGLE_API_KEY` - Google Custom Search API key
- `GOOGLE_CX` - Google Custom Search Engine ID
- `ANTHROPIC_API_KEY` - Anthropic Claude API key

**Note:** OpenAI API key in `.env` is unused (legacy from earlier version).

#### **Deployment Commands**

**Standard Deployment:**
```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/
netlify deploy --prod --dir="." --message "v11.1 - Description"
```

**Build Functions Only:**
```bash
npm run build
```

**Local Development:**
```bash
npm run dev
# Runs netlify dev server at http://localhost:8888
```

**Check Status:**
```bash
netlify status
```

#### **Deployment Workflow**

1. Make changes to `rr_v60.html` or `netlify/functions/*.ts`
2. Test locally (open HTML in browser, or use `netlify dev`)
3. Commit to Git: `git add . && git commit -m "Description"`
4. Deploy: `netlify deploy --prod --dir="." --message "Description"`
5. Push to GitHub: `git push origin main`
6. Verify at https://rrv521-1760738877.netlify.app/rr_v60.html

**Important:** Always hard refresh browser (Cmd+Shift+R) after deployment to clear cache.

---

### Dropbox Setup

#### **App Configuration**

1. **Dropbox App Console:** https://www.dropbox.com/developers/apps
2. **App Name:** Reference Refinement
3. **App Key:** `q4ldgkwjmhxv6w2`
4. **Permission Type:** App Folder (scoped access)
5. **OAuth 2 Redirect URIs:**
   - `https://rrv521-1760738877.netlify.app/rr_v60.html`

#### **OAuth Flow**

1. User clicks "Connect to Dropbox"
2. Redirect to Dropbox authorization page
3. User approves app access
4. Redirect back with `access_token` in URL hash
5. Extract token, store in localStorage
6. Initialize Dropbox client
7. Auto-load `decisions.txt` from `/decisions.txt`

#### **File Paths**

All files saved to: `Dropbox/Apps/Reference Refinement/`

- `/decisions.txt` - Main reference file (auto-saved on Save/Finalize)
- `/debug_logs/session_TIMESTAMP.txt` - Session logs (manual save)

#### **Token Persistence**

- **Storage:** localStorage key `rr_dropbox_token`
- **Lifetime:** Indefinite (unless user revokes access)
- **Disconnect:** Clears token from localStorage

---

### Git Version Control

#### **Repository**

- **URL:** https://github.com/fergidotcom/reference-refinement.git
- **Branch:** main
- **Commits:** All major versions documented

#### **Commit Strategy**

**When to Commit:**
- After completing a version milestone
- After deploying significant features
- Before making major structural changes

**Commit Message Format:**
```
vX.X - Brief Description

Detailed changes:
- Feature 1
- Feature 2
- Bug fix 3

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

#### **Files Tracked**

**Always commit:**
- `rr_v60.html`
- `netlify.toml`
- `netlify/functions/*.ts`
- `package.json`, `package-lock.json`
- `tsconfig.json`
- `README.md`, `CLAUDE.md`, documentation files

**Never commit:**
- `.env` (contains API keys!)
- `node_modules/`
- `.netlify/`
- `decisions.txt` (data file, backed up to Dropbox)
- `debug_logs/` (backed up to Dropbox)

#### **Backup Strategy**

**Triple Redundancy:**
1. **Git:** Code and structure
2. **Dropbox:** Data files (decisions.txt, debug logs)
3. **localStorage:** Browser cache (temporary failover)

---

## System Log Analysis (Future)

### Overview

**Goal:** Iteratively improve query generation and autorank algorithms by analyzing human override patterns in debug logs.

**Current Status:** Manual URL curation phase (4/288 references processed)

**Next Phase:** System Log Analysis to reduce override rate from ~100% to <30%

### Planned Approach

#### **Phase 1: Selection Criteria Definition**
- Interview process to document URL selection heuristics
- Define hierarchy: Publisher > Repository > PDF > Commercial
- Identify disqualifiers: Aggregators, profiles, reviews
- Establish tradeoffs: Authority vs accessibility

#### **Phase 2: Query Effectiveness Analysis**
- Parse debug logs to identify winning queries
- Calculate success rates per query type
- Identify failed query patterns (0 results)
- Measure query efficiency (unique results per query)

#### **Phase 3: Autorank Scoring Refinement**
- Compare AI recommendations vs user selections
- Analyze override patterns
- Update ranking prompt with explicit criteria
- Add domain pattern recognition

#### **Phase 4: Automated Testing**
- Batch process 10 references with refined system
- Measure override rate reduction
- Iterate on failures
- Target: <30% override rate

#### **Phase 5: Production Automation**
- Confidence-based workflow:
  - High confidence (>90): Auto-finalize
  - Medium (70-90): Flag for review
  - Low (<70): Manual only
- Reserve exceptions for manual review
- Monitor exception rate

### Analysis Tools to Build

**Debug Log Parser:**
```python
def parse_session_log(log_file):
    """Extract structured data from debug logs"""
    return {
        'references': [{
            'id': int,
            'ai_primary': {url, p_score, s_score},
            'ai_secondary': {url, p_score, s_score},
            'user_primary': url,
            'user_secondary': url,
            'override': bool,
            'queries': [],
            'search_results': []
        }]
    }
```

**Override Pattern Analyzer:**
```python
def analyze_overrides(data):
    """Identify patterns in user overrides"""
    - Override rate by reference type
    - Characteristics of selected vs rejected URLs
    - Winning query patterns
    - Domain preferences
```

**Improvement Tracker:**
```python
def measure_accuracy(before, after):
    """Track refinement effectiveness"""
    - Override rate reduction
    - Confidence score correlation
    - Query efficiency gains
```

### Success Metrics

**Short-term:**
- Documented selection criteria
- Updated query/ranking prompts
- Override pattern insights

**Mid-term:**
- Override rate <50% on test batch
- Confidence scores correlate with user selections

**Long-term:**
- 70-80% auto-finalized correctly
- <10% exception rate
- <2 minutes per reference (vs current 10-15 minutes)

### Consultation Schedule

1. **Session 1:** Selection criteria definition (Q&A with user)
2. **Session 2:** First analysis after 20 references processed
3. **Session 3:** Test & validate refinements
4. **Session 4:** Production readiness assessment

**Reference:** See "System Log Analysis" section in this document for detailed plan.

---

## Troubleshooting

### Common Issues

#### **1. "Invalid redirect_uri" Error (Dropbox OAuth)**

**Symptoms:** Error page when clicking "Connect to Dropbox"

**Cause:** Redirect URI not configured in Dropbox app settings

**Solution:**
1. Go to Dropbox App Console
2. Add redirect URI: `https://rrv521-1760738877.netlify.app/rr_v60.html`
3. Save and retry connection

---

#### **2. "No rankings returned" Error (Autorank)**

**Symptoms:** Autorank button fails with error message

**Cause:**
- Anthropic API model deprecated or incorrect
- JSON parsing failure in ranking response

**Solution:**
1. Check `llm-rank.ts` uses current model: `claude-sonnet-4-20250514`
2. Check error logs in Netlify function dashboard
3. Verify Anthropic API key is set in environment variables

---

#### **3. App Shows Old Version After Deployment**

**Symptoms:** Changes not visible after successful deployment

**Cause:** Browser cache

**Solution:**
- **iPad Safari:** Close tab completely, reopen
- **Desktop:** Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
- **Nuclear option:** Clear Safari cache in Settings

---

#### **4. References Don't Load from Dropbox**

**Symptoms:** App shows empty list despite Dropbox connection

**Cause:**
- `decisions.txt` doesn't exist in Dropbox yet
- Dropbox token expired
- Network error

**Solution:**
1. Check Dropbox folder: `Apps/Reference Refinement/decisions.txt`
2. If missing, copy initial file manually
3. Disconnect and reconnect Dropbox in app
4. Check browser console for error messages

---

#### **5. "Title shows Untitled" Parsing Error**

**Symptoms:** References display as "Untitled" in main list

**Cause:** decisions.txt format doesn't match parser expectations

**Solution:**
1. Check format: `[ID] Author (YEAR). Title. Other.`
2. Ensure space after `(YEAR).`
3. Check console for parsing errors
4. Critical parsing code at lines 1491-1567 in rr_v60.html

---

#### **6. API Functions Timeout or Fail**

**Symptoms:** Generate Queries or Autorank times out

**Cause:**
- Anthropic API slow or down
- Google API quota exceeded
- Network issues

**Solution:**
1. Check Netlify function logs: https://app.netlify.com/projects/rrv521-1760738877/logs/functions
2. Verify API keys in environment variables
3. Check API status pages:
   - Anthropic: https://status.anthropic.com
   - Google: https://status.cloud.google.com
4. Increase timeout in netlify.toml if needed (current: 10s)

---

#### **7. Session Log Not Saving to Dropbox**

**Symptoms:** "Save Session Log to Dropbox" button does nothing

**Cause:**
- Not connected to Dropbox
- Empty session log
- Dropbox API error

**Solution:**
1. Verify Dropbox connection status
2. Check that you've performed actions (logs exist)
3. Check browser console for errors
4. Try disconnecting and reconnecting Dropbox

---

### Debug Tools

**Browser Console:**
- Open: Right-click → Inspect → Console
- Look for error messages in red
- Check network tab for failed API calls

**Netlify Function Logs:**
- URL: https://app.netlify.com/projects/rrv521-1760738877/logs/functions
- Shows real-time function execution
- Includes error stack traces

**Git History:**
```bash
git log --oneline --graph --all -20
git show <commit-hash>
git diff <commit1> <commit2>
```

**Netlify Deployment History:**
```bash
netlify deploys:list
netlify deploys:get <deploy-id>
```

---

## Version History

### v11.1 (Oct 23, 2025) - Dropbox OAuth Fix
- Fixed redirect URI to hardcoded value
- Resolved "Invalid redirect_uri" OAuth error
- Added console logging for debugging

### v11.0 (Oct 23, 2025) - Dropbox Integration
- OAuth 2.0 authentication flow
- Auto-save decisions.txt to Dropbox on Save/Finalize
- Auto-load decisions.txt from Dropbox on startup
- Manual session log save to Dropbox with auto-clear
- Fallback to localStorage when Dropbox not connected
- Added Dropbox SDK v10.34.0
- Removed "Download decisions.txt" button (obsolete)
- Files saved to `/decisions.txt` and `/debug_logs/`

### v10.10 (Oct 23, 2025) - UI Cleanup
- Removed Ping button and status indicator
- Updated deployment
- Git commit made

### v10.9 (Oct 22, 2025) - Download Buttons
- Added Download decisions.txt button
- Added Download Session Log button
- Download functionality before Dropbox integration

### v10.8 (Oct 22, 2025) - Workflow Refinements
- Session log persistence to localStorage
- Debug tab redesign with panel system

### v10.7 (Oct 22, 2025) - Debug Panel System
- Complete redesign to panel-based stack
- System Log consolidation feature
- Save/Finalize/Done workflow changes

### v10.6 (Oct 22, 2025) - API Model Fix
- Fixed Anthropic API model to claude-sonnet-4-20250514
- Resolved 404 errors in Autorank
- Fixed "No rankings returned" issue

### v10.5 (Oct 21, 2025) - Compact Candidate Layout
- Redesigned candidate cards with stacked buttons
- Removed Preview button
- Reduced vertical space per candidate

### v10.4 (Oct 21, 2025) - UI Improvements
- Expanded Title field to fill line after RID
- Removed Journal/Book Title and Publisher fields
- Increased Generated Queries textarea height
- Removed section titles ("SEARCH RESULTS", etc.)
- Made candidates container shorter

### v10.0-10.3 (Oct 2025) - Modal Fix & Improvements
- Various UI refinements
- Bug fixes

### v8.0-v9.9 (Sep-Oct 2025) - Major Features
- Query generation improvements
- Autorank system implementation
- Debug logging system

### v7.4 (Sep 2025) - Title Parsing Fix
- Fixed "Untitled" bug in reference parser
- Improved parsing of complex titles

### v7.0-v7.3 (Sep 2025) - Netlify Functions
- Migrated to Netlify Functions from FastAPI
- Fixed API URL issues (relative → absolute)
- Implemented all backend endpoints

### v6.x (Aug 2025) - FastAPI Backend
- Initial backend with FastAPI
- Client/server architecture
- Local development with cloudflared

---

## Appendices

### A. File Inventory

**Production Files:**
- `rr_v60.html` - Main application (3000+ lines)
- `netlify.toml` - Netlify configuration
- `netlify/functions/*.ts` - Backend API functions
- `package.json` - Node dependencies
- `tsconfig.json` - TypeScript configuration

**Documentation:**
- `README.md` - Quick start guide
- `CLAUDE.md` - Project instructions for Claude Code
- `DOCUMENTATION.md` - This comprehensive document
- `v74_SUMMARY.md` - Historical version documentation

**Data Files (not in Git):**
- `decisions.txt` - Working references (368KB, 288 refs)
- `debug_logs/*.txt` - Session logs
- `.env` - API keys (NEVER COMMIT)

**Development:**
- `.gitignore` - Excludes node_modules, .env, etc.
- `backend_server.py` - Legacy FastAPI backend (unused)
- `rr_start.sh` - Legacy startup script (unused)

---

### B. API Quotas & Costs

**Anthropic Claude API:**
- Model: claude-sonnet-4-20250514
- Usage: 2 calls per reference (query gen + ranking)
- Cost: ~$0.015 per reference (estimated)
- Monthly limit: None (pay-as-you-go)

**Google Custom Search API:**
- Usage: 15 searches per reference
- Free tier: 100 searches/day
- Paid tier: $5 per 1000 queries
- Monthly cost: ~$20-30 for active use

**Dropbox API:**
- Free tier: 150 API calls/hour
- Usage: 1-2 calls per Save/Finalize
- Cost: Free for this use case

**Netlify:**
- Free tier: 100GB bandwidth/month, 125K function requests/month
- Current usage: Well within free tier
- Cost: $0

---

### C. Browser Compatibility

**Tested & Supported:**
- iPad Safari 17+ (primary target)
- macOS Safari 17+
- Chrome 120+
- Firefox 120+

**Known Issues:**
- Internet Explorer: Not supported (EOL)
- Old Safari versions (<15): localStorage issues possible

**Required Features:**
- ES6+ JavaScript (async/await, arrow functions)
- Fetch API
- localStorage
- CSS Grid
- CSS Variables

---

### D. Performance Benchmarks

**Query Generation:**
- AI processing: 6-10 seconds
- User perception: Acceptable (visible progress)

**Search Execution:**
- 15 parallel queries: 8-12 seconds
- User perception: Good (shows real-time progress)

**Autorank:**
- 20-100 candidates: 15-25 seconds
- User perception: Slow but acceptable (complex operation)

**File Operations:**
- Load from Dropbox: 1-2 seconds
- Save to Dropbox: <1 second
- Parse decisions.txt: <1 second (even at 368KB)

**Overall Workflow:**
- Complete reference (with AI): 10-15 minutes currently
- Target with automation: <2 minutes
- Manual exceptions: 5-10 minutes acceptable

---

### E. Future Enhancements

**High Priority:**
1. System Log Analysis implementation
2. Confidence-based auto-finalization
3. Batch processing interface
4. Override rate tracking dashboard

**Medium Priority:**
5. URL validation (check for 404s)
6. PDF content preview
7. Citation format export (BibTeX, etc.)
8. Mobile app (React Native)

**Low Priority:**
9. Collaborative editing (multi-user)
10. API rate limiting dashboard
11. Custom query templates
12. Advanced filtering (by publication type, year range)

---

### F. Contact & Support

**Developer:** Joe Ferguson
**Project Repository:** https://github.com/fergidotcom/reference-refinement.git
**Documentation:** This file
**Claude Code:** Used for development assistance
**Last Updated:** October 23, 2025

---

## License

**Status:** Private project, not open source

**Copyright:** © 2025 Joe Ferguson

**Usage:** Internal research tool for academic manuscript preparation

---

*End of Documentation*
