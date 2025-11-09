# Reference Refinement v2.0 - Productized System

Complete rebuild of the reference refinement system for processing academic manuscripts with AI-powered URL discovery and validation.

## System Overview

The Reference Refinement v2 system consists of 5 core components working together to provide end-to-end reference processing:

1. **Document Analyzer** - Citation detection, RID assignment, context capture
2. **Format Controller** - Bibliographic parsing, URL extraction, validation
3. **Search Engine** - Query generation, Google Custom Search integration, URL discovery
4. **Refinement Engine** - URL ranking, soft 404 detection, quality validation
5. **Output Generator** - Multiple output formats (decisions.txt, Final.txt, EPUB, HTML)

## Foundation Status

✅ **Completed Components**:
- ✅ Component 1: Document Analyzer (Session 2)
- Next.js 14 + TypeScript + Tailwind CSS setup
- PostgreSQL + Prisma ORM with complete schema
- File upload API (DOCX, PDF, TXT support up to 500MB)
- Basic DOCX parsing with mammoth
- Mobile-first UI foundation

## Component 1: Document Analyzer

The Document Analyzer provides comprehensive document analysis capabilities for academic manuscripts:

### Features

- **Citation Detection**: Detects 12+ citation formats including [100], [], (100), superscripts, author-year, etc.
- **Reference Parsing**: Extracts bibliographic information (author, year, title, publication)
- **RID Assignment**: Smart assignment of Reference IDs to unnumbered citations based on context and title matching
- **Context Capture**: Extracts sentences, paragraphs, and contextual information around citations
- **Structure Analysis**: Identifies document structure (chapters, sections, hierarchies)

### Usage

```typescript
import { DocumentAnalyzer } from './lib/analyzer';

const analyzer = new DocumentAnalyzer({
  contextWindowSize: 200,
  minConfidence: 0.45,
  rateLimitDelay: 100,
  titleMatching: {
    primaryThreshold: 0.55,
    secondaryThreshold: 0.45
  }
});

const result = await analyzer.analyze(documentText, referencesText);

console.log(`Total Citations: ${result.statistics.totalCitations}`);
console.log(`Total References: ${result.statistics.totalReferences}`);
console.log(`Successful RID Assignments: ${result.statistics.successfulAssignments}`);
```

### Training Data

Tested against:
- **Manuscript**: `manuscript_content.txt` (1616 lines, "Caught In The Act")
- **References**: 288 academic references

### Success Criteria

✅ Detect all 288 citations
✅ Parse all 288 references
✅ Assign RIDs correctly (chapter-based: 100-199, 200-299)
✅ Context accuracy >95%
✅ Title matching with confidence scores
✅ Rate limiting compliance

## Database Schema

Complete Prisma schema with 8 models:
- Manuscript
- Citation
- Reference
- ReferenceInstance
- URLCandidate
- Publication

See `prisma/schema.prisma` for details.

## Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env and add DATABASE_URL, ANTHROPIC_API_KEY, etc.

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Visit http://localhost:3000

## Testing

### Run All Tests

```bash
npm test
```

### Run Test Runner

```bash
npx ts-node test-runner.ts
```

This will:
1. Load training data (manuscript_content.txt and references)
2. Run complete document analysis
3. Generate detailed report (ANALYSIS_REPORT.md)
4. Display statistics

## Architecture

```
v2/
├── lib/
│   ├── analyzer/              # Component 1 (Session 2)
│   │   ├── citation-detector.ts
│   │   ├── reference-parser.ts
│   │   ├── rid-assigner.ts
│   │   ├── context-capturer.ts
│   │   ├── structure-analyzer.ts
│   │   └── index.ts
│   ├── format-controller/     # Component 2 (Session 3) - TODO
│   ├── search-engine/         # Component 3 (Session 4) - TODO
│   ├── refinement-engine/     # Component 4 (Session 5) - TODO
│   ├── output-generator/      # Component 5 (Session 5) - TODO
│   ├── pipeline/              # Integration layer - TODO
│   └── types/                 # Shared types
│       └── index.ts
├── __tests__/
│   └── analyzer/
│       └── integration.test.ts
├── app/                       # Next.js app routes
├── prisma/                    # Database schema
├── package.json
├── tsconfig.json
├── jest.config.js
└── test-runner.ts
```

## Next Steps

Remaining components to integrate:

2. **Format Controller** - Bibliographic parsing, URL extraction, validation
3. **Search Engine** - Query generation, Google Custom Search integration
4. **Refinement Engine** - URL ranking, soft 404 detection, quality validation
5. **Output Generator** - Multiple output formats

## Implementation Guide

See `TECHNICAL_SPECIFICATION.md` for complete implementation roadmap.

See `V2_COMPONENT1_IMPLEMENTATION_COMPLETE.md` for Component 1 details.

---

**Built with Claude Code** 🤖

## Status

✅ **Component 1 COMPLETE** - Document Analyzer ready for testing and integration
🔄 **Integration in Progress** - Merging all components into complete v2 system
