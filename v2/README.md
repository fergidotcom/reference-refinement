# Reference Refinement v2 - Document Analyzer

Component 1 of the productized Reference Refinement system.

## Overview

The Document Analyzer provides comprehensive document analysis capabilities for academic manuscripts and their references:

- **Citation Detection**: Detects 10+ citation formats including [100], [], (100), superscripts, author-year, etc.
- **Reference Parsing**: Extracts bibliographic information (author, year, title, publication) from reference entries
- **RID Assignment**: Smart assignment of Reference IDs to unnumbered citations based on context and title matching
- **Context Capture**: Extracts sentences, paragraphs, and contextual information around citations
- **Structure Analysis**: Identifies document structure (chapters, sections, hierarchies)

## Installation

```bash
cd v2
npm install
```

## Usage

### Basic Usage

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

### Individual Components

```typescript
import {
  CitationDetector,
  ReferenceParser,
  ContextCapturer,
  StructureAnalyzer,
  RIDAssigner
} from './lib/analyzer';

// Detect citations
const detector = new CitationDetector(documentText);
const citations = detector.detectAll();

// Parse references
const parser = new ReferenceParser(referencesText);
const references = parser.parseAll();

// Capture context
const capturer = new ContextCapturer(documentText);
const contexts = capturer.captureContexts(citations.citations);

// Analyze structure
const structureAnalyzer = new StructureAnalyzer(documentText);
const structure = structureAnalyzer.analyze();

// Assign RIDs
const assigner = new RIDAssigner(documentText, references.references);
const assignments = await assigner.assignAll(unnumberedCitations);
```

## Components

### 1. Citation Detector (`citation-detector.ts`)

Detects citations in 12+ formats:

1. `[100]` - Standard numbered bracket citation
2. `[]` - Unnumbered bracket (needs RID assignment)
3. `[100-102]` - Range citations
4. `[100, 101]` - Multiple citations
5. `[100; 101]` - Semicolon-separated
6. `(100)` - Parenthetical numbered
7. `()` - Unnumbered parenthetical
8. `¹ ² ³` - Superscript numbers
9. `[Smith 2020]` - Author-year in brackets
10. `(Smith 2020)` - Author-year in parentheses
11. `[*]` - Asterisk/symbol citations
12. `[a] [b]` - Letter citations

### 2. Reference Parser (`reference-parser.ts`)

Parses reference entries in academic formats:

```
[100] Author, A. (YYYY). Title. Publisher/Journal.
```

Extracts:
- RID (Reference ID)
- Authors
- Year
- Title
- Publication information
- Metadata (DOI, ISBN, URLs)

### 3. Context Capturer (`context-capturer.ts`)

Captures context around citations:

- Sentence containing the citation
- Paragraph containing the citation
- N characters before/after
- Word counts
- Citation density analysis
- Citation clusters

### 4. Structure Analyzer (`structure-analyzer.ts`)

Identifies document structure:

- Document title
- Chapters (e.g., "Chapter 1: Title")
- Sections (numbered and text-based)
- Hierarchical relationships
- Table of contents generation

### 5. RID Assigner (`rid-assigner.ts`)

Smart RID assignment with:

- Title matching (≥0.55 Primary, ≥0.45 Secondary)
- Chapter-based RID ranges (100-199, 200-299, etc.)
- Rate limiting (100ms between assignments)
- Confidence scoring
- Validation and conflict detection

**Key Rules:**
- Only assigns RIDs to empty brackets `[]`
- Preserves numbered brackets `[42]` exactly
- Uses context and keywords for matching
- Respects chapter boundaries

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

## Configuration

```typescript
interface AnalyzerConfig {
  /** Context window size (characters before/after citation) */
  contextWindowSize?: number;  // Default: 200

  /** Minimum confidence for RID assignment */
  minConfidence?: number;  // Default: 0.45

  /** Rate limiting delay (ms) */
  rateLimitDelay?: number;  // Default: 100

  /** Title matching thresholds */
  titleMatching?: {
    primaryThreshold: number;    // Default: 0.55
    secondaryThreshold: number;  // Default: 0.45
  };
}
```

## Training Data

Tested against:
- **Manuscript**: `manuscript_content.txt` (1616 lines, "Caught In The Act")
- **References**: `250904 Caught In The Act - REFERENCES ONLY.txt` (288 references)

## Success Criteria

✅ Detect all 288 citations
✅ Parse all 288 references
✅ Assign RIDs correctly (chapter-based: 100-199, 200-299)
✅ Context accuracy >95%
✅ Title matching with confidence scores
✅ Rate limiting compliance

## Architecture

```
v2/
├── lib/
│   ├── analyzer/
│   │   ├── citation-detector.ts
│   │   ├── reference-parser.ts
│   │   ├── rid-assigner.ts
│   │   ├── context-capturer.ts
│   │   ├── structure-analyzer.ts
│   │   └── index.ts
│   └── types/
│       └── index.ts
├── __tests__/
│   └── analyzer/
│       └── integration.test.ts
├── package.json
├── tsconfig.json
├── jest.config.js
└── test-runner.ts
```

## API Documentation

### DocumentAnalyzer

Main class for complete document analysis.

#### Methods

- `analyze(documentText, referencesText)`: Complete analysis
- `analyzeCitations(documentText)`: Citation-only analysis
- `analyzeReferences(referencesText)`: Reference-only analysis
- `generateReport(documentText, referencesText)`: Generate markdown report

### CitationDetector

Citation detection across multiple formats.

#### Methods

- `detectAll()`: Detect all citations in document
- `getCitationsForLine(lineNumber)`: Get citations on specific line
- `getUnnumberedCitations()`: Get all unnumbered citations
- `getStatistics()`: Get detection statistics

### ReferenceParser

Parse reference entries and extract bibliographic information.

#### Methods

- `parseAll()`: Parse all references
- `parseReference(text)`: Parse single reference
- `findByRID(rid)`: Find reference by RID
- `searchByTitle(query, threshold)`: Search by title similarity
- `getStatistics()`: Get parsing statistics

### ContextCapturer

Capture contextual information around citations.

#### Methods

- `captureContext(citation)`: Capture context for single citation
- `captureContexts(citations)`: Capture contexts for multiple citations
- `extractSnippet(citation, size)`: Extract display snippet
- `analyzeDensity(citations)`: Analyze citation density
- `findCitationClusters(citations)`: Find citation clusters

### StructureAnalyzer

Analyze document structure and hierarchy.

#### Methods

- `analyze()`: Analyze complete structure
- `findSectionAtPosition(position)`: Find section at character position
- `findSectionAtLine(lineNumber)`: Find section at line number
- `getSectionsByLevel(level)`: Get all sections at specific level
- `getTableOfContents()`: Generate table of contents
- `getStatistics()`: Get structure statistics

### RIDAssigner

Smart RID assignment to unnumbered citations.

#### Methods

- `assignAll(unnumberedCitations)`: Assign RIDs to all unnumbered citations
- `assignRID(citation)`: Assign RID to single citation
- `getStatistics(assignments)`: Get assignment statistics
- `validateAssignments(assignments)`: Validate and check for conflicts

## License

Part of the Reference Refinement project.

## Status

✅ **COMPLETE** - Component 1 (Document Analyzer) ready for testing and integration.
