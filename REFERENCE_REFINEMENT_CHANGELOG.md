# Reference Refinement - Project Changelog

This document tracks all significant changes, enhancements, and fixes to the Reference Refinement project across both the iPad app and batch processor components.

---

## 2025-11-01 - Baseline Documentation

### Status
✅ **Production Ready** - v16.7 iPad App + v16.7 Batch Processor

### Current State

**iPad App:** v16.6
- Full reference management workflow operational
- AI-powered query generation with configurable allocation
- Google Custom Search integration
- Autorank system with pipe-delimited parsing
- Dropbox OAuth with PKCE and bulletproof save
- Cost tracking and session debug logging
- Quick finalize button for batch-reviewed references
- Batch version badge display
- Manual review flag handling

**Batch Processor:** v16.7
- Enhanced soft 404 detection with 3-level validation system
- Hard 404 detection (HTTP status codes)
- Soft 404 detection via content-type mismatch
- Soft 404 detection via content analysis (11 error patterns)
- ~95% broken URL detection rate
- Batch version tracking (FLAGS[BATCH_vX.X])
- Enhanced query prompts synchronized with iPad app
- Manual review mode with MANUAL_REVIEW flagging
- Resume capability and detailed logging

**Production Deployment:**
- Live URL: https://rrv521-1760738877.netlify.app
- Netlify Functions: 7 serverless endpoints (health, llm-chat, llm-rank, search-google, dropbox-oauth, resolve-urls, proxy-fetch)
- GitHub Repository: https://github.com/fergidotcom/reference-refinement.git
- Dropbox Integration: OAuth with app folder access
- Environment Variables: Configured in Netlify dashboard

**Quality Metrics:**
- Override rate: <10% (target achieved)
- Broken URL detection: ~95%
- Primary URL coverage: 100% (288/288 refs)
- Secondary URL coverage: >90% (269/288 refs)
- Average cost per reference: ~$0.008-$0.012

### Notes
This baseline entry captures the project state as of November 1, 2025. The project is production-ready with comprehensive documentation (CLAUDE.md, REFERENCE_REFINEMENT_OVERVIEW.md) and 30+ technical session summaries documenting the development journey.

---

## Template for Future Entries

```markdown
## [YYYY-MM-DD] - [Version/Milestone Name]

### Added
- [New features, components, or capabilities]
- [New files or directories]
- [New API endpoints or integrations]

### Changed
- [Modifications to existing features]
- [Configuration changes]
- [Performance improvements]
- [UI/UX updates]

### Fixed
- [Bug fixes with issue descriptions]
- [Performance issues resolved]
- [Data integrity problems addressed]

### Files Affected
- [List of modified files with line numbers if relevant]
- [New files created]
- [Files deleted or renamed]

### Performance Impact
- [Changes to processing speed]
- [Changes to API costs]
- [Changes to validation rates]

### Breaking Changes
- [Changes that require user action]
- [Changes to data formats]
- [Changes to API contracts]

### Migration Notes
- [Steps needed to upgrade]
- [Data migration requirements]
- [Configuration changes needed]

### Testing Performed
- [Test scripts run]
- [Manual test cases]
- [Validation results]

### Notes
- [Context and reasoning for changes]
- [Known limitations or future work]
- [Dependencies on other changes]
```

---

## Recent Version History (Pre-Baseline)

### 2025-11-01 - v16.7 Enhanced Soft 404 Detection ⭐

**Added:**
- Level 3 URL validation: Content-based soft 404 detection
- 11 error pattern matchers for HTML error pages
- Partial content fetching (first 15KB) for performance
- Detection for DOI errors, university repository errors, generic 404s
- HTML title tag error detection
- Suspiciously short page detection

**Changed:**
- Enhanced validateURL() function (batch-processor.js lines 673-811)
- Validation performance: +15-20% batch processing time
- Expected detection rate: 50% → 95% broken URLs

**Fixed:**
- Soft 404s that returned HTTP 200 but showed error content
- HTML error pages that passed v16.2 validation
- DOI "not found" pages
- University repository "page not found" errors

**Files Affected:**
- batch-processor.js (lines 11, 15, 673-811)

**Performance Impact:**
- Time per URL: ~600-1000ms (HEAD + partial GET)
- Time per reference: +12-20 seconds (20 URLs validated)
- Broken URL detection: ~95% (up from ~50%)

**Testing Performed:**
- test-soft-404-detection.js - 11/11 pattern tests passed
- test-pattern-detection.js - All error patterns validated
- test-problem-urls.js - Real-world URL validation

**Notes:**
- Trade-off: Slower validation for much better detection
- Expected override rate: <5% (down from 25-50%)
- Documentation: V16_7_ENHANCED_SOFT_404_DETECTION.md

---

### 2025-10-31 - v16.2 URL Validation System

**Added:**
- Two-level URL validation system
- Level 1: Hard 404 detection (HTTP status codes)
- Level 2: Soft 404 detection via content-type mismatch
- validateURL() function in batch-processor.js
- Top 20 candidate validation before selection
- Invalid URL logging in batch output

**Changed:**
- Main batch loop to validate before selecting primary/secondary
- Ranking workflow: rank → validate → select best valid candidate
- Added ~6 seconds per reference processing time

**Fixed:**
- Recommended URLs that returned 404 or soft 404 errors
- PDF URLs that returned HTML error pages
- University repository URLs that appeared valid but weren't

**Files Affected:**
- batch-processor.js (lines 11, 15, 240-288, 646-732)

**Performance Impact:**
- Time per URL validation: ~300ms
- Time per reference: +6 seconds
- Detection rate: ~60-70% of soft 404s caught

**Notes:**
- Documentation: V16_2_URL_VALIDATION_SUMMARY.md
- User reported: "URLs looked good but site said document not available"
- Expected override rate: <10% (down from 25-50%)

---

### 2025-10-31 - v16.1 Enhanced Query Prompts ⭐

**Added:**
- 11 lines of query guidance to batch processor
- Query best practices (exact title quoting, length limits)
- Anti-patterns to avoid (URLs, overly specific jargon)
- Free source prioritization guidance

**Changed:**
- Synchronized query prompts between iPad app and batch processor
- batch-processor.js lines 498-509 (enhanced prompts)
- BATCH_VERSION from v16.0 to v16.1

**Fixed:**
- Batch processor generating lower quality URLs than manual iPad workflow
- Missing guidance that iPad app had but batch processor lacked

**Files Affected:**
- batch-processor.js (lines 15, 498-509)
- decisions.txt (9 refs updated with BATCH_v16.1 tags)

**Performance Impact:**
- 78% improvement rate (7 out of 9 refs improved on re-run)
- Secondary coverage: 56% → 67% (+11 points)
- Average secondary score: 82 → 87 (+5 points)

**Testing Performed:**
- Reprocessed 9 unfinalized references from v16.0 batch
- Compared results documented in BATCH_V16_1_RESULTS.md

**Notes:**
- Proven effective with empirical evidence
- Found completely missing secondaries
- Discovered better scholarly sources (more JSTOR)
- Expected override rate: <25%, possibly <10%

---

### 2025-10-31 - v16.1 Batch Version Badge Display

**Added:**
- Purple robot badge (🤖) for batch-processed references
- Badge shows batch version (e.g., "v16.0")
- Tooltip: "Processed by batch v16.0"

**Changed:**
- index.html line 2350: Added batch version badge rendering
- Badge color: Purple (#9b59b6) to distinguish from finalized (green)

**Files Affected:**
- index.html (line 2350)

**Notes:**
- Visual feedback for which batch version processed each reference
- Helps track quality improvements across batch versions

---

### 2025-10-31 - v16.0 Batch Version Tracking System

**Added:**
- Automatic batch version tagging for all processed references
- FLAGS[BATCH_v16.0] in decisions.txt
- Space-delimited FLAGS format (changed from comma-delimited)
- BATCH_VERSION constant in batch-processor.js

**Changed:**
- batch-processor.js line 15: Added BATCH_VERSION = 'v16.0'
- batch-processor.js line 287: Set ref.batch_version = BATCH_VERSION
- index.html lines 1878-1880: Parse BATCH version from flags
- index.html lines 2646-2648: Write BATCH version to flags

**Files Affected:**
- batch-processor.js (lines 15, 287)
- index.html (lines 1878-1880, 2646-2648)

**Benefits:**
- Track which batch version processed each reference
- Debug quality issues by batch version
- Monitor improvements across versions
- Visual feedback in UI

---

### 2025-10-30 - v15.11 Dropbox Save 400 Error Fix (Critical)

**Fixed:**
- Bug 1 (v15.10): Missing Blob conversion for temp file upload
- Bug 2 (v15.11): Invalid Dropbox API call in commit step
- 400 error when finalizing references with large files (315KB+)

**Changed:**
- index.html line 4411: Convert content to Blob with UTF-8 encoding
- index.html lines 4440-4450: Replace filesCopyV2 with filesUpload
- Commit step now uploads verified content directly (more reliable)

**Files Affected:**
- index.html (lines 4410-4411, 4440-4450)

**Performance Impact:**
- Simpler logic (one upload vs upload+copy)
- Better integrity (upload exact verified content)

**Testing Performed:**
- All 9 steps of bulletproof save complete successfully
- 315KB file saves without errors
- Automatic backups created correctly

**Notes:**
- Used Safari Web Inspector for debugging
- Console logs showed invalid `mode` parameter for filesCopyV2
- Dropbox API documentation confirmed filesUpload accepts `mode`, filesCopyV2 does not

---

### 2025-10-29 - v15.3 Parser Bug Fix (Critical)

**Fixed:**
- Complete parsing failure: "Loaded 0 refs (288 skipped due to errors)"
- Line 1643 called non-existent function `this.parseOneline()`
- Try/catch swallowed errors silently

**Changed:**
- index.html line 1643, 4299: Changed to `this.extractReferenceInfo(ref)`
- Enhanced console logging (format detection, sample refs, stack traces)

**Files Affected:**
- index.html (lines 1643, 4299, logging enhancements)

**Notes:**
- v15.2 completely failed to load any references
- JavaScript TypeError for non-existent function
- All 288 references failed to parse in v15.2

---

### 2025-10-28 - v14.7 Manual Review Mode + Quick Finalize

**Added:**
- Batch processor manual review mode
- MANUAL_REVIEW flag for failed searches
- Quick Finalize button in iPad app
- Auto-clear MANUAL_REVIEW flag on finalization

**Changed:**
- batch-config.yaml: Disabled auto_finalize
- batch-processor.js: MANUAL_REVIEW flag logic
- index.html line 2384-2451: Enhanced finalizeReference() with optional refId
- index.html line 2207: Replaced URL buttons with Finalize button

**Removed:**
- Redundant Primary URL and Secondary URL buttons (URLs already clickable)

**Files Affected:**
- batch-config.yaml
- batch-processor.js
- batch-utils.js (MANUAL_REVIEW parsing/writing)
- index.html (lines 2207, 2384-2451, 2428-2432)

**Notes:**
- New workflow: batch suggests → user reviews → user finalizes
- Flag appears in decisions.txt as FLAGS[MANUAL_REVIEW]
- Helps identify references needing manual research

---

### 2025-10-28 - v14.5 Data Synchronization Fix (Critical)

**Fixed:**
- URLs in main window didn't match URLs in Edit modal
- Stale localStorage data shown after Dropbox OAuth
- Multiple data versions displayed simultaneously

**Changed:**
- index.html lines 3773-3802: Load fresh data after OAuth
- index.html lines 1461-1489: Simplified init() to always load from Dropbox
- Removed justReconnectedDropbox flag

**Files Affected:**
- index.html (lines 1420-1425, 1461-1489, 3773-3802)

**Notes:**
- CRITICAL severity: Data integrity risk
- User confusion from seeing different URLs for same reference
- Dropbox always wins as single source of truth

---

### 2025-10-28 - v14.5 Primary/Secondary Mutual Exclusivity

**Added:**
- Explicit mutual exclusivity rules in ranking prompt
- Full-text sources → PRIMARY only (not SECONDARY)
- Reviews/analyses → SECONDARY only (not PRIMARY)

**Changed:**
- netlify/functions/llm-rank.ts lines 115-118, 153-157
- Added warning blocks in PRIMARY and SECONDARY sections

**Files Affected:**
- netlify/functions/llm-rank.ts (lines 115-118, 153-157)

**Notes:**
- Prevents full-text PDFs from being selected as secondary sources
- Prevents reviews from scoring high on PRIMARY
- Batch processor and manual ranking both benefit (shared logic)

---

### 2025-10-27 - v14.2 Query Control + Cost Tracking + Enhanced Detection

**Added:**
- User-configurable query allocation (primary vs secondary)
- UI dropdowns with preset buttons (4+4, 6+2, 2+6)
- Real-time cost tracking display
- Session Cost Summary panel
- Language detection (non-English domains capped at P:70)
- Review website vs review article distinction

**Changed:**
- Query generation respects allocation settings
- Token counts and costs shown after AI operations
- Projections for batch runs (100 and 500 references)

**Files Affected:**
- index.html (query allocation UI, cost tracking panels)

**Performance Impact:**
- Average cost per reference: ~$0.008-$0.012 calculated
- Allows experimentation to find optimal query balance

**Notes:**
- Goal: Reduce override rate to <25%
- v14.1 test results: 50% override rate (2/4)

---

### 2025-10-27 - v14.1 Content-Type Detection

**Added:**
- Enhanced PRIMARY detection (work itself vs about the work)
- Enhanced SECONDARY detection (review vs listing)
- Heuristics for review language ("review of", "I argue")
- PhilPapers/WorldCat/library catalog detection

**Changed:**
- Ranking criteria with better source type detection
- Max scores adjusted based on content type

**Files Affected:**
- netlify/functions/llm-rank.ts (content-type detection logic)

**Notes:**
- v14.0 test results: 100% override rate (4/4)
- Goal: Reduce to <25% with better detection

---

### 2025-10-27 - v14.0 Query Generation Strategy Redesign

**Added:**
- Structured 3:1 query ratio
- PRIMARY queries: 75% free sources, 25% publisher fallback
- SECONDARY queries: 75% work-specific reviews, 25% topic discussions

**Changed:**
- Query structure from generic to targeted (8 queries total)
- Primary scoring: FREE full-text 95-100 (prioritized)
- Secondary scoring: Work-specific reviews 90-100 (prioritized)

**Files Affected:**
- index.html (query generation logic)
- netlify/functions/llm-chat.ts (query generation prompt)

**Notes:**
- Free sources prioritized over publisher pages
- Work-specific reviews prioritized over generic topic discussions

---

### 2025-10-26 - v13.12 CDN Redirect Caching Fix

**Fixed:**
- Netlify CDN caching 301 redirects indefinitely
- Deployments showing old versions even after browser cache clear

**Changed:**
- Switched from versioned files with redirect to index.html
- Netlify automatically serves index.html at root (no redirect)
- Versioned files kept as backups only

**Files Affected:**
- netlify.toml (lines 46-49: removed redirect configuration)
- Deployment process updated in documentation

**Notes:**
- 301 redirects told CDN "cache forever"
- index.html = no redirect = nothing to cache
- Cache headers ensure freshness

---

### 2025-10-26 - v13.0 Major Enhancements

**Added:**
- Dropbox OAuth with PKCE support
- Enhanced llm-rank.ts with search tool disabling for large sets
- User Notes panel in Debug tab
- Toast close buttons
- Override tracking statistics
- Automatic token refresh
- Increased function timeout to 26 seconds
- Cache busting meta tags

**Changed:**
- Function timeout from 10s to 26s (Netlify max)
- Search tool disabled for 50+ candidates (prevents timeouts)

**Files Affected:**
- netlify/functions/dropbox-oauth.ts (new file)
- netlify/functions/llm-rank.ts (enhanced)
- index.html (OAuth flow, UI improvements)
- netlify.toml (timeout increase)

**Notes:**
- Major architectural update
- PKCE security for OAuth
- Prevents autorank timeouts with large candidate sets

---

## Notes on Changelog Maintenance

**Update Frequency:**
- Add entry after each significant version update
- Group related small changes into single entries
- Keep baseline entry at top for reference

**Required Information:**
- Date and version/milestone name
- Clear categorization (Added/Changed/Fixed)
- Files affected with line numbers when relevant
- Performance impact if applicable
- Testing results when available

**Best Practices:**
- Link to detailed technical docs (V16_7_*.md, etc.)
- Include user-facing impact description
- Note breaking changes prominently
- Document migration steps when needed
- Reference related issues or user reports

---

**Last Updated:** November 1, 2025
**Document Maintainer:** Fergi + Claude Code
**Related Documentation:** See CLAUDE.md and REFERENCE_REFINEMENT_OVERVIEW.md
