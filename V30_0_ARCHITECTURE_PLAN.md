# Reference Refinement v30.0 - Architecture & Development Plan

**Development Branch:** `v30-linode-deployment`
**Target Platform:** Linode VPS (NEW) + Netlify (preserved for v18.0)
**Development Start:** November 13, 2025
**Status:** Planning Phase

---

## 🎯 Overview

v30.0 is a **major new release** that transforms Reference Refinement from a reference management tool into a comprehensive **academic document processing and training database system**.

**Key Objectives:**
1. Complete document processing pipeline (.docx → enhanced .docx + decisions.txt)
2. Context preservation throughout entire workflow
3. Empty bracket filling with AI-selected references
4. 200-word relevance generation using document context
5. Training database for commercial reference system
6. Deploy to Linode VPS (separate from current Netlify v18.0)

---

## 📊 Version Strategy

### Current Production (Preserved):
- **v18.0 on Netlify:** https://rrv521-1760738877.netlify.app
- **Purpose:** CaughtInTheAct reference finalization
- **Status:** Active, maintained until all refs finalized
- **File:** CaughtInTheActDecisions.txt (288 references)

### New Development (v30.0):
- **Platform:** Linode VPS
- **Purpose:** Full document workflow + training database
- **Branch:** `v30-linode-deployment`
- **No interference** with v18.0 production work

---

## 🏗️ System Architecture

### Platform: Linode Nanode 1GB VPS

**Specifications:**
- RAM: 1GB
- CPU: 1 vCPU
- Storage: 25GB SSD
- Transfer: 1TB/month
- Cost: $5/month

**Domain:** `refs.fergi.com` (via Paul's DNS routing)

**Why Linode Instead of Netlify:**
1. Full control over server environment
2. No serverless function timeouts (handle long document processing)
3. Persistent storage for training database
4. Can run background jobs (batch processing, ML training)
5. More cost-effective for compute-heavy workloads
6. No cold starts

### Technology Stack

**Backend:**
- Node.js / Express server
- TypeScript for type safety
- SQLite database for training data
- mammoth.js for .docx parsing
- natural.js for NLP processing

**Frontend:**
- Enhanced iPad app (v30.0)
- Progressive Web App (PWA) capabilities
- Context-aware editing interface
- Document viewer integration

**APIs:**
- Anthropic Claude API (query generation, relevance writing)
- Google Custom Search API (URL discovery)
- Dropbox API (OAuth for file storage)

---

## 📁 Directory Structure

```
/var/www/refs.fergi.com/
├── server/
│   ├── app.js                    # Express server
│   ├── routes/
│   │   ├── api/
│   │   │   ├── documents.js      # Document processing endpoints
│   │   │   ├── references.js     # Reference management
│   │   │   ├── llm.js            # Claude API integration
│   │   │   ├── search.js         # Google Search
│   │   │   └── dropbox.js        # Dropbox OAuth
│   │   └── health.js             # Health check
│   ├── services/
│   │   ├── document-processor.js # .docx analysis
│   │   ├── reference-generator.js# Bracket filling
│   │   ├── context-analyzer.js   # 5-level context analysis
│   │   ├── relevance-generator.js# 200-word relevance
│   │   └── url-validator.js      # Deep URL validation
│   ├── database/
│   │   ├── training.db           # SQLite training database
│   │   └── schema.sql            # Database schema
│   └── utils/
│       ├── parser.js             # decisions.txt parser
│       └── formatter.js          # Output formatting
│
├── public/
│   ├── index.html                # iPad app v30.0
│   ├── css/
│   ├── js/
│   └── assets/
│
├── batch/
│   ├── batch-processor-v30.js    # Enhanced batch processor
│   └── config/                   # Batch configs
│
├── docs/
│   ├── processed/                # Enhanced .docx outputs
│   └── training/                 # Training documents
│
└── logs/
    ├── server.log
    ├── processing.log
    └── errors.log
```

---

## 🔄 Document Processing Pipeline

### Input:
- `.docx` file (e.g., "The Myth of Male Menopause")
- Contains citations and bibliography
- May contain empty brackets `[ ]` where author needs help

### Stage 1: Document Analysis

**Tasks:**
1. Load .docx using mammoth
2. Extract document structure (sections, paragraphs, pages)
3. Parse all existing citations
4. Identify bibliography section
5. **Find all empty brackets `[ ]`**
6. **Capture paragraph context for each citation**

**Context Storage Format:**
```javascript
{
  citation_id: "123",
  citation_text: "[Smith, 2023]",
  paragraph_context: "Full paragraph containing citation...",
  location: {
    section: "3.2 Productivity Metrics",
    paragraph_num: 15,
    page: 47
  },
  surrounding_context: {
    before: "Previous sentence for context.",
    after: "Following sentence for context."
  },
  claim_being_supported: "Remote work increased productivity by 23%",
  evidence_type_needed: "empirical_study"
}
```

### Stage 2: Empty Bracket Processing

**For each `[ ]` found:**

1. **Deep Context Analysis (5 Levels):**
   - **Level 1:** Immediate context (paragraph)
   - **Level 2:** Section context (methodology, results, discussion)
   - **Level 3:** Argumentative context (what claim needs support)
   - **Level 4:** Domain context (academic field standards)
   - **Level 5:** Quality requirements (peer-reviewed, empirical, theoretical)

2. **Generate Search Query:**
   - Use context analysis to build targeted query
   - Apply v21.0 query strategies
   - Consider domain-specific search terms

3. **Find Candidate References:**
   - Search Google Scholar, PubMed, JSTOR, etc.
   - Apply deep URL validation
   - Rank by relevance to context

4. **Auto-Select Best Reference:**
   - Match to claim type (empirical, theoretical, review)
   - Verify authority level
   - Check publication quality
   - Validate URLs

5. **Generate 200-Word Relevance:**
   - Explain how reference supports specific claim
   - Connect to paragraph context
   - Note methodological match
   - Cite evidence type provided

### Stage 3: Enhanced decisions.txt Generation

**Format with Context Preservation:**
```
[123] Smith, A. (2023). Remote work productivity analysis. Journal of Work Studies, 45(2), 112-134.
[FINALIZED]
Relevance: [200-word AI-generated explanation based on document context...]
Context: "This study examined remote work productivity across 500 companies during 2020-2022. The results showed a significant increase in output metrics [Smith, 2023]. These findings align with broader trends in workplace flexibility."
Location: Section 3.2 - Productivity Metrics, Paragraph 15
Primary URL: https://doi.org/10.1234/jws.2023.45.2.112
Secondary URL: https://example.com/smith2023-fulltext.pdf
Q: remote work productivity empirical study 2020-2022
FLAGS[BATCH_v30.0][CONTEXT_PRESERVED][AUTO_SELECTED]
```

### Stage 4: Enhanced .docx Output

**Tasks:**
1. Fill all `[ ]` with selected citations
2. Update bibliography section
3. Add footnotes/endnotes if needed
4. Preserve all formatting
5. Save as `[OriginalName]_enhanced.docx`

---

## 🎨 iPad App v30.0 Enhancements

### Document Context Navigation

**New Features:**
1. **Document Viewer Integration:**
   - Display .docx content alongside reference editing
   - Highlight paragraph containing citation
   - Show surrounding context

2. **Context-Aware Editing:**
   - "Go to Document" button jumps to citation location
   - Expandable context view shows full paragraph
   - Section breadcrumb shows document structure

3. **Relevance Generation:**
   - AI generates 200 words based on paragraph context
   - Shows connection to specific claim
   - Editable by user

4. **Visual Context Indicators:**
   - Color-coded by section type (intro, methods, results, discussion)
   - Icon shows evidence type (📊 empirical, 📖 theoretical, 📝 review)
   - Badge shows quality level (peer-reviewed, grey literature, etc.)

### UI Mockup:

```
┌─────────────────────────────────────────────────────────┐
│ Reference Refinement v30.0                    [Settings]│
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ┌─────────────────────┐  ┌──────────────────────────┐  │
│ │ Document View       │  │ Reference Editor         │  │
│ │                     │  │                          │  │
│ │ Section 3.2:        │  │ [123] Smith (2023)      │  │
│ │ Productivity        │  │                          │  │
│ │                     │  │ 📊 Empirical Study      │  │
│ │ "This study         │  │ ✓ Peer-reviewed         │  │
│ │  examined remote    │  │                          │  │
│ │  work productivity  │  │ Context:                 │  │
│ │  across 500         │  │ [Expandable paragraph]   │  │
│ │  companies..."      │  │                          │  │
│ │                     │  │ Relevance (200 words):   │  │
│ │ ► [Smith, 2023] ◄   │  │ [AI-generated...]        │  │
│ │                     │  │                          │  │
│ └─────────────────────┘  │ [Go to Document] [Edit]  │  │
│                          └──────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Training Database Schema

### Purpose:
Learn from each processed document to improve reference selection and relevance generation.

### Tables:

```sql
-- Documents processed
CREATE TABLE documents (
    id INTEGER PRIMARY KEY,
    filename TEXT NOT NULL,
    title TEXT,
    author TEXT,
    processed_date TIMESTAMP,
    total_citations INTEGER,
    empty_brackets_filled INTEGER,
    context_preservation_quality REAL,
    avg_relevance_quality REAL,
    notes TEXT
);

-- Citations extracted
CREATE TABLE citations (
    id INTEGER PRIMARY KEY,
    document_id INTEGER,
    citation_text TEXT,
    paragraph_context TEXT,
    location_section TEXT,
    location_paragraph INTEGER,
    claim_supported TEXT,
    evidence_type TEXT,
    selected_reference_id INTEGER,
    auto_selected BOOLEAN,
    user_override BOOLEAN,
    quality_score REAL,
    FOREIGN KEY (document_id) REFERENCES documents(id)
);

-- References selected
CREATE TABLE references (
    id INTEGER PRIMARY KEY,
    citation TEXT,
    primary_url TEXT,
    secondary_url TEXT,
    relevance_text TEXT,
    context TEXT,
    selection_strategy TEXT,
    validation_status TEXT,
    quality_indicators TEXT,
    used_count INTEGER DEFAULT 1
);

-- Context patterns (ML training data)
CREATE TABLE context_patterns (
    id INTEGER PRIMARY KEY,
    claim_type TEXT,
    evidence_type TEXT,
    successful_query TEXT,
    successful_reference_id INTEGER,
    context_features TEXT,  -- JSON
    domain TEXT,
    quality_score REAL,
    FOREIGN KEY (successful_reference_id) REFERENCES references(id)
);

-- Relevance quality feedback
CREATE TABLE relevance_feedback (
    id INTEGER PRIMARY KEY,
    reference_id INTEGER,
    generated_relevance TEXT,
    user_rating INTEGER,  -- 1-5 stars
    user_edits TEXT,
    improvement_notes TEXT,
    timestamp TIMESTAMP,
    FOREIGN KEY (reference_id) REFERENCES references(id)
);
```

---

## 🔌 API Endpoints

### Document Processing:

```
POST /api/documents/upload
Body: { file: .docx, options: {...} }
Returns: { document_id, status, analysis }

POST /api/documents/process
Body: { document_id, mode: 'fill_blanks' }
Returns: { processing_job_id }

GET /api/documents/status/:job_id
Returns: { status, progress, results }

GET /api/documents/download/:job_id
Returns: Enhanced .docx + decisions.txt
```

### Reference Management:

```
GET /api/references
Returns: List of all references

POST /api/references/:id/context
Body: { paragraph, location, claim }
Returns: { suggested_references, query_used }

POST /api/references/:id/relevance
Body: { context, reference }
Returns: { relevance_text (200 words) }
```

### Training Database:

```
GET /api/training/stats
Returns: { total_documents, total_citations, patterns_learned }

POST /api/training/feedback
Body: { reference_id, rating, notes }
Returns: { success }
```

---

## 🚀 Development Phases

### Phase 1: Infrastructure Setup (Week 1)
- [ ] Provision Linode VPS
- [ ] Set up Node.js/Express server
- [ ] Configure domain: refs.fergi.com
- [ ] Set up SSL/TLS certificates
- [ ] Deploy basic health check endpoint
- [ ] Set up logging and monitoring

### Phase 2: Document Processing Pipeline (Week 2-3)
- [ ] Implement document-processor.js
- [ ] Build .docx parser with mammoth
- [ ] Create citation extractor
- [ ] Implement empty bracket detector
- [ ] Build context capture system
- [ ] Test with "The Myth of Male Menopause"

### Phase 3: Reference Generation (Week 3-4)
- [ ] Implement context-analyzer.js (5 levels)
- [ ] Build reference-generator.js
- [ ] Create query builder using v21.0 strategies
- [ ] Implement candidate ranking
- [ ] Build auto-selection logic
- [ ] Test with sample empty brackets

### Phase 4: Relevance Generation (Week 4-5)
- [ ] Implement relevance-generator.js
- [ ] Create context-aware prompts
- [ ] Test 200-word generation quality
- [ ] Add user editing capabilities
- [ ] Implement quality scoring

### Phase 5: Enhanced decisions.txt (Week 5)
- [ ] Update parser for new format
- [ ] Add context preservation fields
- [ ] Implement backward compatibility
- [ ] Test round-trip (read → modify → write)

### Phase 6: Enhanced .docx Output (Week 6)
- [ ] Implement bracket filling
- [ ] Build bibliography updater
- [ ] Preserve formatting
- [ ] Test with multiple document types

### Phase 7: Training Database (Week 6-7)
- [ ] Create SQLite schema
- [ ] Implement data collectors
- [ ] Build pattern recognition
- [ ] Create feedback system
- [ ] Test learning from 1st document

### Phase 8: iPad App v30.0 (Week 7-8)
- [ ] Implement document viewer
- [ ] Build context navigation
- [ ] Add relevance editing UI
- [ ] Create visual context indicators
- [ ] Test on iPad

### Phase 9: Testing & Optimization (Week 9)
- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] User acceptance testing

### Phase 10: Production Deployment (Week 10)
- [ ] Deploy to Linode production
- [ ] Configure monitoring
- [ ] Set up backups
- [ ] Document deployment process
- [ ] Create user documentation

---

## 🧪 Testing Strategy

### Document Processing Tests:
- Various .docx formats (Word versions, styles)
- Documents with 0, 1, 5, 20+ empty brackets
- Mixed citation styles (APA, MLA, Chicago)
- Large documents (100+ pages)
- Complex formatting (tables, footnotes, images)

### Reference Selection Tests:
- Different claim types (empirical, theoretical, methodological)
- Various academic domains (psychology, sociology, economics)
- Edge cases (no good candidates, ambiguous claims)
- Quality validation (peer-reviewed vs grey literature)

### Context Preservation Tests:
- Verify paragraph context captured correctly
- Test location metadata accuracy
- Validate surrounding context extraction
- Test multi-level context analysis

### Training Database Tests:
- Pattern recognition accuracy
- Learning from feedback
- Query improvement over time
- Reference quality improvement

---

## 📊 Success Metrics

### Phase 1 (Document Processing):
- Successfully parse 95%+ of .docx files
- Extract 100% of citations correctly
- Find 100% of empty brackets
- Capture context for 100% of citations

### Phase 2 (Reference Selection):
- Auto-select appropriate reference 80%+ of time
- Generate valid URLs 95%+ of time
- Match evidence type to claim type 90%+ of time

### Phase 3 (Relevance Generation):
- Generate coherent 200-word relevance 95%+ of time
- Connect to specific claim 90%+ of time
- Require < 20% editing by user

### Phase 4 (Training Database):
- Improve query quality by 10% after 10 documents
- Improve reference selection by 15% after 20 documents
- Build pattern library with 100+ successful examples

---

## 💰 Cost Estimate

### Infrastructure:
- Linode VPS: $5/month
- Domain (already owned): $0
- SSL (Let's Encrypt): $0
- **Total:** $5/month

### Development APIs:
- Claude API: ~$20-40 per document processed
- Google Search: ~$5 per 1000 searches
- Dropbox: Free tier sufficient

### Expected Volume (Year 1):
- Process 50 documents
- 2500 empty brackets filled
- 50,000 API calls
- **Estimated Cost:** $1,500-2,000/year

---

## 🔐 Security Considerations

### Authentication:
- OAuth 2.0 with Dropbox
- Session management with JWT tokens
- Rate limiting on API endpoints

### Data Protection:
- HTTPS only (SSL/TLS)
- Encrypted database storage
- Secure API key management
- Regular security updates

### Privacy:
- No personal data stored
- Document processing on-demand only
- User controls all data
- GDPR compliant

---

## 📈 Future Enhancements (v31.0+)

### Short-term:
- Multi-document batch processing
- Collaborative editing
- Version history
- Export to multiple formats

### Medium-term:
- Machine learning for better reference selection
- Custom domain knowledge bases
- Integration with citation managers (Zotero, Mendeley)
- API for third-party integrations

### Long-term:
- Commercial offering for researchers
- Academic institution licensing
- Real-time collaboration
- AI writing assistant

---

## 🎓 Learning Objectives

### Technical Skills:
- Full-stack web development
- Document processing at scale
- Machine learning integration
- VPS deployment and management

### Domain Knowledge:
- Academic citation practices
- Reference quality assessment
- Context-aware AI prompting
- Training database design

---

## 📝 Documentation Deliverables

### User Documentation:
- Getting Started Guide
- Document Processing Workflow
- Reference Quality Guidelines
- Training Database Overview

### Technical Documentation:
- API Reference
- Database Schema
- Deployment Guide
- Troubleshooting Guide

### Development Documentation:
- Architecture Decision Records
- Code Style Guide
- Testing Protocols
- Release Process

---

## 🔄 Migration Path

### From v18.0 to v30.0:

**User Workflow:**
1. Finish finalizing CaughtInTheActDecisions.txt on v18.0 (Netlify)
2. Export final decisions.txt
3. Import to v30.0 (Linode) for document enhancement
4. Continue with new document processing workflow

**Technical Migration:**
1. v18.0 remains on Netlify (no changes)
2. v30.0 deploys to Linode (separate instance)
3. Users can access both simultaneously
4. No data loss or service interruption

---

## ✅ Prerequisites for Development

### Required:
- [x] v18.0 deployed to production (Netlify)
- [x] v21.0 batch processor tested and validated
- [x] Linode account and VPS specs confirmed
- [x] Domain routing plan with Paul
- [ ] Sample .docx documents for testing
- [ ] API budget approved

### Nice to Have:
- [ ] Academic domain expert consultation
- [ ] User testing group (3-5 researchers)
- [ ] Automated testing framework
- [ ] CI/CD pipeline

---

## 🎯 Immediate Next Steps

1. **Obtain Sample Documents:**
   - "The Myth of Male Menopause" .docx
   - 2-3 additional test documents
   - Various sizes and complexities

2. **Set Up Development Environment:**
   - Provision Linode VPS
   - Configure SSH access
   - Install Node.js, npm, git
   - Set up project structure

3. **Begin Phase 1 Implementation:**
   - Create Express server boilerplate
   - Set up SQLite database
   - Implement basic document upload endpoint
   - Test .docx parsing with mammoth

---

**Development Branch:** `v30-linode-deployment`
**Target Release:** Q1 2026
**Priority:** High (foundation for commercial system)

**Next Session:** Begin Phase 1 infrastructure setup and document processing implementation.

---

**END ARCHITECTURE PLAN**

This comprehensive plan outlines the complete transformation from reference management to full document processing with training database capabilities, deployed on dedicated Linode VPS infrastructure.
