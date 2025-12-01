# Reference Refinement v7.2 - Current Version Summary

**Date:** October 21, 2025  
**Status:** Production Ready  
**URL:** https://rrv521-1760738877.netlify.app  
**Location:** ~/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/

---

## 🎯 v7.2 Key Features

### Core Functionality
- **Tabbed Edit Modal** (3 tabs: Suggest & Query, Candidates & Autorank, Debug)
- **Relevance TEXT field** (narrative description, not rating)
- **Final.txt support** (import/export finalized references)
- **Enhanced bibliographic fields** (ISBN, DOI, volume, issue, pages, edition, etc.)
- **AI-powered operations** (query generation, search, ranking)
- **Standalone architecture** (Netlify Functions, no backend needed)

### v7.2 Improvements
- **Smart API routing** - Auto-tries both `/api/` and `/.netlify/functions/` paths
- **Comprehensive logging** - All API calls logged to browser console
- **Enhanced error handling** - Specific error details in Toast and Debug tab
- **Response verification** - Logs what APIs actually return

---

## 📋 File Structure

```
References/
├── rr_v60.html                 # Production app (deploy target)
├── netlify/functions/          # Backend functions
│   ├── health.ts
│   ├── search-google.ts
│   ├── llm-chat.ts
│   └── llm-rank.ts
├── decisions.txt               # Working references
└── [documentation files]
```

---

## 🔧 Key Technical Details

### API Endpoints
- Health: `/api/health` or `/.netlify/functions/health`
- LLM Chat: `/api/llm/chat` or `/.netlify/functions/llm-chat`
- LLM Rank: `/api/llm/rank` or `/.netlify/functions/llm-rank`
- Google Search: `/api/search/google` or `/.netlify/functions/search-google`

### Environment Variables (Netlify)
- `ANTHROPIC_API_KEY` - Claude API key
- `GOOGLE_API_KEY` - Google Custom Search key
- `GOOGLE_CX` - Google Custom Search engine ID

### Reference Format (decisions.txt)
```
[123] Author, A. (2020). Title. Journal/Publisher.
Relevance: Narrative description of why this reference matters...
Primary URL: https://...
Secondary URL: https://...
Q: search query 1
Q: search query 2
```

---

## 🚀 Standard Deployment

```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/
cp ~/Downloads/rr_vXX.html rr_v60.html
netlify deploy --prod --dir="." --message "vX.X - description"
```

---

## 🎨 UI Overview

### Main View
- Header with version, mode toggle, API status
- File controls (Load References, Load Final, Export, Clear)
- Filters (Search, URL Status, Sort)
- Stats bar (Total, Filtered, With URLs, Finalized)
- Reference cards grid

### Edit Modal - Tab 1: Suggest & Query
- Bibliographic fields (all standard metadata)
- Relevance text field ("Why This Reference Matters")
- Search queries textarea
- Buttons: "Suggest Queries (AI)", "Query & Search"

### Edit Modal - Tab 2: Candidates & Autorank
- Search results displayed as candidate cards
- Each candidate: Title, Snippet, URL, Actions
- Buttons: "Set as Primary", "Set as Secondary", "Preview"
- "Autorank Candidates (AI)" button
- "Finalize & Save to Final.txt" button

### Edit Modal - Tab 3: Debug & Feedback
- Original source line
- Parsed fields (JSON)
- Parsing issues
- Operation logs (search, ranking, API calls)

---

## 🔍 Troubleshooting

### Common Issues
1. **Queries not generating** → Check console, verify Netlify Functions deployed
2. **Search not working** → Check Google API key, verify endpoint paths
3. **Parsing errors** → Check Debug tab (Tab 3) for details
4. **Empty responses** → Check function return format

### Debug Process
1. Open browser console (Command+Option+I)
2. Attempt operation (Suggest Queries, etc.)
3. Check console for API logs
4. Check Debug tab (Tab 3) in modal
5. Report specific error message

---

## 📝 For New Conversations

When starting a new conversation about this project:

```
Reference Refinement v7.2 continuation.
URL: https://rrv521-1760738877.netlify.app
Location: ~/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/

Current features:
- Tabbed edit modal with AI operations
- Relevance TEXT field (not rating)
- Final.txt support
- Smart API routing with console logging

[Describe issue or request]
```

---

## 🎯 Version History Context

- v7.1: Previous working version
- v7.2: Fixed API endpoints, added debugging (current)
- Earlier: Removed relevance ratings, added Final.txt, tabbed modal

---

**Remember:** v7.2 is the current production version with API debugging enhancements.
