# Reference Refinement v30.0 - Complete Build Instructions for Claude Code Web

**Target Platform:** Linode VPS + Enhanced iPad Interface
**Development Approach:** Single Comprehensive Session
**Status:** Ready for Implementation
**Estimated Session Duration:** 4-6 hours
**Date Prepared:** November 13, 2025

---

## 📋 EXECUTIVE SUMMARY

Build a complete document processing and reference management system with hierarchical context-based workflow:

**Hierarchical Model:**
```
Context (from .docx manuscript) + Bibliographic Info
    ↓ (automatically generates)
Relevance Text (200 words explaining why this reference matters)
    ↓ (used to search for)
Primary & Secondary URLs (validated, ranked sources)
```

**Author Control Philosophy:**
- Author can override **EVERYTHING** at any level
- When upstream element changes (e.g., context), downstream auto-regenerates
- Author sees what changed and can accept/reject/modify
- Full transparency and control at every step

**Key Capabilities:**
1. Process .docx manuscripts (extract citations, capture context)
2. Display manuscript with interactive reference highlighting
3. Author can select/edit context for each reference
4. System auto-generates 200-word relevance from context
5. System searches for URLs using biblio + relevance
6. Author can override context, relevance, or URLs at any time
7. Changes cascade: Context → Relevance → URLs (with approval)

---

## 🎯 SYSTEM ARCHITECTURE OVERVIEW

### Platform Stack

**Server Environment:**
- Platform: Linode Nanode 1GB VPS
- OS: Ubuntu 22.04 LTS
- Domain: refs.fergi.com
- SSL: Let's Encrypt (automated)

**Backend:**
- Runtime: Node.js 18.x
- Framework: Express 4.x
- Database: SQLite 3.x
- Document Processing: mammoth.js (DOCX)
- NLP: natural.js (optional, for analysis)

**Frontend:**
- Single Page Application (SPA)
- Framework: Vanilla JavaScript (iPad Safari compatible)
- Document Viewer: Custom DOCX renderer
- State Management: Local state + localStorage
- API Communication: Fetch API with retry logic

**External APIs:**
- Anthropic Claude API (relevance generation)
- Google Custom Search API (URL discovery)
- Dropbox API (OAuth for file storage)

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    USER (iPad Safari)                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│              Enhanced iPad Interface v30.0              │
│  ┌──────────────────┐  ┌────────────────────────────┐  │
│  │ Document Viewer  │  │  Reference Editor          │  │
│  │ - Show .docx     │  │  - Edit Context            │  │
│  │ - Highlight refs │  │  - Edit Relevance          │  │
│  │ - Select context │  │  - Manage URLs             │  │
│  └──────────────────┘  └────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 Express API Server                      │
│  /api/documents     - Upload, process, list             │
│  /api/references    - CRUD, context, relevance, URLs    │
│  /api/llm           - Claude API integration            │
│  /api/search        - Google Search integration         │
│  /api/dropbox       - OAuth and file operations         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   SQLite Database                       │
│  - documents        - Uploaded .docx metadata           │
│  - citations        - Extracted citations with context  │
│  - references       - Full reference data + overrides   │
│  - audit_log        - Change tracking for cascades      │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ DATABASE SCHEMA (COMPLETE)

### Table: documents

```sql
CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    title TEXT,
    author TEXT,
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_date TIMESTAMP,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    total_citations INTEGER DEFAULT 0,
    total_references INTEGER DEFAULT 0,
    status TEXT DEFAULT 'uploaded', -- uploaded, processing, processed, error
    error_message TEXT,
    metadata TEXT -- JSON: sections, page_count, etc.
);

CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_upload_date ON documents(upload_date);
```

### Table: citations

**Purpose:** Store each citation location in the document with its surrounding context.

```sql
CREATE TABLE citations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER NOT NULL,
    citation_text TEXT NOT NULL, -- e.g., "[Smith, 2023]" or "[ ]"
    is_empty_bracket BOOLEAN DEFAULT 0,

    -- Context from manuscript
    paragraph_context TEXT NOT NULL, -- Full paragraph containing citation
    sentence_before TEXT, -- Sentence immediately before
    sentence_after TEXT, -- Sentence immediately after

    -- Location metadata
    section_title TEXT,
    section_number TEXT,
    paragraph_number INTEGER,
    page_number INTEGER,
    char_offset INTEGER, -- Character offset in document

    -- Derived information
    claim_supported TEXT, -- What claim this citation supports
    evidence_type TEXT, -- empirical, theoretical, review, methodological

    -- Override flags
    context_overridden BOOLEAN DEFAULT 0,
    context_override_source TEXT, -- 'manual', 'selected_text', 'auto'

    -- Reference linkage
    reference_id INTEGER, -- Links to references table

    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (reference_id) REFERENCES references(id) ON DELETE SET NULL
);

CREATE INDEX idx_citations_document ON citations(document_id);
CREATE INDEX idx_citations_reference ON citations(reference_id);
CREATE INDEX idx_citations_empty ON citations(is_empty_bracket);
```

### Table: references

**Purpose:** Store complete reference information with hierarchical data (context → relevance → URLs).

```sql
CREATE TABLE references (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Bibliographic information (from citation or user-provided)
    citation_text TEXT NOT NULL, -- Full formatted citation
    authors TEXT,
    year TEXT,
    title TEXT,
    publication TEXT, -- Journal, publisher, etc.
    doi TEXT,
    isbn TEXT,
    other_biblio_info TEXT,

    -- LEVEL 1: Context (from manuscript or override)
    context_source TEXT NOT NULL, -- 'citation_auto', 'selected_text', 'manual_override'
    context_text TEXT NOT NULL, -- Paragraph or selected text from manuscript
    context_location TEXT, -- JSON: {section, paragraph, page}
    context_overridden BOOLEAN DEFAULT 0,
    context_override_date TIMESTAMP,
    context_original TEXT, -- Original context before override (for undo)

    -- LEVEL 2: Relevance (auto-generated from context, overridable)
    relevance_text TEXT, -- 200-word explanation
    relevance_source TEXT DEFAULT 'auto', -- 'auto', 'manual_override', 'edited'
    relevance_generated_date TIMESTAMP,
    relevance_overridden BOOLEAN DEFAULT 0,
    relevance_override_date TIMESTAMP,
    relevance_original TEXT, -- Original relevance before override (for undo)

    -- LEVEL 3: URLs (searched using biblio + relevance, overridable)
    primary_url TEXT,
    primary_url_source TEXT, -- 'search_auto', 'user_selected', 'manual_override'
    primary_url_validation_status TEXT, -- 'valid', 'paywall', 'soft_404', 'pending'
    primary_url_validation_date TIMESTAMP,

    secondary_url TEXT,
    secondary_url_source TEXT,
    secondary_url_validation_status TEXT,
    secondary_url_validation_date TIMESTAMP,

    tertiary_url TEXT,
    tertiary_url_source TEXT,
    tertiary_url_validation_status TEXT,
    tertiary_url_validation_date TIMESTAMP,

    -- Search and ranking metadata
    search_query TEXT, -- Query used to find URLs
    search_strategy TEXT, -- Which v21.0 strategy was used
    search_date TIMESTAMP,
    search_results_count INTEGER,

    -- Quality and validation
    quality_score REAL, -- 0.0-1.0
    validation_flags TEXT, -- JSON array of flags

    -- Workflow status
    status TEXT DEFAULT 'draft', -- draft, finalized, published
    finalized_date TIMESTAMP,

    -- Change tracking
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1, -- Increment on each change

    -- Notes and flags
    notes TEXT,
    flags TEXT -- JSON array: ['MANUAL_REVIEW', 'AUTO_SELECTED', etc.]
);

CREATE INDEX idx_references_status ON references(status);
CREATE INDEX idx_references_context_overridden ON references(context_overridden);
CREATE INDEX idx_references_relevance_overridden ON references(relevance_overridden);
CREATE INDEX idx_references_finalized ON references(finalized_date);
```

### Table: audit_log

**Purpose:** Track all changes, especially cascading updates when context/relevance changes.

```sql
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_id INTEGER NOT NULL,
    change_type TEXT NOT NULL, -- 'context_changed', 'relevance_regenerated', 'urls_updated', 'manual_override'
    level TEXT NOT NULL, -- 'context', 'relevance', 'urls'

    -- What changed
    field_name TEXT,
    old_value TEXT,
    new_value TEXT,

    -- Why it changed
    trigger TEXT, -- 'user_edit', 'cascade_from_context', 'cascade_from_relevance', 'auto_regenerate'
    trigger_reference_id INTEGER, -- If cascaded from another reference

    -- User interaction
    user_approved BOOLEAN, -- Did user approve auto-regeneration?
    user_action TEXT, -- 'approved', 'rejected', 'modified', 'ignored'

    -- Metadata
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,

    FOREIGN KEY (reference_id) REFERENCES references(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_reference ON audit_log(reference_id);
CREATE INDEX idx_audit_type ON audit_log(change_type);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
```

### Table: url_candidates

**Purpose:** Store all URL candidates found during search (not just top 2-3).

```sql
CREATE TABLE url_candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_id INTEGER NOT NULL,
    search_id INTEGER, -- Group candidates from same search

    url TEXT NOT NULL,
    title TEXT,
    snippet TEXT,
    rank INTEGER, -- Position in search results (1-20)
    score REAL, -- Relevance score (0.0-1.0)

    -- Validation
    validation_status TEXT, -- 'valid', 'paywall', 'soft_404', 'login_required', 'pending'
    validation_date TIMESTAMP,
    validation_details TEXT, -- JSON: {status_code, content_type, error_patterns}

    -- Selection
    selected_as TEXT, -- 'primary', 'secondary', 'tertiary', 'rejected', null
    selected_date TIMESTAMP,

    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (reference_id) REFERENCES references(id) ON DELETE CASCADE
);

CREATE INDEX idx_url_candidates_reference ON url_candidates(reference_id);
CREATE INDEX idx_url_candidates_selected ON url_candidates(selected_as);
```

---

## 🔌 BACKEND API SPECIFICATIONS

### Base URL: `https://refs.fergi.com/api`

All endpoints return JSON. All require authentication (Dropbox OAuth token).

### Authentication

**Headers Required:**
```
Authorization: Bearer <dropbox_oauth_token>
Content-Type: application/json
```

---

### 📄 Documents API

#### `POST /api/documents/upload`

Upload and process a .docx file.

**Request:**
```json
{
  "file": "<base64_encoded_docx>",
  "filename": "TheMythOfMaleMenopause.docx",
  "metadata": {
    "title": "The Myth of Male Menopause",
    "author": "Joe Ferguson"
  }
}
```

**Response:**
```json
{
  "success": true,
  "document_id": 1,
  "status": "processing",
  "message": "Document uploaded and processing started"
}
```

**Processing Steps:**
1. Save .docx file to `/var/www/refs.fergi.com/docs/uploads/`
2. Create database record in `documents` table
3. Queue processing job (background or immediate)
4. Return document_id

---

#### `POST /api/documents/:id/process`

Process an uploaded document (extract citations, context).

**Request:**
```json
{
  "options": {
    "extract_citations": true,
    "capture_context": true,
    "fill_empty_brackets": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "document_id": 1,
  "status": "processing",
  "job_id": "proc_123abc",
  "estimated_time": 60
}
```

**Processing Steps:**
1. Load .docx using mammoth.js
2. Extract document structure (sections, paragraphs)
3. Find all citations (existing and empty brackets `[ ]`)
4. For each citation:
   - Capture paragraph context
   - Get surrounding sentences
   - Determine section, page, paragraph number
   - Extract claim being supported
   - Insert into `citations` table
5. Update document status to 'processed'

---

#### `GET /api/documents/:id/status`

Check processing status.

**Response:**
```json
{
  "success": true,
  "document_id": 1,
  "status": "processed",
  "progress": 100,
  "total_citations": 45,
  "empty_brackets": 12,
  "processing_time": 42
}
```

---

#### `GET /api/documents/:id`

Get document details and all citations.

**Response:**
```json
{
  "success": true,
  "document": {
    "id": 1,
    "filename": "TheMythOfMaleMenopause.docx",
    "title": "The Myth of Male Menopause",
    "author": "Joe Ferguson",
    "total_citations": 45,
    "total_references": 33,
    "status": "processed"
  },
  "citations": [
    {
      "id": 1,
      "citation_text": "[Smith, 2023]",
      "is_empty_bracket": false,
      "paragraph_context": "This study examined...",
      "section_title": "Introduction",
      "paragraph_number": 3,
      "reference_id": 12
    }
  ]
}
```

---

#### `GET /api/documents/:id/content`

Get full document content for viewer.

**Response:**
```json
{
  "success": true,
  "content": {
    "sections": [
      {
        "title": "Introduction",
        "paragraphs": [
          {
            "number": 1,
            "text": "This is the first paragraph...",
            "citations": [
              {
                "id": 1,
                "start_offset": 45,
                "end_offset": 58,
                "citation_text": "[Smith, 2023]"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

### 📚 References API

#### `GET /api/references`

List all references.

**Query Parameters:**
- `document_id` - Filter by document
- `status` - Filter by status (draft, finalized)
- `context_overridden` - Filter by override status

**Response:**
```json
{
  "success": true,
  "total": 33,
  "references": [
    {
      "id": 12,
      "citation_text": "Smith, A. (2023). Title...",
      "context_text": "This study examined...",
      "relevance_text": "This reference supports...",
      "primary_url": "https://...",
      "status": "draft",
      "context_overridden": false,
      "relevance_overridden": false
    }
  ]
}
```

---

#### `GET /api/references/:id`

Get complete reference details.

**Response:**
```json
{
  "success": true,
  "reference": {
    "id": 12,
    "citation_text": "Smith, A. (2023). Remote work productivity...",
    "authors": "Smith, A.",
    "year": "2023",
    "title": "Remote work productivity analysis",

    "context_source": "citation_auto",
    "context_text": "This study examined remote work...",
    "context_location": {
      "section": "Results",
      "paragraph": 15,
      "page": 47
    },
    "context_overridden": false,

    "relevance_text": "This reference provides empirical evidence...",
    "relevance_source": "auto",
    "relevance_overridden": false,

    "primary_url": "https://doi.org/10.1234/example",
    "primary_url_source": "search_auto",
    "primary_url_validation_status": "valid",

    "secondary_url": "https://example.com/fulltext.pdf",

    "search_query": "remote work productivity 2023 empirical",
    "search_strategy": "title_keywords_5_terms",

    "status": "draft"
  }
}
```

---

#### `POST /api/references`

Create new reference (for empty brackets).

**Request:**
```json
{
  "citation_id": 5,
  "bibliographic_info": {
    "authors": "Jones, B.",
    "year": "2022",
    "title": "Climate change impacts",
    "publication": "Nature Climate Change"
  },
  "context_text": "Recent research shows...",
  "auto_generate_relevance": true,
  "auto_search_urls": true
}
```

**Response:**
```json
{
  "success": true,
  "reference_id": 34,
  "reference": { /* full reference object */ },
  "actions_taken": [
    "relevance_generated",
    "urls_searched"
  ]
}
```

---

#### `PUT /api/references/:id/context`

Update reference context (triggers cascade).

**Request:**
```json
{
  "context_text": "Updated paragraph context...",
  "context_source": "manual_override",
  "auto_regenerate_relevance": true
}
```

**Response:**
```json
{
  "success": true,
  "reference_id": 12,
  "changes": {
    "context": {
      "old": "This study examined...",
      "new": "Updated paragraph context...",
      "changed": true
    },
    "relevance": {
      "old": "Previous relevance...",
      "new": "Auto-regenerated relevance...",
      "changed": true,
      "action": "auto_regenerated",
      "requires_approval": true
    }
  },
  "pending_approval": {
    "relevance": {
      "id": "approval_123",
      "old_value": "Previous relevance...",
      "new_value": "Auto-regenerated relevance...",
      "message": "Relevance was auto-regenerated based on new context. Approve?"
    }
  }
}
```

**Logic:**
1. Update context in database
2. Set `context_overridden = true`
3. Save original context to `context_original`
4. If `auto_regenerate_relevance = true`:
   - Generate new relevance using Claude API
   - Return both old and new for user approval
   - Don't commit until approved
5. Log change in `audit_log`

---

#### `PUT /api/references/:id/relevance`

Update reference relevance (manually or approve auto-generated).

**Request:**
```json
{
  "relevance_text": "Manually edited relevance...",
  "source": "manual_override",
  "auto_regenerate_urls": false
}
```

**OR for approval:**
```json
{
  "approval_id": "approval_123",
  "action": "approve"
}
```

**Response:**
```json
{
  "success": true,
  "reference_id": 12,
  "relevance_updated": true,
  "offer_url_regeneration": true,
  "message": "Relevance updated. Would you like to regenerate URLs based on new relevance?"
}
```

---

#### `POST /api/references/:id/generate-relevance`

Generate or regenerate relevance from context.

**Request:**
```json
{
  "force_regenerate": true
}
```

**Response:**
```json
{
  "success": true,
  "relevance_text": "Auto-generated 200-word relevance...",
  "tokens_used": {
    "input": 450,
    "output": 280
  },
  "cost": 0.0042
}
```

**Implementation:**
Use Claude API with prompt:
```
Generate a 200-word explanation of why this reference is relevant to the document.

REFERENCE:
{citation_text}

CONTEXT FROM MANUSCRIPT:
{context_text}

CLAIM BEING SUPPORTED:
{claim_supported}

Explain:
1. How this reference supports the specific claim
2. What evidence/argument it provides
3. Why it's appropriate for this context
4. How it connects to the document's broader argument

Be specific and precise. Focus on the connection between the reference and the claim.
Exactly 200 words.
```

---

#### `POST /api/references/:id/search-urls`

Search for URLs using biblio + relevance.

**Request:**
```json
{
  "strategies": ["title_keywords_5_terms", "title_first_60_chars"],
  "max_candidates": 20,
  "validate_urls": true
}
```

**Response:**
```json
{
  "success": true,
  "search_query": "climate change impacts empirical evidence 2022",
  "strategy_used": "title_keywords_5_terms",
  "total_results": 18,
  "candidates": [
    {
      "rank": 1,
      "url": "https://doi.org/10.1038/s41558-022-01234-5",
      "title": "Climate change impacts on global ecosystems",
      "snippet": "Our study demonstrates...",
      "score": 0.95,
      "validation_status": "valid",
      "suggested_as": "primary"
    },
    {
      "rank": 2,
      "url": "https://example.com/jones2022.pdf",
      "title": "Full text PDF",
      "score": 0.89,
      "validation_status": "valid",
      "suggested_as": "secondary"
    }
  ]
}
```

**Implementation:**
1. Build query from:
   - Title (using v21.0 strategies)
   - Keywords from relevance text
   - Author, year
2. Search Google Custom Search API
3. For each result:
   - Validate URL (check status, paywall patterns, soft 404s)
   - Score based on relevance to biblio + relevance
   - Store in `url_candidates` table
4. Return top 20 candidates
5. Suggest top 2-3 for primary/secondary

---

#### `PUT /api/references/:id/select-url`

Select a URL candidate as primary/secondary/tertiary.

**Request:**
```json
{
  "candidate_id": 45,
  "position": "primary"
}
```

**Response:**
```json
{
  "success": true,
  "reference_id": 12,
  "primary_url": "https://doi.org/10.1038/s41558-022-01234-5",
  "primary_url_source": "user_selected"
}
```

---

#### `PUT /api/references/:id/finalize`

Mark reference as finalized.

**Request:**
```json
{
  "finalize": true
}
```

**Response:**
```json
{
  "success": true,
  "reference_id": 12,
  "status": "finalized",
  "finalized_date": "2025-11-13T18:45:00Z"
}
```

---

### 🤖 LLM API (Claude Integration)

#### `POST /api/llm/generate-relevance`

Generate 200-word relevance text.

**Request:**
```json
{
  "citation": "Smith, A. (2023). Title...",
  "context": "Paragraph from manuscript...",
  "claim": "Remote work increases productivity",
  "evidence_type": "empirical"
}
```

**Response:**
```json
{
  "success": true,
  "relevance_text": "This reference provides critical empirical evidence...",
  "tokens": {
    "input": 420,
    "output": 275
  },
  "cost": 0.0039,
  "model": "claude-3-5-sonnet-20241022"
}
```

---

#### `POST /api/llm/generate-query`

Generate search query using v21.0 strategies.

**Request:**
```json
{
  "reference": {
    "title": "Remote work productivity analysis",
    "authors": "Smith, A.",
    "year": "2023"
  },
  "relevance": "This reference provides...",
  "strategy": "title_keywords_5_terms"
}
```

**Response:**
```json
{
  "success": true,
  "query": "remote work productivity empirical study 2023",
  "strategy_used": "title_keywords_5_terms",
  "tokens": { "input": 350, "output": 15 },
  "cost": 0.0012
}
```

---

### 🔍 Search API (Google Integration)

#### `POST /api/search/google`

Search Google Custom Search.

**Request:**
```json
{
  "query": "remote work productivity 2023",
  "num_results": 20
}
```

**Response:**
```json
{
  "success": true,
  "total_results": 18,
  "results": [
    {
      "url": "https://doi.org/10.1234/example",
      "title": "Remote work productivity analysis",
      "snippet": "Our study examined...",
      "rank": 1
    }
  ]
}
```

---

#### `POST /api/search/validate-url`

Validate a URL (check for paywall, soft 404, etc.).

**Request:**
```json
{
  "url": "https://example.com/article"
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://example.com/article",
  "status_code": 200,
  "content_type": "text/html",
  "validation_status": "valid",
  "issues": [],
  "is_paywall": false,
  "is_soft_404": false,
  "is_login_required": false
}
```

**Validation Logic:**
- Check HTTP status (200, 301, 404, etc.)
- Scan for paywall patterns (12 patterns from v21.0)
- Check for login walls (10 patterns from v21.0)
- Detect soft 404s (8 content patterns from v21.0)
- Verify content-type matches URL extension

---

### 💾 Dropbox API

#### `POST /api/dropbox/oauth`

Handle Dropbox OAuth flow.

**Request:**
```json
{
  "code": "oauth_code_from_dropbox"
}
```

**Response:**
```json
{
  "success": true,
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 14400
}
```

---

#### `GET /api/dropbox/files`

List files in Dropbox App folder.

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "name": "CaughtInTheActDecisions.txt",
      "path": "/CaughtInTheActDecisions.txt",
      "size": 321000,
      "modified": "2025-11-13T12:29:00Z"
    }
  ]
}
```

---

#### `POST /api/dropbox/upload`

Upload file to Dropbox.

**Request:**
```json
{
  "path": "/enhanced_documents/TheMythOfMaleMenopause_enhanced.docx",
  "content": "<base64_encoded_file>"
}
```

**Response:**
```json
{
  "success": true,
  "path": "/enhanced_documents/TheMythOfMaleMenopause_enhanced.docx",
  "size": 1240000
}
```

---

## 🎨 FRONTEND UI/UX SPECIFICATIONS

### Overall Layout

**Two-Panel Interface:**

```
┌─────────────────────────────────────────────────────────────────┐
│ Reference Refinement v30.0                           [⚙ Settings]│
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌─────────────────────────┐  ┌──────────────────────────────┐  │
│ │  DOCUMENT VIEWER        │  │  REFERENCE EDITOR            │  │
│ │  (Left Panel - 45%)     │  │  (Right Panel - 55%)         │  │
│ │                         │  │                              │  │
│ │  [Document Title]       │  │  ┌────────────────────────┐  │  │
│ │                         │  │  │ Reference #12          │  │  │
│ │  Section 3.2:           │  │  │ [Smith, A. (2023)]     │  │  │
│ │  Productivity Metrics   │  │  └────────────────────────┘  │  │
│ │                         │  │                              │  │
│ │  This study examined    │  │  📄 CONTEXT                  │  │
│ │  remote work            │  │  Source: Auto from citation  │  │
│ │  productivity across    │  │  ┌────────────────────────┐  │  │
│ │  500 companies during   │  │  │ [Context paragraph]    │  │  │
│ │  2020-2022. The        │  │  │                        │  │  │
│ │  results showed a       │  │  │ ► [Smith, 2023] ◄      │  │  │
│ │  significant increase   │  │  └────────────────────────┘  │  │
│ │  in output metrics      │  │  [Highlight in Doc] [Edit]   │  │
│ │  ► [Smith, 2023] ◄      │  │                              │  │
│ │  These findings align   │  │  💬 RELEVANCE (200 words)    │  │
│ │  with broader trends.   │  │  Source: Auto-generated      │  │
│ │                         │  │  ┌────────────────────────┐  │  │
│ │  [Next Section]         │  │  │ This reference          │  │  │
│ │                         │  │  │ provides empirical...   │  │  │
│ │                         │  │  └────────────────────────┘  │  │
│ │                         │  │  [Regenerate] [Edit]         │  │
│ │                         │  │                              │  │
│ │                         │  │  🔗 URLS                     │  │
│ │                         │  │  Search: "remote work..."    │  │
│ │                         │  │  Strategy: Title Keywords 5  │  │
│ │                         │  │                              │  │
│ │                         │  │  ● Primary URL               │  │
│ │                         │  │  https://doi.org/...         │  │
│ │                         │  │  ✓ Valid | [Change]          │  │
│ │                         │  │                              │  │
│ │                         │  │  ● Secondary URL             │  │
│ │                         │  │  https://example.com/...     │  │
│ │                         │  │  ✓ Valid | [Change]          │  │
│ │                         │  │                              │  │
│ │                         │  │  [Search Again] [Add URL]    │  │
│ │                         │  │                              │  │
│ │                         │  │  [Finalize Reference]        │  │
│ └─────────────────────────┘  └──────────────────────────────┘  │
│                                                                  │
│ [< Prev Reference]              [Reference 12 / 45]  [Next >]   │
└─────────────────────────────────────────────────────────────────┘
```

---

### Document Viewer (Left Panel)

**Features:**
1. **Document Structure:**
   - Show section headings with hierarchy
   - Display paragraphs with proper formatting
   - Scroll through entire document

2. **Citation Highlighting:**
   - All citations highlighted (yellow background)
   - Currently selected citation (blue border, scroll into view)
   - Click citation to load in Reference Editor

3. **Context Selection:**
   - User can select text with mouse/touch
   - "Use as Context" button appears
   - Selected text becomes new context for current reference

4. **Visual Indicators:**
   - 📊 Empirical citation (blue icon)
   - 📖 Theoretical citation (green icon)
   - ❓ Empty bracket (red icon)
   - ✅ Finalized citation (checkmark)

**Implementation:**
```html
<div id="documentViewer" class="document-viewer">
  <div class="document-header">
    <h2 id="docTitle">The Myth of Male Menopause</h2>
    <div class="doc-meta">
      <span>45 citations</span>
      <span>12 empty brackets</span>
      <span>33 finalized</span>
    </div>
  </div>

  <div class="document-content">
    <section class="doc-section">
      <h3 class="section-title">1. Introduction</h3>
      <div class="paragraphs">
        <p class="paragraph" data-paragraph="1">
          This study examined remote work productivity
          <span class="citation selected" data-citation-id="12">
            [Smith, 2023]
          </span>
          across 500 companies.
        </p>
      </div>
    </section>
  </div>

  <div class="context-selection-toolbar" style="display: none;">
    <button onclick="useSelectedAsContext()">
      Use Selected Text as Context
    </button>
  </div>
</div>
```

**CSS:**
```css
.citation {
  background: #fff3cd;
  padding: 2px 4px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s;
}

.citation:hover {
  background: #ffc107;
}

.citation.selected {
  background: #cfe2ff;
  border: 2px solid #0d6efd;
  font-weight: 600;
}

.citation.finalized::after {
  content: "✓";
  color: #198754;
  margin-left: 3px;
}

.citation.empty::before {
  content: "❗";
  color: #dc3545;
  margin-right: 3px;
}
```

---

### Reference Editor (Right Panel)

**Three Sections (Hierarchical):**

#### 1. Context Section

```html
<div class="reference-section context-section">
  <div class="section-header">
    <h3>📄 CONTEXT</h3>
    <span class="source-badge auto">Auto from Citation</span>
  </div>

  <div class="context-display">
    <div class="context-text" id="contextText">
      This study examined remote work productivity across 500
      companies during 2020-2022. The results showed a significant
      increase in output metrics [Smith, 2023]. These findings
      align with broader trends.
    </div>

    <div class="context-meta">
      <span>Section: Results</span>
      <span>Paragraph: 15</span>
      <span>Page: 47</span>
    </div>
  </div>

  <div class="context-actions">
    <button onclick="highlightInDocument()">
      📍 Highlight in Document
    </button>
    <button onclick="editContext()">
      ✏️ Edit Context
    </button>
    <button onclick="selectNewContext()">
      🎯 Select Different Text
    </button>
  </div>

  <div class="context-override-indicator" style="display: none;">
    <span class="override-badge">⚠️ Context Overridden</span>
    <button onclick="undoContextOverride()">Undo</button>
  </div>
</div>
```

**When Context Changes:**
1. Show modal: "Context changed. Regenerate relevance?"
2. Options: "Yes, Regenerate" | "No, Keep Current" | "Edit Manually"
3. If regenerate: Show diff of old vs new relevance
4. User can approve, reject, or edit

---

#### 2. Relevance Section

```html
<div class="reference-section relevance-section">
  <div class="section-header">
    <h3>💬 RELEVANCE (200 words)</h3>
    <span class="source-badge auto">Auto-generated</span>
    <span class="word-count">200 words</span>
  </div>

  <div class="relevance-display">
    <div class="relevance-text" id="relevanceText">
      This reference provides critical empirical evidence for the
      claim that remote work increases productivity. Smith's 2023
      study examined 500 companies during the pandemic period
      (2020-2022), offering a large-scale quantitative analysis...
      [continues to 200 words]
    </div>
  </div>

  <div class="relevance-actions">
    <button onclick="regenerateRelevance()">
      🔄 Regenerate from Context
    </button>
    <button onclick="editRelevance()">
      ✏️ Edit Relevance
    </button>
  </div>

  <div class="relevance-override-indicator" style="display: none;">
    <span class="override-badge">⚠️ Relevance Manually Edited</span>
    <button onclick="undoRelevanceOverride()">Undo</button>
  </div>

  <div class="cascade-notification" style="display: none;">
    <div class="notification-box">
      <p><strong>Relevance Changed</strong></p>
      <p>Would you like to search for URLs again using the new relevance?</p>
      <button onclick="regenerateURLs()">Yes, Search Again</button>
      <button onclick="dismissNotification()">No, Keep Current URLs</button>
    </div>
  </div>
</div>
```

**Auto-Regeneration Flow:**
1. User changes context
2. System generates new relevance using Claude
3. Show comparison modal:
   ```
   OLD RELEVANCE:                    NEW RELEVANCE:
   This reference provides...        This reference provides...
   [200 words]                       [200 words]

   [Keep Old] [Use New] [Edit Both]
   ```
4. User chooses action
5. If approved, offer to regenerate URLs

---

#### 3. URLs Section

```html
<div class="reference-section urls-section">
  <div class="section-header">
    <h3>🔗 URLs</h3>
    <div class="search-info">
      <span>Query: "remote work productivity empirical 2023"</span>
      <span class="strategy-badge">Title Keywords 5</span>
    </div>
  </div>

  <div class="url-primary">
    <label>● Primary URL</label>
    <div class="url-display">
      <input type="url" id="primaryUrl"
             value="https://doi.org/10.1234/example" />
      <span class="validation-status valid">✓ Valid</span>
    </div>
    <div class="url-actions">
      <button onclick="validateURL('primary')">Validate</button>
      <button onclick="selectFromCandidates('primary')">
        Choose from 18 candidates
      </button>
      <button onclick="manualURL('primary')">Enter Manually</button>
    </div>
  </div>

  <div class="url-secondary">
    <label>● Secondary URL</label>
    <div class="url-display">
      <input type="url" id="secondaryUrl"
             value="https://example.com/fulltext.pdf" />
      <span class="validation-status valid">✓ Valid</span>
    </div>
    <div class="url-actions">
      <button onclick="validateURL('secondary')">Validate</button>
      <button onclick="selectFromCandidates('secondary')">
        Choose from candidates
      </button>
    </div>
  </div>

  <div class="url-search-actions">
    <button onclick="searchURLs()" class="primary-button">
      🔍 Search for URLs (Biblio + Relevance)
    </button>
    <button onclick="viewAllCandidates()">
      View All 18 Candidates
    </button>
  </div>
</div>
```

**URL Candidates Modal:**
```html
<div id="urlCandidatesModal" class="modal">
  <div class="modal-content">
    <h3>URL Candidates (18 results)</h3>
    <p>Search query: "remote work productivity empirical 2023"</p>

    <div class="candidates-list">
      <div class="candidate-item" data-rank="1">
        <div class="rank">1</div>
        <div class="candidate-info">
          <div class="url">https://doi.org/10.1234/example</div>
          <div class="title">Remote work productivity analysis</div>
          <div class="snippet">Our study examined 500 companies...</div>
          <div class="meta">
            <span class="score">Score: 0.95</span>
            <span class="validation valid">✓ Valid</span>
          </div>
        </div>
        <div class="candidate-actions">
          <button onclick="selectAs('primary', 1)">
            Set as Primary
          </button>
          <button onclick="selectAs('secondary', 1)">
            Set as Secondary
          </button>
        </div>
      </div>

      <!-- Repeat for all candidates -->
    </div>

    <button onclick="closeModal()">Close</button>
  </div>
</div>
```

---

### Modals and Notifications

#### Context Change Modal

```html
<div id="contextChangeModal" class="modal">
  <div class="modal-content">
    <h3>⚠️ Context Changed</h3>

    <div class="change-summary">
      <div class="old-context">
        <h4>OLD CONTEXT:</h4>
        <p>This study examined remote work productivity...</p>
      </div>

      <div class="arrow">→</div>

      <div class="new-context">
        <h4>NEW CONTEXT:</h4>
        <p>Recent research demonstrates that remote work...</p>
      </div>
    </div>

    <p><strong>The relevance text was based on the old context.</strong></p>
    <p>Would you like to regenerate the relevance to match the new context?</p>

    <div class="modal-actions">
      <button onclick="regenerateRelevanceFromContext()" class="primary">
        Yes, Regenerate Relevance
      </button>
      <button onclick="keepCurrentRelevance()">
        No, Keep Current Relevance
      </button>
      <button onclick="editRelevanceManually()">
        Let Me Edit It Manually
      </button>
    </div>
  </div>
</div>
```

---

#### Relevance Regeneration Approval

```html
<div id="relevanceApprovalModal" class="modal">
  <div class="modal-content">
    <h3>Review Auto-Generated Relevance</h3>

    <div class="side-by-side-comparison">
      <div class="old-relevance">
        <h4>CURRENT RELEVANCE:</h4>
        <div class="text-box">
          This reference provides empirical evidence...
          [200 words]
        </div>
        <span class="word-count">200 words</span>
      </div>

      <div class="new-relevance">
        <h4>NEW RELEVANCE (Auto-generated):</h4>
        <div class="text-box editable" contenteditable="true">
          This reference offers critical empirical support...
          [200 words]
        </div>
        <span class="word-count">200 words</span>
        <p class="hint">💡 You can edit this before approving</p>
      </div>
    </div>

    <div class="cost-info">
      <span>Tokens: 450 input + 280 output</span>
      <span>Cost: $0.0042</span>
    </div>

    <div class="modal-actions">
      <button onclick="approveNewRelevance()" class="primary">
        ✓ Use New Relevance
      </button>
      <button onclick="keepOldRelevance()">
        ✗ Keep Current Relevance
      </button>
    </div>
  </div>
</div>
```

---

#### URL Search Progress

```html
<div id="urlSearchProgress" class="modal">
  <div class="modal-content">
    <h3>🔍 Searching for URLs...</h3>

    <div class="progress-steps">
      <div class="step complete">
        <span class="icon">✓</span>
        <span>Building query from biblio + relevance</span>
      </div>

      <div class="step active">
        <span class="icon">⏳</span>
        <span>Searching Google (Strategy: Title Keywords 5)</span>
      </div>

      <div class="step pending">
        <span class="icon">○</span>
        <span>Validating URLs</span>
      </div>

      <div class="step pending">
        <span class="icon">○</span>
        <span>Ranking candidates</span>
      </div>
    </div>

    <div class="progress-bar">
      <div class="progress" style="width: 50%"></div>
    </div>

    <p class="status-text">Found 18 results, validating...</p>
  </div>
</div>
```

---

### Reference Navigation

```html
<div class="reference-navigation">
  <button onclick="previousReference()" id="prevBtn">
    ← Previous Reference
  </button>

  <div class="reference-counter">
    <span>Reference</span>
    <input type="number" id="refNumber" value="12"
           min="1" max="45" onchange="jumpToReference()" />
    <span>of 45</span>
  </div>

  <button onclick="nextReference()" id="nextBtn">
    Next Reference →
  </button>
</div>

<div class="reference-filter">
  <label>Show:</label>
  <select onchange="filterReferences()">
    <option value="all">All References</option>
    <option value="empty">Empty Brackets Only</option>
    <option value="unfinalized">Unfinalized Only</option>
    <option value="overridden">Overridden Only</option>
  </select>
</div>
```

---

## 🔄 HIERARCHICAL MODEL IMPLEMENTATION

### Core Concept

```
CONTEXT (from manuscript or override)
    ↓ triggers auto-generation
RELEVANCE (200 words explaining connection)
    ↓ used in search query
PRIMARY & SECONDARY URLs (validated sources)
```

### Cascade Logic

#### When Context Changes:

```javascript
async function onContextChange(referenceId, newContext) {
  // 1. Update context in database
  await updateContext(referenceId, newContext);

  // 2. Ask user: regenerate relevance?
  const regenerate = await showModal({
    type: 'confirm',
    title: 'Context Changed',
    message: 'Context has changed. Regenerate relevance to match?',
    actions: ['Yes, Regenerate', 'No, Keep Current', 'Edit Manually']
  });

  if (regenerate === 'Yes, Regenerate') {
    // 3. Generate new relevance
    const newRelevance = await generateRelevance(referenceId, newContext);

    // 4. Show comparison for approval
    const approved = await showRelevanceComparison({
      oldRelevance: currentRelevance,
      newRelevance: newRelevance,
      editable: true
    });

    if (approved) {
      // 5. Update relevance
      await updateRelevance(referenceId, approved.finalRelevance);

      // 6. Log in audit_log
      await logChange({
        reference_id: referenceId,
        change_type: 'relevance_regenerated',
        trigger: 'cascade_from_context',
        old_value: currentRelevance,
        new_value: approved.finalRelevance,
        user_approved: true
      });

      // 7. Ask: regenerate URLs?
      const regenerateURLs = await showModal({
        type: 'confirm',
        title: 'Relevance Updated',
        message: 'Search for URLs again using new relevance?',
        actions: ['Yes, Search', 'No, Keep URLs']
      });

      if (regenerateURLs === 'Yes, Search') {
        await searchAndRankURLs(referenceId);
      }
    }
  } else if (regenerate === 'Edit Manually') {
    await openRelevanceEditor(referenceId);
  }
}
```

---

#### When Relevance Changes:

```javascript
async function onRelevanceChange(referenceId, newRelevance) {
  // 1. Update relevance in database
  await updateRelevance(referenceId, newRelevance);

  // 2. Offer to regenerate URLs
  const regenerateURLs = await showNotification({
    type: 'cascade',
    message: 'Relevance changed. Search for URLs using new relevance?',
    actions: ['Search Again', 'Keep Current URLs'],
    dismissible: true
  });

  if (regenerateURLs === 'Search Again') {
    // 3. Build new query using updated relevance
    const query = await buildSearchQuery({
      bibliographic: reference.biblio,
      relevance: newRelevance,
      strategy: selectQueryStrategy(reference)
    });

    // 4. Search and show candidates
    const candidates = await searchURLs(query);
    await showURLCandidatesModal(candidates);
  }
}
```

---

### Override Tracking

Every override is logged and reversible:

```javascript
async function overrideContext(referenceId, newContext, source) {
  const reference = await getReference(referenceId);

  // Save original for undo
  await db.run(`
    UPDATE references
    SET context_original = ?,
        context_text = ?,
        context_source = ?,
        context_overridden = 1,
        context_override_date = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [reference.context_text, newContext, source, referenceId]);

  // Log the change
  await logAudit({
    reference_id: referenceId,
    change_type: 'context_changed',
    level: 'context',
    field_name: 'context_text',
    old_value: reference.context_text,
    new_value: newContext,
    trigger: 'manual_override',
    user_approved: true
  });

  // Return undo function
  return {
    undo: async () => {
      await db.run(`
        UPDATE references
        SET context_text = context_original,
            context_overridden = 0,
            context_override_date = NULL
        WHERE id = ?
      `, [referenceId]);
    }
  };
}
```

---

## 📂 FILE STRUCTURE

### Server Directory: `/var/www/refs.fergi.com/`

```
refs.fergi.com/
├── server/
│   ├── app.js                      # Main Express app
│   ├── config/
│   │   ├── database.js             # SQLite connection
│   │   ├── apis.js                 # API keys (Anthropic, Google, Dropbox)
│   │   └── constants.js            # Constants (strategies, validation patterns)
│   ├── routes/
│   │   ├── index.js                # Route aggregator
│   │   ├── documents.js            # Document upload/processing
│   │   ├── references.js           # Reference CRUD + cascade logic
│   │   ├── llm.js                  # Claude API integration
│   │   ├── search.js               # Google Search + URL validation
│   │   └── dropbox.js              # Dropbox OAuth + file ops
│   ├── services/
│   │   ├── document-processor.js   # Parse .docx, extract citations
│   │   ├── context-analyzer.js     # 5-level context analysis
│   │   ├── relevance-generator.js  # Claude API for relevance
│   │   ├── url-searcher.js         # Google Search wrapper
│   │   ├── url-validator.js        # Deep URL validation (v21.0)
│   │   ├── query-builder.js        # v21.0 query strategies
│   │   └── cascade-manager.js      # Handle cascading updates
│   ├── models/
│   │   ├── Document.js             # Document model
│   │   ├── Citation.js             # Citation model
│   │   ├── Reference.js            # Reference model
│   │   └── AuditLog.js             # Audit log model
│   ├── middleware/
│   │   ├── auth.js                 # Dropbox OAuth verification
│   │   ├── error-handler.js        # Global error handling
│   │   └── logger.js               # Request logging
│   └── utils/
│       ├── parser.js               # Parse decisions.txt format
│       ├── formatter.js            # Format output files
│       └── validation.js           # Input validation schemas
│
├── public/
│   ├── index.html                  # Main iPad app
│   ├── css/
│   │   ├── main.css                # Core styles
│   │   ├── document-viewer.css     # Document viewer styles
│   │   ├── reference-editor.css    # Reference editor styles
│   │   └── modals.css              # Modal styles
│   ├── js/
│   │   ├── app.js                  # Main app controller
│   │   ├── document-viewer.js      # Document display & interaction
│   │   ├── reference-editor.js     # Reference editing logic
│   │   ├── cascade-handler.js      # Client-side cascade UI
│   │   ├── api-client.js           # API communication
│   │   └── state-manager.js        # Local state management
│   └── assets/
│       ├── icons/
│       └── images/
│
├── database/
│   ├── references.db               # SQLite database
│   └── schema.sql                  # Database schema
│
├── uploads/
│   └── documents/                  # Uploaded .docx files
│
├── processed/
│   └── enhanced_documents/         # Output .docx files
│
├── logs/
│   ├── server.log                  # Server logs
│   ├── processing.log              # Document processing logs
│   └── errors.log                  # Error logs
│
├── package.json                    # Node dependencies
├── .env                            # Environment variables (API keys)
└── README.md                       # Deployment instructions
```

---

## 🚀 DEPLOYMENT INSTRUCTIONS

### Prerequisites

1. **Linode VPS Provisioned:**
   - Nanode 1GB plan
   - Ubuntu 22.04 LTS installed
   - Root access configured
   - Domain: refs.fergi.com (DNS pointed to Linode IP)

2. **API Keys Ready:**
   - Anthropic Claude API key
   - Google Custom Search API key + CX ID
   - Dropbox App Key + App Secret

---

### Step 1: Server Setup

```bash
# SSH into Linode
ssh root@<linode_ip>

# Update system
apt update && apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install build tools
apt install -y build-essential sqlite3

# Install nginx (reverse proxy)
apt install -y nginx

# Install certbot (SSL)
apt install -y certbot python3-certbot-nginx

# Create app user
useradd -m -s /bin/bash refapp
```

---

### Step 2: Application Deployment

```bash
# Switch to app user
su - refapp

# Create application directory
mkdir -p /var/www/refs.fergi.com
cd /var/www/refs.fergi.com

# Initialize Node project
npm init -y

# Install dependencies
npm install express sqlite3 mammoth natural dotenv cors helmet compression
npm install @anthropic-ai/sdk axios dropbox

# Create directory structure
mkdir -p server/{routes,services,models,middleware,utils,config}
mkdir -p public/{css,js,assets}
mkdir -p database uploads processed logs

# Create .env file
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
DATABASE_PATH=/var/www/refs.fergi.com/database/references.db

# API Keys
ANTHROPIC_API_KEY=your_claude_api_key
GOOGLE_API_KEY=your_google_api_key
GOOGLE_CX=your_custom_search_engine_id
DROPBOX_APP_KEY=your_dropbox_app_key
DROPBOX_APP_SECRET=your_dropbox_app_secret

# Security
SESSION_SECRET=generate_random_string_here
EOF

# Set permissions
chmod 600 .env
```

---

### Step 3: Database Setup

```bash
# Create schema file
cat > database/schema.sql << 'EOF'
-- [Insert complete schema from DATABASE SCHEMA section above]
EOF

# Initialize database
sqlite3 database/references.db < database/schema.sql

# Verify
sqlite3 database/references.db "SELECT name FROM sqlite_master WHERE type='table';"
```

---

### Step 4: Create Server Code

**Create `server/app.js`:**

```javascript
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Logging
app.use(require('./middleware/logger'));

// Routes
app.use('/api/documents', require('./routes/documents'));
app.use('/api/references', require('./routes/references'));
app.use('/api/llm', require('./routes/llm'));
app.use('/api/search', require('./routes/search'));
app.use('/api/dropbox', require('./routes/dropbox'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(require('./middleware/error-handler'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
```

---

### Step 5: Implement Core Routes

**`server/routes/references.js`** (example):

```javascript
const express = require('express');
const router = express.Router();
const Reference = require('../models/Reference');
const CascadeManager = require('../services/cascade-manager');

// GET /api/references
router.get('/', async (req, res, next) => {
  try {
    const { document_id, status } = req.query;
    const references = await Reference.findAll({ document_id, status });
    res.json({ success: true, total: references.length, references });
  } catch (error) {
    next(error);
  }
});

// PUT /api/references/:id/context
router.put('/:id/context', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { context_text, context_source, auto_regenerate_relevance } = req.body;

    // Update context
    const updated = await Reference.updateContext(id, {
      context_text,
      context_source,
      context_overridden: true
    });

    // Handle cascade if requested
    let cascadeResult = null;
    if (auto_regenerate_relevance) {
      cascadeResult = await CascadeManager.handleContextChange(id, context_text);
    }

    res.json({
      success: true,
      reference_id: id,
      changes: {
        context: {
          old: updated.old_context,
          new: context_text,
          changed: true
        }
      },
      ...(cascadeResult && { pending_approval: cascadeResult.pending })
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

---

### Step 6: Implement Services

**`server/services/relevance-generator.js`:**

```javascript
const Anthropic = require('@anthropic-ai/sdk');
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function generateRelevance({ citation, context, claim, evidence_type }) {
  const prompt = `Generate a 200-word explanation of why this reference is relevant.

REFERENCE:
${citation}

CONTEXT FROM MANUSCRIPT:
${context}

CLAIM BEING SUPPORTED:
${claim || 'Not specified'}

EVIDENCE TYPE NEEDED:
${evidence_type || 'Not specified'}

Explain:
1. How this reference supports the specific claim
2. What evidence/argument it provides
3. Why it's appropriate for this context
4. How it connects to the document's broader argument

Be specific and precise. Focus on the connection between the reference and the claim.
Exactly 200 words.`;

  const message = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  return {
    relevance_text: message.content[0].text,
    tokens: {
      input: message.usage.input_tokens,
      output: message.usage.output_tokens
    },
    cost: (message.usage.input_tokens / 1000 * 0.003) +
          (message.usage.output_tokens / 1000 * 0.015)
  };
}

module.exports = { generateRelevance };
```

---

### Step 7: Frontend Implementation

**`public/index.html`** (skeleton):

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reference Refinement v30.0</title>
    <link rel="stylesheet" href="/css/main.css">
    <link rel="stylesheet" href="/css/document-viewer.css">
    <link rel="stylesheet" href="/css/reference-editor.css">
    <link rel="stylesheet" href="/css/modals.css">
</head>
<body>
    <div id="app">
        <header class="app-header">
            <h1>Reference Refinement v30.0</h1>
            <div class="header-actions">
                <button onclick="app.settings()">⚙ Settings</button>
                <button onclick="app.export()">💾 Export</button>
            </div>
        </header>

        <main class="app-main">
            <div id="documentViewer" class="document-viewer">
                <!-- Document content loaded here -->
            </div>

            <div id="referenceEditor" class="reference-editor">
                <!-- Reference editing interface loaded here -->
            </div>
        </main>

        <footer class="app-footer">
            <div class="reference-navigation">
                <!-- Navigation controls -->
            </div>
        </footer>
    </div>

    <!-- Modals -->
    <div id="modals"></div>

    <!-- Scripts -->
    <script src="/js/state-manager.js"></script>
    <script src="/js/api-client.js"></script>
    <script src="/js/document-viewer.js"></script>
    <script src="/js/reference-editor.js"></script>
    <script src="/js/cascade-handler.js"></script>
    <script src="/js/app.js"></script>
</body>
</html>
```

**`public/js/cascade-handler.js`:**

```javascript
class CascadeHandler {
  async onContextChange(referenceId, newContext) {
    // Show loading
    showLoading('Updating context...');

    // Update context
    const response = await api.updateContext(referenceId, {
      context_text: newContext,
      context_source: 'manual_override',
      auto_regenerate_relevance: false // Ask first
    });

    hideLoading();

    // Ask user about regeneration
    const shouldRegenerate = await showModal({
      type: 'confirm',
      title: 'Context Changed',
      message: 'Would you like to regenerate the relevance text to match the new context?',
      actions: ['Yes, Regenerate', 'No, Keep Current']
    });

    if (shouldRegenerate === 'Yes, Regenerate') {
      await this.regenerateRelevance(referenceId);
    }
  }

  async regenerateRelevance(referenceId) {
    showLoading('Generating relevance...');

    // Call API to generate new relevance
    const result = await api.generateRelevance(referenceId);

    hideLoading();

    // Show comparison modal
    const approved = await showRelevanceComparison({
      old: state.currentReference.relevance_text,
      new: result.relevance_text,
      editable: true
    });

    if (approved) {
      // Update in database
      await api.updateRelevance(referenceId, approved.finalText);

      // Update UI
      state.currentReference.relevance_text = approved.finalText;
      referenceEditor.render();

      // Ask about URL regeneration
      const regenerateURLs = await showModal({
        type: 'confirm',
        title: 'Relevance Updated',
        message: 'Search for URLs using the new relevance?',
        actions: ['Yes, Search', 'No, Keep URLs']
      });

      if (regenerateURLs === 'Yes, Search') {
        await this.searchURLs(referenceId);
      }
    }
  }
}

const cascadeHandler = new CascadeHandler();
```

---

### Step 8: Nginx Configuration

```bash
# Exit to root
exit

# Create nginx config
cat > /etc/nginx/sites-available/refs.fergi.com << 'EOF'
server {
    listen 80;
    server_name refs.fergi.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/refs.fergi.com /etc/nginx/sites-enabled/

# Test config
nginx -t

# Restart nginx
systemctl restart nginx

# Get SSL certificate
certbot --nginx -d refs.fergi.com
```

---

### Step 9: Process Manager (PM2)

```bash
# Install PM2
npm install -g pm2

# Start app
cd /var/www/refs.fergi.com
pm2 start server/app.js --name refs-app

# Configure auto-start
pm2 startup
pm2 save

# Monitor
pm2 monit
```

---

## ✅ TESTING CHECKLIST

### Backend Tests

- [ ] **Document Upload:**
  - Upload .docx file
  - Verify saved to `/var/www/refs.fergi.com/uploads/`
  - Check database record created

- [ ] **Document Processing:**
  - Process uploaded document
  - Verify citations extracted
  - Check context captured correctly
  - Verify empty brackets detected

- [ ] **Reference CRUD:**
  - Create reference
  - Read reference
  - Update context
  - Update relevance
  - Update URLs

- [ ] **Cascade Logic:**
  - Change context → verify relevance regeneration offered
  - Approve new relevance → verify URL search offered
  - Reject changes → verify old values preserved

- [ ] **Claude API:**
  - Generate relevance text
  - Verify 200 words
  - Check token usage
  - Verify cost calculation

- [ ] **Google Search:**
  - Search for URLs
  - Verify candidates returned
  - Check validation status

- [ ] **URL Validation:**
  - Test valid URL → status: valid
  - Test paywall URL → detected
  - Test soft 404 → detected
  - Test login wall → detected

---

### Frontend Tests

- [ ] **Document Viewer:**
  - Load document content
  - Display sections and paragraphs
  - Highlight citations
  - Click citation → load in editor
  - Select text → use as context

- [ ] **Reference Editor:**
  - Display context section
  - Display relevance section
  - Display URLs section
  - Edit context → triggers cascade
  - Edit relevance → offers URL search
  - Select URL candidates

- [ ] **Modals:**
  - Context change modal appears
  - Relevance comparison modal shows diff
  - URL candidates modal displays results
  - User can approve/reject changes

- [ ] **Navigation:**
  - Previous/Next reference buttons
  - Jump to reference by number
  - Filter references (empty, unfinalized, etc.)

- [ ] **Override Tracking:**
  - Override indicators appear
  - Undo buttons work
  - Original values restored

---

### Integration Tests

- [ ] **End-to-End Workflow:**
  1. Upload .docx document
  2. Process document
  3. View citations in document viewer
  4. Click empty bracket citation
  5. Auto-generate reference
  6. Edit context → approve regenerated relevance
  7. Search URLs → select primary/secondary
  8. Finalize reference
  9. Export enhanced decisions.txt

- [ ] **Cascade Workflow:**
  1. Load reference with context + relevance + URLs
  2. Change context
  3. Approve regenerated relevance
  4. Search new URLs
  5. Verify all changes tracked in audit_log

---

## 🎯 IMPLEMENTATION PRIORITY

### Phase 1: Core Backend (Hours 1-2)
1. Set up server structure
2. Create database schema
3. Implement Document model and routes
4. Implement Reference model and routes
5. Test with Postman/curl

### Phase 2: Document Processing (Hours 2-3)
1. Implement document-processor.js
2. Test .docx parsing
3. Implement citation extraction
4. Test context capture

### Phase 3: AI Integration (Hour 3)
1. Implement relevance-generator.js
2. Implement query-builder.js (v21.0 strategies)
3. Test Claude API integration

### Phase 4: Search & Validation (Hour 4)
1. Implement url-searcher.js
2. Implement url-validator.js (v21.0 validation)
3. Test Google Search integration

### Phase 5: Cascade Logic (Hour 4)
1. Implement cascade-manager.js
2. Add audit logging
3. Test cascade workflows

### Phase 6: Frontend Core (Hour 5)
1. Create HTML structure
2. Implement document viewer
3. Implement reference editor
4. Test basic UI

### Phase 7: Frontend Interactions (Hour 6)
1. Implement cascade modals
2. Implement URL selection
3. Add override tracking
4. Test complete workflows

### Phase 8: Deployment (Final Hour)
1. Deploy to Linode
2. Configure nginx
3. Set up SSL
4. Test production

---

## 📝 CRITICAL NOTES

### For Claude Code Web:

1. **Start with Backend:**
   - Database schema first
   - Models second
   - Routes third
   - Services last

2. **Test Each Component:**
   - Write API endpoint
   - Test with curl/Postman
   - Verify database updates
   - Move to next component

3. **Frontend After Backend Works:**
   - Don't build UI until APIs are tested
   - Use simple HTML first
   - Add complexity incrementally

4. **Focus on Cascade Logic:**
   - This is the core innovation
   - Test thoroughly with different scenarios
   - Make sure undo works

5. **Author Override Priority:**
   - User can override EVERYTHING
   - Always preserve original values
   - Always track changes in audit_log
   - Always offer (never force) auto-regeneration

6. **Document Processing:**
   - Use mammoth.js for .docx parsing
   - Capture complete paragraph context
   - Store location metadata accurately
   - Test with various document formats

---

## 🚨 CRITICAL SUCCESS FACTORS

1. **Hierarchical Model Must Work:**
   - Context → Relevance → URLs
   - Changes cascade correctly
   - User approves each step

2. **Author Has Complete Control:**
   - Can override at any level
   - Can undo any override
   - Can reject auto-regeneration
   - Can edit auto-generated content before accepting

3. **Transparency:**
   - User sees what changed
   - User sees why it changed
   - User sees what will happen next
   - User can audit all changes

4. **Performance:**
   - Document viewer loads quickly
   - API responses < 1 second (except AI generation)
   - UI feels responsive
   - No lag when switching references

5. **Data Integrity:**
   - No data loss
   - All changes logged
   - Undo always works
   - Database constraints enforced

---

## 🎉 EXPECTED OUTCOME

After this session, you should have:

✅ **Complete Backend API** running on Linode
✅ **SQLite Database** with full schema
✅ **Document Processing Pipeline** working
✅ **Enhanced iPad Interface** with document viewer
✅ **Hierarchical Cascade System** functional
✅ **Author Override Capabilities** at all levels
✅ **Auto-Regeneration Logic** with approval flow
✅ **URL Search & Validation** integrated
✅ **Deployment** complete with SSL
✅ **Testing** basic workflows verified

**The system should be ready for:**
- User to upload "The Myth of Male Menopause" .docx
- System to extract citations and context
- User to review and edit context
- System to generate relevance automatically
- User to approve or edit relevance
- System to search for URLs
- User to select URLs from candidates
- User to finalize references
- Export enhanced .docx + decisions.txt

---

## 📞 SUPPORT & QUESTIONS

If you encounter issues during implementation:

1. **Check the specification** - all details are here
2. **Test incrementally** - don't build everything at once
3. **Log everything** - use console.log and server logs
4. **Verify database** - check that data is being stored correctly
5. **Test APIs with curl** - before building UI

---

**END OF BUILD INSTRUCTIONS**

This specification is complete and ready for implementation. Build methodically, test thoroughly, and prioritize the hierarchical cascade system as the core innovation of v30.0.

Good luck! 🚀
