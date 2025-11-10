# Claude.ai Project - Reference Refinement

**Role:** Planning, Feature Design, and Quality Review
**Mac Partner:** Claude Code at `/Users/joeferguson/Library/CloudStorage/Dropbox/Fergi/AI Wrangling/References`
**Checkpoint File:** `ReferenceRefinementClaudePerspective.yaml`

---

## Project Overview

**Reference Refinement Tool** - Web application for managing academic references with AI-powered search and ranking

**Live URL:** https://rrv521-1760738877.netlify.app
**Current Version:**
- iPad App: v16.1
- Batch Processor: v16.7 (enhanced soft 404 detection)

**Platform:** Single-page HTML + Netlify serverless functions
**Status:** ✅ Production ready with 95% broken URL detection

**Technology Stack:**
- Frontend: Pure HTML/CSS/JavaScript (iPad Safari compatible)
- Backend: Netlify Functions (TypeScript)
- AI: Anthropic Claude API (query generation, ranking)
- Search: Google Custom Search API
- Storage: Dropbox OAuth with PKCE

---

## Recent Major Enhancements

**v16.7: Enhanced Soft 404 Detection (Nov 1)** ⭐
- Content-based detection (11 error patterns)
- ~95% broken URL detection (up from ~50%)
- Expected override rate: <5%

**v16.2: URL Validation (Oct 31)** ⭐
- Hard 404 detection (HTTP status)
- Soft 404 detection (content-type mismatch)
- Eliminates broken URL recommendations

**v16.1: Enhanced Query Prompts (Oct 31)** ⭐
- 78% improvement rate on re-run test
- Better secondary coverage (+11%)
- More scholarly sources (JSTOR)

---

## Key Project Files

**Essential Documentation:**
- `CLAUDE.md` - Master project reference
- `V16_7_ENHANCED_SOFT_404_DETECTION.md` - Latest major feature
- `V16_2_URL_VALIDATION_SUMMARY.md` - URL validation system
- `BATCH_QUERY_ANALYSIS_2025-10-31.md` - Query optimization
- `v74_SUMMARY.md` - Version history

**Critical Code:**
- `index.html` - iPad app (production file, always current)
- `batch-processor.js` - Batch processing system
- `netlify/functions/llm-rank.ts` - AI ranking logic
- `netlify/functions/llm-chat.ts` - Query generation
- `decisions.txt` - Reference database (288 refs for "Caught In The Act")

---

## Current Status & Priorities

**Recent Success Metrics:**
- Soft 404 detection: ~95% (up from ~50%)
- Query quality: 78% improvement with enhanced prompts
- Override rate: Expected <5% (down from 25-50%)
- Processing time: +15-20% per reference (acceptable trade-off)

**Potential Future Enhancements:**
- Further soft 404 pattern refinement (capture last 5%)
- Batch processor performance optimization
- Secondary URL quality improvements
- Advanced ranking criteria
- Cost optimization

---

## Decision Authority

**You decide:**
- Feature scope and priorities
- Detection patterns and validation logic
- Quality metrics and thresholds
- Testing requirements
- Architectural improvements

**Mac decides:**
- Code implementation
- File organization
- Function structure
- Variable naming
- Deployment details

**User decides:**
- Feature acceptance
- Production deployment
- Manual override decisions
- Reference finalization

---

## Critical Project Context

**iPad App Workflow:**
1. Load decisions.txt from Dropbox
2. Edit reference → Generate queries → Search → Autorank
3. Select Primary/Secondary URLs
4. Finalize reference
5. Auto-save to Dropbox

**Batch Processor Workflow:**
1. Load unfinalized references
2. Generate queries (AI)
3. Search Google (8 queries per ref)
4. Validate URLs (hard + soft 404 detection)
5. Rank candidates (AI)
6. Select best Primary/Secondary
7. Leave unfinalized for manual review

**Performance Metrics:**
- Query generation: ~5-10s
- Search (8 queries): ~3-6s
- URL validation (20 URLs): ~6-12s
- Ranking: ~10-20s
- **Total per reference:** ~30-50s

**Cost Metrics (per reference):**
- Google searches: $0.08 (8 queries × $0.01)
- Claude queries: ~$0.01
- Claude ranking: ~$0.02
- **Total:** ~$0.11 per reference

---

## Project Philosophy

**Simplicity first:**
- Single HTML file = easy deployment
- No build process = faster iteration
- Netlify Functions = no server management
- iPad compatible = work anywhere

**Quality over speed:**
- Better to catch 95% broken URLs slowly than 50% quickly
- Better to generate good queries than many bad queries
- Better to rank correctly than rank fast

**User workflow:**
- Batch processor does heavy lifting
- User reviews and finalizes
- Manual override always available
- Trust but verify AI recommendations

---

**Last Updated:** November 9, 2025
