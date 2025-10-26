# Reference Refinement Tool - Complete Documentation

**Version:** 13.0
**Last Updated:** October 26, 2025
**Author:** Joe Ferguson
**Live URL:** https://rrv521-1760738877.netlify.app/rr_v60.html
**GitHub Repository:** https://github.com/fergidotcom/reference-refinement.git

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [What's New in v13.0](#whats-new-in-v130)
3. [Dropbox Integration Details](#dropbox-integration-details)
4. [API Keys and Environment Variables](#api-keys-and-environment-variables)
5. [Functional Goals](#functional-goals)
6. [Reference Refinement Process](#reference-refinement-process)
7. [Technical Architecture](#technical-architecture)
8. [Implementation Details](#implementation-details)
9. [File Formats & Data Structures](#file-formats--data-structures)
10. [Deployment & Operations](#deployment--operations)
11. [Troubleshooting](#troubleshooting)
12. [Version History](#version-history)

---

## Project Overview

### Purpose

The Reference Refinement Tool is a web-based application designed to help researchers validate and enhance bibliographic references by finding and ranking authoritative URLs for academic works. The tool combines AI-powered search query generation with Google Custom Search and Claude-based ranking to identify the best online sources for each reference.

### Key Innovation

Rather than manually searching for each reference URL, the tool:
1. Generates intelligent search queries using AI (15 queries per reference)
2. Executes parallel Google searches across all queries
3. Ranks results using AI with dual scoring (Primary + Secondary metrics)
4. Optionally performs additional web searches during ranking for better results
5. Provides semi-automated workflow with human oversight
6. Maintains comprehensive debug logs for continuous improvement
7. Auto-syncs with Dropbox for cloud storage and cross-device access

### Target User

Academic researchers and authors who need to:
- Validate bibliographic references for manuscripts
- Find authoritative URLs for citations
- Maintain a decision log of reference research
- Track relevance justifications for each source

### Current Status

- **288 references** in active bibliography
- **Production-ready** for manual URL curation phase
- **Dropbox integration** fully deployed with OAuth 2.0 PKCE flow
- **iPad-optimized** for mobile research workflow
- **Enhanced ranking** with adaptive search tool usage

---

## What's New in v13.0

### 🔐 Dropbox OAuth with PKCE (Major Enhancement)

**Previous Implementation (v11.x-v12.x):**
- Used Implicit Grant flow (access token in URL fragment)
- No refresh tokens
- Required re-authentication when token expired
- Less secure

**New Implementation (v13.0):**
- **PKCE Flow** (Proof Key for Code Exchange) for enhanced security
- **Refresh Tokens** stored in localStorage for automatic renewal
- **Token Expiry Tracking** with automatic refresh before expiration
- **Netlify Function** (`dropbox-oauth.ts`) securely exchanges authorization code for tokens
- **Data Preservation** on reconnect - won't overwrite in-memory changes

**Benefits:**
- More secure OAuth flow (industry best practice)
- Seamless token refresh without user intervention
- Better user experience - rarely need to re-authenticate
- Server-side secret handling (never exposed to frontend)

### 🚀 Enhanced llm-rank.ts for Large Candidate Sets

**Problem:** When ranking 100+ candidates, Claude would often use the search tool multiple times, causing:
- Function timeouts (exceeded 10 second limit)
- Unnecessary API calls
- Slower user experience

**Solution:**
- Automatically **disables search tool** when candidate count >= 50
- Increases function timeout to **26 seconds** (Netlify maximum)
- More efficient ranking with focused evaluation
- Better error messages with longer response previews (500 chars vs 200)

**Impact:**
- Faster ranking for large result sets
- Fewer timeout errors
- More predictable performance

### 📝 User Notes Panel in Debug Tab

**New Feature:**
- Dedicated textarea in Debug tab for user observations
- Auto-saves notes to session log as you type
- Helps document decision-making process
- Valuable for future analysis and learning

**Use Cases:**
- "AI recommended Google Scholar profile but I chose official PDF because..."
- "This reference has unusual title format - parser had trouble"
- "Search queries for author CV were very effective"

### 🎨 UI/UX Improvements

1. **Toast Notifications**
   - Added close buttons (×) for manual dismissal
   - Better layout with proper spacing
   - Wider toasts (400px max) for longer messages

2. **Override Tracking Statistics**
   - New stat panel shows count of AI overrides
   - Helps track manual intervention rate
   - Useful for measuring automation success

3. **Clear Session Log Button**
   - Quick way to reset debug log
   - Useful when starting fresh work session
   - Complements "Save to Dropbox" functionality

4. **Cache Busting Meta Tags**
   - Prevents browser caching issues
   - Ensures users always see latest version
   - Critical for rapid iteration and deployment

### 🔧 Technical Enhancements

1. **Function Timeout Increased**
   - Raised from 10s to 26s (Netlify max)
   - Allows more time for complex ranking operations
   - Reduces timeout errors

2. **Improved Token Management**
   - Stores access token, refresh token, and expiry time
   - Proactive token refresh before expiration
   - Graceful handling of expired tokens

3. **Reconnect Data Preservation**
   - Flag prevents auto-load from Dropbox after reconnect
   - Preserves in-memory changes during re-authentication
   - Prevents accidental data loss

---

## Dropbox Integration Details

### App Configuration

**Dropbox App Console:** https://www.dropbox.com/developers/apps

**App Details:**
- **App Name:** Reference Refinement
- **App Key:** `q4ldgkwjmhxv6w2`
- **App Secret:** `[REDACTED - Set in Netlify environment variable DROPBOX_APP_SECRET]`
- **Permission Type:** App Folder (scoped access only)
- **Access Type:** Files and folders

**OAuth 2 Configuration:**
- **Redirect URIs:** `https://rrv521-1760738877.netlify.app/rr_v60.html`
- **Flow Type:** Authorization Code with PKCE
- **Grant Types:** authorization_code, refresh_token

### OAuth Flow (PKCE)

**Step-by-Step Process:**

1. **User clicks "Connect to Dropbox"**
   - Frontend generates code_verifier (random string)
   - Creates code_challenge from code_verifier (SHA-256 hash)
   - Stores code_verifier in localStorage
   - Redirects to Dropbox authorization page with code_challenge

2. **User approves access**
   - Dropbox redirects back with authorization code in URL
   - Frontend extracts code from URL

3. **Frontend calls dropbox-oauth.ts function**
   - Sends: authorization code + code_verifier
   - Function uses DROPBOX_APP_SECRET (server-side)
   - Makes POST to Dropbox token endpoint
   - Returns: access_token, refresh_token, expires_in

4. **Frontend stores tokens**
   - access_token → localStorage `rr_dropbox_token`
   - refresh_token → localStorage `rr_dropbox_refresh_token`
   - expiry time → localStorage `rr_dropbox_token_expiry`
   - Initializes Dropbox SDK client

5. **Auto-load decisions.txt**
   - Fetches from `/decisions.txt` in app folder
   - Parses and displays references

### Token Refresh

**Automatic Process:**
- Before each Dropbox API call, checks if token expired
- If expired or within 5 minutes of expiry:
  - Calls dropbox-oauth.ts with refresh_token
  - Gets new access_token (and possibly new refresh_token)
  - Updates localStorage
  - Reinitializes Dropbox client
- User never sees re-authentication unless refresh token is revoked

**Manual Refresh:**
- User can disconnect and reconnect anytime
- Useful if permissions change or sync issues occur

### File Paths and Operations

**App Folder Location:**
- User's Dropbox: `/Apps/Reference Refinement/`
- All file paths are relative to this folder

**Key Files:**
- `/decisions.txt` - Main working file (auto-saved on Save/Finalize)
- `/debug_logs/session_YYYYMMDD_HHMMSS.txt` - Session logs (manual save)

**Auto-Save Triggers:**
- Clicking "Save" button in Edit Reference modal
- Clicking "Finalize" button in Edit Reference modal
- Both update decisions.txt in Dropbox immediately

**Manual Save:**
- "Save Session Log to Dropbox" button in controls
- Creates timestamped file in `/debug_logs/` folder
- Clears localStorage session log after successful save

---

## API Keys and Environment Variables

### Complete Reference Guide

All API keys and secrets are managed through Netlify's environment variable system. Never commit these to Git.

#### 1. Google Custom Search API

**Purpose:** Execute Google searches for reference URLs

**Where to Get:**
- Google Cloud Console: https://console.cloud.google.com/apis/credentials
- Enable Custom Search API for your project
- Create API key

**Environment Variables:**
```
GOOGLE_API_KEY=AIzaSy... (your API key)
GOOGLE_CX=e1f7a... (your search engine ID)
```

**Setting up Custom Search Engine:**
1. Go to https://programmablesearchengine.google.com/
2. Create new search engine
3. Choose "Search the entire web"
4. Copy the Search Engine ID (CX)

**Quotas:**
- Free tier: 100 searches/day
- Paid tier: $5 per 1000 queries
- Current usage: ~15 searches per reference processed

**Used By:**
- `netlify/functions/search-google.ts`

#### 2. Anthropic Claude API

**Purpose:** AI-powered query generation and result ranking

**Where to Get:**
- Anthropic Console: https://console.anthropic.com/
- Create account and generate API key

**Environment Variable:**
```
ANTHROPIC_API_KEY=sk-ant-... (your API key)
```

**Model Used:**
- `claude-sonnet-4-20250514` (Claude Sonnet 4)

**Quotas:**
- Pay-as-you-go pricing
- ~$0.015 per reference (query gen + ranking)

**Used By:**
- `netlify/functions/llm-chat.ts` (query generation)
- `netlify/functions/llm-rank.ts` (candidate ranking)

#### 3. Dropbox API

**Purpose:** Cloud storage and sync for decisions.txt and session logs

**Where to Get:**
- Dropbox App Console: https://www.dropbox.com/developers/apps
- Create new app with "App folder" access type
- Get App Key and App Secret

**Public App Key** (hardcoded in frontend):
```
DROPBOX_APP_KEY=q4ldgkwjmhxv6w2
```

**Secret Environment Variable** (Netlify only):
```
DROPBOX_APP_SECRET=[REDACTED - See Netlify environment variables]
```

**OAuth Redirect URI:**
```
https://rrv521-1760738877.netlify.app/rr_v60.html
```

**Quotas:**
- Free tier: 150 API calls/hour
- Current usage: 1-2 calls per Save/Finalize

**Used By:**
- `netlify/functions/dropbox-oauth.ts` (OAuth token exchange)
- Frontend Dropbox SDK (file operations)

### Setting Environment Variables in Netlify

**Command Line:**
```bash
netlify env:set VARIABLE_NAME "value"
```

**Dashboard:**
1. Go to https://app.netlify.com/projects/rrv521-1760738877/settings/deploys
2. Click "Environment variables"
3. Add new variable
4. Redeploy site for changes to take effect

**Verification:**
```bash
netlify env:list
```

### Security Best Practices

1. **Never commit API keys to Git**
   - `.env` is in `.gitignore`
   - Use Netlify environment variables for production

2. **Rotate keys periodically**
   - Especially if exposed accidentally
   - Update in Netlify dashboard

3. **Monitor usage**
   - Check API dashboards for unexpected spikes
   - Set up billing alerts

4. **Use scoped permissions**
   - Dropbox: App folder only (not full Dropbox access)
   - Google: Custom Search API only
   - Anthropic: API key with usage limits

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
   - Auto-save to Dropbox (primary)
   - Auto-save to localStorage (browser backup)
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

**Tab 3: Debug & User Notes**
- **NEW in v13.0:** User notes panel at top
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

---

#### **4. Execute Searches** (Google Custom Search API)

**Process:**
- Execute all 15 queries in parallel via Netlify Function
- Each query returns up to 10 results
- Deduplicate across all results
- Typical yield: 60-120 unique URLs per reference

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

**NEW in v13.0: Adaptive Search Tool Usage**
- **Small candidate sets (<50 URLs):** Search tool enabled
  - Claude can perform additional web searches if needed
  - Useful when initial results don't include canonical sources

- **Large candidate sets (≥50 URLs):** Search tool disabled
  - Faster ranking (no additional searches)
  - Prevents timeout issues
  - Assumes enough candidates already present

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
- Add notes in User Notes panel about decision rationale
- Override if necessary
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

## Technical Architecture

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (iPad/Desktop)                  │
│                    Single HTML File (rr_v60.html)            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Reference   │  │    Edit      │  │    Debug     │      │
│  │     List     │  │    Modal     │  │   + Notes    │      │
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
│  │  /dropbox-oauth (NEW v13.0)                          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    External APIs                             │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Anthropic  │  │    Google    │  │   Dropbox    │      │
│  │    Claude    │  │   Custom     │  │     API      │      │
│  │     API      │  │   Search     │  │   v2 OAuth   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- Pure HTML5/CSS3/JavaScript (ES6+)
- Dropbox SDK v10.34.0 (only external dependency)
- Single-page application architecture
- Responsive design for iPad Safari

**Backend:**
- Netlify Functions (TypeScript)
- Node.js 18 runtime
- esbuild bundler (automatic compilation)

**APIs:**
- Anthropic Claude API (claude-sonnet-4-20250514)
- Google Custom Search API
- Dropbox API v2 (OAuth 2.0 with PKCE)

**Data Storage:**
- Dropbox App Folder (cloud persistence)
- Browser localStorage (client-side cache)
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
rr_v60.html (single file, ~3500 lines)
├── HTML Structure (lines 1-1300)
│   ├── Header & Controls
│   ├── Statistics Panel
│   ├── Reference List
│   ├── Edit Reference Modal (3 tabs)
│   └── Toast Notifications
│
├── CSS Styles (lines 15-1000)
│   ├── Layout & Grid
│   ├── Modal Styling
│   ├── Toast Improvements (v13.0)
│   ├── Dark/Light Theme Variables
│   └── Responsive Breakpoints
│
└── JavaScript Application (lines 1300-3500)
    ├── App State Management
    ├── Reference Parser
    ├── UI Event Handlers
    ├── API Communication
    ├── Dropbox OAuth & Token Refresh (enhanced v13.0)
    ├── User Notes Auto-Save (NEW v13.0)
    └── Debug Logging System
```

### Backend Architecture (Netlify Functions)

All functions are TypeScript, deployed to `/.netlify/functions/`

#### **1. health.ts** - Health Check
```typescript
export const handler: Handler = async (req: Request) => {
  return new Response(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

#### **2. llm-chat.ts** - Query Generation
- **Purpose:** Generate search queries using Claude
- **Model:** claude-sonnet-4-20250514
- **Input:** Reference metadata (title, author, year, etc.)
- **Output:** 10-15 search query strings
- **Timeout:** 26 seconds
- **Error Handling:** Returns error JSON if AI fails

#### **3. llm-rank.ts** - Candidate Ranking (Enhanced v13.0)
- **Purpose:** Rank URLs with dual scoring
- **Model:** claude-sonnet-4-20250514
- **Input:** Array of candidate URLs with metadata
- **Output:** Array of ranked candidates with P/S scores
- **Scoring:** JSON format with Primary/Secondary scores
- **NEW:** Disables search tool for candidate count >= 50
- **NEW:** Better error messages (500 char preview vs 200)
- **Error Handling:** Detailed error messages for JSON parse failures

#### **4. search-google.ts** - Google Custom Search
- **Purpose:** Execute Google searches
- **API:** Google Custom Search JSON API
- **Input:** Query string
- **Output:** Array of {title, link, snippet, query}
- **Rate Limiting:** Managed by Google API quotas
- **Deduplication:** Happens client-side

#### **5. dropbox-oauth.ts** - OAuth Token Exchange (NEW v13.0)
- **Purpose:** Securely exchange OAuth codes for tokens
- **Flow:** PKCE (Proof Key for Code Exchange)
- **Input:**
  - Initial auth: `code`, `code_verifier`
  - Refresh: `refresh_token`, `grant_type: 'refresh_token'`
- **Output:** `access_token`, `refresh_token`, `expires_in`, `token_type`
- **Security:** Uses server-side DROPBOX_APP_SECRET
- **Error Handling:** Detailed logging, error messages returned to client

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

### Debug Log Format

**Structure:** Chronological log of all actions for a reference

**Entry Types:**
- Raw Reference from decisions.txt
- Parsed Reference Fields
- System Log (generic messages)
- User Notes (NEW v13.0)
- Query Generation (AI)
- Search Results
- Autorank Results
- Manual URL Selection
- Finalization

**Storage:**
- localStorage: `rr_session_log` (array of objects)
- Dropbox: `/debug_logs/session_TIMESTAMP.txt` (formatted text)

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

  # Function timeout (26 seconds - Netlify max) - UPDATED v13.0
  [functions."*"]
    timeout = 26

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

# NEW in v13.0
[[redirects]]
  from = "/api/dropbox-oauth"
  to = "/.netlify/functions/dropbox-oauth"
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

#### **Deployment Commands**

**Standard Deployment:**
```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/
netlify deploy --prod --dir="." --message "v13.0 - Description"
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

**Check Environment Variables:**
```bash
netlify env:list
```

**Set Environment Variable:**
```bash
netlify env:set VARIABLE_NAME "value"
```

#### **Deployment Workflow**

1. Make changes to `rr_v60.html` or `netlify/functions/*.ts`
2. Test locally (open HTML in browser, or use `netlify dev`)
3. Commit to Git: `git add . && git commit -m "Description"`
4. Deploy: `netlify deploy --prod --dir="." --message "Description"`
5. Push to GitHub: `git push origin main`
6. Verify at https://rrv521-1760738877.netlify.app/rr_v60.html
7. Hard refresh browser (Cmd+Shift+R) to clear cache

---

## Troubleshooting

### Common Issues

#### **1. Dropbox OAuth Errors**

**"Invalid redirect_uri":**
- Check redirect URI in Dropbox App Console matches exactly
- Must be: `https://rrv521-1760738877.netlify.app/rr_v60.html`

**"DROPBOX_APP_SECRET not configured":**
- Set in Netlify: `netlify env:set DROPBOX_APP_SECRET "your-app-secret-from-dropbox-console"`
- Redeploy site after setting

**Token refresh fails:**
- Disconnect and reconnect Dropbox in app
- Check Netlify function logs for detailed error
- Verify refresh token is stored in localStorage

#### **2. Ranking Timeouts**

**Symptoms:** Autorank fails with timeout error

**Causes:**
- Too many candidates (>100)
- Claude using search tool extensively
- Network latency

**Solutions:**
- v13.0 automatically disables search for 50+ candidates
- Reduce candidate count by filtering in Candidates tab
- Check function logs for specific errors

#### **3. References Don't Load from Dropbox**

**Symptoms:** App shows empty list despite Dropbox connection

**Causes:**
- `decisions.txt` doesn't exist in Dropbox yet
- Token expired
- Network error

**Solutions:**
1. Check Dropbox folder: `/Apps/Reference Refinement/decisions.txt`
2. If missing, upload initial file manually
3. Disconnect and reconnect Dropbox in app
4. Check browser console for error messages

---

## Version History

### v13.0 (October 26, 2025) - Current Release

**Major Enhancements:**

1. **Dropbox OAuth with PKCE**
   - Migrated from Implicit Grant to Authorization Code + PKCE flow
   - Added `dropbox-oauth.ts` Netlify function for secure token exchange
   - Implemented refresh token support for automatic token renewal
   - Added token expiry tracking and proactive refresh
   - Data preservation flag to prevent overwrites on reconnect

2. **Enhanced llm-rank.ts**
   - Adaptive search tool usage: disabled for candidate count >= 50
   - Increased function timeout to 26 seconds (Netlify max)
   - Better error messages with 500-char response previews
   - Improved logging for debugging

3. **User Notes Panel**
   - New textarea in Debug tab for user observations
   - Auto-saves notes to session log as you type
   - Helps document decision-making for future analysis

4. **UI/UX Improvements**
   - Toast close buttons for manual dismissal
   - Override tracking in statistics panel
   - Clear session log button
   - Cache busting meta tags
   - Improved toast layout and sizing

**Technical Changes:**
- netlify.toml timeout: 10s → 26s
- Added cache-control meta tags
- Enhanced token management in frontend
- Better error handling throughout

---

### v12.0 (October 2025) - AI-Powered Search During Ranking

**Features:**
- Enabled web search tool during autorank
- Claude can perform additional searches if needed
- Improved ranking accuracy for difficult references

---

### v11.x (October 2025) - Dropbox Integration (Implicit Grant)

**Features:**
- Dropbox OAuth integration (Implicit Grant flow)
- Auto-save to Dropbox on Save/Finalize
- Auto-load from Dropbox on startup
- Session log export to Dropbox

**Known Limitations:**
- No refresh tokens (required re-auth on expiry)
- Less secure flow (token in URL fragment)

---

### v10.x (September-October 2025) - UI Refinements

**Features:**
- Debug panel system redesign
- Session log persistence
- Download buttons for files
- Compact candidate layout
- Various bug fixes

---

### v8.0-v9.x (September 2025) - Core Features

**Features:**
- Query generation improvements
- Autorank system implementation
- Debug logging system
- Three-tab modal interface

---

### v7.4 (September 2025) - Title Parsing Fix

**Fixes:**
- Fixed "Untitled" bug in reference parser
- Improved parsing of complex titles

---

### v7.0-v7.3 (September 2025) - Netlify Functions

**Migration:**
- Migrated from FastAPI to Netlify Functions
- Fixed API URL issues (relative → absolute)
- Implemented all backend endpoints in TypeScript

---

### v6.x (August 2025) - FastAPI Backend

**Initial Implementation:**
- FastAPI backend with client/server architecture
- Local development with cloudflared tunnel
- Basic reference management features

---

## Appendices

### A. Complete File Inventory

**Production Files:**
- `rr_v60.html` - Main application (~3500 lines)
- `netlify.toml` - Netlify configuration
- `netlify/functions/*.ts` - 7 backend API functions
- `package.json` - Node dependencies
- `.env` - API keys (NOT IN GIT)

**Documentation:**
- `README.md` - Quick start guide
- `CLAUDE.md` - Project instructions for Claude Code
- `DOCUMENTATION.md` - This comprehensive document

**Data Files (not in Git):**
- `decisions.txt` - Working references
- `debug_logs/*.txt` - Session logs

---

### B. API Quotas & Estimated Costs

**Anthropic Claude API:**
- Model: claude-sonnet-4-20250514
- Usage: 2-3 calls per reference (query gen + ranking + optional searches)
- Cost: ~$0.02 per reference (estimated)

**Google Custom Search API:**
- Usage: 15 searches per reference
- Free tier: 100 searches/day
- Paid tier: $5 per 1000 queries
- Monthly cost: ~$20-30 for active use

**Dropbox API:**
- Free tier: 150 API calls/hour
- Usage: 1-2 calls per Save/Finalize
- Cost: Free

**Netlify:**
- Free tier: 100GB bandwidth/month, 125K function requests/month
- Current usage: Well within free tier
- Cost: $0

---

### C. Support & Resources

**Developer:** Joe Ferguson
**Project Repository:** https://github.com/fergidotcom/reference-refinement.git
**Live Application:** https://rrv521-1760738877.netlify.app/rr_v60.html
**Documentation:** This file
**Last Updated:** October 26, 2025

**External Resources:**
- Netlify Docs: https://docs.netlify.com/
- Dropbox API Docs: https://www.dropbox.com/developers/documentation
- Anthropic API Docs: https://docs.anthropic.com/
- Google Custom Search API: https://developers.google.com/custom-search

---

*End of Documentation*
