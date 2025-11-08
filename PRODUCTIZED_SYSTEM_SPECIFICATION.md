# PRODUCTIZED REFERENCE REFINEMENT SYSTEM
## Complete Implementation Specification for Claude Code Web

**Version**: 2.1
**Branch**: productized-system
**Training Manuscripts**:
- `source/raw_manuscript_training.docx` (Caught in the Act - 2.3 MB) ✅ **In Repository**
- `source/authoritarian_ascent_usa.docx` (Authoritarian Ascent in USA - 497 MB) ⚠️ **Local Only** (GitHub 100MB limit)
- `source/myth_male_menopause.docx` (The Myth of Male Menopause - 13 MB) ⚠️ **Local Only**
- **Note**: See `source/README.md` for details on accessing large manuscripts
**UI/UX Foundation**: Ferguson Family Archive project standards (mobile-first, accessible, performant)
**Status**: Ready for Implementation
**Created**: November 8, 2025
**Updated**: November 8, 2025 - Added manuscripts, explicit UI/UX standards, large file handling

---

## 🎯 PROJECT OVERVIEW

### Mission
Transform manuscript-specific Reference Refinement system into universal AI-powered academic reference management platform that works with any manuscript at any stage of completion.

### Core Innovation
Replace rigid flag-based parsing with intelligent AI document understanding that comprehends content, context, and academic standards.

### Strategic Validation
**All three manuscripts MUST be supported from V1:**

1. **"Caught in the Act"** (`raw_manuscript_training.docx` - 2.3 MB)
   - Political performance and democratic accountability
   - 288 references baseline (100% Primary, 93.4% Secondary coverage)
   - Mixed citation formats, chapter-based RID scheme (100-199, 200-299, etc.)

2. **"Authoritarian Ascent in the USA"** (`authoritarian_ascent_usa.docx` - 497 MB)
   - Large manuscript with extensive references
   - Tests system scalability and performance
   - Validates handling of complex political science citations

3. **"The Myth of Male Menopause"** (`myth_male_menopause.docx` - 13 MB)
   - Medical/scientific manuscript
   - Different citation patterns (likely medical/APA style)
   - Tests cross-disciplinary citation handling

**Validation Criteria**: System must successfully process all three manuscripts through complete workflow (normalization → refinement → publication) before V1 considered complete.

**Phase 2**: Productize for third-party authors after three-manuscript validation

---

## 📋 COMPLETE AUTHOR WORKFLOW

### STEP 1: DOCUMENT INTELLIGENCE & NORMALIZATION
**Duration**: Automated (minutes)
**Author Involvement**: Upload and wait

#### AI Processing (Automatic)

**1.1 Universal Citation Detection**
Recognize ALL citation formats:

**Bracket Systems**:
- Standard: `[]`, `[42]`, `[1,2,3]`, `[Smith2020]`
- Variations: `[[42]]`, `[ 42 ]`, `[see 42]`, `[cf. 42]`
- Annotations: `[CITE]`, `[TODO]`, `[NEED REF]`

**Parenthetical Citations (APA/Harvard)**:
- Basic: `(Smith, 2020)`, `(Jones et al., 2019)`
- Complex: `(Smith, 2020; Jones, 2019)`
- Pages: `(Smith, 2020, p. 45)`
- Qualifiers: `(see Smith, 2020)`, `(cf. Jones, 2019)`

**Superscript Numbers (Chicago/Medical)**:
- Simple: `studies show¹ that methodology²`
- Multiple: `research³,⁴,⁵ demonstrates`
- Ranges: `findings¹⁻⁵ support`

**Footnote Markers**:
- Symbols: `proven effective*` `documented†`
- Letters: `studiesᵃ showᵇ`
- Roman: `researchⁱ demonstratesⁱⁱ`

**Author-Date Inline**:
- `Smith (2020) argues...`
- `According to Jones et al. (2019),...`
- `Smith's (2020) methodology...`

**Legal Citations (Bluebook)**:
- Cases: `Brown v. Board, 347 U.S. 483 (1954)`
- Statutes: `42 U.S.C. § 1983`

**Custom/Discipline-Specific**:
- Computer Science: `@Smith2020`, `@theory`
- Mathematics: `{Theorem 4.2}`, `{Lemma 3.1}`

**Incomplete/Placeholder**:
- Author only: `[Smith]`, `[Jones et al.]`
- Year only: `[2020]`, `[recent study]`
- Descriptive: `[seminal work]`, `[landmark study]`

**1.2 Reference Section Analysis**
Parse bibliography/works cited:
- Extract bibliographic information (any format)
- Find existing URLs:
  - **1st URL found** → Primary URL candidate
  - **2nd URL found** → Secondary URL candidate
  - **3rd+ URLs** → Store as "Other" bibliographic info
- Handle multiple citation formats (APA, MLA, Chicago, IEEE, etc.)

**1.3 Citation-Reference Mapping**
- Map each citation to its reference entry
- Detect orphaned citations (no matching reference)
- Detect orphaned references (no matching citation)
- Flag validation issues for author review

**1.4 RID Assignment Rules** ⚠️ CRITICAL

**ONLY assign RIDs to empty brackets `[]`**:
- All numbered brackets preserved: `[42]` stays `[42]`
- Empty brackets get unique RID assignment
- Uniqueness is ABSOLUTE requirement
- No RID duplication anywhere in document

**Numbering Scheme Analysis**:
1. Analyze existing RID patterns in document
2. Detect scheme (sequential, chapter-based, random)
3. Example: Caught in the Act uses chapter blocks:
   - Chapter 1: RID 100-199
   - Chapter 2: RID 200-299
   - Chapter 3: RID 300-399, etc.
4. Recommend scheme for empty brackets based on pattern
5. Present recommendation to author (can override)

**Scheme Flexibility**:
- System must handle ANY RID numbering scheme
- No constraints on Web's design
- Must accommodate arbitrary RID assignments
- Author has final control over numbering

**1.5 Document Structure Analysis**
- Identify chapters, sections, paragraphs
- Recognize front matter, main content, back matter
- Detect figures, tables, captions
- Separate manuscript content from artifacts:
  - **Filter**: TOC, page numbers, headers, footers, revision marks
  - **Preserve**: All actual manuscript text and structure

**1.6 Context Capture** (Foundation for Everything)
Extract meaning around each citation:
- **Semantic context**: What topic is being discussed?
- **Argumentative context**: Claim, support, or evidence?
- **Rhetorical context**: Introduction, methodology, results, discussion?
- **Temporal context**: Past research, current study, future work?
- **Multi-paragraph context**: Complex arguments spanning paragraphs
- **Disciplinary context**: Field-specific terminology

**1.7 Gap Analysis** (OPTIONAL - Author Enabled)
- Find claims needing citations
- Identify factual statements requiring sources
- Detect theoretical concepts needing attribution
- Suggest citation opportunities
- Author can enable/disable this feature

#### Step 1 Output
**Clean, normalized manuscript** with:
- All citations converted to [RID] format
- All references prefixed with [RID]
- Complete citation-reference mapping
- Captured context for each citation
- Existing URLs extracted (Primary/Secondary/Other)
- Validation report (orphans, gaps, issues)
- Recommended RID scheme for empty brackets

---

### STEP 2: REFERENCE REFINEMENT & PUBLICATION
**Duration**: Variable (hours to weeks)
**Author Involvement**: High - iterative dialogue with AI
**Mobile-Optimized Interface**: CRITICAL requirement

#### Phase 2A: Pre-Validation Relevance Generation ⚠️ CRITICAL TIMING

**BEFORE any validation or refinement begins**:

Generate relevance text for ALL references with complete bibliographic info:
- Input: Context + Bibliographic info
- Output: Relevance text explaining WHY source is relevant
- Must happen BEFORE validation phase
- Drives search query generation for URLs

**Cascade Rule**: If context OR bibliographic info changes:
1. Regenerate relevance text immediately
2. Regenerate search queries
3. Rediscover URL candidates

**Example**:
```
[42] Smith, J. (2020). Quantitative Methods in Social Research.

Context: "Discussing longitudinal methodology approaches
for analyzing temporal changes in social behavior..."

Relevance Text Generated:
"Smith's quantitative methodology framework provides the
statistical foundation for analyzing temporal changes in
social behavior patterns across multiple measurement periods."
```

#### Phase 2B: Review & Validate

**Author Interface** (Mobile-Optimized):

**Citation List View**:
```
Reference Refinement Queue

[100] Chapter 1, Para 5
Status: ⚠️ Needs Context Review
Context: "Discussing political performance..."
Biblio: ✓ Complete
URLs: ⏳ Not yet discovered

[101] Chapter 1, Para 12
Status: ⚠️ Incomplete Bibliographic
Context: ✓ Approved
Biblio: ⚠️ Missing title and publication
URLs: ❌ Cannot discover until biblio complete

[102] Chapter 1, Para 18
Status: ✅ Ready for URL Discovery
Context: ✓ Approved
Biblio: ✓ Complete
Relevance: ✓ Generated
URLs: ⏳ Ready to search

Progress: 3 of 288 reviewed
```

**Individual Citation View**:
```
[42] Smith, J. (2020)
Location: Chapter 3, Paragraph 15

📝 Context:
"Discussing quantitative methodology approaches
for longitudinal social behavior studies..."

[Accept] [Modify] [Rewrite] [Ask Claude 💬]

📚 Bibliographic Info:
Smith, J. (2020). Quantitative Methods in
Social Research. Academic Press.

[Accept] [Edit] [Replace Source]

✨ Relevance Text:
"Smith's quantitative methodology framework
provides the statistical foundation for..."

[Accept] [Regenerate] [Edit]

🔗 URLs: Ready to discover
[Find Primary & Secondary URLs]
```

**Claude Integration** (Built into Interface):
```
💬 Claude Chat Panel

Author: "This context seems too narrow for
what I'm actually discussing"

Claude: "I can help expand it. Looking at
surrounding paragraphs, you're also discussing
temporal validity and measurement consistency.
Would you like me to broaden the context?"

Author: "Yes, and emphasize the statistical
aspects more"

Claude: [Provides expanded context]

⚠️ Context changed - This will trigger:
- Relevance text regeneration
- Search query regeneration
- URL rediscovery

[Proceed with Cascade] [Cancel]
```

#### Phase 2C: Reference Refinement (Variable Starting States)

**State A: Complete Reference**
- Context: ✓ Captured/Approved
- Bibliographic: ✓ Complete
- Relevance: ✓ Generated
- URLs: ✓ Primary + Secondary extracted from original
- **Workflow**: Validate URLs → Finalize

**State B: Partial Bibliographic**
- Context: ✓ Captured/Approved
- Bibliographic: ⚠️ Incomplete (author/year only)
- Relevance: ⏳ Waiting for complete biblio
- URLs: ❌ None
- **Workflow**: Complete biblio → Generate relevance → Find URLs → Finalize

**State C: Context Only**
- Context: ✓ Captured/Approved
- Bibliographic: ❌ None
- Relevance: ⏳ Waiting for biblio
- URLs: ❌ None
- **Workflow**: Find source → Build biblio → Generate relevance → Find URLs → Finalize

#### Phase 2D: URL Discovery (Enhanced with Proven Techniques)

**Search Query Generation** (based on Reference Refinement experience):

```
[42] Smith, J. (2020). Quantitative Methods...
Context: "longitudinal methodology approaches..."
Relevance: "Smith's quantitative framework provides..."

Generated Search Queries:
1. "Smith 2020 Quantitative Methods Social Research"
2. "DOI Smith Quantitative Methods Academic Press"
3. "Smith longitudinal methodology statistical 2020"
4. "Smith J Quantitative Methods ISBN"

[Use These] [Modify] [Add More]
```

**Candidate Analysis** (Draw from 288-reference experience):

**Soft 404 Detection**:
- Check HTTP response codes
- Verify actual content vs. error pages
- Detect redirect chains to generic pages
- Flag fake/dead results

**Title Matching**:
- Extract title from candidate page
- Compare with bibliographic title
- Fuzzy matching for minor variations
- Score confidence: Exact > Close > Partial > None

**Paywall Detection**:
- Check for subscription requirements
- Detect institutional access barriers
- Flag "login required" patterns
- Identify open access indicators

**Accessibility Scoring**:
- Open access: 100 points
- Institutional access: 75 points
- Paywall with preview: 50 points
- Hard paywall: 25 points

**Link Permanence**:
- DOI: 100 points (permanent)
- Institutional repository: 90 points
- Publisher official: 85 points
- Archive.org: 70 points
- Personal/temporary: 30 points

**Source Authority**:
- Official publisher: 100 points
- University repository: 95 points
- ResearchGate/Academia.edu: 80 points
- Author personal site: 70 points
- Third-party aggregator: 50 points

**Example Candidate Analysis**:
```
Analyzing Candidates for [42]...

🔗 https://doi.org/10.1234/smith.2020.qmsr
✅ Title: "Quantitative Methods in Social Research" (exact match)
✅ Soft 404: None (valid content)
✅ Paywall: None (open access)
✅ Permanence: DOI (100 pts)
✅ Authority: Official publisher (100 pts)
Overall Score: 95/100
→ PRIMARY URL CANDIDATE

🔗 https://researchgate.net/publication/smith2020
✅ Title: "Quantitative Methods..." (exact match)
✅ Soft 404: None
⚠️ Paywall: Free but requires ResearchGate account
⚠️ Permanence: Platform-dependent (70 pts)
✅ Authority: Author repository (80 pts)
Overall Score: 80/100
→ SECONDARY URL CANDIDATE

🔗 https://sketchy-site.com/download/smith.pdf
❌ Title: Generic "Download PDF" page (no match)
❌ Soft 404: DETECTED (fake result)
❌ Paywall: Suspicious download prompts
❌ Permanence: Temporary site (30 pts)
❌ Authority: Unknown third party (20 pts)
Overall Score: 15/100
→ REJECTED

Recommendations:
Primary: https://doi.org/10.1234/smith.2020.qmsr
Secondary: https://researchgate.net/publication/smith2020

[Accept] [Find More] [Manual Entry]
```

#### Phase 2E: Multiple Instance Handling

**Same source cited multiple times** = **Independent refinements**:

```
Reference [42] Smith, J. (2020) - Used 3 times

Instance 1: Chapter 2, Para 15
Context: "Discussing research methodology approaches..."
Relevance: "Smith's quantitative methodology framework
provides the statistical foundation for..."
URLs: Same as canonical

Instance 2: Chapter 5, Para 42
Context: "Examining statistical validity testing procedures..."
Relevance: "Smith's validity testing procedures ensure robust
measurement across temporal intervals..."
URLs: Same as canonical

Instance 3: Chapter 8, Para 103
Context: "Concluding with methodological implications..."
Relevance: "Smith's comprehensive approach demonstrates the
necessity of rigorous quantitative frameworks..."
URLs: Same as canonical

[Refine Each] [Copy Relevance Text] [Bulk Operations]
```

**Key Points**:
- Same bibliographic info for all instances
- Same Primary/Secondary URLs for all instances
- **Different relevance text** per instance (context-specific)
- Each instance tracked separately in decisions.txt format

#### Phase 2F: Finalization & Validation

**Reference NOT finalized until**:
- ✅ Complete bibliographic information
- ✅ Relevance text generated/approved
- ✅ Search criteria generated
- ✅ Primary URL identified and validated
- ✅ Secondary URL(s) identified (optional but recommended)
- ✅ Author final approval

**Progress Dashboard**:
```
Reference Refinement Progress

Total Citations: 288
Status:
✅ Finalized: 156 (54%)
🔄 In Progress: 47 (16%)
⏳ Not Started: 85 (30%)

Quality Metrics:
Primary URLs: 156/156 (100%)
Secondary URLs: 142/156 (91%)
Relevance Text: 156/156 (100%)

Target Metrics (from current system):
Primary URL Coverage: ≥100%
Secondary URL Coverage: ≥93.4%

[Continue] [Review Finalized] [Export]
```

#### Phase 2G: Publication Generation

**When all references finalized**:

```
✅ Ready to Generate Publications

All 288 references finalized
✅ 100% Primary URL coverage (288/288)
✅ 96% Secondary URL coverage (277/288)
✅ 100% Relevance text coverage
✅ Zero validation errors
✅ Faithful content reproduction verified

Select Formats:
☑ HTML (interactive, clickable URLs)
☑ EPUB (e-reader, clickable URLs)
☑ Print (QR codes for URLs)

[Generate All Formats]
```

**HTML Version**:
```html
<p>
  The methodology demonstrates significant validity
  <sup><a href="#ref-42-instance-1" class="citation">[42]</a></sup>
  for longitudinal studies.
</p>

<div class="reference" id="ref-42-instance-1">
  <div class="citation">
    [42] Smith, J. (2020). Quantitative Methods in Social Research.
    Academic Press.
  </div>
  <div class="relevance">
    Smith's quantitative methodology framework provides the statistical
    foundation for analyzing temporal changes in social behavior patterns
    across multiple measurement periods.
  </div>
  <div class="urls">
    <a href="https://doi.org/10.1234/smith.2020"
       class="primary-url" target="_blank">
      📖 Primary Source (Open Access)
    </a>
    <a href="https://researchgate.net/publication/smith2020"
       class="secondary-url" target="_blank">
      📄 Secondary Source (Author Repository)
    </a>
  </div>
</div>
```

**EPUB Version**:
- EPUB 3.0 compliant
- Proper chapter structure and TOC
- Clickable citations → references
- Clickable URLs in references
- Compatible: Kindle, Apple Books, Kobo, Nook

**Print Version with QR Codes**:
```
[42] Smith, J. (2020). Quantitative Methods in Social Research.
     Academic Press.

Smith's quantitative methodology framework provides the statistical
foundation for analyzing temporal changes in social behavior patterns
across multiple measurement periods.

[QR CODE]        [QR CODE]
Primary Source   Secondary Source
```

**QR Code Requirements**:
- High resolution (300 DPI for print)
- Labeled (Primary, Secondary)
- Tested for scannability
- **No printed URLs** in print version (codes only)

---

## 🏗️ SYSTEM ARCHITECTURE

### Six Core Components

#### Component 1: AI Document Analyzer
**Purpose**: Universal citation detection and document understanding

**Capabilities**:
- Multi-format citation recognition (10+ formats)
- Reference section parsing (any style)
- Citation-reference mapping with orphan detection
- RID assignment (empty brackets only, preserve numbered)
- Numbering scheme analysis and recommendation
- Document structure analysis (chapters, sections, paragraphs)
- Context capture (semantic, argumentative, rhetorical, temporal)
- Content vs. artifact separation (filter TOC, page numbers, headers)
- Gap analysis (optional, author-enabled)

**AI Model**: Claude API for content understanding

**Output**: Normalized manuscript with [RID] system + complete analysis

---

#### Component 2: Format Controller
**Purpose**: Clean, validate, and standardize bibliographic data

**Capabilities**:
- Parse multiple citation formats (APA, MLA, Chicago, IEEE)
- Extract: title, author, publication, year, DOI, ISBN, etc.
- Detect format issues: title bleeding, missing fields, ambiguous data
- Extract existing URLs (1st=Primary, 2nd=Secondary, 3rd+=Other)
- Flag problematic entries for human review
- Standardize to internal format
- Prevent downstream parsing errors

**Critical Rule**: Never proceed with messy bibliographic data

---

#### Component 3: Claude Integration Layer
**Purpose**: AI assistance throughout workflow (built into interface)

**Integration Points**:
- Context refinement and expansion
- Bibliographic clarification
- Source discovery based on context
- Relevance text generation and refinement
- Search query optimization
- Natural language queries

**API Pattern**:
```javascript
async function refineContext(originalContext, authorQuestion) {
  const response = await claudeAPI.complete({
    prompt: `Context: "${originalContext}"
             Author: "${authorQuestion}"
             Provide refined context.`,
    max_tokens: 500
  });
  return response.text;
}
```

---

#### Component 4: Reference Refinement Engine
**Purpose**: Process each citation through complete refinement workflow

**Capabilities**:
- Handle variable starting states (context only, partial biblio, complete)
- Pre-validation relevance text generation (CRITICAL TIMING)
- Context-driven source discovery
- Relevance text generation/regeneration
- Context override with cascade regeneration
- Multiple instance tracking (same source, different contexts)
- Search query generation (proven patterns)
- URL discovery with advanced analysis

**URL Discovery Features** (draw from 288-reference experience):
- Soft 404 detection
- Title matching with fuzzy logic
- Paywall detection and avoidance
- Accessibility scoring
- Link permanence assessment
- Source authority ranking

**Cascade Logic**:
```javascript
async function handleContextOverride(citationId, newContext) {
  await updateContext(citationId, newContext);
  const newRelevance = await generateRelevanceText(newContext);
  const newQueries = await generateSearchQueries(newContext, biblio);
  const newUrls = await discoverUrls(newQueries);
  await updateCitation(citationId, {
    context: newContext,
    relevance_text: newRelevance,
    search_queries: newQueries,
    urls: newUrls,
    status: "needs_review"
  });
}
```

---

#### Component 5: Reintegration System
**Purpose**: Merge enhanced references back into manuscript

**Capabilities**:
- Replace [RID] citations with formatted citations
- Build comprehensive reference section
- **Faithful content reproduction**: Preserve ALL manuscript content
- **Filter artifacts**: Remove TOC, page numbers, headers, footers
- Format-specific processing (HTML, EPUB, Print)
- QR code generation for print URLs
- Citation Narratives preservation
- **Zero content loss**: Every word from original manuscript appears

---

#### Component 6: Publication Generator
**Purpose**: Create three publication-ready formats

**HTML Version**:
- Single-page or multi-page structure
- Clickable [RID] citations → references
- Clickable URLs in references (Primary + Secondary)
- Search functionality
- Table of contents navigation
- Mobile-responsive design

**EPUB Version**:
- EPUB 3.0 standard compliance
- Proper chapter structure with TOC
- Clickable internal citations
- Clickable external URLs
- Compatible: Kindle, Apple Books, Kobo, Nook
- Validation with EPUBCheck

**Print Version**:
- Print-optimized layout
- QR codes for ALL URLs (Primary + Secondary)
- **No printed URLs** (scannable codes only)
- Professional typography
- High-resolution (300 DPI)
- Print-ready PDF or HTML

---

## 🎨 UI/UX REQUIREMENTS

### ⭐ CRITICAL: Ferguson Family Archive Standards (MANDATORY)

**This system MUST use the exact UI/UX standards, conventions, and tools implemented in the Ferguson Family Archive project.**

**Complete Rebuild Required**: The new productized system will be completely rebuilt from scratch using Ferguson Family Archive mobile-first standards. DO NOT reuse existing Reference Refinement iPad app UI patterns.

### Ferguson Family Archive UI/UX Foundation

**Access the complete UI/UX specification**:
- See `~/.claude/fergi-ui-ux-standards.md` for comprehensive design system
- All Fergi projects inherit these standards automatically
- Reference: `@~/.claude/global-infrastructure.md`

**Core Ferguson Archive Patterns**:
1. **Mobile First**: Design for phones, enhance for tablets/desktop
2. **Touch Optimized**: Large touch targets (minimum 44px), swipe gestures, haptic feedback
3. **Progressive Enhancement**: Works on basic devices, enhanced on capable
4. **Consistent Visual Language**: Follow Archive project color palette, typography, spacing
5. **Accessibility**: WCAG 2.1 AA compliance minimum
6. **Performance**: Lighthouse score >90 on mobile devices
7. **Offline Capable**: Service workers for offline functionality
8. **Responsive Grid**: CSS Grid and Flexbox for fluid layouts

**Technology Stack from Ferguson Archive**:
- **Styling**: Tailwind CSS (same configuration as Archive)
- **Icons**: Same icon library as Archive project
- **Fonts**: Same typography system as Archive
- **Components**: Reusable component patterns from Archive
- **State Management**: Same patterns as Archive (Context API or Zustand)
- **Build Tools**: Same build configuration as Archive

**Visual Consistency Requirements**:
- Same color scheme and theme variables
- Same button styles and interactive elements
- Same form input designs and validation patterns
- Same navigation patterns (bottom nav on mobile)
- Same loading states and skeleton screens
- Same toast/notification designs
- Same modal and dialog patterns

### Critical Mobile Optimization
- Bottom navigation bar (fixed)
- Swipe gestures (next/previous citation)
- Pull-to-refresh on lists
- Collapsible sections to save screen space
- Keyboard-aware layouts (don't hide inputs)
- Large touch targets throughout
- Claude chat panel slides in from side

### Screen Flows Priority
1. Citation list/queue view (mobile-optimized cards)
2. Individual citation refinement (single-page scroll)
3. Context editor with Claude integration
4. Bibliographic information form
5. URL discovery and selection
6. Progress dashboard
7. Publication generation interface

---

## 🔧 TECHNICAL STACK RECOMMENDATIONS

### Frontend
- **Framework**: React, Vue, or Svelte (your choice)
- **Styling**: Tailwind CSS (matches Archive project)
- **State Management**: Context API or Zustand
- **Mobile**: Responsive CSS + touch events

### Backend
- **Runtime**: Node.js or Python
- **Framework**: Express/Fastify (Node) or Flask/FastAPI (Python)
- **Database**: PostgreSQL or MongoDB
- **File Storage**: Local filesystem or S3-compatible
- **Queue**: For async processing (Bull, Celery)

### AI Integration
- **Primary**: Claude API (Anthropic)
- **Use Cases**: Document understanding, context capture, relevance generation, source suggestions, author assistance

### Document Processing
- **DOCX**: `mammoth` (Node) or `python-docx` (Python)
  - Must handle: complex formatting, styles, headers, footers, TOC
  - Robust error handling for corrupted files
  - Content preservation with artifact filtering
- **PDF**: `pdf-parse` (Node) or `PyPDF2` (Python)
- **TXT/MD**: Native file reading

### QR Code Generation
- **Library**: `qrcode` (Node/Python)
- **Requirements**: 300 DPI, labeled, tested for scannability

### Publication Generation
- **HTML**: Template engine (Handlebars, Nunjucks, Jinja2)
- **EPUB**: `epub-gen` (Node) or `ebooklib` (Python) + EPUBCheck validation
- **Print**: HTML → PDF via `puppeteer` or `weasyprint`

---

## 📊 DATA MODELS

### Core Entities

**Manuscript**:
```typescript
interface Manuscript {
  id: string;
  title: string;
  author: string;
  uploaded: Date;
  file_path: string;
  file_type: 'docx' | 'pdf' | 'txt' | 'md';
  status: 'uploaded' | 'analyzing' | 'refining' | 'complete';
  structure: DocumentStructure;
  citations: Citation[];
  references: Reference[];
  publications: Publication[];
  rid_scheme: RIDScheme;
}
```

**Citation**:
```typescript
interface Citation {
  id: string;
  manuscript_id: string;
  rid: number;
  original_format: string; // (Smith, 2020), ¹, [42], etc.
  location: {
    chapter: string;
    section: string;
    paragraph: number;
    character_position: number;
  };
  context_before: string;
  context_after: string;
  captured_context: string;
  context_approved: boolean;
  has_matching_reference: boolean;
  validation_status: 'valid' | 'orphaned' | 'missing_reference';
}
```

**Reference**:
```typescript
interface Reference {
  id: string;
  manuscript_id: string;
  rid: number;
  bibliographic_info: {
    title: string;
    authors: string[];
    publication: string;
    year: number;
    doi?: string;
    isbn?: string;
    pages?: string;
    volume?: string;
    issue?: string;
    publisher?: string;
    other?: string; // For 3rd+ URLs from original
  };
  original_urls: {
    primary?: string;
    secondary?: string;
    other?: string[];
  };
  instances: ReferenceInstance[];
  status: 'incomplete' | 'ready_for_refinement' | 'refining' | 'finalized';
  format_issues: FormatIssue[];
}
```

**ReferenceInstance**:
```typescript
interface ReferenceInstance {
  id: string;
  reference_id: string;
  citation_id: string;
  location: Location;
  context: string;
  context_modified: boolean;
  relevance_text: string;
  search_queries: string[];
  url_candidates: URLCandidate[];
  primary_url: string;
  secondary_urls: string[];
  status: 'draft' | 'refined' | 'finalized';
  last_modified: Date;
}
```

**URLCandidate**:
```typescript
interface URLCandidate {
  url: string;
  analysis: {
    title_match: {
      score: number; // 0-100
      matched_title: string;
      confidence: 'exact' | 'close' | 'partial' | 'none';
    };
    soft_404: {
      detected: boolean;
      reason?: string;
    };
    paywall: {
      detected: boolean;
      type?: 'subscription' | 'institutional' | 'none';
    };
    accessibility_score: number; // 0-100
    permanence_score: number; // 0-100
    authority_score: number; // 0-100
    overall_score: number; // weighted average
  };
  recommendation: 'primary' | 'secondary' | 'reject';
}
```

**RIDScheme**:
```typescript
interface RIDScheme {
  type: 'sequential' | 'chapter_based' | 'custom';
  pattern?: string; // e.g., "Chapter N: RID N00-N99"
  next_available: number;
  reserved_ranges: { start: number; end: number; }[];
  author_override: boolean;
}
```

---

## 🧪 TESTING STRATEGY

### Validation Test (CRITICAL)

**Test Manuscript**: `raw_manuscript_training.docx` (Caught in the Act)

**Test Objectives**:
1. Verify system handles real-world raw manuscript
2. Validate RID assignment for chapter-based scheme (Ch1=100-199, Ch2=200-299, etc.)
3. Process complete workflow: normalization → refinement → publication
4. Compare output quality to current manual process (decisions.txt baseline)
5. Verify URL discovery matches/exceeds: 100% Primary, 93.4% Secondary

**Test Criteria**:
- ✅ All citations detected and normalized
- ✅ RID scheme correctly identified and maintained
- ✅ Context captured accurately (>95% useful)
- ✅ Bibliographic data cleanly parsed
- ✅ Relevance text generated before validation
- ✅ URL discovery with soft 404/paywall detection working
- ✅ Primary URL coverage ≥100%
- ✅ Secondary URL coverage ≥93.4%
- ✅ All three publication formats generated successfully
- ✅ QR codes scannable and accurate
- ✅ Zero content loss (every manuscript word appears in output)
- ✅ Artifacts properly filtered (no TOC, page numbers, headers in final)

### Unit Tests
- Citation detection algorithms (all formats)
- RID assignment logic (uniqueness, scheme fitting)
- Context extraction
- Bibliographic parsing (multiple formats)
- URL analysis (soft 404, title matching, paywall detection)
- QR code generation
- Relevance text generation

### Integration Tests
- Document upload and analysis
- Claude API integration
- Database operations
- Citation-reference mapping
- Cascade regeneration on context change
- Publication generation pipeline

### End-to-End Tests
- Complete workflow simulation
- Multiple user scenarios
- Error handling and recovery
- Mobile interface responsiveness

---

## 📝 DELIVERABLES

### 1. Technical Specification Document
- Comprehensive architecture
- All design decisions documented
- API specifications
- UI/UX wireframes
- Component interactions
- Data flow diagrams
- Technology stack rationale

### 2. Complete Implementation
- Well-organized directory structure
- Six core components implemented
- Mobile-first responsive UI
- Claude API integration
- Database schema and migrations
- QR code generation system
- Publication format generators
- Configuration files
- Comprehensive tests

### 3. Test Results
- Test coverage report (target >80%)
- Raw manuscript processing results
- URL discovery effectiveness metrics
- Publication format samples (HTML, EPUB, Print)
- Performance benchmarks
- Mobile responsiveness testing
- Accessibility compliance report

### 4. Documentation
- Technical documentation (architecture, APIs, database)
- User documentation (author workflow guide)
- Deployment guide (environment setup, configuration)
- Maintenance guide (troubleshooting, updates)

---

## ⚠️ CRITICAL REQUIREMENTS

### Must-Haves for V1

1. ✅ **RID Assignment**: Only to empty brackets, preserve all numbered
2. ✅ **Uniqueness**: Absolute requirement for all RIDs
3. ✅ **Scheme Flexibility**: Handle ANY numbering pattern
4. ✅ **Pre-Validation Relevance**: Generate BEFORE validation phase
5. ✅ **Cascade Regeneration**: Context/biblio changes trigger updates
6. ✅ **URL Discovery**: Soft 404, title matching, paywall detection
7. ✅ **Mobile First**: Fully functional on phones and tablets
8. ✅ **Claude Integration**: Built into interface (not external)
9. ✅ **Multiple Instances**: Independent refinement per citation location
10. ✅ **QR Codes**: Print version with scannable codes only
11. ✅ **Three Formats**: HTML, EPUB, Print all generated successfully
12. ✅ **Zero Data Loss**: No manuscript content lost during processing
13. ✅ **Faithful Reproduction**: Preserve all content, filter artifacts
14. ✅ **Gap Analysis Optional**: Author can enable/disable suggestions
15. ✅ **Separate Branch**: Never modify existing Reference Refinement system

### Success Metrics

**Functional**:
- Complete workflow works end-to-end
- All six components functioning
- Mobile UI responsive across devices
- Publications generated successfully

**Quality**:
- Context accuracy >95% useful without modification
- Primary URL coverage ≥100%
- Secondary URL coverage ≥93.4%
- Professional publication quality
- Zero data loss verified
- Performance: 300-reference manuscript in <10 minutes

**Validation**:
- Raw manuscript processed successfully
- Output quality matches/exceeds manual process
- All publication formats tested
- QR codes tested with multiple scanning apps
- No critical bugs in core workflow

---

## 🚀 IMPLEMENTATION PHASES

### Phase 1: Foundation (Weeks 1-2)
- Project setup and repository structure
- Database schema and models
- Basic API endpoints
- File upload and storage
- Document parsing (DOCX, PDF, TXT)

### Phase 2: Document Analyzer (Weeks 3-4)
- Universal citation detection (all formats)
- Reference section parsing
- Citation-reference mapping
- RID assignment logic (empty brackets only)
- Numbering scheme analysis
- Document structure analysis
- Context capture algorithm

### Phase 3: Format Control & Validation (Weeks 5-6)
- Bibliographic parsing (multiple formats)
- URL extraction (Primary/Secondary/Other)
- Issue detection and flagging
- Validation rules
- Pre-validation relevance generation

### Phase 4: Claude Integration (Weeks 7-8)
- Claude API integration layer
- Context refinement assistance
- Bibliographic clarification
- Source suggestion
- In-app chat interface (mobile-optimized)

### Phase 5: Refinement Engine (Weeks 9-10)
- Variable starting state handling
- Cascade regeneration logic
- Search query generation (proven patterns)
- URL discovery with analysis (soft 404, paywall, title matching)
- Multiple instance tracking

### Phase 6: Reintegration & QR (Weeks 11-12)
- Citation replacement logic
- Reference section builder
- Content preservation with artifact filtering
- QR code generation system
- Format-specific processing

### Phase 7: Publication Generator (Weeks 13-14)
- HTML generator (clickable links)
- EPUB generator (EPUB 3.0, EPUBCheck validation)
- Print generator (QR codes, no printed URLs)
- Quality assurance checks
- Cross-platform testing

### Phase 8: Mobile UI (Weeks 15-16)
- Mobile-first responsive design
- All screen flows implemented
- Touch optimization
- Claude chat integration
- Progress dashboard
- Accessibility compliance

### Phase 9: Testing & Validation (Weeks 17-18)
- Unit test suite (>80% coverage)
- Integration tests
- End-to-end workflow tests
- Raw manuscript validation test
- Performance optimization
- Mobile device testing

### Phase 10: Documentation & Handoff (Weeks 19-20)
- Technical documentation
- API documentation
- User guide for authors
- Deployment guide
- Maintenance guide

---

## 📞 QUESTIONS FOR WEB SESSION

Before starting implementation, analyze and provide:

1. **Timeline Estimate**: Realistic timeline for complete V1
2. **Technology Choices**: Specific stack with rationale
3. **Architectural Decisions**: Major design decisions needing approval
4. **Resource Requirements**: Compute/storage/API cost estimates
5. **Risk Assessment**: Potential challenges and mitigation
6. **Test Strategy**: Detailed plan for raw manuscript validation
7. **Open Questions**: Any ambiguities requiring clarification

---

## 🎯 IMMEDIATE NEXT STEPS FOR WEB

1. ✅ Read complete specification thoroughly
2. ✅ Review raw_manuscript_training.docx structure
3. ✅ Analyze existing decisions.txt for URL discovery patterns
4. ✅ Create comprehensive technical specification document
5. ✅ Get architecture approval before implementation
6. ✅ Set up development environment on productized-system branch
7. ✅ Begin Phase 1 implementation

---

## ✅ FINAL CHECKLIST

Before considering V1 complete:

- [ ] All six core components implemented
- [ ] Mobile-first UI fully responsive
- [ ] Claude API integration working
- [ ] All three publication formats generating
- [ ] QR codes functional and scannable
- [ ] Raw manuscript processed successfully
- [ ] URL discovery matches baseline (100%/93.4%)
- [ ] Zero data loss verified
- [ ] Artifacts properly filtered
- [ ] Performance targets met
- [ ] Security review completed
- [ ] Documentation complete
- [ ] Deployment guide written
- [ ] Handoff to production ready

---

**Status**: READY FOR CLAUDE CODE WEB IMPLEMENTATION
**Branch**: productized-system
**Training Data**: raw_manuscript_training.docx
**Baseline**: decisions.txt (288 references, 100% Primary, 93.4% Secondary)
**Timeline**: 5-6 months for complete V1
**Priority**: High - Strategic project for productization

---

*Generated: November 8, 2025*
*For: Claude Code Web Implementation*
*Project: Reference Refinement System v2.0 (Productized)*
*Do Not Modify: Existing Reference Refinement system (main branch)*
