# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Reference Refinement Tool** - A web application for managing academic references with AI-powered search and ranking capabilities. The tool helps researchers find and validate URLs for bibliographic references.

**Live URL:** https://rrv521-1760738877.netlify.app
**Current Version:** v13.7 (deployed and accessible via rr_v137.html)
**Platform:** Single-page HTML application deployed on Netlify with serverless functions
**Last Updated:** October 26, 2025

## ✅ RESOLVED - Version Display Bug (Oct 26, 2025)

**Issue:** Page showed "v13.4" in header despite deploying v13.7 multiple times. Appeared on all browsers and all URLs.

**Root Cause:** HTML had TWO version numbers that got out of sync:
- `<title>Reference Refinement v13.7</title>` ✅ (updated)
- `<h1>Reference Refinement v13.4</h1>` ❌ (forgotten)

**Solution:** Updated `<h1>` tag on line 1037 to show v13.7

**Lesson Learned:** When bumping versions, search for ALL occurrences of the version string, not just `<title>` tag.

**What We Fixed in v13.6/v13.7:**
- Disabled search_web tool in llm-rank.ts (was causing 29s timeouts)
- Increased batch size to 35 (safe now that search is disabled)
- Should fix 504 timeout errors during autorank

**Next Steps:**
1. ✅ Version display fixed - v13.7 now shows correctly everywhere
2. Test autorank on References #3 and #4 to verify timeout fix works
3. See `DEPLOYMENT_CACHING_ISSUE.md` for full investigation details

## Architecture

### Frontend Architecture
- **Single HTML file:** `rr_v60.html` (name stays constant across versions)
- Pure HTML/CSS/JavaScript with no external dependencies
- Designed for iPad Safari compatibility
- Uses native fetch() API for backend communication

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
cp ~/Downloads/rr_vXXX.html rr_v60.html
netlify deploy --prod --dir="." --message "vX.X - [description]"
```

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
The parser (in rr_v60.html) expects format: `[ID] Author (YEAR). Title. Publication.`

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
- **OAuth 2 Redirect URIs:** `https://rrv521-1760738877.netlify.app/rr_v60.html`
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
├── rr_v137.html                # Main app (production file as of v13.7)
├── rr_v60.html                 # Legacy production file (retired due to CDN caching)
├── netlify.toml                # Netlify configuration (redirects to rr_v137.html)
├── netlify/functions/          # Serverless function handlers
├── backend_server.py           # Optional FastAPI backend
├── decisions.txt               # Working references file
├── ui/src/                     # React components (legacy/unused?)
└── v74_SUMMARY.md             # Version documentation
```

### Version Management
- Actual version number is in the HTML file's `<title>` and header
- **Production file (as of v13.7):** `rr_v137.html` (changed from rr_v60.html to fix CDN caching)
- New versions: Copy from Downloads (e.g., `rr_v80.html` → `rr_v137.html`)
- netlify.toml redirects `/` to `/rr_v137.html`
- **Important:** If CDN caching issues occur again, rename to a new filename (e.g., rr_v138.html) and update netlify.toml

### Netlify Configuration
The `netlify.toml` file configures:
- Functions directory and timeout
- Redirects from `/api/*` to `/.netlify/functions/*`
- Default redirect from `/` to `/rr_v60.html`
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
4. Copy to `rr_v60.html`
5. Deploy using standard deployment command

### Testing Changes
1. **Frontend only:** Open HTML file directly in browser
2. **With functions:** Use `npm run dev` to test locally
3. **Full integration:** Deploy to Netlify and test on iPad Safari

## Critical Constraints

1. **No Build Process for HTML:** The main HTML file must be self-contained with inline CSS/JS
2. **iPad Safari Compatibility:** Must work without modern JS features that Safari doesn't support
3. **File Name Constant:** Production file must always be `rr_v60.html` (Netlify redirects depend on this)
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
