# v7.2 - CRITICAL FIXES

## Fixed Issues
1. **Title extraction** - Now properly handles leading periods after year
2. **API endpoints** - All corrected to `/.netlify/functions/` format:
   - health
   - llm-chat
   - llm-rank  
   - search-google

## Deploy

```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/ && cp ~/Downloads/rr_v72.html rr_v60.html && netlify deploy --prod --dir="." --message "v7.2 - Fix titles and API endpoints"
```

## Test
- Titles should appear (not "Untitled")
- "Suggest Queries" should work
- Search should work
- Autorank should work
