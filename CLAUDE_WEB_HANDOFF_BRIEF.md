# Claude Web Session Brief - Reference Refinement v30.0

**Optimized for:** Claude.ai Web Interface
**Based on:** Recent successful patterns from this project
**Estimated Duration:** 4-6 hours (single session)
**Date:** November 13, 2025

---

## 🎯 WHAT WE LEARNED ABOUT CLAUDE WEB

From recent sessions on Reference Refinement:

### ✅ Claude Web Excels At:
- Long-form planning and architecture
- Detailed specification writing
- API design and documentation
- Database schema design
- Breaking down complex systems
- Iterative refinement through conversation

### ⚠️ Claude Web Challenges:
- Cannot execute code directly
- Cannot deploy to servers
- Cannot test implementations
- Limited to artifact generation (code files)
- Needs user to copy/paste and test

### 💡 Optimal Pattern:
1. Claude Web creates comprehensive artifacts (code files)
2. User copies artifacts to appropriate locations
3. User tests and reports results
4. Claude Web refines based on feedback
5. Iterate until complete

---

## 📋 YOUR MISSION

Build Reference Refinement v30.0 using this proven pattern:

**You will create artifacts for:**
1. Complete database schema (SQL)
2. All backend routes (JavaScript files)
3. All service modules (JavaScript files)
4. Complete frontend (HTML + CSS + JavaScript)
5. Deployment scripts (Bash)
6. Configuration files (JSON, ENV)

**User will:**
1. Copy your artifacts to Linode VPS
2. Execute deployment scripts
3. Test functionality
4. Report results back to you
5. You'll refine as needed

---

## 🏗️ SYSTEM OVERVIEW (Quick Reference)

**The Hierarchy:**
```
Context (from .docx) → Relevance (200 words) → URLs (Primary/Secondary)
```

**Author Controls:**
- Can override EVERYTHING at any level
- Changes cascade downstream (with approval)
- Can undo any override
- Full transparency into auto-generation

**Platform:**
- Backend: Node.js/Express on Linode VPS
- Database: SQLite
- Frontend: Enhanced iPad app (single HTML file)
- APIs: Claude (relevance), Google (search), Dropbox (storage)

**Full specification:** See `CLAUDE_WEB_V30_BUILD_INSTRUCTIONS.md` (50+ pages)

---

## 📝 SESSION WORKFLOW

### Opening Statement (Start Here)

```
I need you to build Reference Refinement v30.0, a document processing and
reference management system. I have a complete 50-page specification
(CLAUDE_WEB_V30_BUILD_INSTRUCTIONS.md) that I'll share progressively.

We'll work iteratively:
1. You'll create code artifacts (files)
2. I'll deploy and test them
3. I'll report results
4. You'll refine
5. We'll iterate until complete

Let's start with the database schema. Ready?
```

---

### Phase 1: Database Foundation

**You Say:**
```
Create the SQLite database schema with these 4 tables:
1. documents - Uploaded .docx files metadata
2. citations - Citations extracted from documents with context
3. references - Complete reference info (context → relevance → URLs)
4. audit_log - Change tracking for cascading updates

Key requirements:
- references table has hierarchical structure (context → relevance → URLs)
- Track overrides at each level (context_overridden, relevance_overridden)
- Store original values for undo (context_original, relevance_original)
- audit_log tracks cascading changes with approval status

Full schema specification in BUILD_INSTRUCTIONS.md sections "DATABASE SCHEMA"
```

**Claude Web Creates:**
- Artifact: `database/schema.sql` (complete schema)

**You Do:**
1. Copy to `/var/www/refs.fergi.com/database/schema.sql`
2. Run: `sqlite3 database/references.db < schema.sql`
3. Verify: `sqlite3 database/references.db ".tables"`
4. Report: "Schema created successfully, 4 tables + indexes"

---

### Phase 2: Backend Structure

**You Say:**
```
Create the Express server structure with:

Main app (server/app.js):
- Express setup with middleware (cors, helmet, compression)
- Route mounting for 5 APIs (documents, references, llm, search, dropbox)
- Error handling
- Health check endpoint

Configuration (server/config/):
- database.js - SQLite connection pool
- apis.js - API key management (Anthropic, Google, Dropbox)
- constants.js - Validation patterns, query strategies from v21.0

Middleware (server/middleware/):
- auth.js - Dropbox OAuth verification
- error-handler.js - Global error handling
- logger.js - Request logging

Package.json with all dependencies
```

**Claude Web Creates:**
- Artifacts: `server/app.js`, config files, middleware, `package.json`

**You Do:**
1. Copy all files to server
2. Run: `npm install`
3. Test: `node server/app.js` (should start without errors)
4. Test: `curl http://localhost:3000/api/health`
5. Report: "Server started, health check responds"

---

### Phase 3: Core Models

**You Say:**
```
Create models for database interaction:

server/models/Reference.js:
- findAll(filters) - query references
- findById(id) - get single reference
- create(data) - create new reference
- updateContext(id, data) - update context (triggers cascade check)
- updateRelevance(id, data) - update relevance
- updateURLs(id, data) - update primary/secondary/tertiary URLs
- finalize(id) - mark as finalized

Similar models for Document.js, Citation.js, AuditLog.js

Use async/await, proper error handling, return structured data
```

**Claude Web Creates:**
- Artifacts: All 4 model files

**You Do:**
1. Copy to `server/models/`
2. Test basic query:
   ```javascript
   const Reference = require('./models/Reference');
   Reference.findAll().then(console.log);
   ```
3. Report: "Models working, empty result set as expected"

---

### Phase 4: Document Processing Service

**You Say:**
```
Create document-processor.js service:

processDocument(filepath):
1. Load .docx using mammoth.js
2. Extract document structure (sections, paragraphs)
3. Find all citations (regex: \[[^\]]+\] or \[\s*\])
4. For each citation:
   - Capture full paragraph context
   - Get sentence before/after
   - Determine section, page, paragraph number
   - Identify if empty bracket
   - Insert into citations table with document_id
5. Update document.total_citations
6. Set document.status = 'processed'
7. Return processing summary

Handle errors gracefully, log progress
```

**Claude Web Creates:**
- Artifact: `server/services/document-processor.js`

**You Do:**
1. Copy to `server/services/`
2. Test with sample .docx:
   ```javascript
   const processor = require('./services/document-processor');
   processor.processDocument('test.docx').then(console.log);
   ```
3. Report: "Extracted 12 citations with context"

---

### Phase 5: Relevance Generation Service

**You Say:**
```
Create relevance-generator.js using Anthropic Claude API:

generateRelevance({ citation, context, claim, evidence_type }):
1. Build prompt explaining what relevance text should contain
2. Call Claude API (claude-3-5-sonnet-20241022)
3. Request exactly 200 words
4. Include: how reference supports claim, what evidence it provides,
   why appropriate for context, connection to broader argument
5. Return: { relevance_text, tokens: {input, output}, cost }

Use this prompt structure from BUILD_INSTRUCTIONS section "LLM API"
```

**Claude Web Creates:**
- Artifact: `server/services/relevance-generator.js`

**You Do:**
1. Copy to `server/services/`
2. Set ANTHROPIC_API_KEY in .env
3. Test:
   ```javascript
   const gen = require('./services/relevance-generator');
   gen.generateRelevance({
     citation: 'Smith (2023)',
     context: 'Remote work increased productivity...',
     claim: 'Remote work is beneficial',
     evidence_type: 'empirical'
   }).then(console.log);
   ```
4. Report: "Generated 200-word relevance, cost $0.0042"

---

### Phase 6: References API Routes

**You Say:**
```
Create complete references API (server/routes/references.js):

GET /api/references - List all references
GET /api/references/:id - Get single reference
POST /api/references - Create new reference
PUT /api/references/:id/context - Update context (CASCADE TRIGGER)
PUT /api/references/:id/relevance - Update relevance
POST /api/references/:id/generate-relevance - Generate/regenerate relevance
POST /api/references/:id/search-urls - Search for URLs
PUT /api/references/:id/select-url - Select URL candidate
PUT /api/references/:id/finalize - Mark as finalized

CASCADE LOGIC for PUT /api/references/:id/context:
1. Update context in database
2. If auto_regenerate_relevance = true:
   - Call relevance-generator service
   - Return NEW relevance for approval (don't save yet)
   - Include old and new in response
   - Wait for PUT /api/references/:id/relevance with approval
3. Log change in audit_log

See BUILD_INSTRUCTIONS "BACKEND API SPECIFICATIONS" for details
```

**Claude Web Creates:**
- Artifact: `server/routes/references.js` (400+ lines)

**You Do:**
1. Copy to `server/routes/`
2. Mount in app.js: `app.use('/api/references', require('./routes/references'))`
3. Test each endpoint with curl
4. Report: "All endpoints responding, cascade logic works"

---

### Phase 7: Cascade Manager Service

**You Say:**
```
Create cascade-manager.js to orchestrate cascading updates:

handleContextChange(referenceId, newContext):
1. Update context in database
2. Generate new relevance using relevance-generator
3. Return { old_relevance, new_relevance, pending_approval }
4. Log in audit_log with trigger='cascade_from_context'
5. Don't commit until approved

handleRelevanceChange(referenceId, newRelevance):
1. Update relevance in database
2. Offer to regenerate URLs (return flag)
3. Log in audit_log

approveRelevanceChange(referenceId, approvalId, finalRelevance):
1. Commit approved relevance
2. Set relevance_overridden = true if edited
3. Update audit_log with user_approved = true
4. Return success

This is CORE INNOVATION - test thoroughly!
```

**Claude Web Creates:**
- Artifact: `server/services/cascade-manager.js`

**You Do:**
1. Copy to `server/services/`
2. Integration test:
   - Create reference
   - Update context
   - Check new relevance returned
   - Approve change
   - Verify database updated
3. Report: "Cascade works, relevance regenerated on context change"

---

### Phase 8: Frontend HTML Structure

**You Say:**
```
Create public/index.html with two-panel layout:

LEFT PANEL (45%): Document Viewer
- Document title and metadata
- Sections with collapsible paragraphs
- Citations highlighted (yellow background)
- Currently selected citation (blue border)
- Click citation to load in Reference Editor
- Select text to use as context

RIGHT PANEL (55%): Reference Editor
- Three sections vertically stacked:
  1. CONTEXT section (source badge, text display, actions)
  2. RELEVANCE section (200 words, word count, actions)
  3. URLS section (primary/secondary, validation status, search)

BOTTOM: Reference navigation (prev/next, counter, filters)

Use CSS Grid for layout, make responsive for iPad
Inline all CSS in <style> tag (single file like v18.0)
Include all CSS from BUILD_INSTRUCTIONS "FRONTEND UI/UX"
```

**Claude Web Creates:**
- Artifact: `public/index.html` (500+ lines)

**You Do:**
1. Copy to `public/`
2. Open in browser
3. Check layout renders correctly
4. Report: "Layout works, two panels responsive"

---

### Phase 9: Frontend JavaScript - Document Viewer

**You Say:**
```
Add to index.html (in <script> tag):

DocumentViewer class:
- loadDocument(documentId) - fetch from API, render sections
- renderSections(sections) - build HTML for sections + paragraphs
- highlightCitations() - add yellow background to citation spans
- selectCitation(citationId) - blue border, scroll into view, load in editor
- onTextSelection() - detect text selection, show "Use as Context" button
- useSelectedAsContext() - send selected text to Reference Editor

Citation rendering:
- Wrap citation text in <span class="citation" data-citation-id="X">
- Add click handler: onclick="documentViewer.selectCitation(X)"
- Add classes: .finalized (green checkmark), .empty (red icon)

See BUILD_INSTRUCTIONS "Document Viewer (Left Panel)" for details
```

**Claude Web Creates:**
- Artifact: JavaScript code block for `<script>` section

**You Do:**
1. Add to index.html
2. Test: `documentViewer.loadDocument(1)`
3. Check citations render and highlight
4. Click citation, verify scrolling
5. Report: "Document viewer works, citations clickable"

---

### Phase 10: Frontend JavaScript - Reference Editor

**You Say:**
```
Add ReferenceEditor class to <script>:

- loadReference(referenceId) - fetch from API, render 3 sections
- renderContextSection() - show context text, source badge, actions
- renderRelevanceSection() - show 200 words, word count, actions
- renderURLsSection() - show primary/secondary, validation, candidates

Actions:
- editContext() - show contenteditable or textarea
- saveContext() - call API, trigger cascade modal if needed
- regenerateRelevance() - call API, show comparison modal
- searchURLs() - call API, show candidates modal
- selectURL(candidateId, position) - set as primary/secondary

Modal system:
- showContextChangeModal(oldContext, newContext)
- showRelevanceComparisonModal(oldRel, newRel)
- showURLCandidatesModal(candidates)

See BUILD_INSTRUCTIONS "Reference Editor (Right Panel)"
```

**Claude Web Creates:**
- Artifact: JavaScript code block

**You Do:**
1. Add to index.html
2. Test: `referenceEditor.loadReference(12)`
3. Edit context, verify cascade modal appears
4. Approve relevance change, verify saved
5. Report: "Reference editor works, cascade UI functional"

---

### Phase 11: Cascade UI Handlers

**You Say:**
```
Add CascadeHandler class to manage auto-regeneration UX:

onContextChange(refId, newContext):
1. Call API: PUT /api/references/:id/context
2. If response includes pending_approval:
   - Show modal with old vs new relevance
   - User can: approve, reject, edit
   - If approved: Call PUT /api/references/:id/relevance
3. If relevance updated:
   - Show notification: "Search URLs with new relevance?"
   - If yes: Call POST /api/references/:id/search-urls

onRelevanceChange(refId, newRelevance):
1. Show notification offering URL regeneration
2. If accepted: searchURLs()

approveRelevance(pendingId, finalText):
1. Call API to commit changes
2. Update UI
3. Offer URL search

This implements the hierarchical cascade: Context → Relevance → URLs
```

**Claude Web Creates:**
- Artifact: JavaScript code block

**You Do:**
1. Add to index.html
2. End-to-end test:
   - Change context
   - Approve new relevance (or edit it)
   - Search URLs
   - Select URLs
3. Report: "Full cascade works, user approves each step"

---

### Phase 12: URL Search & Validation

**You Say:**
```
Create server/services/url-searcher.js:

searchURLs({ query, num_results }):
1. Call Google Custom Search API
2. For each result, validate using url-validator.js
3. Score results by relevance
4. Store in url_candidates table
5. Return ranked candidates

Create server/services/url-validator.js:
- Validate URL (check paywall, soft-404, login wall)
- Use v21.0 validation patterns (12 paywall + 10 login + 8 soft-404)
- Return { status, is_valid, issues }

Create server/routes/search.js:
- POST /api/search/google - Search with query
- POST /api/search/validate-url - Validate single URL
- Integrate with references routes for searching

See BUILD_INSTRUCTIONS "Search API" and v21-improvement-report.md for patterns
```

**Claude Web Creates:**
- Artifacts: url-searcher.js, url-validator.js, search.js routes

**You Do:**
1. Copy all files
2. Set GOOGLE_API_KEY and GOOGLE_CX in .env
3. Test search: POST /api/search/google with query
4. Test validation: POST /api/search/validate-url
5. Report: "Search returns 20 candidates, validation detects paywalls"

---

### Phase 13: Dropbox Integration

**You Say:**
```
Create server/routes/dropbox.js:

POST /api/dropbox/oauth - Handle OAuth code exchange
GET /api/dropbox/files - List files in App folder
GET /api/dropbox/download - Download file content
POST /api/dropbox/upload - Upload file to Dropbox

Use Dropbox SDK, implement PKCE flow (same as v18.0)
Store access_token and refresh_token
Auto-refresh when expired

Frontend: Add Dropbox connection UI
- "Connect to Dropbox" button
- OAuth redirect flow
- Load CaughtInTheActDecisions.txt button

See v18.0 index.html for working Dropbox integration code
```

**Claude Web Creates:**
- Artifacts: dropbox.js routes, frontend Dropbox UI code

**You Do:**
1. Copy files
2. Set DROPBOX_APP_KEY and DROPBOX_APP_SECRET
3. Test OAuth flow
4. Test file list
5. Report: "Dropbox connected, can list/download files"

---

### Phase 14: Deployment Scripts

**You Say:**
```
Create deployment automation:

deploy.sh:
1. Install Node.js 18.x
2. Install dependencies (npm install)
3. Create database
4. Set up nginx reverse proxy
5. Configure SSL with Let's Encrypt
6. Start with PM2
7. Configure auto-start

Also create:
- .env.example (template for environment variables)
- nginx config file
- PM2 ecosystem.config.js

See BUILD_INSTRUCTIONS "DEPLOYMENT INSTRUCTIONS" for all steps
```

**Claude Web Creates:**
- Artifacts: deploy.sh, .env.example, nginx config, PM2 config

**You Do:**
1. Upload to Linode
2. Run: `bash deploy.sh`
3. Check: `pm2 list` (app running)
4. Check: `curl https://refs.fergi.com/api/health`
5. Report: "Deployed, SSL working, app running"

---

### Phase 15: Testing & Refinement

**You Say:**
```
I'm testing the complete system. Here's what I found:
[Report issues]

Please fix:
1. [Issue 1]
2. [Issue 2]
3. [Issue 3]
```

**Claude Web Does:**
- Analyzes issues
- Creates updated artifacts
- Explains changes
- You copy updated files and re-test

**Iterate until all issues resolved**

---

## 🎯 SUCCESS CRITERIA

Session is complete when:

✅ **Backend:**
- All API endpoints working
- Database operations successful
- Cascade logic functional
- Claude API generating relevance
- Google Search finding URLs
- URL validation detecting issues

✅ **Frontend:**
- Document viewer displays .docx content
- Citations highlighted and clickable
- Reference editor shows 3 sections
- Context editing triggers cascade
- Relevance regeneration works
- URL search and selection functional

✅ **Integration:**
- Upload .docx → extracts citations → displays in viewer
- Click citation → loads in editor
- Edit context → approve new relevance → search URLs
- Select URLs → finalize reference → export

✅ **Deployment:**
- Running on Linode at refs.fergi.com
- SSL configured
- PM2 managing process
- Logs working

---

## 💡 TIPS FOR SUCCESS

### Communicate Clearly:
```
Bad:  "The context thing isn't working"
Good: "When I PUT to /api/references/12/context, I get 500 error.
       Server log shows: 'Cannot read property contextText of undefined'"
```

### Share Specific Details:
- Exact error messages
- Request/response JSON
- Console logs
- Database state

### Test Incrementally:
- Don't wait until end to test
- Test each artifact as you get it
- Report issues immediately
- Fix before moving to next phase

### Use the Spec:
- CLAUDE_WEB_V30_BUILD_INSTRUCTIONS.md has all details
- Reference it when asking questions
- Copy exact code examples when relevant

---

## 📊 PROGRESS TRACKING

Keep a checklist:

```
Phase 1: Database      [ ] Schema created [ ] Tables verified
Phase 2: Backend       [ ] Server running [ ] Health check works
Phase 3: Models        [ ] All 4 models  [ ] Basic queries work
Phase 4: Doc Process   [ ] Parses .docx  [ ] Extracts citations
Phase 5: Relevance     [ ] Generates 200w [ ] Cost tracked
Phase 6: Ref API       [ ] All endpoints [ ] Cascade works
Phase 7: Cascade Mgr   [ ] Context→Rel   [ ] Approval flow
Phase 8: HTML          [ ] Layout works  [ ] Responsive
Phase 9: Doc Viewer    [ ] Renders doc   [ ] Citations clickable
Phase 10: Ref Editor   [ ] 3 sections    [ ] All actions work
Phase 11: Cascade UI   [ ] Modals show   [ ] Approval works
Phase 12: Search       [ ] Google works  [ ] Validation works
Phase 13: Dropbox      [ ] OAuth works   [ ] Files accessible
Phase 14: Deploy       [ ] On Linode     [ ] SSL configured
Phase 15: Testing      [ ] All features  [ ] No blockers
```

Update after each phase. Share with Claude Web to track progress.

---

## 🚨 IF YOU GET STUCK

### Option 1: Simplify
- Skip Dropbox initially (manual file uploads)
- Use mock data instead of real .docx
- Test with hardcoded examples first

### Option 2: Fall Back to Mac Claude Code
- If Claude Web hits limits
- If artifacts too complex
- If testing requires iteration
- Mac Claude can deploy and test directly

### Option 3: Hybrid Approach
- Claude Web creates architecture/models/routes
- Mac Claude deploys and integrates
- Claude Web refines based on Mac Claude's reports

---

## 🎉 READY TO START?

**Opening message to Claude Web:**

```
I need to build Reference Refinement v30.0 based on a complete specification.

It's a document processing system with a hierarchical model where:
Context (from manuscript) → Relevance (200 words) → URLs (Primary/Secondary)

Author can override at any level, changes cascade downstream with approval.

I have a 50-page specification (CLAUDE_WEB_V30_BUILD_INSTRUCTIONS.md) with:
- Complete database schema (4 tables)
- All API endpoints (20+ routes)
- Full frontend (document viewer + reference editor)
- Cascade logic implementation
- Deployment scripts

We'll work iteratively - you create artifacts, I deploy and test, we refine.

Let's start with the database schema. Ready?
```

Then work through phases 1-15 above.

---

**GOOD LUCK!** 🚀

If Claude Web succeeds, you'll have v30.0 in one session.
If not, Mac Claude Code is ready to take over with the same specification.

Either way, this spec ensures success! 💪
