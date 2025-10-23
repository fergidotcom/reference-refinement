# Reference Refinement - Clean Deployment Commands

## 📍 Correct Project Location
```
~/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/
```

**No subdirectories needed** - all files are in the References folder.

---

## ⚡ ONE-LINE DEPLOY (v7.1)

```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/ && cp ~/Downloads/rr_v71.html rr_v60.html && netlify deploy --prod --dir="." --message "v7.1 - Restore relevance text field"
```

---

## 📋 Standard Deployment Pattern

**For ANY future version:**

```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/ && \
cp ~/Downloads/rr_vXXX.html rr_v60.html && \
netlify deploy --prod --dir="." --message "vX.X - [description]"
```

**Replace:**
- `rr_vXXX.html` with the new version filename
- `vX.X - [description]` with version number and brief description

---

## 📁 File Organization

```
References/
├── rr_v60.html                 # Main app (always this name)
├── netlify/                    # Netlify functions
│   └── functions/
│       ├── health.ts
│       ├── search-google.ts
│       ├── llm-chat.ts
│       └── llm-rank.ts
├── backend_server.py           # Optional local backend
├── decisions.txt               # Your working file
├── v631_deployment_instructions.md
└── v631_quick_reference.md
```

---

## 🚀 Current Deployment (v7.1)

**Status:** Ready to deploy  
**Files:** In ~/Downloads/  
**Command:**

```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/ && cp ~/Downloads/rr_v71.html rr_v60.html && netlify deploy --prod --dir="." --message "v7.1 - Restore relevance text field"
```

---

## ✅ After Deployment

1. Open: https://rrv521-1760738877.netlify.app
2. Force refresh (pull down)
3. Header should show: "Reference Refinement v7.1"
4. Test relevance text field in Tab 1

---

## 🔧 Quick Operations

**Deploy new version:**
```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/
cp ~/Downloads/rr_vXXX.html rr_v60.html
netlify deploy --prod --dir="." --message "Description"
```

**Backup current version:**
```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/
cp rr_v60.html rr_v60_backup_$(date +%Y%m%d).html
```

**Check netlify status:**
```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/
netlify status
```

---

## 📝 Project Info

**URL:** https://rrv521-1760738877.netlify.app  
**Location:** ~/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/  
**Current Version:** v7.1  
**Deployment:** Netlify (production)

---

**No more subdirectories. No more confusion. Just this path.**
