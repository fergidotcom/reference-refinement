-- Reference Refinement v30.0 Database Schema
-- Platform: SQLite 3.x
-- Created: November 13, 2025
-- Purpose: Document processing and training database

-- Table: documents
-- Purpose: Store uploaded .docx manuscripts
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

-- Table: citations
-- Purpose: Store each citation location in the document with its surrounding context
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
    FOREIGN KEY (reference_id) REFERENCES refs(id) ON DELETE SET NULL
);

CREATE INDEX idx_citations_document ON citations(document_id);
CREATE INDEX idx_citations_reference ON citations(reference_id);
CREATE INDEX idx_citations_empty ON citations(is_empty_bracket);

-- Table: references
-- Purpose: Store complete reference information with hierarchical data (context → relevance → URLs)
CREATE TABLE refs (
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

CREATE INDEX idx_references_status ON refs(status);
CREATE INDEX idx_references_context_overridden ON refs(context_overridden);
CREATE INDEX idx_references_relevance_overridden ON refs(relevance_overridden);
CREATE INDEX idx_references_finalized ON refs(finalized_date);

-- Table: audit_log
-- Purpose: Track all changes, especially cascading updates when context/relevance changes
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

    FOREIGN KEY (reference_id) REFERENCES refs(id) ON DELETE CASCADE
);

CREATE INDEX idx_audit_reference ON audit_log(reference_id);
CREATE INDEX idx_audit_type ON audit_log(change_type);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);

-- Table: url_candidates
-- Purpose: Store all URL candidates found during search (not just top 2-3)
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

    FOREIGN KEY (reference_id) REFERENCES refs(id) ON DELETE CASCADE
);

CREATE INDEX idx_url_candidates_reference ON url_candidates(reference_id);
CREATE INDEX idx_url_candidates_selected ON url_candidates(selected_as);
