# v7.4 Deployment Issue - "Failed to fetch" Error

## 🐛 Problem Diagnosis

**Error:** `Error: API request failed: Error: Failed to fetch`  
**Location:** When calling health endpoint  
**Cause:** Netlify Functions are missing or not deployed

---

## 🔍 What's Happening

The v7.4 HTML file tries to connect to:
```
https://rrv521-1760738877.netlify.app/.netlify/functions/health
```

But this function doesn't exist yet, causing "Failed to fetch" error.

---

## ✅ Solution: Deploy Functions First

### Step 1: Check Netlify Functions Folder

Open Terminal and check if functions exist:

```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/
ls -la netlify/functions/
```

**Expected files:**
- health.ts
- llm-chat.ts
- llm-rank.ts
- search-google.ts

### Step 2: Create Missing Files

If `netlify/functions/` folder doesn't exist or is empty:

```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/
mkdir -p netlify/functions
```

Then copy these files from Downloads:
```bash
cp ~/Downloads/health.ts netlify/functions/
cp ~/Downloads/netlify.toml .
```

### Step 3: Deploy Everything

```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/
cp ~/Downloads/rr_v74.html rr_v60.html
cp ~/Downloads/v74_IMPLEMENTATION.md .
cp ~/Downloads/DEPLOY_v74.md .
cp ~/Downloads/v74_SUMMARY.md .
netlify deploy --prod --dir="." --message "v7.4 - Fix parsing, add functions"
```

---

## 🧪 Test After Deployment

1. Open: https://rrv521-1760738877.netlify.app
2. Open browser console (Safari Dev Tools)
3. Click "Ping" button in header
4. **Should see:**
   - ✅ "Connected (v7.4)" status
   - ✅ Console: `API Response status: 200`
   - ✅ Console: `API Response data: {ok: true, version: "v7.4"}`

5. **Should NOT see:**
   - ❌ "Failed to fetch" error
   - ❌ 404 errors
   - ❌ "Disconnected" status

---

## 📋 Files Added to Downloads

1. **health.ts** - Basic health check function
2. **netlify.toml** - Netlify configuration

These are **required** for the app to work in standalone mode.

---

## 🔧 Alternative: Work Without Functions (Temporary)

If you just want to test the parsing fix without AI features:

1. Deploy only the HTML:
   ```bash
   cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/
   cp ~/Downloads/rr_v74.html rr_v60.html
   netlify deploy --prod --dir="."
   ```

2. Ignore the "Disconnected" status (it's expected without functions)

3. **You can still:**
   - Load decisions.txt
   - Edit references
   - Save changes
   - Export files
   - Use filters/sorting

4. **You CANNOT:**
   - Generate queries (AI)
   - Search for URLs (Google)
   - Rank candidates (AI)
   - Use health check

---

## 📝 Summary

**The "Failed to fetch" error is EXPECTED** if Netlify Functions aren't deployed yet.

**Two Options:**

**Option A (Full deployment):**
- Deploy health.ts function
- Deploy all other functions (if you have them)
- Full app functionality

**Option B (HTML only):**
- Deploy just the HTML
- Core features work (editing, filtering, export)
- AI features won't work (expected)

**Recommendation:** Use Option A if you have the function files, otherwise Option B is fine for testing the parsing fix.

---

## ❓ Do You Have the Function Files?

**Check your Dropbox folder:**
```bash
ls ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/netlify/functions/
```

**If YES (files exist):** Use the full deployment command above  
**If NO (folder empty):** 
1. Copy health.ts from Downloads to netlify/functions/
2. Deploy with health function only
3. AI features won't work yet (that's OK)

---

**Next Steps:** Tell me which option you want to use, and I'll give you the exact command.
