# Reference Refinement v2.0 - Productized System

Complete rebuild of the reference refinement system for processing academic manuscripts.

## Foundation Status

✅ **Completed**:
- Next.js 14 + TypeScript + Tailwind CSS setup
- PostgreSQL + Prisma ORM with complete schema
- File upload API (DOCX, PDF, TXT support up to 500MB)
- Basic DOCX parsing with mammoth
- Mobile-first UI foundation

## Architecture

Based on `TECHNICAL_SPECIFICATION.md` with 6 core components:

1. **Document Analyzer** - Citation detection, RID assignment, context capture
2. **Format Controller** - Bibliographic parsing, URL extraction, validation
3. **Claude Integration** - Context refinement, relevance generation
4. **Refinement Engine** - URL discovery, soft 404 detection, ranking
5. **Reintegration** - Citation replacement, zero data loss
6. **Publication Generator** - HTML, EPUB, Print with QR codes

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

## Next Steps

The foundation is complete. Next session will implement:

1. **Citation Detection** - Multi-format citation parser
2. **Reference Parser** - Bibliographic extraction
3. **RID Assignment** - Smart numbering (sequential/chapter-based)
4. **Context Capture** - Semantic context around citations
5. **URL Discovery** - Search query generation + Google Custom Search
6. **Soft 404 Detection** - 3-level validation (proven patterns)

## Implementation Guide

See `TECHNICAL_SPECIFICATION.md` for complete implementation roadmap.

See `REFERENCE_REFINEMENT_LESSONS_LEARNED.md` for proven patterns from baseline system.

---

**Built with Claude Code** 🤖
