# Claude Web Session Setup - v30.0 Hybrid Build

**Date:** November 13, 2025
**Build Method:** Hybrid (Claude Web creates → Mac tests → iterate)
**Target:** Phase 1 - Document Processing Pipeline

---

## 🎯 SETUP INSTRUCTIONS

### Step 1: Open Claude.ai and Create Project

1. Go to https://claude.ai
2. Click "Projects" in sidebar
3. Click "Create Project"
4. Project Name: **"Reference Refinement v30.0"**
5. Click "Create"

---

### Step 2: Upload Specifications to Project Knowledge

Upload these 4 files from your Downloads folder:

**Required Files:**
1. `CLAUDE_WEB_V30_BUILD_INSTRUCTIONS.md` (67KB) - Complete technical spec
2. `CLAUDE_WEB_HANDOFF_BRIEF.md` (21KB) - Workflow guide
3. `V30_0_ARCHITECTURE_PLAN.md` (20KB) - Architecture overview
4. `ReferenceRefinementClaudePerspective.yaml` (19KB) - Latest checkpoint

**How to upload:**
- Click "Project Knowledge" in project
- Click "Add Content"
- Select "Upload Files"
- Choose all 4 files
- Click "Upload"

---

### Step 3: Upload Test Manuscripts

Upload these 3 test documents:

**Test Files (from References directory):**
1. `250916CaughtInTheAct.docx` (2.3MB)
2. `250714TheMythOfMaleMenopause.docx` (64KB)
3. `250625AuthoritarianAscentInTheUSA.docx` (304KB)

**Location:** `/Users/joeferguson/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References/`

**How to upload:**
- In same "Project Knowledge" section
- Click "Add Content" again
- Select "Upload Files"
- Choose all 3 .docx files
- Click "Upload"

---

### Step 4: Start Conversation with Opening Statement

Copy and paste this exact opening statement into the chat:

```
I need to build Reference Refinement v30.0 using a hybrid approach where you create code artifacts and I test them.

This is a document processing system with three stages:
1. Initial Processing: Convert citations to brackets, generate relevance, discover URLs
2. Author Refinement: Hierarchical cascade (Context → Relevance → URLs) with dual interfaces
3. Publication: Output HTML, EPUB, and Print (with QR codes)

Key technical details:
- Platform: Linode VPS (Node.js + Express + SQLite)
- Database: 5 tables already created (documents, citations, refs, audit_log, url_candidates)
- Database location: v30/server/db/v30.db (already initialized)
- Test manuscripts: 3 documents uploaded (1 bracket format, 2 superscript format)
- Citation conversion: Superscript ¹²³ → Bracket [123]
- Hierarchical model: Context → Relevance (200 words) → URLs (Primary/Secondary)
- Author can override everything with cascading regeneration

I have complete specifications uploaded to this project. The database foundation is complete and ready.

Let's build Phase 1: Document Processing Pipeline.

Start with Component 1: Citation Parser.

This component needs to:
1. Detect citation format in .docx (superscript, parenthetical, or brackets)
2. Convert all citations to bracket notation [123]
3. Map citations to bibliography entries
4. Update .docx with standardized format

Create the citation parser as a Node.js module that I can copy to v30/server/services/citation-parser.js and test with my 3 manuscripts.

Use mammoth.js for .docx parsing. Return the code as a complete artifact.

Ready?
```

---

### Step 5: Claude Web Will Respond

Claude Web will create the citation parser code as an artifact. When you receive it:

1. **Copy the code** from the artifact
2. **Tell me:** "I have Component 1: Citation Parser from Claude Web"
3. **Paste the code** or tell me to check a specific location
4. I'll save it to `v30/server/services/citation-parser.js`
5. I'll test it with all 3 manuscripts
6. I'll report results back to you
7. You relay the results to Claude Web
8. Claude Web refines if needed
9. We repeat for Components 2-5

---

## 📋 COMPONENT BUILD ORDER

### Component 1: Citation Parser ⬅️ START HERE
- Detect citation format
- Convert to brackets [123]
- Map to bibliography
- Test with 3 manuscripts

### Component 2: Context Extractor
- Parse document structure
- Extract paragraph context
- Store section metadata
- Test with 3 manuscripts

### Component 3: Relevance Generator
- Call Claude API
- Generate 200-word relevance
- Format with "Relevance:" label
- Test with sample references

### Component 4: URL Discoverer
- Integrate v21.0 algorithms
- Google Custom Search
- Deep URL validation
- Test with sample references

### Component 5: Decisions.txt Writer
- Format complete entries
- Apply FLAGS
- Maintain compatibility
- Test with all 3 manuscripts

---

## 🔄 WORKFLOW FOR EACH COMPONENT

**Step 1:** You tell Claude Web what component to build (use opening statement above for Component 1)

**Step 2:** Claude Web creates artifact with code

**Step 3:** You copy artifact and tell me "I have Component X from Claude Web"

**Step 4:** I save code to appropriate location in v30/

**Step 5:** I test with manuscripts and report results

**Step 6:** You relay my results to Claude Web

**Step 7:** Claude Web refines (if needed) or we move to next component

**Step 8:** Repeat until all 5 components complete

---

## ✅ WHAT'S ALREADY DONE

I've completed:
- ✅ v30/ directory structure created
- ✅ package.json with all dependencies installed
- ✅ Database schema created (5 tables, 14 indexes)
- ✅ v30.db initialized and ready
- ✅ database.js access layer created
- ✅ 3 test manuscripts located

Claude Web can focus purely on creating the 5 component modules.

---

## 📊 SUCCESS CRITERIA

**Phase 1 Complete When:**
- All 3 manuscripts successfully processed
- Superscript citations converted to brackets (100% accuracy)
- Context extracted for all citations
- Relevance generated for 95%+ of references
- Valid URLs discovered for 90%+ of references
- decisions.txt output with all fields

---

## 🚀 START NOW

1. Open Claude.ai
2. Create "Reference Refinement v30.0" project
3. Upload 4 specification files
4. Upload 3 test manuscripts
5. Paste opening statement
6. Wait for citation parser artifact
7. Tell me when you have it!

---

**I'm ready to test as soon as you have Component 1!**
