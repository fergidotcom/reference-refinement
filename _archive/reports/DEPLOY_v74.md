# v7.4 Quick Deploy Guide

## ⚡ ONE-LINE DEPLOY

```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/ && cp ~/Downloads/rr_v74.html rr_v60.html && netlify deploy --prod --dir="." --message "v7.4 - Fix parsing, complete finalization"
```

---

## 🎯 What's Fixed in v7.4

### 1. Title Parsing (CRITICAL FIX)
- **Problem:** All references showed "Untitled"
- **Fix:** Completely rewritten parser
- **Result:** All titles now display correctly

### 2. Finalization Workflow
- **New Feature:** "Finalize" button in edit modal
- **Updates:** decisions.txt with [FINALIZED] flag
- **Creates:** Clean entries for Final.txt
- **Shows:** Both formats in Debug tab (Tab 3)

---

## ✅ After Deployment

1. Open: https://rrv521-1760738877.netlify.app
2. Force refresh (pull down)
3. Header shows: **"Reference Refinement v7.4"**
4. Load decisions.txt
5. **Check:** Titles should NOT be "Untitled"

---

## 🧪 Quick Test

1. Click any reference "Edit" button
2. **Verify:** Title field is populated (not empty)
3. **Verify:** All fields show correct data
4. Set Primary URL if needed
5. Click **"Finalize"** button (orange)
6. Check Debug tab (Tab 3) - should show:
   - decisions.txt entry (with [FINALIZED])
   - Final.txt entry (clean format)
7. Filter by "Finalized" - should work

---

## 🐛 If Something's Wrong

### Titles Still "Untitled"?
- Open browser console (F12)
- Look for JavaScript errors
- Check decisions.txt format

### Finalize Button Doesn't Work?
- Check console for errors
- Verify Primary URL is set
- Click again and check Debug tab

---

**Current Version:** v7.4  
**Status:** Ready to deploy  
**Location:** ~/Downloads/rr_v74.html  
**Deployment:** Single command above
