# Reference Refinement - Linode Migration Complete

**Date:** November 29, 2025
**Version:** v19.0

## Summary

Successfully migrated Reference Refinement from Netlify to Linode VPS.

**Old URL:** https://rrv521-1760738877.netlify.app
**New URL:** https://refs.fergi.com

## Cost Savings

| Before | After | Annual Savings |
|--------|-------|----------------|
| $19/month (Netlify) | $0 marginal (shared Linode) | **$228/year** |

## What Was Done

1. **Created Express.js server** (`server.js`)
   - Converted 7 Netlify Functions to Express endpoints
   - All endpoints use `/api/` path prefix
   - ES modules syntax for Node.js 18+

2. **Updated package.json**
   - Added express, cors, dotenv dependencies
   - Version bumped to 19.0.0

3. **Updated frontend** (`index.html`)
   - Changed API base URL to `https://refs.fergi.com`
   - Updated Dropbox redirect URI to `https://refs.fergi.com/`
   - Version updated to v19.0

4. **Deployed to Linode**
   - Files uploaded to `/var/www/apps/reference-refinement/`
   - Dependencies installed
   - Systemd service restarted

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/llm-chat` | POST | Query generation (Claude) |
| `/api/llm-rank` | POST | URL ranking (Claude) |
| `/api/search-google` | POST | Google Custom Search |
| `/api/dropbox-oauth` | POST | Dropbox OAuth tokens |
| `/api/resolve-urls` | POST | URL validation |
| `/api/proxy-fetch` | GET/POST | CORS proxy |

## Verified Working

- ✅ Health endpoint: `curl https://refs.fergi.com/api/health`
- ✅ Google Search: Returns 10 results
- ✅ Claude API: Query generation working
- ✅ SSL/HTTPS: Certificate valid

## Manual Step Required

**Update Dropbox App Console:**
1. Go to https://www.dropbox.com/developers/apps
2. Select "Reference Refinement" app
3. Add redirect URI: `https://refs.fergi.com/`
4. Keep old Netlify URI temporarily as fallback

## Architecture

```
iPad/Browser
     │
     ▼
https://refs.fergi.com (Nginx + SSL)
     │
     ▼
localhost:3002 (Express.js)
     │
     ├── Claude API (Anthropic)
     ├── Google Custom Search
     └── Dropbox API
```

## Rollback Plan

If issues arise:
1. Netlify site remains at original URL
2. Revert index.html to use NETLIFY_URL
3. Redeploy to Netlify

## Files Modified

- `server.js` - New Express server (v19.0)
- `package.json` - Added Express dependencies
- `index.html` - Updated API URLs to Linode (v19.0)
