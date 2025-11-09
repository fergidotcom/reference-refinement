# Reference Refinement v2 - Technical Architecture

**Version:** 2.0.0
**Date:** November 9, 2025
**Status:** ✅ Integration Complete
**Branch:** v2-integration

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Component Architecture](#component-architecture)
4. [Type System](#type-system)
5. [Data Flow](#data-flow)
6. [Integration Patterns](#integration-patterns)
7. [Error Handling](#error-handling)
8. [Testing Strategy](#testing-strategy)
9. [Performance Optimization](#performance-optimization)
10. [Security Considerations](#security-considerations)

---

## System Overview

### High-Level Architecture

Reference Refinement v2 follows a **modular pipeline architecture** with five core components, an integration layer, and a CLI interface:

```
┌──────────────────────────────────────────────────────────────────┐
│                        v2 System Architecture                     │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Component Layer                           │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │                                                               │ │
│  │  Component 1       Component 2       Component 3             │ │
│  │  ┌───────────┐    ┌───────────┐    ┌───────────┐           │ │
│  │  │ Document  │───▶│  Format   │───▶│  Search   │           │ │
│  │  │ Analyzer  │    │Controller │    │  Engine   │           │ │
│  │  └───────────┘    └───────────┘    └───────────┘           │ │
│  │       │                                    │                  │ │
│  │       │                                    ▼                  │ │
│  │       │            Component 4       Component 5             │ │
│  │       │           ┌───────────┐    ┌───────────┐           │ │
│  │       └──────────▶│Refinement │───▶│  Output   │           │ │
│  │                   │  Engine   │    │ Generator │           │ │
│  │                   └───────────┘    └───────────┘           │ │
│  │                                                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Integration Layer                          │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │                                                               │ │
│  │  Pipeline Orchestration     Batch Processing                │ │
│  │  ┌─────────────────┐       ┌─────────────────┐             │ │
│  │  │  Reference      │       │     Batch       │             │ │
│  │  │  Pipeline       │       │   Processor     │             │ │
│  │  └─────────────────┘       └─────────────────┘             │ │
│  │                                                               │ │
│  │  Progress Tracking         Configuration                     │ │
│  │  ┌─────────────────┐       ┌─────────────────┐             │ │
│  │  │   Progress      │       │    Pipeline     │             │ │
│  │  │   Tracker       │       │     Config      │             │ │
│  │  └─────────────────┘       └─────────────────┘             │ │
│  │                                                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                      CLI Interface                           │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │                                                               │ │
│  │  process    validate    stats    resume                     │ │
│  │                                                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    External Dependencies                     │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │                                                               │ │
│  │  Anthropic Claude API      Google Custom Search API         │ │
│  │  (Query Gen + Ranking)     (URL Discovery)                  │ │
│  │                                                               │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
└──────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Core Technologies:**
- **Language:** TypeScript 5.9.3
- **Runtime:** Node.js 18+
- **Module System:** ESM (ES Modules)
- **Package Manager:** npm

**Framework & Libraries:**
- **CLI:** Commander.js 11.x (command parsing), Inquirer.js 9.x (interactive prompts)
- **API Client:** @anthropic-ai/sdk 0.68.0 (Claude API)
- **HTTP Client:** Native fetch() API (Node 18+)
- **Testing:** Jest 29.0.0 + ts-jest

**Optional UI Stack:**
- **Framework:** Next.js 16.0.1 + React 19.2.0
- **Database:** PostgreSQL + Prisma ORM 6.19.0
- **Styling:** Tailwind CSS 4.x

**Build Tools:**
- **Compiler:** TypeScript 5.9.3
- **Bundler:** Next.js Turbopack
- **Linter:** ESLint 9.x
- **Formatter:** Prettier 3.x

### Design Philosophy

**1. Modularity:**
- Each component is independent and reusable
- Components communicate via well-defined interfaces
- Easy to test, maintain, and extend

**2. Type Safety:**
- Strict TypeScript with no `any` types
- Comprehensive type definitions in unified type system
- Runtime type validation at boundaries

**3. Separation of Concerns:**
- Components handle single responsibilities
- Integration layer orchestrates components
- CLI provides user interface

**4. Testability:**
- Pure functions wherever possible
- Dependency injection for external services
- Comprehensive test coverage

**5. Performance:**
- Async/await for I/O operations
- Rate limiting to prevent API overload
- Progress tracking for long-running operations

**6. Reliability:**
- Error handling at every layer
- Automatic retry with exponential backoff
- Progress persistence for resumption

---

## Architecture Principles

### SOLID Principles

**Single Responsibility Principle:**
- Each component has one reason to change
- Document Analyzer: Extract and parse references
- Format Controller: Validate bibliographic format
- Search Engine: Discover URLs
- Refinement Engine: Rank and validate URLs
- Output Generator: Format output files

**Open/Closed Principle:**
- Components open for extension, closed for modification
- New search providers can be added without changing SearchEngine
- New output formats can be added without changing OutputGenerator

**Liskov Substitution Principle:**
- All components implement consistent interfaces
- Alternative implementations can be substituted

**Interface Segregation Principle:**
- Interfaces are small and focused
- Components only depend on methods they use

**Dependency Inversion Principle:**
- Components depend on abstractions, not implementations
- API clients injected via constructor

### Functional Programming Principles

**Immutability:**
- Data structures never mutated in place
- Pure functions return new objects
- State changes explicit and trackable

**Pure Functions:**
- Functions without side effects
- Same input always produces same output
- Easier to test and reason about

**Composition:**
- Small functions composed to build complex behavior
- Pipeline pattern for end-to-end processing
- Higher-order functions for reusability

---

## Component Architecture

### Component 1: Document Analyzer

**Purpose:** Extract and parse references from manuscripts

**Module Structure:**

```
lib/analyzer/
├── citation-detector.ts      # Detects citations (12+ formats)
├── reference-parser.ts        # Parses bibliographic data
├── rid-assigner.ts            # Assigns Reference IDs
├── context-capturer.ts        # Captures citation context
├── structure-analyzer.ts      # Analyzes document structure
└── index.ts                   # Public API exports
```

**Key Algorithms:**

**1. Citation Detection:**
```typescript
// Regex patterns for 12+ citation formats
const patterns = [
  /\[(\d+)\]/,                      // Numbered [1]
  /\(Author,?\s+\d{4}[a-z]?\)/,    // APA (Author, 2020)
  /Author\s+\(\d{4}[a-z]?\)/,      // Author (2020)
  // ... 9 more patterns
];

function detectCitations(text: string): CitationMatch[] {
  const matches: CitationMatch[] = [];

  for (const pattern of patterns) {
    const found = text.matchAll(pattern);
    for (const match of found) {
      matches.push({
        text: match[0],
        position: match.index,
        type: detectType(pattern)
      });
    }
  }

  return matches.sort((a, b) => a.position - b.position);
}
```

**2. RID Assignment:**
```typescript
// Smart RID assignment for unnumbered citations
function assignRID(citation: Citation, existing: Reference[]): string {
  // Check for explicit RID
  if (citation.rawText.match(/^\[(\d+)\]/)) {
    return RegExp.$1;
  }

  // Match by author-year
  const match = existing.find(ref =>
    ref.authors === citation.authors &&
    ref.year === citation.year
  );

  if (match) return match.rid;

  // Assign next available RID
  const maxRID = Math.max(...existing.map(r => parseInt(r.rid)));
  return String(maxRID + 1);
}
```

**3. Context Capture:**
```typescript
// Capture paragraph context around citation
function captureContext(citation: CitationMatch, text: string): Context {
  // Find paragraph boundaries
  const paragraphs = text.split(/\n\n+/);

  // Find paragraph containing citation
  let charCount = 0;
  for (let i = 0; i < paragraphs.length; i++) {
    const paraLength = paragraphs[i].length + 2; // +2 for \n\n

    if (charCount + paraLength > citation.position) {
      return {
        paragraph: paragraphs[i],
        location: i,
        surroundingText: extractSurrounding(citation.position, text)
      };
    }

    charCount += paraLength;
  }

  return { paragraph: '', location: -1, surroundingText: '' };
}
```

**Dependencies:**
- None (pure TypeScript)

**Exports:**
```typescript
export class DocumentAnalyzer {
  analyze(text: string): Reference[];
  detectCitations(text: string): CitationMatch[];
  parseCitation(citation: CitationMatch): Reference;
  assignRID(citation: Citation, existing: Reference[]): string;
  captureContext(citation: CitationMatch, text: string): Context;
}
```

---

### Component 2: Format Controller

**Purpose:** Validate and parse bibliographic format

**Module Structure:**

```
lib/format-controller/
├── author-extractor.ts        # Extracts author names
├── year-extractor.ts          # Extracts publication year
├── title-extractor.ts         # Extracts title
├── url-extractor.ts           # Extracts URLs from text
├── format-validator.ts        # Validates format consistency
├── bibliographic-parser.ts    # Parses bibliographic details
└── index.ts                   # Public API exports
```

**Key Algorithms:**

**1. Author Extraction:**
```typescript
// Extract authors from various formats
function extractAuthors(text: string): Author[] {
  const authors: Author[] = [];

  // Pattern: "LastName, F. M."
  const pattern1 = /([A-Z][a-z]+),\s+([A-Z]\.\s*)+/g;

  // Pattern: "LastName, FirstName"
  const pattern2 = /([A-Z][a-z]+),\s+([A-Z][a-z]+)/g;

  // Apply patterns and extract
  let match;
  while (match = pattern1.exec(text)) {
    authors.push({
      lastName: match[1],
      firstName: match[2].trim(),
      raw: match[0]
    });
  }

  // Handle "et al."
  if (text.includes('et al.')) {
    authors[authors.length - 1].etAl = true;
  }

  return authors;
}
```

**2. Title Extraction:**
```typescript
// Extract title (handles quotes, italics, case)
function extractTitle(text: string, year: string): string {
  // Remove RID and author/year
  let cleaned = text.replace(/^\[\d+\]/, '');
  cleaned = cleaned.replace(/.*\(\d{4}[a-z]?\)\.?\s*/, '');

  // Check for quoted title
  const quotedMatch = cleaned.match(/[""]([^""]+)[""]/);
  if (quotedMatch) return quotedMatch[1];

  // Check for italicized title (between periods)
  const parts = cleaned.split('.');
  if (parts.length >= 2) {
    return parts[0].trim();
  }

  // Take everything before publication venue
  const beforePub = cleaned.split(/\.\s+[A-Z]/).length > 0
    ? cleaned.split(/\.\s+[A-Z]/)[0]
    : cleaned;

  return beforePub.trim();
}
```

**3. Format Detection:**
```typescript
// Detect citation format (APA, MLA, Chicago)
function detectFormat(text: string): CitationFormat {
  const scores = { APA: 0, MLA: 0, Chicago: 0 };

  // APA indicators
  if (text.match(/\(\d{4}[a-z]?\)\./)) scores.APA += 2; // Year in parens
  if (text.match(/[A-Z]\.\s*[A-Z]\./)) scores.APA += 1; // Initials
  if (text.match(/&/)) scores.APA += 1; // Ampersand

  // MLA indicators
  if (text.match(/[A-Z][a-z]+,\s+[A-Z][a-z]+\./)) scores.MLA += 1; // Full first name
  if (text.match(/pp?\.\s*\d+-\d+/)) scores.MLA += 1; // Page numbers

  // Chicago indicators
  if (text.match(/,\s*no\.\s*\d+\s*\(\d{4}\):/)) scores.Chicago += 2;

  // Return highest scoring format
  const maxScore = Math.max(...Object.values(scores));
  if (maxScore === 0) return 'Unknown';

  const winner = Object.entries(scores).find(([_, score]) => score === maxScore);
  return winner ? winner[0] as CitationFormat : 'Unknown';
}
```

**Dependencies:**
- None (pure TypeScript)

**Exports:**
```typescript
export class FormatController {
  parse(text: string): BibliographicData;
  extractAuthors(text: string): Author[];
  extractYear(text: string): string;
  extractTitle(text: string, year: string): string;
  extractPublication(text: string): string;
  detectFormat(text: string): CitationFormat;
  validate(data: BibliographicData): FormatValidationResult;
}
```

---

### Component 3: Search Engine

**Purpose:** Discover candidate URLs via Google search

**Module Structure:**

```
lib/search-engine/
├── query-generator.ts         # AI-powered query generation
├── google-search-client.ts    # Google API integration
├── url-discoverer.ts          # URL discovery and deduplication
├── rate-limiter.ts            # Token bucket rate limiting
├── cost-tracker.ts            # Real-time cost tracking
├── search-config.ts           # Configuration management
└── index.ts                   # Public API exports
```

**Key Algorithms:**

**1. Query Generation (AI-Powered):**
```typescript
// Generate targeted search queries using Claude
async function generateQueries(
  reference: Reference,
  primaryCount: number,
  secondaryCount: number
): Promise<string[]> {
  const prompt = `
Generate ${primaryCount} primary queries (full-text sources)
and ${secondaryCount} secondary queries (reviews/analyses)
for this reference:

${reference.rawText}

BEST PRACTICES:
✓ Use exact title in quotes
✓ Keep queries 40-80 characters
✓ Prioritize free sources (filetype:pdf, site:archive.org)
✓ Use 1-2 quoted phrases max

PRIMARY QUERIES (${primaryCount}):
[Focus on full-text, free sources]

SECONDARY QUERIES (${secondaryCount}):
[Focus on reviews and analyses]
`;

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1000
  });

  // Parse queries from response
  return parseQueries(response.content[0].text);
}
```

**2. Rate Limiting (Token Bucket):**
```typescript
// Token bucket algorithm for rate limiting
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(queriesPerSecond: number, maxBurst: number) {
    this.maxTokens = maxBurst;
    this.tokens = maxBurst;
    this.refillRate = queriesPerSecond;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    // Refill tokens
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.maxTokens,
      this.tokens + elapsed * this.refillRate
    );
    this.lastRefill = now;

    // Wait if no tokens available
    if (this.tokens < 1) {
      const waitTime = (1 - this.tokens) / this.refillRate * 1000;
      await sleep(waitTime);
      this.tokens = 1;
    }

    // Consume token
    this.tokens -= 1;
  }
}
```

**3. Cost Tracking:**
```typescript
// Real-time cost tracking
class CostTracker {
  private googleCost = 0;
  private claudeCost = 0;

  trackGoogleQuery(): void {
    this.googleCost += 0.005; // $0.005 per query
  }

  trackClaudeAPI(inputTokens: number, outputTokens: number): void {
    // Sonnet 4 pricing (as of Jan 2025)
    const inputCost = (inputTokens / 1000) * 0.003;  // $3 per 1M input tokens
    const outputCost = (outputTokens / 1000) * 0.015; // $15 per 1M output tokens
    this.claudeCost += inputCost + outputCost;
  }

  getTotalCost(): number {
    return this.googleCost + this.claudeCost;
  }

  getCostBreakdown(): CostBreakdown {
    return {
      google: this.googleCost,
      claude: this.claudeCost,
      total: this.getTotalCost()
    };
  }
}
```

**Dependencies:**
- @anthropic-ai/sdk (Claude API)
- Native fetch() API (Google Custom Search)

**Exports:**
```typescript
export class SearchEngine {
  constructor(
    googleApiKey: string,
    googleCxId: string,
    claudeApiKey: string
  );

  generateQueries(
    reference: Reference,
    primaryCount: number,
    secondaryCount: number
  ): Promise<string[]>;

  search(
    queries: string[],
    resultsPerQuery: number
  ): Promise<SearchResult[]>;

  discoverURLs(reference: Reference): Promise<DiscoveryResult>;

  getCost(): CostBreakdown;
}
```

---

### Component 4: Refinement Engine

**Purpose:** Rank and validate candidate URLs

**Module Structure:**

```
lib/refinement-engine/
├── llm-ranker.ts              # AI-powered URL ranking
├── url-validator.ts           # 3-level soft 404 detection
├── url-selector.ts            # Select best URLs
├── refinement-config.ts       # Configuration
└── index.ts                   # Public API exports
```

**Key Algorithms:**

**1. AI-Powered Ranking:**
```typescript
// Rank URLs with Claude (primary + secondary scores)
async function rankURLs(
  urls: string[],
  reference: Reference
): Promise<RankedURL[]> {
  const prompt = `
Rank these URLs for this reference:

Reference: ${reference.rawText}

URLs:
${urls.map((url, i) => `${i}. ${url}`).join('\n')}

For each URL, provide:
- PRIMARY score (0-100): Full-text source likelihood
- SECONDARY score (0-100): Review/analysis likelihood

CRITICAL RULES:
• Full-text sources → HIGH primary, LOW secondary
• Reviews/analyses → LOW primary, HIGH secondary
• Mutual exclusivity: HIGH primary XOR HIGH secondary
• Non-English domains capped at PRIMARY:70
• Free sources preferred over paywalled

Format: INDEX|PRIMARY|SECONDARY|PRIMARY_REASON|SECONDARY_REASON
`;

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 4000
  });

  // Parse pipe-delimited rankings
  return parseRankings(response.content[0].text, urls);
}
```

**2. 3-Level Soft 404 Detection:**
```typescript
// Comprehensive soft 404 detection
async function validateURL(url: string): Promise<ValidationResult> {
  // Level 1: HTTP Status Check
  let response;
  try {
    response = await fetch(url, { method: 'HEAD', redirect: 'follow' });
  } catch (err) {
    return { valid: false, reason: `Connection failed: ${err.message}` };
  }

  if (response.status >= 400) {
    return { valid: false, reason: `HTTP ${response.status}` };
  }

  // Level 2: Content-Type Mismatch (PDF → HTML indicates error page)
  const contentType = response.headers.get('content-type') || '';
  if (url.endsWith('.pdf') && contentType.includes('html')) {
    return { valid: false, reason: 'PDF URL returns HTML (error page)' };
  }

  // Level 3: Content-Based Detection (fetch first 15KB, scan for errors)
  if (contentType.includes('html') || contentType.includes('text')) {
    const contentResponse = await fetch(url, { method: 'GET' });
    const reader = contentResponse.body.getReader();
    const decoder = new TextDecoder();

    let htmlContent = '';
    let bytesRead = 0;

    while (bytesRead < 15000) {
      const { done, value } = await reader.read();
      if (done) break;
      htmlContent += decoder.decode(value, { stream: true });
      bytesRead += value.length;
    }

    // Check for error patterns
    const errorPatterns = [
      { pattern: /404.*not found|not found.*404/i, name: 'Generic 404' },
      { pattern: /page not found|page cannot be found/i, name: 'Page not found' },
      { pattern: /sorry.*couldn't find.*page/i, name: 'Apologetic 404' },
      { pattern: /oops.*nothing here|there's nothing here/i, name: 'Playful 404' },
      { pattern: /doi not found|doi.*cannot be found/i, name: 'DOI not found' },
      { pattern: /document not found|document.*not available/i, name: 'Document unavailable' },
      { pattern: /item.*not found|handle.*not found/i, name: 'Repository item missing' },
      { pattern: /<title>[^<]*(404|not found|error)[^<]*<\/title>/i, name: 'Error in title' },
      { pattern: /access denied|forbidden/i, name: 'Access denied' },
      { pattern: /page no longer available|page has been removed/i, name: 'Page removed' },
      { pattern: /this page doesn't exist|page does not exist/i, name: 'Non-existent page' }
    ];

    for (const { pattern, name } of errorPatterns) {
      if (pattern.test(htmlContent)) {
        return { valid: false, reason: `Soft 404 detected: ${name}` };
      }
    }

    // Check for suspiciously short pages (likely error pages)
    if (htmlContent.length < 500) {
      return { valid: false, reason: 'Page suspiciously short (likely error)' };
    }
  }

  return { valid: true };
}
```

**3. URL Selection:**
```typescript
// Select best primary and secondary URLs
function selectURLs(
  rankings: RankedURL[],
  minPrimaryScore: number,
  minSecondaryScore: number
): SelectedURLs {
  // Filter to valid URLs only
  const valid = rankings.filter(r => r.valid);

  // Sort by primary score (descending)
  const sortedByPrimary = [...valid].sort((a, b) =>
    b.scores.primary - a.scores.primary
  );

  // Sort by secondary score (descending)
  const sortedBySecondary = [...valid].sort((a, b) =>
    b.scores.secondary - a.scores.secondary
  );

  // Select primary (first with score >= threshold)
  const primary = sortedByPrimary.find(r =>
    r.scores.primary >= minPrimaryScore
  );

  // Select secondary (first with score >= threshold, different from primary)
  const secondary = sortedBySecondary.find(r =>
    r.scores.secondary >= minSecondaryScore &&
    r.url !== primary?.url
  );

  return { primary, secondary };
}
```

**Dependencies:**
- @anthropic-ai/sdk (Claude API)
- Native fetch() API (URL validation)

**Exports:**
```typescript
export class RefinementEngine {
  constructor(claudeApiKey: string);

  rankURLs(
    urls: string[],
    reference: Reference
  ): Promise<RankedURL[]>;

  validateURLs(
    urls: string[],
    topN: number
  ): Promise<ValidationResult[]>;

  selectURLs(
    rankings: RankedURL[],
    validations: ValidationResult[]
  ): SelectedURLs;

  refine(
    candidateURLs: string[],
    reference: Reference
  ): Promise<RefinementResult>;
}
```

---

### Component 5: Output Generator

**Purpose:** Format output in multiple formats

**Module Structure:**

```
lib/output-generator/
├── decisions-formatter.ts     # Format decisions.txt
├── final-formatter.ts         # Format Final.txt
├── json-formatter.ts          # Format JSON
├── markdown-formatter.ts      # Format Markdown
└── index.ts                   # Public API exports
```

**Key Formats:**

**1. decisions.txt Format:**
```typescript
// Format working file with all metadata
function formatDecisions(references: Reference[]): string {
  return references.map(ref => {
    const lines = [];

    // Reference line with RID
    lines.push(`[${ref.rid}] ${ref.rawText}`);

    // Flags
    if (ref.flags) {
      const flags = [];
      if (ref.flags.finalized) flags.push('FINALIZED');
      if (ref.flags.manual_review) flags.push('MANUAL_REVIEW');
      if (ref.flags.batch_version) flags.push(`BATCH_${ref.flags.batch_version}`);
      if (flags.length > 0) {
        lines.push(`FLAGS[${flags.join(' ')}]`);
      }
    }

    // Relevance
    if (ref.relevance) {
      lines.push(`Relevance: ${ref.relevance}`);
    }

    // URLs
    if (ref.urls?.primary) lines.push(`Primary URL: ${ref.urls.primary}`);
    if (ref.urls?.secondary) lines.push(`Secondary URL: ${ref.urls.secondary}`);
    if (ref.urls?.tertiary) lines.push(`Tertiary URL: ${ref.urls.tertiary}`);

    // Queries
    if (ref.queries) {
      ref.queries.forEach(q => lines.push(`Q: ${q}`));
    }

    return lines.join('\n');
  }).join('\n\n');
}
```

**2. Final.txt Format:**
```typescript
// Format clean publication file (finalized refs only)
function formatFinal(references: Reference[]): string {
  const finalized = references.filter(ref =>
    ref.flags?.finalized === true
  );

  return finalized.map(ref => {
    const lines = [];

    // Reference line with RID
    lines.push(`[${ref.rid}] ${ref.rawText}`);

    // URLs only (no flags, queries, relevance)
    if (ref.urls?.primary) lines.push(`Primary URL: ${ref.urls.primary}`);
    if (ref.urls?.secondary) lines.push(`Secondary URL: ${ref.urls.secondary}`);

    return lines.join('\n');
  }).join('\n\n');
}
```

**Dependencies:**
- None (pure TypeScript)

**Exports:**
```typescript
export class OutputGenerator {
  formatDecisions(references: Reference[]): string;
  formatFinal(references: Reference[]): string;
  formatJSON(references: Reference[]): string;
  formatMarkdown(references: Reference[]): string;

  writeDecisions(references: Reference[], path: string): Promise<void>;
  writeFinal(references: Reference[], path: string): Promise<void>;
  writeJSON(references: Reference[], path: string): Promise<void>;
  writeMarkdown(references: Reference[], path: string): Promise<void>;
}
```

---

## Type System

### Unified Type System Architecture

All types are defined in `lib/types/index.ts` (490 lines). This unified file supports:

1. **Component 1-3 types** (parsed format)
2. **Component 4-5 types** (v1 decisions.txt format)
3. **Compatibility layer** (alias fields)

**Design Goal:** Single Reference interface compatible with all components.

### Core Types

**Reference Interface (Unified):**
```typescript
export interface Reference {
  // ===== Core Identity (both formats) =====
  rid: string;                    // Reference ID (primary)
  id?: string;                    // v1 format alias for rid

  // ===== Bibliographic Data (parsed format - C1-C3) =====
  authors: string | Author[];     // Union type: string OR structured
  year: string;
  title: string;
  publication: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  isbn?: string;
  format?: CitationFormat;        // APA, MLA, Chicago, etc.

  // ===== Raw Text (both formats) =====
  rawText: string;                // Original citation text (primary)
  text?: string;                  // v1 format alias for rawText

  // ===== URLs (both formats) =====
  url?: string;                   // Single URL (simple format)
  primaryUrl?: string;            // Primary URL (direct access)
  secondaryUrl?: string;          // Secondary URL (direct access)
  tertiaryUrl?: string;           // Tertiary URL (direct access)
  urls?: {                        // v1 format nested object
    primary?: string;
    secondary?: string;
    tertiary?: string;
  };

  // ===== Search & Ranking (Component 3-4) =====
  queries?: string[];             // Search queries used
  candidates?: CandidateURL[];    // All discovered URLs

  // ===== Validation (Component 4) =====
  validation?: {
    primary?: ValidationResult;
    secondary?: ValidationResult;
    tertiary?: ValidationResult;
  };

  // ===== Scores (Component 4) =====
  scores?: {
    primary?: number;             // Primary score (0-100)
    secondary?: number;           // Secondary score (0-100)
  };

  // ===== v1 Decisions.txt Format Fields (C4-C5) =====
  parsed?: {                      // v1 parsed data
    authors?: string;
    year?: string;
    title?: string;
    publication?: string;
    volume?: string;
    issue?: string;
    pages?: string;
    doi?: string;
    isbn?: string;
  };

  flags?: {                       // v1 flags
    finalized?: boolean;
    manual_review?: boolean;
    batch_version?: string;
    [key: string]: boolean | string | undefined;
  };

  relevance?: string;             // v1 relevance text

  meta?: Record<string, any>;     // v1 additional metadata

  metadata?: {                    // v1 structured metadata
    doi?: string;
    isbn?: string;
    url?: string;
    verified?: boolean;
    [key: string]: string | boolean | undefined;
  };

  // ===== Context (Component 1) =====
  context?: {
    paragraph?: string;
    location?: number;
    surroundingText?: string;
  };
}
```

**Key Design Decisions:**

1. **Union Types:** `authors: string | Author[]` supports both formats
2. **Alias Fields:** `id` alias for `rid`, `text` alias for `rawText`
3. **Nested vs Flat URLs:** Both `primaryUrl` and `urls.primary` supported
4. **Optional Everything:** All fields optional for maximum flexibility
5. **Extensible Flags:** `flags` allows arbitrary key-value pairs

### Supporting Types

**Author:**
```typescript
export interface Author {
  firstName: string;
  lastName: string;
  middleName?: string;
  suffix?: string;
  raw: string;                    // Original text
  etAl?: boolean;                 // "et al." indicator
}
```

**BibliographicData:**
```typescript
export interface BibliographicData {
  authors: Author[];
  year: string;
  title: string;
  publication: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  isbn?: string;
  url?: string;
  format?: CitationFormat;
  fullText?: string;              // Added for Component 3
}
```

**SearchResult:**
```typescript
export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  displayUrl?: string;
  query: string;                  // Which query found this
  position: number;               // Position in results (1-10)
}
```

**RankedURL:**
```typescript
export interface RankedURL {
  url: string;
  scores: {
    primary: number;              // 0-100
    secondary: number;            // 0-100
  };
  reasons: {
    primary: string;
    secondary: string;
  };
  valid: boolean;
  validationReason?: string;
}
```

**ValidationResult:**
```typescript
export interface ValidationResult {
  valid: boolean;
  reason?: string;                // Why invalid (if applicable)
  level?: 1 | 2 | 3;              // Which detection level caught it
  httpStatus?: number;
  contentType?: string;
}
```

### Type Guards

**Authors Type Guard:**
```typescript
// Safely handle string | Author[] union
function getAuthorsString(authors: string | Author[]): string {
  if (typeof authors === 'string') {
    return authors;
  }

  return authors.map(a =>
    `${a.firstName} ${a.lastName}`
  ).join(', ');
}
```

**Format Validation:**
```typescript
// Ensure format is never undefined
function ensureFormat(format: CitationFormat | undefined): CitationFormat {
  return format || 'Unknown';
}
```

---

## Data Flow

### End-to-End Pipeline Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     Input: Raw References                     │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              Component 1: Document Analyzer                   │
│                                                                │
│  Input:  Raw manuscript text                                  │
│  Output: Parsed references with RIDs                          │
│                                                                │
│  [                                                             │
│    {                                                           │
│      rid: '1',                                                 │
│      rawText: '[1] Author (2020). Title. Publisher.',        │
│      context: { paragraph: '...', location: 0 }              │
│    }                                                           │
│  ]                                                             │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│             Component 2: Format Controller                    │
│                                                                │
│  Input:  Raw reference text                                   │
│  Output: Structured bibliographic data                        │
│                                                                │
│  {                                                             │
│    rid: '1',                                                   │
│    authors: [{ firstName: 'A', lastName: 'Author' }],        │
│    year: '2020',                                              │
│    title: 'Title',                                            │
│    publication: 'Publisher',                                  │
│    format: 'APA'                                              │
│  }                                                             │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│              Component 3: Search Engine                       │
│                                                                │
│  Input:  Bibliographic data                                   │
│  Output: Candidate URLs + queries                             │
│                                                                │
│  {                                                             │
│    rid: '1',                                                   │
│    ...bibliographic data...,                                  │
│    queries: [                                                  │
│      'Author 2020 "Title" filetype:pdf',                     │
│      'Author 2020 site:archive.org',                         │
│      ...                                                       │
│    ],                                                          │
│    candidates: [                                               │
│      { url: 'https://archive.org/...', ... },                │
│      { url: 'https://jstor.org/...', ... },                  │
│      ...                                                       │
│    ]                                                           │
│  }                                                             │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│            Component 4: Refinement Engine                     │
│                                                                │
│  Input:  Candidate URLs + bibliographic data                  │
│  Output: Ranked & validated URLs                              │
│                                                                │
│  {                                                             │
│    rid: '1',                                                   │
│    ...previous data...,                                       │
│    urls: {                                                     │
│      primary: 'https://archive.org/...',                     │
│      secondary: 'https://jstor.org/...'                      │
│    },                                                          │
│    scores: {                                                   │
│      primary: 95,                                             │
│      secondary: 90                                            │
│    },                                                          │
│    validation: {                                               │
│      primary: { valid: true },                               │
│      secondary: { valid: true }                              │
│    }                                                           │
│  }                                                             │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│            Component 5: Output Generator                      │
│                                                                │
│  Input:  Refined references                                   │
│  Output: Multiple formats                                     │
│                                                                │
│  - decisions.txt (working file with all metadata)            │
│  - Final.txt (clean publication format)                      │
│  - references.json (structured data)                         │
│  - references.md (human-readable)                            │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                Output: Refined References                     │
└──────────────────────────────────────────────────────────────┘
```

### Data Transformations

**Raw Text → Parsed Reference:**
```
"[1] Author (2020). Title. Publisher."

↓ Component 1 (Document Analyzer)

{
  rid: '1',
  rawText: '[1] Author (2020). Title. Publisher.',
  context: { ... }
}

↓ Component 2 (Format Controller)

{
  rid: '1',
  rawText: '[1] Author (2020). Title. Publisher.',
  authors: [{ firstName: 'A', lastName: 'Author' }],
  year: '2020',
  title: 'Title',
  publication: 'Publisher',
  format: 'APA'
}
```

**Parsed Reference → Queries:**
```
{
  rid: '1',
  authors: [{ firstName: 'A', lastName: 'Author' }],
  year: '2020',
  title: 'Title',
  publication: 'Publisher'
}

↓ Component 3 (Search Engine - AI Query Generation)

{
  rid: '1',
  ...bibliographic data...,
  queries: [
    'Author 2020 "Title" filetype:pdf',
    'Author 2020 site:archive.org',
    'Author 2020 site:researchgate.net',
    '"Title" Author full text pdf',
    'review "Title" Author 2020',
    '"Title" analysis scholarly'
  ]
}
```

**Queries → Candidate URLs:**
```
{
  rid: '1',
  queries: ['Author 2020 "Title" filetype:pdf', ...]
}

↓ Component 3 (Search Engine - Google Search)

{
  rid: '1',
  queries: [...],
  candidates: [
    { url: 'https://archive.org/...', title: '...', snippet: '...' },
    { url: 'https://jstor.org/...', title: '...', snippet: '...' },
    { url: 'https://researchgate.net/...', title: '...', snippet: '...' },
    ...
  ]
}
```

**Candidates → Ranked & Validated:**
```
{
  rid: '1',
  candidates: [
    { url: 'https://archive.org/...', ... },
    { url: 'https://jstor.org/...', ... },
    ...
  ]
}

↓ Component 4 (Refinement Engine - AI Ranking + Validation)

{
  rid: '1',
  urls: {
    primary: 'https://archive.org/...',
    secondary: 'https://jstor.org/...'
  },
  scores: {
    primary: 95,
    secondary: 90
  },
  validation: {
    primary: { valid: true },
    secondary: { valid: true }
  }
}
```

**Refined Reference → Output Formats:**
```
{
  rid: '1',
  rawText: '[1] Author (2020). Title. Publisher.',
  urls: {
    primary: 'https://archive.org/...',
    secondary: 'https://jstor.org/...'
  },
  flags: { finalized: true, batch_version: 'v16.7' }
}

↓ Component 5 (Output Generator)

decisions.txt:
[1] Author (2020). Title. Publisher.
FLAGS[FINALIZED BATCH_v16.7]
Primary URL: https://archive.org/...
Secondary URL: https://jstor.org/...

Final.txt:
[1] Author (2020). Title. Publisher.
Primary URL: https://archive.org/...
Secondary URL: https://jstor.org/...

JSON:
{
  "references": [
    {
      "id": "1",
      "text": "[1] Author (2020). Title. Publisher.",
      "urls": { "primary": "...", "secondary": "..." },
      "flags": { "finalized": true, "batch_version": "v16.7" }
    }
  ]
}
```

---

## Integration Patterns

### Pipeline Pattern

**Orchestration:**
```typescript
// Main pipeline orchestrates components sequentially
class ReferencePipeline {
  async process(input: string): Promise<Reference[]> {
    // Step 1: Analyze document
    const references = await this.analyzer.analyze(input);

    // Step 2: Parse format for each reference
    const parsed = references.map(ref =>
      this.formatController.parse(ref.rawText)
    );

    // Step 3: Search for URLs
    const searched = await Promise.all(
      parsed.map(ref => this.searchEngine.discoverURLs(ref))
    );

    // Step 4: Rank and validate
    const refined = await Promise.all(
      searched.map(ref => this.refinementEngine.refine(ref.candidates, ref))
    );

    // Step 5: Generate output
    await this.outputGenerator.writeDecisions(refined, 'decisions.txt');
    await this.outputGenerator.writeFinal(refined, 'Final.txt');

    return refined;
  }
}
```

### Dependency Injection

**Configuration Injection:**
```typescript
// Components receive configuration via constructor
class SearchEngine {
  constructor(
    private googleApiKey: string,
    private googleCxId: string,
    private claudeApiKey: string,
    private config: SearchConfig
  ) {
    this.rateLimiter = new RateLimiter(
      config.queriesPerSecond,
      config.maxBurst
    );

    this.costTracker = new CostTracker();
  }
}
```

### Progress Tracking

**Progress Persistence:**
```typescript
// Track progress for resumption
class ProgressTracker {
  private progress: BatchProgress;

  async updateProgress(batchId: string, refId: string, stage: string) {
    this.progress.completedRefs.push(refId);
    this.progress.lastStage = stage;
    this.progress.timestamp = Date.now();

    // Persist to disk
    await this.save(`batch-progress-${batchId}.json`);
  }

  async canResume(batchId: string): Promise<boolean> {
    const progress = await this.load(`batch-progress-${batchId}.json`);
    return progress !== null && progress.completedRefs.length > 0;
  }

  async resume(batchId: string): Promise<BatchProgress> {
    return await this.load(`batch-progress-${batchId}.json`);
  }
}
```

### Error Recovery

**Retry with Exponential Backoff:**
```typescript
// Retry failed operations with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      if (attempt === maxRetries - 1) {
        throw err; // Last attempt, rethrow
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1} after ${delay}ms`);
      await sleep(delay);
    }
  }

  throw new Error('Should not reach here');
}

// Usage
const rankings = await retryWithBackoff(
  () => this.refinementEngine.rankURLs(urls, reference),
  3,  // Max 3 retries
  1000 // Start with 1s delay
);
```

---

## Error Handling

### Error Types

**1. Network Errors:**
- API timeout
- Connection refused
- DNS failure

**2. API Errors:**
- Rate limit exceeded
- Invalid API key
- Quota exceeded
- Request too large

**3. Validation Errors:**
- Invalid reference format
- Missing required fields
- Invalid configuration

**4. Processing Errors:**
- Failed to parse reference
- Failed to generate queries
- Failed to rank URLs

### Error Handling Strategy

**Component-Level:**
```typescript
// Each component handles its own errors
class FormatController {
  parse(text: string): BibliographicData {
    try {
      const authors = this.extractAuthors(text);
      const year = this.extractYear(text);
      const title = this.extractTitle(text, year);

      return { authors, year, title, ... };
    } catch (err) {
      // Log error
      console.error(`Failed to parse reference: ${err.message}`);

      // Return partial data
      return {
        authors: [],
        year: '',
        title: text,  // Fallback to raw text
        publication: '',
        format: 'Unknown'
      };
    }
  }
}
```

**Pipeline-Level:**
```typescript
// Pipeline handles component errors
class ReferencePipeline {
  async processSingle(reference: Reference): Promise<Reference> {
    const result = { ...reference };

    try {
      // Step 1: Parse format
      const parsed = this.formatController.parse(reference.rawText);
      Object.assign(result, parsed);
    } catch (err) {
      console.error(`Format parsing failed for RID ${reference.rid}: ${err.message}`);
      result.errors = result.errors || [];
      result.errors.push('Format parsing failed');
    }

    try {
      // Step 2: Search for URLs
      const searched = await this.searchEngine.discoverURLs(result);
      result.candidates = searched.urls;
      result.queries = searched.queries;
    } catch (err) {
      console.error(`URL discovery failed for RID ${reference.rid}: ${err.message}`);
      result.errors = result.errors || [];
      result.errors.push('URL discovery failed');
      // Continue without URLs
    }

    try {
      // Step 3: Rank and validate
      if (result.candidates && result.candidates.length > 0) {
        const refined = await this.refinementEngine.refine(result.candidates, result);
        result.urls = refined.urls;
        result.scores = refined.scores;
      }
    } catch (err) {
      console.error(`Refinement failed for RID ${reference.rid}: ${err.message}`);
      result.errors = result.errors || [];
      result.errors.push('Refinement failed');
      // Continue without rankings
    }

    return result;
  }
}
```

**User-Level:**
```typescript
// CLI shows user-friendly errors
try {
  const pipeline = new ReferencePipeline(config);
  const results = await pipeline.process(input);

  console.log(`✓ Processed ${results.length} references`);
} catch (err) {
  if (err.message.includes('API key')) {
    console.error('❌ Invalid API key. Please check your configuration.');
    console.error('   Set ANTHROPIC_API_KEY and GOOGLE_API_KEY in config.yaml');
  } else if (err.message.includes('quota')) {
    console.error('❌ API quota exceeded. Please wait or upgrade your plan.');
  } else if (err.message.includes('timeout')) {
    console.error('❌ Request timed out. Please try again or reduce batch size.');
  } else {
    console.error(`❌ Processing failed: ${err.message}`);
  }

  process.exit(1);
}
```

---

## Testing Strategy

### Test Pyramid

```
            ▲
           ╱ ╲
          ╱   ╲
         ╱ E2E ╲          5 tests (integration)
        ╱───────╲
       ╱  Comp.  ╲        80 tests (component)
      ╱───────────╲
     ╱    Unit     ╲      200+ tests (unit)
    ╱───────────────╲
   ╱                 ╲
  ╱───────────────────╲
```

### Unit Tests

**Pure Function Tests:**
```typescript
// Test pure functions in isolation
describe('Author Extraction', () => {
  test('should extract single author', () => {
    const text = 'Ferguson, J. (2024). Title.';
    const authors = extractAuthors(text);

    expect(authors).toHaveLength(1);
    expect(authors[0].lastName).toBe('Ferguson');
    expect(authors[0].firstName).toBe('J');
  });

  test('should extract multiple authors', () => {
    const text = 'Berger, P. L., & Luckmann, T. (1966). Title.';
    const authors = extractAuthors(text);

    expect(authors).toHaveLength(2);
    expect(authors[0].lastName).toBe('Berger');
    expect(authors[1].lastName).toBe('Luckmann');
  });

  test('should handle et al.', () => {
    const text = 'Smith, J., et al. (2020). Title.';
    const authors = extractAuthors(text);

    expect(authors).toHaveLength(1);
    expect(authors[0].etAl).toBe(true);
  });
});
```

### Component Tests

**Component Integration:**
```typescript
// Test component workflows
describe('FormatController Integration', () => {
  let controller: FormatController;

  beforeAll(() => {
    controller = new FormatController();
  });

  test('should parse 288 real references', () => {
    const input = readFileSync('test-data/caught-in-the-act-refs.txt', 'utf-8');
    const parsed = controller.parseMany(input);

    expect(parsed.length).toBeGreaterThanOrEqual(280);

    // Check author extraction rate
    const withAuthors = parsed.filter(ref => ref.authors.length > 0);
    expect(withAuthors.length / parsed.length).toBeGreaterThan(0.95);

    // Check year extraction rate
    const withYear = parsed.filter(ref => ref.year.length > 0);
    expect(withYear.length / parsed.length).toBeGreaterThan(0.95);
  });
});
```

### Integration Tests

**End-to-End Pipeline:**
```typescript
// Test complete pipeline
describe('Pipeline Integration', () => {
  let pipeline: ReferencePipeline;

  beforeAll(() => {
    pipeline = new ReferencePipeline('test-config.yaml');
  });

  test('should process 5 test references end-to-end', async () => {
    const input = `
[1] Ferguson, J. (2024). Authoritarian ascent in the USA. Amazon.
[2] Gergen, K. J. (1999). An Invitation to Social Construction. SAGE.
[3] Berger, P. L., & Luckmann, T. (1966). The Social Construction of Reality. Doubleday.
[4] Kuhn, T. S. (1962). The Structure of Scientific Revolutions. Chicago.
[5] Tversky, A., & Kahneman, D. (1974). Judgment under uncertainty. Science, 185(4157), 1124-1131.
    `.trim();

    const results = await pipeline.process(input);

    // Check all references processed
    expect(results).toHaveLength(5);

    // Check all have primary URLs
    const withPrimary = results.filter(r => r.urls?.primary);
    expect(withPrimary.length).toBeGreaterThan(3); // At least 4/5

    // Check cost tracking
    const cost = pipeline.getTotalCost();
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(1.00); // Should be ~$0.70 for 5 refs
  }, 300000); // 5 minute timeout
});
```

### Test Data

**Real-World Data:**
- 288 references from "Caught In The Act" manuscript
- Multiple citation formats (APA, MLA, Chicago)
- Edge cases (et al., special characters, non-English)
- Known broken URLs for validation testing

**Test Files:**
- `test-data/caught-in-the-act-refs.txt` - 288 references
- `test-data/caught-in-the-act-decisions.txt` - Processed with URLs
- `test-data/test-5-refs.txt` - Quick test set
- `test-data/broken-urls.txt` - URLs for soft 404 testing

---

## Performance Optimization

### Bottleneck Analysis

**Current Performance (per reference):**
- Parse format: <1s
- Generate queries: ~5-10s (Claude API)
- Search URLs: ~8s (Google API, 8 queries)
- Rank URLs: ~10-30s (Claude API, depends on candidate count)
- Validate URLs: ~6-12s (HTTP requests, top 20)
- **Total: ~30-60s per reference**

**Bottlenecks:**
1. **Claude API calls** (query generation + ranking): ~15-40s
2. **Google API calls** (search): ~8s
3. **URL validation** (HTTP requests): ~6-12s

### Optimization Strategies

**1. Parallel Processing:**
```typescript
// Process multiple references in parallel
async function processBatch(
  references: Reference[],
  concurrency: number = 5
): Promise<Reference[]> {
  const results: Reference[] = [];

  for (let i = 0; i < references.length; i += concurrency) {
    const batch = references.slice(i, i + concurrency);
    const processed = await Promise.all(
      batch.map(ref => this.processSingle(ref))
    );
    results.push(...processed);
  }

  return results;
}

// 5 references in parallel → ~30-60s instead of 150-300s
```

**2. Caching:**
```typescript
// Cache query generation results
class QueryCache {
  private cache = new Map<string, string[]>();

  async generateQueries(reference: Reference): Promise<string[]> {
    // Create cache key from reference
    const key = `${reference.authors}-${reference.year}-${reference.title}`;

    // Check cache
    if (this.cache.has(key)) {
      console.log('✓ Using cached queries');
      return this.cache.get(key)!;
    }

    // Generate and cache
    const queries = await this.queryGenerator.generate(reference);
    this.cache.set(key, queries);

    return queries;
  }
}
```

**3. Reduce API Calls:**
```typescript
// Batch ranking instead of per-candidate
async function rankURLsBatch(
  urls: string[],
  reference: Reference,
  batchSize: number = 50
): Promise<RankedURL[]> {
  // Instead of 1 API call per 10 URLs (many calls)
  // Make 1 API call for all URLs up to 50

  if (urls.length <= batchSize) {
    return await this.rankAll(urls, reference);
  }

  // If >50 URLs, process in batches
  const results: RankedURL[] = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const ranked = await this.rankAll(batch, reference);
    results.push(...ranked);
  }

  return results;
}
```

**4. Optimize Validation:**
```typescript
// Validate only top candidates (not all)
async function selectURLsOptimized(
  rankings: RankedURL[],
  validateTopN: number = 20
): Promise<SelectedURLs> {
  // Sort by primary score
  const sorted = rankings.sort((a, b) => b.scores.primary - a.scores.primary);

  // Validate only top N candidates (not all)
  const toValidate = sorted.slice(0, validateTopN);
  const validations = await Promise.all(
    toValidate.map(r => this.validateURL(r.url))
  );

  // Mark validated URLs
  for (let i = 0; i < toValidate.length; i++) {
    toValidate[i].valid = validations[i].valid;
  }

  // Select from validated only
  return this.selectBestURLs(toValidate);
}
```

### Expected Improvements

**With Optimizations:**
- Parallel processing (5x concurrency): 5x speedup on multi-reference batches
- Caching: ~30% speedup on similar references
- Batch ranking: ~40% reduction in API calls
- Optimized validation: ~50% reduction in HTTP requests

**Estimated Performance (optimized):**
- 10 references: ~2-3 minutes (vs 5-10 minutes)
- 50 references: ~10-15 minutes (vs 25-50 minutes)
- 100 references: ~20-30 minutes (vs 50-100 minutes)

---

## Security Considerations

### API Key Management

**Environment Variables:**
```bash
# Never commit API keys to git
# Use environment variables or config files

export GOOGLE_API_KEY="your-key"
export ANTHROPIC_API_KEY="your-key"

# Or use config.yaml (add to .gitignore)
```

**Configuration File:**
```yaml
# config.yaml (add to .gitignore!)
google:
  api_key: "YOUR_KEY"  # NEVER commit this

anthropic:
  api_key: "YOUR_KEY"  # NEVER commit this
```

### Input Validation

**Reference Text:**
```typescript
// Validate reference text before processing
function validateReferenceText(text: string): void {
  // Check length
  if (text.length > 10000) {
    throw new Error('Reference text too long (max 10,000 characters)');
  }

  // Check for injection attempts
  if (text.includes('<script>') || text.includes('javascript:')) {
    throw new Error('Invalid characters in reference text');
  }

  // Check for reasonable format
  if (!text.match(/\[\d+\]/) && !text.match(/\(\d{4}\)/)) {
    console.warn('Reference may not be in standard format');
  }
}
```

### URL Validation

**Prevent SSRF:**
```typescript
// Prevent Server-Side Request Forgery
function validateURL(url: string): void {
  try {
    const parsed = new URL(url);

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Only HTTP/HTTPS URLs allowed');
    }

    // Block private IP ranges
    const privateRanges = [
      /^127\./,           // Localhost
      /^10\./,            // Private class A
      /^172\.(1[6-9]|2[0-9]|3[01])\./,  // Private class B
      /^192\.168\./,      // Private class C
      /^169\.254\./       // Link-local
    ];

    const hostname = parsed.hostname;
    for (const range of privateRanges) {
      if (range.test(hostname)) {
        throw new Error('Private IP ranges not allowed');
      }
    }
  } catch (err) {
    throw new Error(`Invalid URL: ${err.message}`);
  }
}
```

### Rate Limiting

**Prevent API Abuse:**
```typescript
// Token bucket rate limiter
class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private queriesPerSecond: number,
    private maxBurst: number
  ) {
    this.tokens = maxBurst;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    // Refill tokens based on time elapsed
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(
      this.maxBurst,
      this.tokens + elapsed * this.queriesPerSecond
    );
    this.lastRefill = now;

    // Wait if no tokens available
    if (this.tokens < 1) {
      const waitTime = (1 - this.tokens) / this.queriesPerSecond * 1000;
      await sleep(waitTime);
      this.tokens = 1;
    }

    this.tokens -= 1;
  }
}
```

### Error Disclosure

**Don't Leak Sensitive Info:**
```typescript
// Sanitize error messages for users
function sanitizeError(err: Error): string {
  // Never expose API keys or internal paths
  let message = err.message;

  // Remove API keys
  message = message.replace(/[a-zA-Z0-9]{20,}/g, '***');

  // Remove file paths
  message = message.replace(/\/[\w\/]+/g, '***');

  // Generic message for unknown errors
  if (message.includes('ECONNREFUSED') || message.includes('ETIMEDOUT')) {
    return 'Network error. Please check your connection.';
  }

  return message;
}

// Usage
try {
  await processReference(ref);
} catch (err) {
  console.error(sanitizeError(err));
}
```

---

## Appendix

### File Manifest

**Core Library (lib/):**
- analyzer/ - 6 files
- format-controller/ - 7 files
- search-engine/ - 7 files
- refinement-engine/ - 5 files
- output-generator/ - 5 files
- pipeline/ - 5 files
- types/ - 1 file (490 lines)

**CLI (cli/):**
- commands/ - 4 files
- index.ts - 1 file

**Tests (__tests__):**
- analyzer/ - 5 test files
- format-controller/ - 5 test files
- search-engine/ - 5 test files
- refinement-engine/ - 5 test files
- output-generator/ - 5 test files
- integration/ - 5 test files

**Configuration:**
- config.example.yaml
- tsconfig.json
- jest.config.js
- package.json

**Documentation:**
- README.md
- V2_INTEGRATION_COMPLETE.md
- V2_COMPLETE_SYSTEM.md
- V2_ARCHITECTURE.md (this file)

**Total Files:** 43 TypeScript modules + 30 test files + 10 config/docs = 83 files

### Glossary

**RID** - Reference ID, unique identifier for each reference (e.g., "123")

**Soft 404** - HTTP 200 response that's actually an error page

**Citation Format** - Bibliographic style (APA, MLA, Chicago, etc.)

**Primary URL** - Main/canonical source for the reference

**Secondary URL** - Backup/alternative source (often a review)

**Candidate URL** - Potential URL discovered during search

**Ranked URL** - Candidate URL with primary/secondary scores

**Validated URL** - Ranked URL that passed 3-level validation

**Finalized Reference** - Reference marked as complete and approved

**Batch Version** - Version tag for batch processor (e.g., "v16.7")

**Manual Review Flag** - Flag indicating human review needed

**Token Bucket** - Rate limiting algorithm

**PKCE** - Proof Key for Code Exchange (OAuth security)

**ESM** - ES Modules (modern JavaScript module system)

---

**Version:** 2.0.0
**Last Updated:** November 9, 2025
**Status:** ✅ Integration Complete
**Branch:** v2-integration
**Next:** Testing → Pull Request → Production Deployment
