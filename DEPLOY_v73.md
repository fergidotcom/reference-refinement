# Reference Refinement v7.3 - Absolute URL Fix

## 🎯 THE PROBLEM FOUND

**Root Cause:** HTML file served from `claude.ai` artifact viewer, so relative URLs like `/api/health` go to **claude.ai** (404), not your Netlify site!

**Evidence:** 404 error returned Next.js HTML from `claude.ai`, not from Netlify.

## ✅ THE FIX in v7.3

1. **Absolute Netlify URLs** - All API calls now use `https://rrv521-1760738877.netlify.app/.netlify/functions/FUNCTION`
2. **Fixed llm-chat.ts** - Now uses Anthropic API (not OpenAI) and returns correct format `{result: "..."}`

---

## ⚡ ONE-LINE DEPLOY

```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/ && cp ~/Downloads/rr_v73.html rr_v60.html && cp ~/Downloads/llm-chat.ts netlify/functions/llm-chat.ts && netlify deploy --prod --dir="." --message "v7.3 - Use absolute URLs, fix llm-chat"
```

---

## 📋 What Changed

### HTML (rr_v73.html)
- **apiRequest function** now uses absolute URLs in standalone mode
- Converts `/api/health` → `https://rrv521-1760738877.netlify.app/.netlify/functions/health`
- Only uses relative URLs when custom backend configured

### Function (llm-chat.ts)
- **API changed:** OpenAI → Anthropic Claude
- **Model:** `claude-sonnet-4-20250514`
- **Response format:** `{result: "..."}` (was `{text: "..."}`)
- Proper CORS headers
- Better error handling

---

## ✅ After Deployment - Test

1. Open https://rrv521-1760738877.netlify.app
2. Force refresh
3. Header should show **"v7.3"**
4. Open browser console
5. Load decisions.txt
6. Edit reference
7. Click "Suggest Queries (AI)"
8. **Console should show:**
   ```
   API Request: https://rrv521-1760738877.netlify.app/.netlify/functions/llm-chat
   API Response status: 200
   API Response data: {result: "query1\nquery2\n..."}
   ```

---

## 🎯 Expected Behavior

- ✅ "Suggest Queries" generates 5-7 queries
- ✅ Console shows successful 200 responses
- ✅ No 404 errors
- ✅ Queries appear in textarea
- ✅ "Query & Search" finds results
- ✅ "Autorank" scores candidates

---

## 🔍 Why This Works

**Before v7.3:**
```
HTML at: https://usercontent.claude.ai/...
API call: /api/health
Goes to: https://usercontent.claude.ai/api/health ❌ 404
```

**After v7.3:**
```
HTML at: https://usercontent.claude.ai/...
API call: https://rrv521-1760738877.netlify.app/.netlify/functions/health
Goes to: Your Netlify functions ✅ 200
```

---

## 📝 Files in Download

1. **rr_v73.html** - Main app with absolute URLs
2. **llm-chat.ts** - Fixed Anthropic function

Both need to be deployed.

---

**Current Version:** v7.3  
**Status:** READY TO DEPLOY  
**This should fix the 404 errors!**
