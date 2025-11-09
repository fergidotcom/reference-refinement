# Reference Refinement v2 - Format Controller

**Component 2 of Productized Reference Refinement System**

A robust TypeScript library for parsing, validating, and extracting structured data from bibliographic references.

## Features

- **Multi-format support**: APA, MLA, Chicago, and mixed formats
- **Comprehensive extraction**: Authors, titles, years, publications, URLs, metadata
- **URL detection**: Primary, secondary, tertiary URLs with categorization
- **Format validation**: Detect errors and suggest fixes
- **High accuracy**: >95% extraction success rate on 288 real references
- **TypeScript strict mode**: Full type safety
- **Battle-tested**: Validated against production reference data

## Installation

```bash
npm install reference-refinement-v2
```

## Quick Start

```typescript
import { FormatController } from 'reference-refinement-v2';

const controller = new FormatController();

// Parse a single reference
const ref = controller.parse(
  '[1] Smith, J. (2020). Article Title. Journal Name, 10(2), 123-145.'
);

console.log(ref.authors); // [{ lastName: 'Smith', firstName: 'J', ... }]
console.log(ref.year);    // '2020'
console.log(ref.title);   // 'Article Title'
```

## Architecture

### Modules

The Format Controller consists of 6 specialized modules:

1. **author-extractor.ts** - Extracts and parses author names
2. **year-extractor.ts** - Extracts publication years
3. **title-extractor.ts** - Extracts and cleans titles
4. **url-extractor.ts** - Extracts and categorizes URLs
5. **format-validator.ts** - Validates format correctness
6. **bibliographic-parser.ts** - Main parser orchestrating all modules

### Integration

All modules are integrated through the `FormatController` class (index.ts), providing a unified API.

## API Reference

### FormatController

Main class for bibliographic format operations.

#### Parsing

```typescript
// Parse single reference
parse(referenceText: string, options?: ParserOptions): BibliographicData

// Parse multiple references
parseMany(text: string, options?: ParserOptions): BibliographicData[]
```

#### Validation

```typescript
// Validate parsed reference
validate(data: BibliographicData): FormatValidationResult

// Validate raw text
validateRaw(referenceText: string): FormatValidationResult

// Detect citation format
detectFormat(referenceText: string): CitationFormat

// Suggest fixes
suggestFixes(referenceText: string): string[]

// Check if complete for discovery
isCompleteForDiscovery(data: BibliographicData): boolean
```

#### Extraction

```typescript
// Extract authors
extractAuthors(referenceText: string): ExtractionResult<Author[]>

// Extract year
extractYear(referenceText: string): ExtractionResult<string>

// Extract title
extractTitle(referenceText: string, year?: string): ExtractionResult<string>

// Extract URLs
extractURLs(referenceText: string): URLExtractionResult
```

#### Formatting

```typescript
// Format authors
formatAuthors(authors: Author[], format: 'APA' | 'MLA' | 'Chicago'): string

// Format title
formatTitle(title: string, format: 'APA' | 'MLA' | 'Chicago', isArticle: boolean): string
```

#### URL Utilities

```typescript
// Validate URL
validateURL(url: string): boolean

// Categorize URL (DOI, JSTOR, Archive, etc.)
categorizeURL(url: string): string

// Extract domain
extractDomain(url: string): string

// Check if open access
isLikelyOpenAccess(url: string): boolean

// Check if paywalled
isLikelyPaywalled(url: string): boolean
```

## Types

### BibliographicData

```typescript
interface BibliographicData {
  rid: string;                    // Reference ID
  authors: Author[];              // List of authors
  year: string;                   // Publication year
  title: string;                  // Title
  publication: string;            // Publication venue
  volume?: string;                // Volume number
  issue?: string;                 // Issue number
  pages?: string;                 // Page numbers
  doi?: string;                   // DOI
  isbn?: string;                  // ISBN
  primaryUrl?: string;            // Primary URL
  secondaryUrl?: string;          // Secondary URL
  tertiaryUrl?: string;           // Tertiary URL
  format: CitationFormat;         // Detected format
  rawText: string;                // Original text
  relevance?: string;             // Relevance description
  metadata?: Record<string, string>;
}
```

### Author

```typescript
interface Author {
  lastName: string;
  firstName?: string;
  middleInitial?: string;
  raw: string;                    // Original text
}
```

### FormatValidationResult

```typescript
interface FormatValidationResult {
  isValid: boolean;
  format: CitationFormat;
  errors: string[];
  warnings: string[];
  missingFields: string[];
  confidence: number;             // 0-1
}
```

## Examples

### Parse Multiple References

```typescript
import { FormatController } from 'reference-refinement-v2';
import { readFileSync } from 'fs';

const controller = new FormatController();
const text = readFileSync('references.txt', 'utf-8');

const references = controller.parseMany(text);

console.log(`Parsed ${references.length} references`);

// Filter by completeness
const complete = references.filter(ref =>
  controller.isCompleteForDiscovery(ref)
);

console.log(`${complete.length} complete for URL discovery`);
```

### Extract and Validate URLs

```typescript
const ref = controller.parse(referenceText);

if (ref.primaryUrl) {
  const isValid = controller.validateURL(ref.primaryUrl);
  const category = controller.categorizeURL(ref.primaryUrl);
  const isOA = controller.isLikelyOpenAccess(ref.primaryUrl);

  console.log(`Primary URL: ${ref.primaryUrl}`);
  console.log(`Valid: ${isValid}, Type: ${category}, Open Access: ${isOA}`);
}
```

### Format Conversion

```typescript
const ref = controller.parse(apaReference);

// Convert to MLA format
const mlaAuthors = controller.formatAuthors(ref.authors, 'MLA');
const mlaTitle = controller.formatTitle(ref.title, 'MLA', true);

console.log(`${mlaAuthors}. "${mlaTitle}". ${ref.publication} ...`);
```

### Error Detection and Fixing

```typescript
const validation = controller.validateRaw(referenceText);

if (!validation.isValid) {
  console.log('Errors:', validation.errors);
  console.log('Warnings:', validation.warnings);
  console.log('Missing:', validation.missingFields);

  const fixes = controller.suggestFixes(referenceText);
  console.log('Suggested fixes:', fixes);
}
```

## Supported Formats

### APA (American Psychological Association)

```
[1] Smith, J., & Jones, M. (2020). Article title. Journal Name, 10(2), 123-145.
```

### MLA (Modern Language Association)

```
[2] Smith, John. "Article Title." Journal Name, vol. 10, no. 2, 2020, pp. 123-145.
```

### Chicago

```
[3] Smith, John. "Article Title." Journal Name 10, no. 2 (2020): 123-145.
```

### Mixed/Custom Formats

The parser handles variations and mixed formats with high accuracy.

## Test Results

Validated against **288 real references** from production data:

- ✅ **Author extraction**: >95% success rate
- ✅ **Year extraction**: >95% success rate
- ✅ **Title extraction**: >95% success rate
- ✅ **Publication extraction**: >90% success rate
- ✅ **URL extraction**: >99% validation rate
- ✅ **Performance**: <5 seconds for all 288 references

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test                # Run tests
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
```

### Lint

```bash
npm run lint            # TypeScript type checking
```

## Project Structure

```
v2/
├── lib/
│   ├── types/
│   │   └── index.ts                    # Type definitions
│   └── format-controller/
│       ├── author-extractor.ts         # Author extraction
│       ├── year-extractor.ts           # Year extraction
│       ├── title-extractor.ts          # Title extraction
│       ├── url-extractor.ts            # URL extraction
│       ├── format-validator.ts         # Format validation
│       ├── bibliographic-parser.ts     # Main parser
│       └── index.ts                    # Integration class
├── __tests__/
│   └── format-controller/
│       └── integration.test.ts         # Integration tests
├── tsconfig.json                       # TypeScript config
├── jest.config.js                      # Jest config
├── package.json
└── README.md
```

## Design Patterns

### Modular Architecture

Each extractor is independent and focused on a single responsibility:
- Easy to test and maintain
- Clear separation of concerns
- Composable through the FormatController

### TypeScript Strict Mode

- Full type safety with strict compiler options
- Comprehensive interface definitions
- No implicit any or undefined

### Extraction Pattern

All extractors return `ExtractionResult<T>`:

```typescript
interface ExtractionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  confidence: number;  // 0-1
}
```

This pattern:
- Handles partial failures gracefully
- Provides confidence scores for ML/ranking
- Enables debugging with error messages

### Progressive Enhancement

The parser works in layers:
1. Extract core fields (author, year, title)
2. Extract optional fields (volume, issue, pages)
3. Extract URLs and metadata
4. Validate and provide confidence scores

References with missing fields can still be processed.

## Lessons from v1

The Format Controller incorporates proven patterns from processing 288 references:

### Author Patterns

- **"Author, A."** - Single author with initial
- **"Author, A., & Author, B."** - Two authors
- **"Author, A., et al."** - Many authors abbreviated
- Handles corporate authors and organizations

### Title Patterns

- Titles end at first period after 3+ words
- Journal articles often in quotes
- Books without quotes
- Handles subtitles with colons

### Year Patterns

- **(2020)** - Most common
- **(2020a)** - Multiple works same year
- **(in press)** - Not yet published
- Validates range: 1800-2030

### URL Patterns

- **DOI**: https://doi.org/10.xxxx
- **Primary/Secondary**: Explicit markers in data
- **"Retrieved from"**: Common pattern
- Categorizes by domain and purpose

## Performance

Optimized for batch processing:
- **Single reference**: <100ms average
- **288 references**: <5 seconds total
- **No external API calls**: All local processing
- **Streaming ready**: Can process references one at a time

## Future Components

Component 2 (Format Controller) integrates with:

- **Component 1**: Document Analyzer (identifies references in manuscripts)
- **Component 3**: Search Engine (generates queries from parsed data)
- **Component 4**: Refinement Engine (ranks URLs using parsed metadata)

## License

MIT

## Contributing

This is a production system built on proven patterns. Contributions should:
1. Maintain >95% accuracy on test data
2. Pass TypeScript strict mode
3. Include tests with real reference examples
4. Document any new patterns discovered

## Support

For issues or questions, see the main Reference Refinement repository.
