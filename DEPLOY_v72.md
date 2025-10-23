# Reference Refinement v7.2 - API Fix & Debug Enhancement

## ⚡ ONE-LINE DEPLOY

```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/ && cp ~/Downloads/rr_v72.html rr_v60.html && netlify deploy --prod --dir="." --message "v7.2 - Fix API endpoints, add debug logging"
```

---

## 🐛 What v7.2 Fixes

**Problem:** Query generation and search not working

**Root Cause:** API endpoints - calling `/api/llm/chat` but Netlify Functions are at `/.netlify/functions/llm-chat`

**Solution:**
- Dual-path API requests (tries both paths automatically)
- Comprehensive console logging (see exactly what's happening)
- Better error messages (specific details in Toast and Debug tab)
- Response body logging (verify API returns expected data)

---

## 📋 Changes in v7.2

1. **Smart API routing** - Tries `/api/` path first, auto-falls back to `/.netlify/functions/`
2. **Console debugging** - Every API call logged with request/response details
3. **Enhanced error handling** - Shows actual error messages, not generic "failed"
4. **Debug tab integration** - All errors logged to Tab 3 for easy troubleshooting

---

## ✅ After Deployment - Testing

1. Open https://rrv521-1760738877.netlify.app
2. Force refresh (pull down in Safari)
3. Header should show **"v7.2"**
4. **Open browser console** (Command+Option+I on Mac)
5. Load decisions.txt
6. Edit any reference
7. Click "Suggest Queries (AI)"
8. **Watch console output:**
   ```
   API Request: /api/llm/chat {method: 'POST', ...}
   API Response status: 200
   API Response data: {result: "query1\nquery2\n..."}
   ```

---

## 🔍 Troubleshooting

### If Still Not Working

**Check console for specific errors:**

**404 Not Found:**
- Functions not deployed or wrong path
- Run: `netlify functions:list` to verify

**500 Internal Error:**
- Function code has bugs
- Check Netlify function logs
- Verify API keys in environment

**CORS Error:**
- Functions missing CORS headers
- Check _redirects file exists

**Empty/Wrong Response:**
- Function returns wrong format
- Should return `{result: "..."}` for llm-chat
- Should return `{results: [...]}` for search-google

### Console Commands to Try

```bash
# Check functions deployed
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/
netlify functions:list

# Check environment variables
netlify env:list

# Test function directly
curl https://rrv521-1760738877.netlify.app/.netlify/functions/health
```

---

## 📝 What to Report

After testing, tell me what you see:

1. **Console logs** - Copy/paste the actual error
2. **Debug tab** - What's in Tab 3?
3. **Toast messages** - Exact error text
4. **Network tab** - HTTP status codes

This tells us exactly what's broken and how to fix it.

---

## 🎯 Expected Behavior

- ✅ "Suggest Queries" generates 5-7 queries
- ✅ "Query & Search" finds candidate URLs
- ✅ "Autorank Candidates" scores results
- ✅ Console shows successful API calls
- ✅ No 404/500 errors
- ✅ Debug tab logs all operations

---

**Current Version:** v7.2  
**URL:** https://rrv521-1760738877.netlify.app  
**Location:** ~/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/
