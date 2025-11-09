# TECHNICAL SPECIFICATION - PRODUCTIZED REFERENCE REFINEMENT SYSTEM
## Architecture, Timeline, and Implementation Plan

**Version**: 1.0
**Date**: November 9, 2025
**Author**: Claude Code Web
**Status**: Ready for Approval

---

## EXECUTIVE SUMMARY

This document provides concrete technical decisions, architecture, timeline, and resource estimates for building the productized Reference Refinement System v2.0.

**Key Decisions**:
- **Stack**: Next.js 14 + TypeScript + PostgreSQL + Tailwind CSS
- **Timeline**: 20 weeks (5 months) to production-ready V1
- **Cost**: ~$500-800 initial development (API costs)
- **Risk Level**: Medium (mitigatable with proven patterns)

---

## 1. TECHNOLOGY STACK DECISIONS

### 1.1 Frontend Framework: **Next.js 14 + React 18**

**Rationale**:
- ✅ **Ferguson Archive Compatibility**: Can share Tailwind config, components, design system
- ✅ **Mobile-First**: Excellent responsive design support
- ✅ **Server Components**: Reduce client bundle, faster mobile performance
- ✅ **API Routes**: Backend endpoints without separate server
- ✅ **File Upload**: Built-in API route handling for DOCX uploads
- ✅ **SSR/SSG**: Performance optimization for publication generation

**Alternative Considered**: Plain React SPA - Rejected (lacks integrated backend, slower mobile perf)

### 1.2 Language: **TypeScript**

**Rationale**:
- ✅ Type safety for complex data models (Citation, Reference, URLCandidate)
- ✅ Better IDE support for large codebase
- ✅ Catches bugs at compile time (critical for RID uniqueness)
- ✅ Self-documenting code with interfaces

### 1.3 Styling: **Tailwind CSS**

**Rationale**:
- ✅ **MANDATORY**: Ferguson Family Archive uses Tailwind
- ✅ Mobile-first utility classes
- ✅ Consistent design tokens
- ✅ Fast prototyping and iteration
- ✅ Can import Archive project's `tailwind.config.js` directly

### 1.4 Database: **PostgreSQL**

**Rationale**:
- ✅ **Relational Structure**: Citations ↔ References mapping fits relational model
- ✅ **JSONB Support**: Store context, bibliographic data flexibly
- ✅ **Full-Text Search**: Built-in search for manuscript content
- ✅ **Transactions**: Ensure RID uniqueness with constraints
- ✅ **Mature Ecosystem**: Prisma ORM for type-safe queries

**Alternative Considered**: MongoDB - Rejected (relational mapping better suited for citations-references)

### 1.5 ORM: **Prisma**

**Rationale**:
- ✅ Type-safe database queries (integrates with TypeScript)
- ✅ Automatic migrations
- ✅ Schema visualization
- ✅ Excellent PostgreSQL support

### 1.6 AI Integration: **Anthropic Claude API**

**Models**:
- **Document Analysis**: Claude 3.5 Sonnet (balanced speed/quality)
- **Context Refinement**: Claude 3.5 Sonnet
- **Relevance Generation**: Claude 3.5 Sonnet
- **Query Generation**: Claude 3.5 Haiku (faster, cheaper for structured output)

**Rationale**:
- ✅ Large context window (200k tokens) handles full manuscripts
- ✅ Excellent at document understanding
- ✅ JSON mode for structured outputs
- ✅ Proven in current Reference Refinement system

### 1.7 Search API: **Google Custom Search API**

**Rationale**:
- ✅ Proven effective in baseline system (93.4% Secondary coverage)
- ✅ Cost-effective ($5 per 1000 queries = ~$0.03 per reference)
- ✅ Reliable results for academic sources

### 1.8 Document Processing

**Libraries**:
- **DOCX**: `mammoth` (Node.js) - Converts to clean HTML, preserves structure
- **PDF**: `pdf-parse` - Extract text and structure
- **TXT/MD**: Native Node.js `fs`

**Rationale**:
- ✅ `mammoth` better than `docx` for content preservation
- ✅ Handles complex DOCX formatting (497MB file requirement)
- ✅ Filters artifacts (headers, footers, TOC) while preserving content

### 1.9 QR Code Generation: **qrcode** (Node.js)

**Rationale**:
- ✅ 300 DPI output support
- ✅ SVG and PNG formats
- ✅ Tested, reliable library

### 1.10 Publication Formats

**HTML**: Handlebars templates + custom CSS
**EPUB**: `epub-gen-memory` + EPUBCheck validation
**Print PDF**: Puppeteer (HTML → PDF with high DPI)

---

## 2. ARCHITECTURE DESIGN

### 2.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     MOBILE-FIRST UI                         │
│                  (Next.js + Tailwind CSS)                   │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Citation  │  │Reference │  │Progress  │  │Publication│  │
│  │List View │  │Detail    │  │Dashboard │  │Generator  │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                             │
│         ┌─────────────────────────────────┐               │
│         │   Claude Chat Integration       │               │
│         │   (Slide-in Panel)              │               │
│         └─────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   NEXT.JS API ROUTES                        │
│                                                             │
│  /api/upload          - File upload & storage              │
│  /api/analyze         - Document analysis (AI)             │
│  /api/citations       - CRUD operations                    │
│  /api/references      - CRUD operations                    │
│  /api/context/refine  - Claude context assistance          │
│  /api/urls/discover   - URL search & analysis              │
│  /api/relevance       - Generate relevance text            │
│  /api/publish         - Generate publications              │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    CORE COMPONENTS                          │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 1. Document Analyzer (AI-Powered)                  │   │
│  │    - Citation detection (10+ formats)              │   │
│  │    - Reference parsing                             │   │
│  │    - RID assignment (empty [] only)                │   │
│  │    - Context capture                               │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 2. Format Controller                               │   │
│  │    - Bibliographic validation                      │   │
│  │    - URL extraction (1st=Primary, 2nd=Secondary)   │   │
│  │    - Issue detection                               │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 3. Claude Integration Layer                        │   │
│  │    - Context refinement                            │   │
│  │    - Source suggestions                            │   │
│  │    - Relevance generation                          │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 4. Refinement Engine                               │   │
│  │    - Query generation (proven patterns)            │   │
│  │    - URL discovery & analysis                      │   │
│  │    - Soft 404 detection                            │   │
│  │    - Title matching (≥0.55 Primary, ≥0.45 Secondary)│  │
│  │    - Paywall detection                             │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 5. Reintegration System                            │   │
│  │    - [RID] → formatted citations                   │   │
│  │    - Content preservation (zero loss)              │   │
│  │    - Artifact filtering                            │   │
│  └────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 6. Publication Generator                           │   │
│  │    - HTML (clickable links)                        │   │
│  │    - EPUB (EPUB 3.0)                               │   │
│  │    - Print PDF (QR codes only)                     │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  POSTGRESQL DATABASE                        │
│                     (via Prisma ORM)                        │
│                                                             │
│  Tables: manuscripts, citations, references,               │
│          reference_instances, url_candidates,              │
│          publications                                       │
└─────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                         │
│                                                             │
│  - Anthropic Claude API (document analysis)                │
│  - Google Custom Search API (URL discovery)                │
│  - File Storage (uploaded manuscripts, generated pubs)     │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Database Schema (Prisma)

```prisma
// schema.prisma

model Manuscript {
  id            String   @id @default(cuid())
  title         String
  authorName    String
  uploadedAt    DateTime @default(now())
  filePath      String
  fileType      String   // 'docx' | 'pdf' | 'txt'
  status        String   // 'uploaded' | 'analyzing' | 'refining' | 'complete'

  // RID Scheme
  ridSchemeType String   // 'sequential' | 'chapter_based' | 'custom'
  ridSchemePattern String?
  ridNextAvailable Int    @default(1)

  // Relationships
  citations     Citation[]
  references    Reference[]
  publications  Publication[]

  @@index([status])
}

model Citation {
  id                  String   @id @default(cuid())
  manuscriptId        String
  manuscript          Manuscript @relation(fields: [manuscriptId], references: [id])

  rid                 Int
  originalFormat      String   // e.g., "(Smith, 2020)" or "¹"

  // Location
  chapter             String?
  section             String?
  paragraphNum        Int
  charPosition        Int

  // Context
  contextBefore       String
  contextAfter        String
  capturedContext     String
  contextApproved     Boolean  @default(false)

  // Validation
  hasMatchingRef      Boolean  @default(false)
  validationStatus    String   // 'valid' | 'orphaned' | 'missing_reference'

  // Relationship
  referenceId         String?
  reference           Reference? @relation(fields: [referenceId], references: [id])

  @@unique([manuscriptId, rid])
  @@index([manuscriptId, validationStatus])
}

model Reference {
  id                  String   @id @default(cuid())
  manuscriptId        String
  manuscript          Manuscript @relation(fields: [manuscriptId], references: [id])

  rid                 Int

  // Bibliographic Info (JSONB for flexibility)
  bibliographic       Json     // { title, authors, publication, year, doi, isbn, etc. }

  // Original URLs from manuscript
  originalPrimaryUrl  String?
  originalSecondaryUrl String?
  originalOtherUrls   Json?    // Array of additional URLs

  status              String   // 'incomplete' | 'ready' | 'refining' | 'finalized'
  formatIssues        Json?    // Array of detected issues

  // Relationships
  citations           Citation[]
  instances           ReferenceInstance[]

  @@unique([manuscriptId, rid])
  @@index([manuscriptId, status])
}

model ReferenceInstance {
  id                  String   @id @default(cuid())
  referenceId         String
  reference           Reference @relation(fields: [referenceId], references: [id])

  citationId          String

  // Context-specific data
  context             String
  contextModified     Boolean  @default(false)
  relevanceText       String?
  searchQueries       Json?    // Array of query strings

  // URLs
  primaryUrl          String?
  secondaryUrls       Json?    // Array of secondary URLs

  status              String   // 'draft' | 'refined' | 'finalized'
  lastModified        DateTime @default(now()) @updatedAt

  // Relationships
  urlCandidates       URLCandidate[]

  @@index([referenceId, status])
}

model URLCandidate {
  id                  String   @id @default(cuid())
  instanceId          String
  instance            ReferenceInstance @relation(fields: [instanceId], references: [id])

  url                 String

  // Analysis (JSONB for flexibility)
  analysis            Json     // { titleMatch, soft404, paywall, scores, etc. }

  recommendation      String   // 'primary' | 'secondary' | 'reject'

  @@index([instanceId, recommendation])
}

model Publication {
  id                  String   @id @default(cuid())
  manuscriptId        String
  manuscript          Manuscript @relation(fields: [manuscriptId], references: [id])

  format              String   // 'html' | 'epub' | 'print'
  filePath            String
  generatedAt         DateTime @default(now())
  fileSize            Int

  @@index([manuscriptId, format])
}
```

### 2.3 Directory Structure

```
reference-refinement-v2/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── layout.tsx          # Root layout (Ferguson Archive theme)
│   │   ├── page.tsx            # Homepage / manuscript upload
│   │   ├── manuscripts/
│   │   │   └── [id]/
│   │   │       ├── page.tsx           # Manuscript overview
│   │   │       ├── citations/page.tsx # Citation list
│   │   │       ├── refinement/page.tsx# Refinement interface
│   │   │       └── publish/page.tsx   # Publication generator
│   │   └── api/                # API Routes
│   │       ├── upload/route.ts
│   │       ├── analyze/route.ts
│   │       ├── citations/route.ts
│   │       ├── references/route.ts
│   │       ├── context/
│   │       │   └── refine/route.ts
│   │       ├── urls/
│   │       │   └── discover/route.ts
│   │       ├── relevance/route.ts
│   │       └── publish/route.ts
│   │
│   ├── components/             # React Components
│   │   ├── ui/                 # Ferguson Archive UI components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ...
│   │   ├── citations/
│   │   │   ├── CitationList.tsx
│   │   │   ├── CitationCard.tsx
│   │   │   └── CitationDetail.tsx
│   │   ├── references/
│   │   │   ├── ReferenceEditor.tsx
│   │   │   ├── BibliographicForm.tsx
│   │   │   └── URLCandidateList.tsx
│   │   ├── claude/
│   │   │   └── ClaudeChatPanel.tsx
│   │   └── publish/
│   │       └── PublicationGenerator.tsx
│   │
│   ├── lib/                    # Core Components (Business Logic)
│   │   ├── analyzer/           # Component 1: Document Analyzer
│   │   │   ├── citation-detector.ts
│   │   │   ├── reference-parser.ts
│   │   │   ├── rid-assigner.ts
│   │   │   ├── context-capturer.ts
│   │   │   └── structure-analyzer.ts
│   │   │
│   │   ├── format-controller/  # Component 2: Format Controller
│   │   │   ├── biblio-parser.ts
│   │   │   ├── url-extractor.ts
│   │   │   └── validator.ts
│   │   │
│   │   ├── claude/             # Component 3: Claude Integration
│   │   │   ├── client.ts
│   │   │   ├── context-refiner.ts
│   │   │   ├── source-suggester.ts
│   │   │   └── relevance-generator.ts
│   │   │
│   │   ├── refinement/         # Component 4: Refinement Engine
│   │   │   ├── query-generator.ts
│   │   │   ├── url-discoverer.ts
│   │   │   ├── soft-404-detector.ts
│   │   │   ├── title-matcher.ts
│   │   │   ├── paywall-detector.ts
│   │   │   └── url-analyzer.ts
│   │   │
│   │   ├── reintegration/      # Component 5: Reintegration
│   │   │   ├── citation-replacer.ts
│   │   │   ├── content-preserver.ts
│   │   │   └── artifact-filter.ts
│   │   │
│   │   ├── publication/        # Component 6: Publication Generator
│   │   │   ├── html-generator.ts
│   │   │   ├── epub-generator.ts
│   │   │   ├── print-generator.ts
│   │   │   └── qr-generator.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── string-similarity.ts
│   │   │   ├── rate-limiter.ts
│   │   │   └── logger.ts
│   │   │
│   │   └── db.ts               # Prisma client instance
│   │
│   └── config/
│       ├── ranking-criteria.yaml  # URL ranking weights (from lessons learned)
│       └── domain-whitelist.yaml  # Trusted academic domains
│
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Auto-generated migrations
│
├── public/
│   └── uploads/                # Uploaded manuscripts
│
├── tests/
│   ├── unit/                   # Component unit tests
│   ├── integration/            # API integration tests
│   └── e2e/                    # End-to-end tests
│
├── tailwind.config.js          # Ferguson Archive Tailwind config
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md
```

---

## 3. PROVEN PATTERNS FROM LESSONS LEARNED

### 3.1 URL Ranking Configuration (ranking-criteria.yaml)

```yaml
# Validated thresholds from 288-reference baseline

thresholds:
  primary:
    title_similarity_min: 0.55
    overall_score_min: 75
  secondary:
    title_similarity_min: 0.45
    overall_score_min: 60

scoring_weights:
  title_similarity: 0.35      # Most important
  domain_authority: 0.25
  content_type: 0.20
  accessibility: 0.10
  link_permanence: 0.10

domain_authority:
  publisher_official: 100
  university_press: 95
  academic_repository: 90
  jstor_muse: 85
  researchgate_academia: 80
  author_personal: 70
  unknown: 30

link_permanence:
  doi: 100
  institutional_repo: 90
  publisher_official: 85
  archive_org: 70
  personal_temporary: 30

accessibility:
  open_access: 100
  institutional: 75
  preview_available: 50
  hard_paywall: 25

auto_reject_patterns:
  - amazon.com           # Consumer sites
  - goodreads.com
  - barnesandnoble.com
  - /toc                 # Table of contents pages
  - /contents
  - /people/*/publications  # Author bibliographies
```

### 3.2 Search Query Patterns (Proven Effective)

```typescript
// lib/refinement/query-generator.ts

export function generateSearchQueries(
  bibliographic: BibliographicInfo,
  context: string
): string[] {
  const queries: string[] = [];

  // Pattern 1: Title-only quoted (MOST EFFECTIVE)
  queries.push(`"${bibliographic.title}"`);

  // Pattern 2: DOI search (if available)
  if (bibliographic.doi) {
    queries.push(`DOI ${bibliographic.doi}`);
  }

  // Pattern 3: Title + author + year
  queries.push(
    `"${bibliographic.title}" ${bibliographic.authors[0]} ${bibliographic.year}`
  );

  // Pattern 4: ISBN search for books
  if (bibliographic.isbn) {
    queries.push(`ISBN ${bibliographic.isbn}`);
  }

  // Pattern 5: Domain-filtered search (publisher)
  if (bibliographic.publisher) {
    const domain = inferPublisherDomain(bibliographic.publisher);
    queries.push(`"${bibliographic.title}" site:${domain}`);
  }

  // Pattern 6: Context-driven keywords (for Secondary URLs)
  const contextKeywords = extractKeywords(context);
  queries.push(
    `${contextKeywords.join(' ')} "${bibliographic.title}"`
  );

  return queries.slice(0, 6); // Limit to top 6 (proven sweet spot)
}
```

### 3.3 Soft 404 Detection (3-Level Strategy)

```typescript
// lib/refinement/soft-404-detector.ts

export async function detectSoft404(url: string): Promise<{
  isSoft404: boolean;
  reason?: string;
}> {
  // Level 1: HTTP Status Check
  const response = await fetch(url, { method: 'HEAD' });
  if (response.status >= 400) {
    return { isSoft404: true, reason: `HTTP ${response.status}` };
  }

  // Level 2: Content-Type Mismatch (60-70% detection)
  const contentType = response.headers.get('content-type') || '';
  if (url.endsWith('.pdf') && !contentType.includes('pdf')) {
    if (contentType.includes('html')) {
      return {
        isSoft404: true,
        reason: 'PDF URL returns HTML (likely error page)'
      };
    }
  }

  // Level 3: HTML Content Analysis (for remaining cases)
  if (contentType.includes('html')) {
    const html = await fetch(url).then(r => r.text());
    const errorPatterns = [
      /404|not found|page not found/i,
      /error|oops|something went wrong/i,
      /no longer available|removed/i
    ];

    for (const pattern of errorPatterns) {
      if (pattern.test(html)) {
        return {
          isSoft404: true,
          reason: 'HTML content indicates error page'
        };
      }
    }
  }

  return { isSoft404: false };
}
```

### 3.4 Rate Limiting (Proven Pattern)

```typescript
// lib/utils/rate-limiter.ts

export class RateLimiter {
  private lastRequestTime = 0;
  private readonly minDelay = 100; // 100ms between requests (from lessons)

  async throttle<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.minDelay) {
      await new Promise(resolve =>
        setTimeout(resolve, this.minDelay - elapsed)
      );
    }

    this.lastRequestTime = Date.now();
    return fn();
  }
}
```

---

## 4. TIMELINE ESTIMATE

### 4.1 Detailed 20-Week Breakdown

| Phase | Weeks | Deliverables | Risk |
|-------|-------|--------------|------|
| **Phase 1: Foundation** | 1-2 | Project setup, DB schema, basic API, file upload | Low |
| **Phase 2: Document Analyzer** | 3-4 | Citation detection, RID assignment, context capture | Medium |
| **Phase 3: Format Control** | 5-6 | Bibliographic parsing, URL extraction, validation | Low |
| **Phase 4: Claude Integration** | 7-8 | API layer, context refinement, in-app chat | Low |
| **Phase 5: Refinement Engine** | 9-10 | Query gen, URL discovery, soft 404, paywall detection | Medium |
| **Phase 6: Reintegration** | 11-12 | Citation replacement, content preservation, QR codes | Low |
| **Phase 7: Publication Gen** | 13-14 | HTML, EPUB, Print generators | Medium |
| **Phase 8: Mobile UI** | 15-16 | All screens, Ferguson Archive design system | Low |
| **Phase 9: Testing** | 17-18 | Unit/integration/e2e tests, 3 manuscript validation | High |
| **Phase 10: Documentation** | 19-20 | Tech docs, user guide, deployment guide | Low |

**Total Duration**: 20 weeks (5 months)

### 4.2 Critical Path Items

1. **Week 4**: Citation detection for all formats must work
2. **Week 10**: URL discovery achieving ≥90% accuracy
3. **Week 14**: All three publication formats generating
4. **Week 18**: All three manuscripts processed successfully

### 4.3 Parallelization Opportunities

- Weeks 7-10: UI development can start while refinement engine being built
- Weeks 11-14: Publication generators can be developed in parallel
- Weeks 15-18: Testing can overlap with final UI polish

---

## 5. RESOURCE REQUIREMENTS

### 5.1 API Cost Estimates

**Claude API** (document analysis, context, relevance):
- **Model**: Claude 3.5 Sonnet @ $3/M input tokens, $15/M output tokens
- **Per Reference**: ~5k input + 1k output = $0.03
- **300 References**: ~$9
- **3 Manuscripts** (288 + est. 200 + est. 150): ~$19

**Google Custom Search API**:
- **Cost**: $5 per 1000 queries
- **Per Reference**: 4-6 queries = $0.02-$0.03
- **300 References**: ~$6-9
- **3 Manuscripts**: ~$13-19

**Total Estimated API Costs for Development/Testing**:
- Initial development: $500-800 (extensive testing, iteration)
- Production per manuscript (300 refs): $15-18

### 5.2 Infrastructure Requirements

**Development**:
- Local PostgreSQL database
- Node.js 18+ runtime
- 16GB RAM minimum (for 497MB manuscript processing)

**Production** (Phase 2 - not V1):
- Server: 4 CPU, 8GB RAM (~$40/month)
- PostgreSQL: 2GB storage + backups (~$15/month)
- File storage: 100GB (~$5/month)
- **Total**: ~$60/month

### 5.3 Human Resources

**Developer Time** (Claude Code Web):
- 20 weeks × 40 hours/week = 800 hours
- Assumes full-time dedicated development

---

## 6. RISK ASSESSMENT & MITIGATION

### 6.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Large file processing (497MB DOCX)** | Medium | High | - Stream processing<br>- Chunk documents<br>- Progress indicators<br>- Test early (Week 3) |
| **Citation format detection accuracy** | Medium | High | - Start with proven regex patterns<br>- Test on all 3 manuscripts early<br>- Manual fallback UI |
| **URL discovery accuracy <93.4%** | Low | High | - Use proven patterns from lessons<br>- Implement all 3 detection levels<br>- Continuous testing against baseline |
| **Claude API rate limits** | Low | Medium | - Implement exponential backoff<br>- Queue system for batch processing<br>- Cache responses |
| **EPUB validation failures** | Medium | Low | - Use EPUBCheck throughout dev<br>- Test on multiple readers early |
| **Mobile performance** | Low | Medium | - Next.js server components<br>- Lazy loading<br>- Performance budgets |

### 6.2 Schedule Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Underestimated complexity** | Medium | High | - 20% buffer built into estimates<br>- Weekly progress reviews<br>- MVP scope flexibility |
| **Scope creep** | Low | Medium | - Strict V1 feature freeze<br>- Phase 2 backlog for new features |
| **Testing phase overruns** | Medium | Medium | - Start testing in Week 5 (not Week 17)<br>- Continuous integration from Day 1 |

### 6.3 Quality Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Data loss during processing** | Low | Critical | - Comprehensive file backup strategy<br>- Transaction-based DB operations<br>- Extensive testing on copies |
| **RID duplicates** | Low | High | - PostgreSQL unique constraints<br>- Unit tests for RID assignment<br>- Validation on every save |
| **Broken QR codes** | Low | Medium | - Test with 5+ scanning apps<br>- 300 DPI requirement enforced<br>- Visual validation in tests |

---

## 7. TESTING STRATEGY

### 7.1 Three-Manuscript Validation Plan

**Manuscript 1: Caught in the Act** (2.3 MB, 288 refs)
- **Purpose**: Baseline validation
- **Success Criteria**:
  - ✅ All 288 citations detected
  - ✅ Chapter-based RID scheme (100-199, 200-299) correctly identified
  - ✅ Context accuracy >95%
  - ✅ Primary URL coverage 100%
  - ✅ Secondary URL coverage ≥93.4%
  - ✅ All three publication formats generated
- **Timeline**: Week 18

**Manuscript 2: Authoritarian Ascent** (497 MB)
- **Purpose**: Scalability and performance
- **Success Criteria**:
  - ✅ File processed without memory issues
  - ✅ Processing time <30 minutes total
  - ✅ No data loss verified
  - ✅ URL discovery maintains accuracy
- **Timeline**: Week 18

**Manuscript 3: Myth of Male Menopause** (13 MB)
- **Purpose**: Cross-disciplinary citation handling
- **Success Criteria**:
  - ✅ Medical/APA citation format detected
  - ✅ Different RID scheme handled correctly
  - ✅ Domain-specific sources (medical journals) ranked appropriately
- **Timeline**: Week 18

### 7.2 Unit Test Coverage Targets

- **Citation Detection**: 100% (all formats)
- **RID Assignment**: 100% (critical uniqueness)
- **URL Analysis**: 95% (soft 404, title matching, paywall)
- **Publication Generation**: 90%
- **Overall Code Coverage**: >80%

### 7.3 Continuous Testing Approach

```typescript
// Example: RID Uniqueness Test
describe('RID Assignment', () => {
  it('should never assign duplicate RIDs', async () => {
    const manuscript = await createTestManuscript();
    const citations = await detectCitations(manuscript);
    const assignedRIDs = await assignRIDs(citations);

    const unique = new Set(assignedRIDs);
    expect(unique.size).toBe(assignedRIDs.length);
  });

  it('should preserve existing numbered brackets', async () => {
    const text = "Smith argues [42] that methodology [43] matters.";
    const result = await assignRIDs(text);

    expect(result).toContain('[42]');
    expect(result).toContain('[43]');
    expect(result).not.toContain('[1]'); // Should not renumber
  });
});
```

---

## 8. OPEN QUESTIONS FOR APPROVAL

### 8.1 Ferguson Archive UI/UX Standards

**Question**: The specification references `~/.claude/fergi-ui-ux-standards.md` which doesn't exist in this environment.

**Options**:
1. **Proceed without**: Build mobile-first UI using Tailwind best practices, Ferguson Archive branding to be applied later
2. **Request standards**: User provides Archive project's `tailwind.config.js` and component library
3. **Extract from Archive**: Clone Ferguson Archive repo to extract design system

**Recommendation**: Option 1 for V1 (can refine UI in Phase 2)

### 8.2 Large Manuscript Handling

**Question**: The 497MB manuscript exceeds typical upload limits and memory constraints.

**Options**:
1. **Streaming processing**: Process document in chunks (recommended)
2. **Cloud processing**: Use AWS Lambda with increased memory
3. **Batch mode**: Process overnight with progress tracking

**Recommendation**: Option 1 (streaming) with progress indicators

### 8.3 Deployment Target for V1

**Question**: Where should V1 be deployed?

**Options**:
1. **Local only**: Run on maintainer's machine
2. **Cloud deployment**: Vercel (Next.js native) or Railway
3. **Hybrid**: Local processing, cloud UI

**Recommendation**: Option 1 for V1 (local), Option 2 for Phase 2

### 8.4 Gap Analysis Feature

**Question**: Gap analysis (finding claims needing citations) is marked as OPTIONAL. Include in V1?

**Options**:
1. **Skip for V1**: Focus on core workflow, add in V1.1
2. **Include**: Add to Phase 2 (Week 3-4)

**Recommendation**: Option 1 (skip for V1, prioritize core workflow)

---

## 9. IMPLEMENTATION PRIORITIES

### 9.1 Must-Have for V1 (Non-Negotiable)

1. ✅ Universal citation detection (10+ formats)
2. ✅ RID assignment (empty brackets only, preserve numbered)
3. ✅ Context capture (semantic, argumentative, temporal)
4. ✅ Pre-validation relevance text generation
5. ✅ URL discovery with proven patterns (≥93.4% Secondary coverage)
6. ✅ Soft 404 detection (3 levels)
7. ✅ Title matching (≥0.55 Primary, ≥0.45 Secondary)
8. ✅ Mobile-first responsive UI
9. ✅ Claude integration (built into interface)
10. ✅ All three publication formats (HTML, EPUB, Print w/ QR)
11. ✅ Zero data loss guarantee
12. ✅ All three manuscripts processed successfully

### 9.2 Nice-to-Have for V1 (Defer if Schedule Slips)

1. Gap analysis (claims needing citations)
2. Advanced analytics dashboard
3. Export to other formats (LaTeX, Word)
4. Multi-user collaboration
5. Version history for references

### 9.3 Phase 2 Features (Post-V1)

1. Productization for third-party authors
2. SaaS deployment infrastructure
3. Billing and payment system
4. Advanced user management
5. API for integrations

---

## 10. SUCCESS METRICS

### 10.1 Functional Metrics

- [ ] All six core components implemented and tested
- [ ] Complete workflow: upload → analysis → refinement → publication
- [ ] Mobile UI responsive on phones (375px) and tablets (768px)
- [ ] Claude chat integration functional
- [ ] All three publication formats generating without errors

### 10.2 Quality Metrics

- [ ] Context accuracy: >95% useful without modification
- [ ] Primary URL coverage: 100% (288/288 on Caught in the Act)
- [ ] Secondary URL coverage: ≥93.4% (269/288)
- [ ] Zero data loss: Every manuscript word in output
- [ ] Artifacts filtered: No TOC, page numbers, headers in final
- [ ] QR codes: 100% scannable (tested with 5+ apps)

### 10.3 Performance Metrics

- [ ] Caught in the Act (2.3 MB): <5 minutes processing
- [ ] Authoritarian Ascent (497 MB): <30 minutes processing
- [ ] Myth of Male Menopause (13 MB): <10 minutes processing
- [ ] Mobile Lighthouse score: >90
- [ ] Page load time: <3 seconds on 4G

### 10.4 Validation Metrics

- [ ] All three manuscripts processed successfully
- [ ] No critical bugs in core workflow
- [ ] Unit test coverage: >80%
- [ ] Integration tests: All passing
- [ ] End-to-end tests: All passing

---

## 11. NEXT STEPS

### 11.1 Immediate Actions (Upon Approval)

1. **Set up development environment**:
   ```bash
   npx create-next-app@latest reference-refinement-v2 --typescript --tailwind --app
   cd reference-refinement-v2
   npm install prisma @prisma/client
   npm install @anthropic-ai/sdk
   npm install mammoth pdf-parse qrcode epub-gen-memory
   npx prisma init --datasource-provider postgresql
   ```

2. **Create database schema**: Copy Prisma schema from Section 2.2

3. **Set up project structure**: Create directories from Section 2.3

4. **Import ranking criteria**: Create `src/config/ranking-criteria.yaml` from Section 3.1

5. **Begin Phase 1 implementation** (Weeks 1-2):
   - File upload API route
   - Database connection
   - Basic DOCX parsing

### 11.2 Week 1 Deliverables

- Project initialized with Next.js + TypeScript + Prisma
- Database schema created and migrated
- File upload working (DOCX, PDF, TXT)
- Basic manuscript storage and retrieval
- First unit tests written

### 11.3 Checkpoints

- **Week 4**: Document analyzer demo (citation detection working)
- **Week 8**: Claude integration demo (context refinement)
- **Week 12**: URL discovery demo (soft 404 detection)
- **Week 16**: Mobile UI demo (all screens)
- **Week 18**: Three-manuscript validation complete
- **Week 20**: Production-ready V1

---

## 12. CONCLUSION

This technical specification provides a concrete, implementable plan for building the Productized Reference Refinement System v2.0 with:

✅ **Proven technology choices** (Next.js + PostgreSQL + Claude API)
✅ **Realistic 20-week timeline** (5 months to V1)
✅ **Clear architecture** (six core components, detailed schema)
✅ **Validated patterns** (from 288-reference baseline)
✅ **Risk mitigation strategies** (for all major risks)
✅ **Concrete success metrics** (>95% context accuracy, 100%/93.4% URL coverage)

**Estimated Total Cost**: $500-800 API costs during development
**Risk Level**: Medium (mitigatable with proven patterns and continuous testing)
**Confidence Level**: High (based on existing successful system)

**Ready for approval and implementation.**

---

**Document Status**: READY FOR REVIEW
**Next Action**: Approve architecture and begin Week 1 implementation
**Author**: Claude Code Web
**Date**: November 9, 2025
