# Reference Refinement - Project Overview

**Project Name:** Reference Refinement Tool
**Purpose:** Academic reference management with AI-powered URL search and validation
**Status:** ✅ Production Ready (v16.7)
**Last Updated:** November 1, 2025
**Live URL:** https://rrv521-1760738877.netlify.app

---

## Project Purpose

Reference Refinement is a web application designed to help researchers find, validate, and manage URLs for bibliographic references. The tool combines AI-powered search query generation, Google Custom Search integration, and intelligent URL ranking to suggest the best primary and secondary sources for academic citations.

**Key Value Propositions:**
- AI-generated search queries optimized for finding academic sources
- Automated URL validation with soft/hard 404 detection
- Intelligent ranking that distinguishes between source types (full-text vs reviews)
- Batch processing for large reference collections
- iPad-optimized UI for on-the-go research
- Dropbox integration for seamless data synchronization

---

## Current Architecture

### Frontend Architecture
**Single-Page Application (SPA)**
- **Production File:** `index.html` (always current version)
- **Versioned Backups:** `rr_vXXX.html` files kept for history
- **Technology Stack:** Pure HTML/CSS/JavaScript (no frameworks)
- **Design Philosophy:** Zero dependencies, maximum compatibility
- **Primary Platform:** iPad Safari (also works on desktop browsers)
- **Access Pattern:** Netlify serves `index.html` at root URL automatically

**Key Frontend Features:**
- Three-tab Edit modal (Metadata, URLs, Debug)
- Real-time cost tracking (Google Search + Claude API)
- Session debug logging with export capability
- Reference finalization workflow
- Query generation with configurable allocation (primary vs secondary)
- Autorank system with candidate validation

### Backend Architecture
**Netlify Serverless Functions (Primary)**

Located in `netlify/functions/` - TypeScript functions with 26-second timeout:

1. **health.ts** - System health check endpoint
2. **llm-chat.ts** - Claude API integration for query generation
3. **llm-rank.ts** - Claude API integration for URL ranking
4. **search-google.ts** - Google Custom Search API integration
5. **dropbox-oauth.ts** - OAuth token exchange with PKCE support
6. **resolve-urls.ts** - URL resolution and validation (redirects, status codes)
7. **proxy-fetch.ts** - CORS proxy for external URL fetching

**FastAPI Backend (Optional Development Alternative)**
- **File:** `backend_server.py`
- **Purpose:** Local development with cloudflared tunnel
- **Usage:** Alternative to Netlify Functions for testing

### Batch Processing System
**Batch Processor (v16.7)**
- **File:** `batch-processor.js`
- **Current Version:** v16.7 (Enhanced Soft 404 Detection)
- **Purpose:** Process multiple references unattended
- **Configuration:** `batch-config.yaml`
- **Utilities:** `batch-utils.js` - Parsing and writing logic
- **Features:**
  - Resume capability from interruptions
  - Detailed logging to `batch-logs/`
  - Version tracking (FLAGS[BATCH_v16.7])
  - Enhanced soft 404 detection (11 error patterns)
  - Automatic MANUAL_REVIEW flagging
  - Optional auto-finalization (currently disabled)

---

## Key Objectives and Requirements

### Primary Objectives
1. **Find Valid URLs** - Locate working primary and secondary sources for references
2. **Validate Quality** - Ensure recommended URLs are accessible and not error pages
3. **Minimize Manual Work** - Automate as much of the search process as possible
4. **Maintain Accuracy** - Distinguish between source types (full-text vs reviews vs listings)
5. **Enable Batch Processing** - Handle large reference collections efficiently

### Core Requirements
- **iPad Compatibility** - Must work flawlessly on iPad Safari
- **Offline Capability** - LocalStorage fallback when Dropbox unavailable
- **Data Integrity** - Bulletproof save system with verification
- **Cost Tracking** - Monitor API usage and project costs
- **Version Tracking** - Track which batch version processed each reference
- **URL Validation** - Detect both hard 404s (HTTP errors) and soft 404s (HTML error pages)

### Quality Metrics
- **Override Rate:** <10% (target) - References requiring manual URL changes
- **URL Detection:** ~95% broken URL detection rate (v16.7)
- **Primary Coverage:** 100% (all references must have primary URL)
- **Secondary Coverage:** >90% (most references should have secondary source)

---

## Implementation Status

### ✅ Completed Features (Production Ready)

**iPad App (v16.6)**
- Reference loading from decisions.txt
- Three-tab Edit modal (Metadata, URLs, Debug)
- AI-powered query generation with configurable allocation
- Google Custom Search integration
- Autorank system with pipe-delimited parsing
- Primary/Secondary/Tertiary URL designation
- Reference finalization workflow
- Export to decisions.txt and Final.txt
- Cost tracking and session summaries
- Dropbox OAuth integration with PKCE
- Bulletproof save system (9-step verification)
- Quick finalize button for batch-reviewed references
- Batch version badge display (🤖 purple badges)
- Manual review flag handling

**Batch Processor (v16.7)**
- Automated query generation
- Google Search execution
- URL ranking with Claude API
- Hard 404 detection (HTTP status codes)
- Soft 404 detection - Phase 1 (content-type mismatch)
- Soft 404 detection - Phase 2 (content-based error patterns) ⭐ NEW
- Top 20 candidate validation before selection
- Batch version tracking (FLAGS[BATCH_vX.X])
- MANUAL_REVIEW flagging for failed searches
- Enhanced query prompts (synchronized with iPad app)
- Resume capability from interruptions
- Detailed logging with recommendations
- Manual review mode (auto-finalization disabled)

**URL Validation System (v16.7)**
- Level 1: Hard 404 detection (HTTP ≥400)
- Level 2: Soft 404 via content-type mismatch (PDF→HTML)
- Level 3: Soft 404 via content analysis (11 error patterns) ⭐ NEW
  - Generic 404 pages
  - DOI "not found" errors
  - University repository errors (Harvard, MIT, Shorenstein)
  - Suspiciously short error pages
  - HTML title tag error indicators
- 95% broken URL detection rate
- ~600-1000ms per URL validation
- Validates top 20 candidates before selection

**Enhanced Query System (v16.1)**
- Synchronized prompts between iPad app and batch processor
- 11-line query best practices guidance
- Exact title quoting for precision
- Character limits (40-80, max 120)
- Quoted phrase limits (1-2 max)
- Prioritization of free sources
- Anti-patterns (avoid URLs, domain names, over-specific jargon)

**Content-Type Detection (v14.1-v14.2)**
- PRIMARY: Distinguishes full-text sources from reviews
- SECONDARY: Distinguishes review articles from metadata listings
- Language detection (non-English domains capped)
- Review website vs review article distinction
- Enhanced ranking criteria with mutual exclusivity

### 🔧 In Progress

**None currently** - Project is feature-complete for current use case

### 📋 Planned Features

**Potential Future Enhancements:**
- Level 4 validation: Machine learning-based error page detection
- Automatic URL repair (finding working alternatives for broken URLs)
- Citation format conversion (different bibliography styles)
- Collaborative reference management (multi-user support)
- API for integration with reference managers (Zotero, Mendeley)
- Analytics dashboard for batch processing history

---

## File Structure and Key Components

### Core Application Files
```
Reference Refinement/
├── index.html                         # Production iPad app (v16.6)
├── rr_v16.6.html                      # Latest versioned backup
├── rr_v162.html                       # Previous version (URL validation)
├── rr_v161.html                       # Previous version (enhanced queries)
└── rr_v60.html                        # Legacy backup

Batch Processing System/
├── batch-processor.js                 # Main batch processor (v16.7)
├── batch-utils.js                     # Parsing and writing utilities
├── batch-config.yaml                  # Configuration (manual review mode)
├── batch-progress.json                # Resume state tracking
├── batch-logs/                        # Session logs by date
│   └── batch_YYYY-MM-DD_HH-MM-SS.txt

Netlify Functions/
├── netlify/functions/
│   ├── health.ts                      # Health check
│   ├── llm-chat.ts                    # Query generation (Claude)
│   ├── llm-rank.ts                    # URL ranking (Claude)
│   ├── search-google.ts               # Google Custom Search
│   ├── dropbox-oauth.ts               # OAuth token exchange
│   ├── resolve-urls.ts                # URL validation
│   └── proxy-fetch.ts                 # CORS proxy

Configuration/
├── netlify.toml                       # Netlify deployment config
├── package.json                       # Node dependencies
├── .env                               # API keys (NOT in git)
└── .gitignore                         # Git ignore rules

Data Files/
├── decisions.txt                      # Working references (symlink to Dropbox)
├── Final.txt                          # Clean publication format
└── Dropbox: /Apps/Reference Refinement/
    └── decisions.txt                  # Cloud-synced working file

Development Tools/
├── backend_server.py                  # Optional FastAPI backend
├── rr_start.sh                        # Start FastAPI + cloudflared
├── rr_check.sh                        # Check backend status
└── rr_stop.sh                         # Stop backend

Testing Scripts/
├── test-soft-404-detection.js         # URL validation tests
├── test-pattern-detection.js          # Error pattern tests
├── test-title-parsing.js              # Parser validation
├── analyze-references.js              # Reference quality analysis
└── validate-all-refs.js               # Batch validation

Documentation/
├── CLAUDE.md                          # Main project documentation
├── REFERENCE_REFINEMENT_OVERVIEW.md   # This file
├── REFERENCE_REFINEMENT_CHANGELOG.md  # Change history
├── V16_7_ENHANCED_SOFT_404_DETECTION.md
├── V16_2_URL_VALIDATION_SUMMARY.md
├── BATCH_V16_1_RESULTS.md
└── [30+ other session summaries and technical docs]
```

### Key Components Explained

**index.html** (Main Application)
- Lines 1-500: HTML structure and CSS styles
- Lines 500-1500: App initialization and state management
- Lines 1500-2000: Reference parsing logic
- Lines 2000-2500: UI rendering and event handlers
- Lines 2500-3000: Query generation (AI integration)
- Lines 3000-3500: Search and ranking logic
- Lines 3500-4000: Dropbox OAuth and file operations
- Lines 4000-4500: Bulletproof save system
- Lines 4500-5000: Debug logging and cost tracking

**batch-processor.js** (Batch Processing)
- Lines 1-100: Imports, configuration, version constants
- Lines 100-200: Main batch loop logic
- Lines 200-300: Reference processing workflow
- Lines 300-400: Query generation
- Lines 400-600: Search execution and candidate collection
- Lines 600-650: URL ranking with Claude
- Lines 650-810: Enhanced URL validation (3 levels) ⭐
- Lines 810-900: Primary/secondary selection
- Lines 900-1000: Logging and progress tracking
- Lines 1000+: Resume logic and error handling

**batch-utils.js** (Utilities)
- parseDecisionsFile() - Parse decisions.txt into objects
- writeDecisionsFile() - Write objects to decisions.txt
- parseFlags() - Extract FLAGS array
- parseQueries() - Extract Q: lines
- parseURLs() - Extract URL lines
- formatReference() - Format for output

---

## Dependencies and Tools

### Node.js Dependencies
```json
{
  "dependencies": {
    "@netlify/functions": "^2.4.0",  // Netlify Functions SDK
    "node-fetch": "^3.3.2",          // HTTP requests
    "yaml": "^2.3.4",                // YAML parsing (config)
    "chalk": "^5.3.0"                // Terminal colors (batch logs)
  },
  "devDependencies": {
    "@types/node": "^20.10.0",       // TypeScript types
    "typescript": "^5.3.0"           // TypeScript compiler
  }
}
```

### External APIs and Services

**Anthropic Claude API**
- **Purpose:** Query generation and URL ranking
- **Model:** Claude Sonnet 3.5 (fast, cost-effective)
- **Key:** `ANTHROPIC_API_KEY` (Netlify environment variable)
- **Cost:** ~$0.50-$1.00 per 100 references (query generation + ranking)

**Google Custom Search API**
- **Purpose:** Web search for candidate URLs
- **Key:** `GOOGLE_API_KEY` (Netlify environment variable)
- **Search Engine ID:** `GOOGLE_CX` (Netlify environment variable)
- **Cost:** Free tier = 100 queries/day, Paid = $5/1000 queries
- **Usage:** 8 queries per reference (4 primary + 4 secondary)

**Dropbox API**
- **Purpose:** Cloud storage and synchronization
- **App:** Reference Refinement
- **App Key:** `q4ldgkwjmhxv6w2` (hardcoded in app)
- **App Secret:** `DROPBOX_APP_SECRET` (Netlify environment variable)
- **OAuth Flow:** PKCE (Proof Key for Code Exchange)
- **Access:** App Folder scope (`/Apps/Reference Refinement/`)

**Netlify**
- **Purpose:** Hosting and serverless functions
- **Site Name:** rrv521-1760738877
- **URL:** https://rrv521-1760738877.netlify.app
- **Features:** Serverless functions, CDN, HTTPS, continuous deployment

### Development Tools

**Required:**
- Node.js v18+ (for Netlify Functions and batch processor)
- npm or yarn (package management)
- Netlify CLI (deployment and local testing)
- Git (version control)
- Text editor with TypeScript support

**Optional:**
- Python 3.9+ (for FastAPI backend alternative)
- cloudflared (for local backend tunneling)
- Safari Web Inspector (for iPad debugging)

---

## Development Setup Instructions

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/fergidotcom/reference-refinement.git
cd reference-refinement

# 2. Install dependencies
npm install

# 3. Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# 4. Link to Netlify site
netlify link

# 5. Set up environment variables locally
# Create .env file with:
ANTHROPIC_API_KEY=your_key_here
GOOGLE_API_KEY=your_key_here
GOOGLE_CX=your_search_engine_id
DROPBOX_APP_SECRET=your_secret_here

# 6. Build TypeScript functions
npm run build
```

### Running Locally

**Option 1: Netlify Dev Server (Recommended)**
```bash
# Start local dev server with functions
npm run dev

# App will be available at http://localhost:8888
# Functions at http://localhost:8888/.netlify/functions/FUNCTION_NAME
```

**Option 2: Direct HTML Testing**
```bash
# Open index.html directly in browser
open index.html  # macOS
# or just drag file to browser

# Note: Some features require backend (search, AI ranking)
# For full testing, use Netlify dev server or production
```

**Option 3: FastAPI Backend (Alternative)**
```bash
# Activate Python virtual environment
source .venv/bin/activate

# Start backend + cloudflared tunnel
./rr_start.sh

# Check tunnel status
./rr_check.sh

# Stop when done
./rr_stop.sh
```

### Running Batch Processor

```bash
# Run batch processor (processes refs from batch-config.yaml)
npm run batch

# or directly:
node batch-processor.js

# Dry run (test without making changes)
npm run batch:dry-run

# Resume from interruption
npm run batch:resume
```

### Deployment

**Standard Deployment Process:**
```bash
# 1. Navigate to project directory
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/

# 2. Copy new version to production filename
cp ~/Downloads/rr_vXXX.html index.html

# 3. Optional: Keep versioned backup
cp ~/Downloads/rr_vXXX.html rr_vXXX.html

# 4. Deploy to Netlify
netlify deploy --prod --dir="." --message "vX.X - [description]"

# Example:
netlify deploy --prod --dir="." --message "v16.7 - Enhanced soft 404 detection"
```

**Important Deployment Notes:**
- Always deploy as `index.html` (not versioned files)
- Versioned files (rr_vXXX.html) are backups only
- Netlify automatically serves `index.html` at root URL
- No redirect configuration needed (avoids CDN caching issues)
- Functions auto-deploy with site (no separate build needed)

---

## Infrastructure Details

### GitHub Repository
- **URL:** https://github.com/fergidotcom/reference-refinement.git
- **Main Branch:** `main`
- **Branching Strategy:** Direct commits to main (single developer)
- **Files in Git:**
  - `index.html` (production file)
  - Versioned HTML backups (rr_vXXX.html)
  - Netlify Functions (netlify/functions/*.ts)
  - Batch processor (batch-processor.js, batch-utils.js)
  - Configuration (netlify.toml, package.json)
  - Documentation (*.md files)
- **Files NOT in Git:**
  - `.env` (API keys - security risk)
  - `node_modules/` (npm packages)
  - `decisions.txt` (user data - stored in Dropbox)
  - Backup files (decisions_backup_*.txt)

### Netlify Deployment Configuration

**Site Details:**
- **Site Name:** rrv521-1760738877
- **URL:** https://rrv521-1760738877.netlify.app
- **Deploy Trigger:** Manual via `netlify deploy --prod`
- **Build Command:** None (static HTML + functions)
- **Publish Directory:** `.` (project root)
- **Node Version:** 18

**Environment Variables (Set in Netlify Dashboard):**
```
ANTHROPIC_API_KEY = [Claude API key]
GOOGLE_API_KEY = [Google Custom Search key]
GOOGLE_CX = [Google Search Engine ID]
DROPBOX_APP_SECRET = [Dropbox app secret]
```

**Functions Configuration:**
- **Directory:** `netlify/functions/`
- **Bundler:** esbuild (automatic)
- **Timeout:** 26 seconds (Netlify maximum)
- **Runtime:** Node.js 18

**Cache Headers:**
- HTML files: `Cache-Control: public, max-age=0, must-revalidate`
- index.html: `Cache-Control: no-cache, no-store, must-revalidate`
- Functions: CORS enabled, security headers set

### Dropbox Integration

**App Configuration:**
- **App Name:** Reference Refinement
- **App Type:** Scoped App (App Folder access only)
- **App Key:** `q4ldgkwjmhxv6w2`
- **App Secret:** Stored in Netlify environment variables
- **Permissions:** Read/write to `/Apps/Reference Refinement/`
- **OAuth Redirect URI:** `https://rrv521-1760738877.netlify.app/`

**File Storage:**
- **Main File:** `/Apps/Reference Refinement/decisions.txt`
- **Debug Logs:** `/Apps/Reference Refinement/debug_logs/session_TIMESTAMP.txt`
- **Local Symlink:** `~/Library/CloudStorage/Dropbox/Apps/Reference Refinement/decisions.txt`

**OAuth Flow:**
1. User clicks "Connect to Dropbox"
2. App redirects to Dropbox OAuth with PKCE challenge
3. User authorizes app
4. Dropbox redirects back with code
5. App calls `dropbox-oauth.ts` function to exchange code for token
6. Tokens stored in localStorage (access_token + refresh_token)
7. Token auto-refresh when expired

### Server Deployment (fergi.com)

**Note:** This project is NOT deployed to fergi.com or Paul's server. It is:
- **Hosted on:** Netlify (serverless)
- **No server needed:** Functions run on-demand
- **No deployment steps** for fergi.com required

If future deployment to fergi.com is needed:
- Would require Node.js server (Express or similar)
- Dropbox OAuth redirect URI would need updating
- Environment variables would need to be set on server
- HTTPS certificate required (for OAuth redirect)

---

## Known Issues and Technical Debt

### Known Issues

**None Critical** - All major issues resolved as of v16.7

**Minor Issues:**
- Console logs from v15.x debugging still present (can be cleaned up)
- Some redundant documentation files in root directory
- Old versioned HTML files could be archived

### Technical Debt

**Frontend Code Organization:**
- Single 5000+ line HTML file could be split into modules
- Inline JavaScript could be extracted to separate file(s)
- CSS could be extracted to separate stylesheet
- **Reason not addressed:** Maintaining single-file simplicity for easy deployment

**Testing:**
- No automated test suite for frontend
- Manual testing only for UI changes
- **Mitigation:** Comprehensive test scripts for batch processor and URL validation

**Error Handling:**
- Some try/catch blocks could have better logging
- Network errors could show more user-friendly messages
- **Impact:** Low - most errors are logged to debug panel

**Performance:**
- Large reference collections (500+) may slow down UI
- No pagination or virtual scrolling
- **Impact:** Low - typical use case is 100-300 references

**Documentation:**
- 30+ markdown files in root directory (could be organized into subdirectories)
- Some session summaries could be archived
- Version history could be consolidated
- **Impact:** Low - grep and find work fine

### Future Refactoring Opportunities

**If Project Grows:**
1. **Modularize Frontend:** Split into separate JS/CSS files with build process
2. **Add Testing:** Jest for unit tests, Playwright for E2E tests
3. **Organize Docs:** Create `docs/` directory for historical summaries
4. **Database:** Consider database for reference storage (vs flat file)
5. **Multi-User:** Add user accounts and collaborative features
6. **UI Framework:** Consider React/Vue if UI complexity grows

**Current Decision:** Maintain simplicity - single HTML file works well for current use case

---

## Success Metrics

### Current Performance (v16.7)

**URL Detection:**
- Hard 404 detection: 100% (HTTP status codes)
- Soft 404 detection: ~95% (11 error patterns + content-type mismatch)
- Overall broken URL detection: ~95% (up from ~50% in v16.1)

**Batch Processing:**
- References per hour: ~20-30 (with validation)
- Override rate: <10% (target, down from 50%+ in v14.0)
- Secondary coverage: ~90%+ (269/288 refs)
- Primary coverage: 100% (288/288 refs)

**Cost Efficiency:**
- Average cost per reference: ~$0.008-$0.012
- Cost per 100 references: ~$0.80-$1.20
- Cost per 500 references: ~$4.00-$6.00
- Google Search quota: 800 queries per 100 references (within free tier if <13 refs/day)

**Quality Metrics:**
- AI-recommended URLs match user expectations: >90%
- Full-text sources correctly identified: >95%
- Reviews distinguished from metadata listings: >90%
- Language detection prevents foreign-language sources: 100%

### Project Health

**✅ Production Ready:**
- iPad app v16.6 stable and feature-complete
- Batch processor v16.7 with enhanced validation
- All critical bugs resolved
- Documentation comprehensive and up-to-date
- Infrastructure stable (Netlify + Dropbox)

**✅ Active Maintenance:**
- Regular version updates and improvements
- Comprehensive session documentation
- Quick bug fix turnaround (<24 hours)
- User feedback incorporated promptly

**✅ Well-Documented:**
- CLAUDE.md with complete technical details
- 30+ session summaries and technical analyses
- Version-specific documentation (V16_7_*.md, etc.)
- Testing scripts with inline documentation

---

## Contact and Resources

**Project Owner:** Fergi
**Development Team:** Fergi + Claude Code
**Documentation:** See `CLAUDE.md` for detailed technical documentation
**Change Log:** See `REFERENCE_REFINEMENT_CHANGELOG.md` for version history

**Key Resources:**
- Live App: https://rrv521-1760738877.netlify.app
- GitHub: https://github.com/fergidotcom/reference-refinement.git
- Netlify Dashboard: https://app.netlify.com/sites/rrv521-1760738877
- Dropbox App Console: https://www.dropbox.com/developers/apps

**Related Projects:**
- Part of Fergi workspace ecosystem
- See `/Users/joeferguson/Library/CloudStorage/Dropbox/Fergi/CLAUDE.md` for workspace overview
- Sibling projects: FergiDotCom, Cooking, Ferguson Family Archive
