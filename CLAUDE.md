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

**For complete version history and technical specifications, see TECHNICAL_REFERENCE.md**

## Recent Critical Fixes (v16+)

### ✅ CRITICAL FIX - v16.10 OAuth Token Refresh (Nov 9, 2025) ⭐⭐⭐

**Issue:** 401 Unauthorized error when clicking "Finalize" or "Save Changes". Users could not save references to Dropbox.

**Root Cause:** v16.8 replaced OAuth flow with hardcoded "generated access token" that expires after 4 hours.

**Fix:** Restored complete OAuth 2.0 PKCE flow with automatic token refresh:
- Removed hardcoded access token
- Restored OAuth authorization flow
- Added automatic token refresh (triggers when < 5 min remaining)
- Tokens now auto-refresh indefinitely using refresh tokens
- Long-lived sessions (months/years instead of 4 hours)

**Status:** ✅ Deployed to production

### ✅ CRITICAL ENHANCEMENT - v16.7 Enhanced Soft 404 Detection (Nov 1, 2025) ⭐⭐

**Issue:** HTML error pages (HTTP 200 status) with "page not found" content were passing validation.

**Fix:** Added Level 3 content-based validation:
- Fetches first 15KB of HTML content for all HTML responses
- Scans content for 11 distinct error patterns (DOI not found, page not found, etc.)
- Checks HTML title tags for error indicators
- Expected detection rate: ~95% of broken URLs (up from ~50%)

**Performance Impact:** +12-20 seconds per reference (20 URLs validated)

**Status:** ✅ Tested and ready for production

### ✅ CRITICAL ENHANCEMENT - v16.2 URL Validation (Oct 31, 2025) ⭐

**Issue:** Batch processor recommended URLs that returned "page not found" when accessed.

**Fix:** Two-level validation system:
- **Level 1:** Hard 404 detection (HTTP status checks)
- **Level 2:** Soft 404 detection (content-type mismatch - PDF URLs returning HTML)

**Impact:** Validates top 20 candidates before selection, adds ~6 seconds per reference

**Status:** ✅ Ready for testing

### ✅ ENHANCEMENT - v16.1 Enhanced Query Prompts (Oct 31, 2025) ⭐

**Issue:** Batch processor recommendations often needed overrides.

**Root Cause:** Batch processor was missing 11 lines of query guidance that iPad app had.

**Fix:** Synchronized query generation prompts between iPad app and batch processor.

**Test Results:** 78% improvement rate (7 out of 9 references improved on re-run)

**Status:** ✅ Production ready

## Architecture Overview

### Frontend
- Single HTML file: `index.html` (production), versioned backups as `rr_vXXX.html`
- Pure HTML/CSS/JavaScript, iPad Safari compatible
- Access URL: https://rrv521-1760738877.netlify.app

### Backend
- **Netlify Functions** (TypeScript serverless):
  - `health.ts` - Health check
  - `llm-chat.ts` - Claude API for query generation
  - `llm-rank.ts` - Claude API for ranking results
  - `search-google.ts` - Google Custom Search
  - `dropbox-oauth.ts` - Dropbox OAuth with PKCE
  - `resolve-urls.ts` - URL resolution
  - `proxy-fetch.ts` - CORS proxy

### File Formats

**decisions.txt** (working file):
```
[123] Author, A. (2020). Title. Journal/Publisher.
[FINALIZED]
Relevance: Narrative description...
Primary URL: https://example.com/article
Secondary URL: https://backup.com/article
Q: search query one
```

**Final.txt** (publication format):
```
[123] Author, A. (2020). Title. Journal/Publisher.
Primary URL: https://example.com/article
Secondary URL: https://backup.com/article
```

## Development Commands

### Deployment
```bash
# Standard deployment (most common operation)
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/

# Copy new version to index.html (production file)
cp ~/Downloads/rr_vXXX.html index.html

# Optional: Keep versioned backup
cp ~/Downloads/rr_vXXX.html rr_vXXX.html

# Deploy to Netlify
netlify deploy --prod --dir="." --message "vX.X - [description]"
```

**IMPORTANT:** Always deploy as `index.html` to avoid CDN redirect caching issues.

### Local Development
```bash
# Run Netlify dev server (tests functions locally)
npm run dev

# Build TypeScript functions
npm run build
```

## Environment Variables

Required environment variables (set in Netlify Dashboard):
- `GOOGLE_API_KEY` - Google Custom Search API key
- `GOOGLE_CX` - Google Custom Search Engine ID
- `ANTHROPIC_API_KEY` - Anthropic Claude API key
- `DROPBOX_APP_SECRET` - Dropbox app secret for OAuth

**WARNING:** The `.env` file in this repo contains actual API keys. Never commit these to git.

### Dropbox Integration

**App Configuration:**
- **App Key:** `q4ldgkwjmhxv6w2` (hardcoded in frontend)
- **Permission Type:** App Folder (scoped to `/Apps/Reference Refinement/`)
- **OAuth Flow:** PKCE (Proof Key for Code Exchange)
- **Token Storage:** Access token and refresh token in browser localStorage
- **Token Refresh:** Automatic when token expires

**File Paths:**
- `/decisions.txt` - Main working file
- `/debug_logs/session_TIMESTAMP.txt` - Session logs

## Workflow

### Reference Finalization
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

## Common Issues

**Title shows "Untitled":**
- Check console for parsing errors
- Verify decisions.txt format: `[ID] Author (YEAR). Title.`

**API Functions Fail (404 errors):**
- Ensure using absolute URLs, not relative paths
- Check Netlify function logs
- Verify API keys are set in environment variables

**Functions timeout:**
- Default timeout is 10 seconds (configurable in netlify.toml)
- Check function logs for slow API calls

**Deployment issues:**
- Verify correct directory (not a subdirectory)
- Check `netlify status` to confirm site link

## Critical Constraints

1. **No Build Process for HTML:** Main HTML file must be self-contained with inline CSS/JS
2. **iPad Safari Compatibility:** Must work without modern JS features Safari doesn't support
3. **Production File:** Always deploy as `index.html` to avoid CDN redirect caching
4. **CORS Requirements:** All external API calls through Netlify Functions
5. **API Keys Security:** Never expose API keys in frontend code

## Current Work & Priorities

**Active Issues:** None - v16.10 fully operational

**Next Priorities:**
1. Monitor v16.7 soft 404 detection effectiveness
2. Track override rates with v16.1 query improvements
3. Consider further query optimization based on user feedback

**Known Blockers:** None

## Version Management

- **Production file:** `index.html` (always current)
- **Versioned backups:** `rr_vXXX.html` files kept for history
- Netlify automatically serves `index.html` at root URL
- No redirect configuration needed (avoids CDN caching issues)

## Development Philosophy

This tool prioritizes:
- Single HTML file = easy version control and deployment
- No build process = faster iteration
- Netlify Functions = no server management
- iPad compatibility = work anywhere

When making changes, maintain these principles.

---

**For complete version history (v15.x and earlier), detailed code examples, debugging procedures, and technical specifications, see TECHNICAL_REFERENCE.md**
