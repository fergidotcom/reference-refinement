# Reference Refinement - Streamlined Project Instructions

**Version:** v7.1  
**URL:** https://rrv521-1760738877.netlify.app  
**Location:** ~/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/

---

## ITERATION CYCLE

### You Report
List issues/requests from iPad testing.

### I Fix
1. Modify HTML file
2. Increment version in title and header
3. Output single file: `rr_vXX.html`
4. Brief summary (3-5 lines max)

### You Deploy
```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/
cp ~/Downloads/rr_vXX.html rr_v60.html
netlify deploy --prod --dir="." --message "vX.X - [brief description]"
```

### You Test
Test on iPad, report next round.

---

## WHAT TO OUTPUT

### Always
- Modified HTML file only
- 3-5 line summary of changes

### Never (unless explicitly requested)
- Changelogs
- Testing guides  
- Documentation
- Deployment scripts
- Visual comparisons
- Verbose summaries

---

## KEY INFO

### Architecture
- Single file: `rr_v60.html` (always this name in production)
- Netlify Functions in `/netlify/functions/` (rarely change)
- Version in HTML: `<title>` and `<h1>`

### APIs
```bash
GOOGLE_API_KEY=your_google_api_key_here
GOOGLE_CX=your_google_cse_cx_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

### Format
References: `[#] Author (Year). Title. Publisher. ISBN: xxx. Relevance: text. PRIMARY_URL[...] SECONDARY_URL[...]`

---

## PROJECT LOCATION

**Path:** `~/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/`

**Structure:**
```
References/
├── rr_v60.html                 # Production app
├── rr_v65.html, rr_v66.html    # Other versions
├── netlify/functions/          # Backend functions
├── decisions.txt               # Working data
├── backend_server.py           # Optional local backend
└── [various docs]
```

**No subdirectories.** Everything is in the References folder.

---

## CONVERSATION CONTINUITY

If conversation limit hit, new chat starts with:

```
Reference Refinement v6.X continuation.
URL: https://rrv521-1760738877.netlify.app
Location: ~/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/

[Attach current rr_v60.html file if needed]
[Describe issue or continue from where we left off]
```

---

## COMMON FIXES

| Issue | Fix Location | Typical Solution |
|-------|--------------|------------------|
| Layout | CSS in `<style>` | Adjust grid/flexbox |
| Parsing | `parseDecisions()` ~line 950 | Fix regex/split logic |
| Save | `saveReference()` ~line 1266 | Update rawText generation |
| Search | `displaySearchResults()` ~line 1386 | Modify HTML template |
| API | Function endpoints | Check path: `/.netlify/functions/` |

---

## DEPLOYMENT COMMAND

**Standard deployment:**
```bash
cd ~/Library/CloudStorage/Dropbox/Fergi/AI\ Wrangling/References/ && \
cp ~/Downloads/rr_vXX.html rr_v60.html && \
netlify deploy --prod --dir="." --message "vX.X - description"
```

---

## CURRENT VERSION

**v7.1 - Key Features:**
- Tabbed Edit Modal (3 tabs: Suggest & Query, Candidates & Autorank, Debug)
- Relevance TEXT field (not rating) - "Why This Reference Matters"
- Final.txt import/export for finalized references
- Enhanced bibliographic fields (ISBN, DOI, volume, issue, pages, etc.)
- AI-powered query generation and candidate ranking
- Standalone architecture (Netlify Functions, no backend needed)

---

## THAT'S IT

Focus on:
- Fast iteration
- Minimal output
- Code only
- Keep conversations lean
- Use correct path always: `~/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/`
