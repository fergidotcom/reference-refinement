# V2 Foundation Complete - Session Handoff

**Date**: November 9, 2025
**Status**: ✅ Foundation Ready
**Branch**: `claude/productized-reference-system-011CUvrXagFBRDZ7gya7Xe3K`
**Location**: `/home/user/reference-refinement/v2/`

---

## What's Complete

### ✅ Project Infrastructure
- **Next.js 14** + TypeScript + Tailwind CSS initialized
- **Package.json** configured with all dependencies
- **Config files**: next.config.js, tsconfig.json, tailwind.config.js, postcss.config.js
- **Directory structure** per TECHNICAL_SPECIFICATION.md Section 2.3

### ✅ Database Layer
- **Prisma ORM** installed and configured
- **Complete schema** implemented (8 models):
  - Manuscript
  - Citation
  - Reference
  - ReferenceInstance
  - URLCandidate
  - Publication
- **Schema location**: `v2/prisma/schema.prisma`
- **Client generated**: Ready to use via `import { prisma } from '@/lib/db'`

### ✅ File Upload System
- **API endpoint**: `POST /api/upload`
- **Accepts**: DOCX, PDF, TXT (up to 500MB)
- **Validates**: File type, required fields (title, authorName)
- **Saves**: Files to `public/uploads/` with unique timestamps
- **Database**: Creates Manuscript record on successful upload
- **Location**: `v2/app/api/upload/route.ts`

### ✅ DOCX Parser
- **Library**: mammoth (preserves structure better than docx)
- **Extracts**: HTML, plain text, paragraphs, word count
- **Filters**: Headers, footers (basic - needs refinement)
- **Location**: `v2/lib/analyzer/docx-parser.ts`
- **Function**: `parseDocx(filePath: string): Promise<ParsedDocument>`

### ✅ User Interface
- **Homepage** (`app/page.tsx`):
  - Upload form (file, title, author name)
  - Mobile-responsive
  - Error handling
  - Loading states

- **Manuscript View** (`app/manuscripts/[id]/page.tsx`):
  - Displays manuscript metadata
  - Shows citation/reference counts (currently 0)
  - Next steps UI
  - Placeholder for analysis button

- **Layout** (`app/layout.tsx`):
  - Basic structure
  - Global styles with Tailwind

---

## File Structure Created

```
v2/
├── app/
│   ├── api/
│   │   └── upload/route.ts          ✅ File upload endpoint
│   ├── manuscripts/[id]/page.tsx    ✅ Manuscript detail view
│   ├── layout.tsx                   ✅ Root layout
│   ├── page.tsx                     ✅ Homepage with upload form
│   └── globals.css                  ✅ Tailwind styles
│
├── lib/
│   ├── analyzer/
│   │   └── docx-parser.ts           ✅ DOCX parsing logic
│   ├── db.ts                        ✅ Prisma client singleton
│   ├── format-controller/           📁 Created (empty)
│   ├── claude/                      📁 Created (empty)
│   ├── refinement/                  📁 Created (empty)
│   ├── reintegration/               📁 Created (empty)
│   ├── publication/                 📁 Created (empty)
│   └── utils/                       📁 Created (empty)
│
├── components/
│   ├── ui/                          📁 Created (empty)
│   ├── citations/                   📁 Created (empty)
│   ├── references/                  📁 Created (empty)
│   ├── claude/                      📁 Created (empty)
│   └── publish/                     📁 Created (empty)
│
├── prisma/
│   └── schema.prisma                ✅ Complete database schema
│
├── public/uploads/                  📁 Upload directory
├── next.config.js                   ✅ Next.js configuration
├── package.json                     ✅ Dependencies
├── tsconfig.json                    ✅ TypeScript config
├── tailwind.config.js               ✅ Tailwind config
├── .env                             ✅ Environment variables
├── .gitignore                       ✅ Git ignore rules
└── README.md                        ✅ Setup instructions
```

---

## Dependencies Installed

```json
{
  "@anthropic-ai/sdk": "^0.68.0",
  "@prisma/client": "^6.19.0",
  "mammoth": "^1.11.0",
  "pdf-parse": "^2.4.5",
  "qrcode": "^1.5.4",
  "epub-gen-memory": "^1.1.2",
  "next": "^16.0.1",
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "typescript": "^5.9.3",
  "tailwindcss": "^4.1.17",
  "prisma": "^6.19.0",
  "dotenv": "^17.2.3"
}
```

---

## Environment Setup Required

Before running, create `.env` file with:

```bash
# Database (adjust for your PostgreSQL instance)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reference_refinement_v2"

# API Keys (add your keys)
ANTHROPIC_API_KEY=""
GOOGLE_API_KEY=""
GOOGLE_CX=""
```

---

## How to Run

```bash
cd v2

# Install dependencies (already done, but just in case)
npm install

# Generate Prisma client (already done)
npx prisma generate

# Run migrations to create database tables
npx prisma migrate dev --name init

# Start development server
npm run dev
```

Visit http://localhost:3000

---

## Testing the Foundation

### Test File Upload

1. Go to http://localhost:3000
2. Select a DOCX file (try `source/raw_manuscript_training.docx`)
3. Enter title: "Test Manuscript"
4. Enter author name: "Test Author"
5. Click "Upload & Analyze"
6. Should redirect to `/manuscripts/{id}` showing metadata

### Verify Database

```bash
npx prisma studio
```

Opens Prisma Studio UI to browse database records.

---

## What's Next (For Implementation Session)

### Phase 1: Component 1 - Document Analyzer

**Priority**: High
**Location**: `lib/analyzer/`

#### 1.1 Citation Detection (`citation-detector.ts`)

Implement multi-format citation parser:

```typescript
// Detect formats:
// - Parenthetical: (Smith, 2020)
// - Superscript: ¹, ², etc.
// - Bracket: [42], [Smith2020]
// - Empty brackets: [] (assign RID)
// - Preserve numbered: [42] stays [42]

export function detectCitations(text: string): Citation[]
```

**Proven patterns from lessons learned**:
- Use regex for each format
- Track position (paragraphNum, charPosition)
- Capture context before/after (100 chars each)

#### 1.2 Reference Parser (`reference-parser.ts`)

Extract bibliographic info from reference list:

```typescript
export function parseReferences(text: string): ParsedReference[]

interface ParsedReference {
  rid: number | null  // null if empty bracket []
  authors: string[]
  year: number
  title: string
  publication: string
  doi?: string
  isbn?: string
  urls: {
    primary?: string
    secondary?: string
    other?: string[]
  }
}
```

**Pattern**: Look for common formats:
- APA: Author, A. (YEAR). Title. Publication.
- MLA: Author, First. "Title." Publication, Year.
- Chicago: Author, First. Year. Title. Publication.

#### 1.3 RID Assignment (`rid-assigner.ts`)

Implement smart RID assignment:

```typescript
// CRITICAL RULES:
// 1. Only assign to empty brackets []
// 2. Preserve numbered brackets [42] exactly
// 3. Detect scheme: sequential (1,2,3) or chapter-based (100-199, 200-299)
// 4. Maintain absolute uniqueness (PostgreSQL constraint enforces this)

export function assignRIDs(
  citations: Citation[],
  references: ParsedReference[],
  scheme: RIDScheme
): Assignment
```

#### 1.4 Context Capture (`context-capturer.ts`)

Extract semantic context around citations:

```typescript
// Capture 3 types:
// 1. Semantic: What claim does this citation support?
// 2. Argumentative: How is it used? (evidence/counterargument/background)
// 3. Temporal: When in manuscript flow?

export function captureContext(
  text: string,
  citation: Citation
): CapturedContext
```

#### 1.5 Structure Analyzer (`structure-analyzer.ts`)

Identify manuscript structure:

```typescript
// Detect:
// - Chapters/sections
// - Headings (H1, H2, H3)
// - References section location
// - Table of contents (filter out)
// - Headers/footers (filter out)

export function analyzeStructure(
  html: string
): ManuscriptStructure
```

---

### Phase 2: Component 2 - Format Controller

**Priority**: High
**Location**: `lib/format-controller/`

#### 2.1 Bibliographic Parser (`biblio-parser.ts`)

Implement robust bibliographic parsing:

```typescript
// Use heuristics + patterns
// Handle variations in formatting
// Extract: authors, year, title, publication, identifiers

export function parseBibliographic(
  text: string
): BibliographicInfo
```

#### 2.2 URL Extractor (`url-extractor.ts`)

Extract URLs from reference text:

```typescript
// Extract URLs and classify:
// - First URL after reference = Primary
// - Second URL = Secondary
// - Additional = Other

export function extractURLs(
  referenceText: string
): ExtractedURLs
```

#### 2.3 Validator (`validator.ts`)

Validate extracted data:

```typescript
// Check:
// - Required fields present
// - URL format valid
// - RID uniqueness
// - Citation-reference matching

export function validateManuscript(
  data: AnalyzedManuscript
): ValidationReport
```

---

### Phase 3: Component 3 - Claude Integration

**Priority**: Medium
**Location**: `lib/claude/`

#### 3.1 Client (`client.ts`)

Anthropic API wrapper:

```typescript
import Anthropic from '@anthropic-ai/sdk'

export const claude = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})
```

#### 3.2 Context Refiner (`context-refiner.ts`)

AI-assisted context refinement:

```typescript
// Use Claude to refine captured context
// Prompt: "Based on this excerpt, what claim is this citation supporting?"

export async function refineContext(
  rawContext: string,
  citation: Citation
): Promise<RefinedContext>
```

#### 3.3 Relevance Generator (`relevance-generator.ts`)

**CRITICAL**: Must run BEFORE URL discovery

```typescript
// Generate relevance text from context + bibliographic info
// This drives search query generation!

export async function generateRelevance(
  context: string,
  bibliographic: BibliographicInfo
): Promise<string>
```

---

### Phase 4: Component 4 - Refinement Engine

**Priority**: Critical
**Location**: `lib/refinement/`

#### 4.1 Query Generator (`query-generator.ts`)

Use proven patterns from REFERENCE_REFINEMENT_LESSONS_LEARNED.md:

```typescript
// Pattern 1: Title-only quoted (MOST EFFECTIVE)
// Pattern 2: DOI search
// Pattern 3: Title + author + year
// Pattern 4: ISBN for books
// Pattern 5: Domain-filtered (site:publisher.com)
// Pattern 6: Context keywords

export function generateSearchQueries(
  bibliographic: BibliographicInfo,
  context: string
): string[]  // Max 6 queries
```

#### 4.2 URL Discoverer (`url-discoverer.ts`)

Google Custom Search integration:

```typescript
export async function discoverURLs(
  queries: string[]
): Promise<URLCandidate[]>
```

#### 4.3 Soft 404 Detector (`soft-404-detector.ts`)

**CRITICAL** - Use 3-level detection from spec:

```typescript
// Level 1: HTTP status check
// Level 2: Content-Type mismatch (PDF returns HTML)
// Level 3: HTML content analysis (error keywords)

export async function detectSoft404(
  url: string
): Promise<{ isSoft404: boolean; reason?: string }>
```

#### 4.4 Title Matcher (`title-matcher.ts`)

Fuzzy title matching:

```typescript
// Thresholds from lessons learned:
// ≥0.55 for Primary URL
// ≥0.45 for Secondary URL

export function calculateTitleSimilarity(
  expectedTitle: string,
  actualTitle: string
): number  // 0.0 to 1.0
```

#### 4.5 URL Analyzer (`url-analyzer.ts`)

Multi-factor scoring using `config/ranking-criteria.yaml`:

```typescript
export function analyzeURL(
  url: string,
  candidate: URLCandidate,
  bibliographic: BibliographicInfo
): URLAnalysis {
  // titleSimilarity: 35%
  // domainAuthority: 25%
  // contentType: 20%
  // accessibility: 10%
  // linkPermanence: 10%
}
```

---

## Testing Strategy

### Unit Tests
Create `tests/unit/` for each component:

```typescript
// Example: tests/unit/citation-detector.test.ts
describe('Citation Detection', () => {
  it('detects parenthetical citations', () => {
    const text = "Smith argues (Smith, 2020) that..."
    const citations = detectCitations(text)
    expect(citations).toHaveLength(1)
    expect(citations[0].originalFormat).toBe('(Smith, 2020)')
  })

  it('preserves numbered brackets', () => {
    const text = "As shown [42], the methodology..."
    const citations = detectCitations(text)
    expect(citations[0].rid).toBe(42)
  })
})
```

### Integration Test

Use `source/raw_manuscript_training.docx`:

```typescript
// Test complete flow:
// 1. Upload manuscript
// 2. Detect citations (should find 288)
// 3. Parse references (should match 288)
// 4. Assign RIDs (chapter-based scheme)
// 5. Discover URLs (aim for ≥93.4% secondary coverage)
```

---

## Key Reminders

### RID Assignment Rules (CRITICAL)
1. ✅ Only assign RIDs to empty brackets `[]`
2. ✅ Preserve all numbered brackets: `[42]` stays `[42]`
3. ✅ Maintain absolute uniqueness (database constraint enforces)
4. ✅ Analyze scheme first, then follow pattern

### URL Discovery Rules (From Lessons Learned)
1. ✅ Title-only quoted queries most effective
2. ✅ Domain filters more reliable than keywords
3. ✅ Validate ALL candidates for soft 404s
4. ✅ Title matching: ≥0.55 Primary, ≥0.45 Secondary
5. ✅ Rate limiting: 100ms between requests

### Relevance Text Timing (CRITICAL)
1. ✅ Generate BEFORE URL discovery
2. ✅ Regenerate when context OR bibliographic info changes
3. ✅ Use for search query generation

---

## Success Metrics (From Spec)

### Target for raw_manuscript_training.docx:
- ✅ All 288 citations detected
- ✅ Chapter-based RID scheme (100-199, 200-299) recognized
- ✅ Context accuracy >95% useful
- ✅ Primary URL coverage: 100% (288/288)
- ✅ Secondary URL coverage: ≥93.4% (269/288)
- ✅ Zero data loss (every word preserved)

---

## Commands for Next Session

```bash
# Navigate to v2 directory
cd /home/user/reference-refinement/v2

# Ensure Prisma client is generated
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# Start development server
npm run dev

# In another terminal, run Prisma Studio
npx prisma studio
```

---

## Resources

- **Technical Spec**: `/home/user/reference-refinement/TECHNICAL_SPECIFICATION.md`
- **Lessons Learned**: `/home/user/reference-refinement/REFERENCE_REFINEMENT_LESSONS_LEARNED.md`
- **Implementation Spec**: `/home/user/reference-refinement/PRODUCTIZED_SYSTEM_SPECIFICATION.md`
- **Training Manuscript**: `/home/user/reference-refinement/source/raw_manuscript_training.docx`

---

## Foundation Complete ✅

The v2 foundation is solid and ready for component implementation. Next session should focus on Component 1 (Document Analyzer) to get the core data extraction working first.

**Recommended Order**:
1. Citation detection
2. Reference parsing
3. RID assignment
4. Context capture
5. Then move to URL discovery

Good luck! 🚀
