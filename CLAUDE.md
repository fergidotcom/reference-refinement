# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Infrastructure

@~/.claude/global-infrastructure.md

## Project Overview

**Reference Refinement Tool** - A web application for managing academic references with AI-powered search and ranking capabilities. The tool helps researchers find and validate URLs for bibliographic references.

**Live URL:** https://rrv521-1760738877.netlify.app
**Current iPad App Version:** v16.10 ⭐ OAUTH TOKEN REFRESH (deployed as index.html)
**Current Batch Processor Version:** v16.7 ⭐ ENHANCED SOFT 404 DETECTION
**Platform:** Single-page HTML application deployed on Netlify with serverless functions
**Last Updated:** November 9, 2025, 8:00 PM
**Production Status:** ✅ 100% Ready - v16.10 with OAuth PKCE and automatic token refresh

## Recent Critical Fixes (v16.x)

**For complete version history including v15.x, v14.x, and v13.x, see VERSION_HISTORY.md**

### ✅ v16.10 OAuth Token Refresh (Nov 9, 2025) ⭐ CRITICAL

**Issue:** 401 errors when saving - hardcoded tokens expired after 4 hours

**Fix:**
- Restored OAuth PKCE flow with automatic token refresh
- Tokens auto-refresh when < 5 min remaining
- Long-lived sessions (months/years vs 4 hours)
- One-time OAuth approval, then transparent auto-refresh

**Impact:** ✅ No more 401 errors, indefinite sessions, data integrity maintained

**Status:** ✅ Deployed to production

---

### ✅ v16.7 Enhanced Soft 404 Detection (Nov 1, 2025) ⭐ MAJOR

**Issue:** HTML error pages (HTTP 200) with "page not found" content passed validation

**Fix:** Three-level validation system
- **Level 1:** Hard 404 detection (HTTP status)
- **Level 2:** Content-type mismatch (PDF→HTML)
- **Level 3:** Content-based detection (11 error patterns scan first 15KB)

**Detection Patterns:** Matches "page not found", "DOI not found", "Oops! There's nothing here", error title tags

**Performance:** +12-20 seconds per reference (20 URLs × ~600-1000ms)

**Detection Rate:** ~95% of broken URLs (up from ~50% in v16.2)

**Status:** ✅ Tested and ready for production

---

### ✅ v16.2 URL Validation (Oct 31, 2025) ⭐ MAJOR

**Issue:** Batch processor recommended URLs that returned "page not found" when accessed

**Fix:** Two-level validation
- **Level 1:** HEAD request checks HTTP status (catches 404, 403, 500)
- **Level 2:** Content-type mismatch detection (PDF URLs returning HTML)

**Impact:** ✅ Eliminates broken URL recommendations, only recommends working URLs

**Status:** ✅ Production ready

---

### ✅ v16.1 Enhanced Query Prompts (Oct 31, 2025) ⭐ MAJOR

**Issue:** Batch processor recommendations needed frequent overrides vs manual workflow

**Fix:** Synchronized query generation prompts between iPad app and batch processor

**Test Results:** 78% improvement rate (7 of 9 references improved)
- Secondary coverage: 56% → 67%
- Average secondary score: 82 → 87
- Found missing secondaries, better scholarly sources (JSTOR)

**Status:** ✅ Production ready

---

### ✅ v16.0/16.1 Batch Version Tracking

**Feature:** Automatic tracking of which batch version processed each reference
- References tagged with `BATCH_v16.X` in decisions.txt
- Purple 🤖 badges in UI show batch version
- Track quality improvements across versions

**Status:** ✅ Deployed to production

## Architecture

### Frontend Architecture
- **Single HTML file:** `index.html` (production), versioned backups kept as `rr_vXXX.html`
- Pure HTML/CSS/JavaScript with no external dependencies
- Designed for iPad Safari compatibility
- Uses native fetch() API for backend communication
- **Access URL:** https://rrv521-1760738877.netlify.app (serves index.html automatically)

### Backend Architecture
- **Netlify Functions** (TypeScript): Serverless API endpoints in `netlify/functions/`
  - `health.ts` - Health check endpoint
  - `llm-chat.ts` - Anthropic Claude API for query generation
  - `llm-rank.ts` - Anthropic Claude API for ranking search results (enhanced in v13.0)
  - `search-google.ts` - Google Custom Search integration
  - `dropbox-oauth.ts` - **NEW in v13.0** - Dropbox OAuth token exchange with PKCE support
  - `resolve-urls.ts` - URL resolution and validation
  - `proxy-fetch.ts` - CORS proxy for fetching external URLs

- **Optional FastAPI Backend** (`backend_server.py`): Alternative local backend for development
  - Can run locally with cloudflared tunnel for remote access
  - Provides same API endpoints as Netlify Functions
  - See `rr_start.sh` for startup script

### Dual-Mode Operation
The app supports two modes:
1. **Standalone Mode** (default): Uses Netlify Functions at absolute URLs
2. **Advanced Mode**: Uses custom backend URL (for local development)

API calls use absolute URLs format: `https://rrv521-1760738877.netlify.app/.netlify/functions/FUNCTION_NAME`

## Development Commands

### Deployment
```bash
# Standard deployment pattern (most common operation)
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/

# Copy new version to index.html (production file)
cp ~/Downloads/rr_vXXX.html index.html

# Optional: Keep versioned backup
cp ~/Downloads/rr_vXXX.html rr_vXXX.html

# Deploy to Netlify
netlify deploy --prod --dir="." --message "vX.X - [description]"
```

**IMPORTANT:** Always deploy as `index.html` to avoid CDN redirect caching issues. The versioned files (rr_vXXX.html) are kept as backups only.

### Local Development
```bash
# Run Netlify dev server (tests functions locally)
npm run dev

# Build TypeScript functions
npm run build

# Run local FastAPI backend (alternative)
./rr_start.sh  # Starts backend + cloudflared tunnel

# Check backend status
./rr_check.sh

# Stop backend
./rr_stop.sh
```

### Python Backend (Optional)
```bash
# Activate virtual environment
source .venv/bin/activate

# Run backend directly
python -m uvicorn backend_server:app --host 127.0.0.1 --port 8000 --reload

# Or use the newer patched version
python -m uvicorn ref_canvas_backend_v52_patch:app --host 127.0.0.1 --port 8000
```

### Batch Processing Operations

**⚠️ AUTO-COMPACT PROTECTION**

Batch processor operations MUST use nohup protection to prevent Mac Claude Code auto-compact from terminating the process mid-run.

**Production batch runs (MANDATORY nohup):**
```bash
# Standard pattern with timestamped logging
nohup node batch-processor.js > logs/$(date +%Y%m%d_%H%M%S)_batch.log 2>&1 &

# Or use the convenience wrapper
run-protected.sh node batch-processor.js
```

**Monitor progress:**
```bash
tail -f logs/[latest_log]
ps aux | grep batch-processor
```

**Why this matters:**
- 288 reference batch operations can take hours
- API costs accumulate (wasted on partial runs)
- Production data manipulation must complete atomically
- Auto-compact interruptions waste significant work investment

**Development/testing (small batches):**
- Run normally for immediate feedback: `node batch-processor.js`
- Use for testing on 5-10 references
- Ctrl+C interruption is fine for development

**Decision rule:** Would losing this mid-way waste >10 minutes of work? If YES → use nohup.

**Reverse merge operations (MANDATORY nohup):**
```bash
# Production data manipulation - must complete atomically
nohup node enhance-production.js --reverse > logs/$(date +%Y%m%d_%H%M%S)_merge.log 2>&1 &
```

## Key Design Patterns

### File Format Architecture
The system uses two distinct file formats:

**decisions.txt** (working file):
```
[123] Author, A. (2020). Title. Journal/Publisher.
[FINALIZED]
Relevance: Narrative description...
Primary URL: https://example.com/article
Secondary URL: https://backup.com/article
Tertiary URL: https://third.com/article
Q: search query one
Q: search query two
```

**Final.txt** (clean publication format):
```
[123] Author, A. (2020). Title. Journal/Publisher.
Primary URL: https://example.com/article
Secondary URL: https://backup.com/article
```

Only finalized references (marked with `[FINALIZED]`) appear in Final.txt.

### Reference Parsing Logic
The parser (in index.html) expects format: `[ID] Author (YEAR). Title. Publication.`

Critical parsing considerations:
- Must handle leading punctuation after year (e.g., ". Title")
- Title extraction requires finding first non-empty part after cleaning
- Parser is sensitive to exact formatting of the reference line

### API Communication Pattern
```javascript
// Standalone mode (production)
const url = `${window.location.origin}/.netlify/functions/${functionName}`;

// Advanced mode (custom backend)
const url = `${customBackendUrl}/api/${endpoint}`;
```

All API calls should use absolute URLs to avoid 404 errors.

## Environment Variables

Required environment variables (set in Netlify Dashboard):
- `GOOGLE_API_KEY` - Google Custom Search API key
- `GOOGLE_CX` - Google Custom Search Engine ID
- `ANTHROPIC_API_KEY` - Anthropic Claude API key (used for query generation and ranking)
- `DROPBOX_APP_SECRET` - **NEW in v13.0** - Dropbox app secret for OAuth token exchange

**WARNING:** The `.env` file in this repo contains actual API keys. Never commit these to git.

### Dropbox Integration Details (v13.0+)

**Dropbox App Configuration:**
- **App Name:** Reference Refinement
- **App Key:** `q4ldgkwjmhxv6w2` (hardcoded in frontend and dropbox-oauth.ts)
- **App Secret:** Stored as `DROPBOX_APP_SECRET` environment variable in Netlify
- **Permission Type:** App Folder (scoped access to `/Apps/Reference Refinement/`)
- **OAuth 2 Redirect URIs:** `https://rrv521-1760738877.netlify.app/` (redirects to index.html)
- **OAuth Flow:** PKCE (Proof Key for Code Exchange) for enhanced security
- **Token Storage:** Access token and refresh token in browser localStorage
- **Token Refresh:** Automatic via dropbox-oauth.ts function when token expires

**Dropbox File Paths:**
- `/decisions.txt` - Main working file (auto-saved on Save/Finalize)
- `/debug_logs/session_TIMESTAMP.txt` - Session logs (manual save from Debug tab)

## Deployment Architecture

### File Structure
```
References/
├── index.html                  # Production file (ALWAYS CURRENT VERSION)
├── rr_v138.html                # Versioned backup (v13.12)
├── rr_v137.html                # Versioned backup (v13.11)
├── rr_v60.html                 # Legacy versioned backup
├── netlify.toml                # Netlify configuration (no redirect needed for index.html)
├── netlify/functions/          # Serverless function handlers
├── backend_server.py           # Optional FastAPI backend
├── decisions.txt               # Working references file
├── ui/src/                     # React components (legacy/unused?)
└── v74_SUMMARY.md             # Version documentation
```

### Version Management
- Actual version number is in the HTML file's `<title>` and header
- **Production file:** `index.html` (always current, no CDN caching issues)
- **Versioned backups:** `rr_vXXX.html` files kept for version history
- New versions: Copy from Downloads → `index.html` (e.g., `cp ~/Downloads/rr_v139.html index.html`)
- Netlify automatically serves `index.html` at root URL (no redirect configuration needed)
- **CDN Caching:** No longer an issue - index.html is never redirected, cache headers force revalidation

### Netlify Configuration
The `netlify.toml` file configures:
- Functions directory and timeout
- Redirects from `/api/*` to `/.netlify/functions/*`
- Cache headers for HTML files (no-cache for index.html)
- CORS headers for function endpoints

## Common Development Patterns

### Adding a New Netlify Function
1. Create `netlify/functions/function-name.ts`
2. Export default async function with `(req: Request) => Response`
3. Add redirect in `netlify.toml`:
   ```toml
   [[redirects]]
     from = "/api/function-name"
     to = "/.netlify/functions/function-name"
     status = 200
   ```
4. Update frontend to call new endpoint
5. Deploy (functions auto-deploy with site)

### Modifying the Main HTML File
1. Edit a local copy (e.g., `rr_vXX.html`)
2. Test locally by opening in browser
3. Update version number in `<title>` and header
4. Copy to `index.html`: `cp rr_vXX.html index.html`
5. Optionally keep versioned backup: `cp rr_vXX.html rr_vXX.html`
6. Deploy using standard deployment command

### Testing Changes
1. **Frontend only:** Open HTML file directly in browser
2. **With functions:** Use `npm run dev` to test locally
3. **Full integration:** Deploy to Netlify and test on iPad Safari

## Critical Constraints

1. **No Build Process for HTML:** The main HTML file must be self-contained with inline CSS/JS
2. **iPad Safari Compatibility:** Must work without modern JS features that Safari doesn't support
3. **Production File:** Always deploy as `index.html` to avoid CDN redirect caching issues
4. **CORS Requirements:** All external API calls must go through Netlify Functions or backend proxy
5. **API Keys Security:** Never expose API keys in frontend code - always use backend functions

## Workflow Notes

### Reference Finalization Workflow
1. Load decisions.txt into app
2. Edit reference in modal (3-tab interface)
3. Generate search queries (AI-powered)
4. Search for URLs (Google Custom Search)
5. Rank candidates (AI-powered)
6. Designate URLs as Primary/Secondary/Tertiary
7. Click "Finalize" button
8. Reference marked with `[FINALIZED]` flag
9. Export both decisions.txt and Final.txt

### URL Designation System
- **Primary URL:** Main/canonical source
- **Secondary URL:** Backup/alternative source
- **Tertiary URL:** Additional alternative source
- Finalization requires at least a Primary URL

## Debugging Guide

### Common Issues

**Title shows "Untitled":**
- Check console for parsing errors
- Verify decisions.txt format matches `[ID] Author (YEAR). Title.`
- Check title parsing logic around line 1491-1567 in HTML

**API Functions Fail (404 errors):**
- Ensure using absolute URLs, not relative paths
- Check Netlify function logs in dashboard
- Verify API keys are set in Netlify environment variables

**Functions timeout:**
- Default timeout is 10 seconds (configurable in netlify.toml)
- Check function logs for slow API calls
- Consider async/await patterns and parallel processing

**Deployment issues:**
- Verify you're in correct directory (not a subdirectory)
- Check `netlify status` to confirm site link
- Ensure netlify.toml is in project root

## Version History Context

The project has gone through multiple iterations:
- v6.x: FastAPI backend with client/server architecture
- v7.x: Transition to Netlify Functions, fix API URL issues
- v7.4: Fixed title parsing bug, added finalization workflow
- v8.0-v11.x: Iterative improvements to UI, ranking, and debug logging
- v12.0: AI-Powered Search During Ranking with web search tool
- **v13.0 (Current)**: Major enhancements:
  - **Dropbox OAuth with PKCE** - Secure token exchange via serverless function
  - **Enhanced llm-rank.ts** - Disables search tool for large candidate sets (50+) to prevent timeouts
  - **User Notes Panel** - Capture observations in Debug tab (auto-saved to session log)
  - **Toast Improvements** - Close buttons and better layout
  - **Override Tracking** - Statistics panel shows AI override count
  - **Token Refresh** - Automatic Dropbox token refresh when expired
  - **Increased Timeout** - Function timeout raised to 26 seconds (Netlify max)
  - **Cache Busting** - Meta tags to prevent browser caching issues

See `v74_SUMMARY.md` and related version docs for detailed change history.

## Development Philosophy

This tool is designed for rapid iteration and simple deployment:
- Single HTML file = easy version control and deployment
- No build process = faster iteration
- Netlify Functions = no server management
- iPad compatibility = work anywhere

When making changes, prioritize simplicity and maintain these core principles.
