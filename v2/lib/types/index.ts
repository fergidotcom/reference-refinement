/**
 * Type definitions for Reference Refinement v2
 * Shared types across all components
 */

// ============================================================================
// Component 1: Document Analyzer Types
// ============================================================================

export interface Citation {
  /** Citation ID (e.g., "100", "42", or empty for unassigned) */
  id: string;
  /** Position in the document (character offset) */
  position: number;
  /** Line number in the document */
  lineNumber: number;
  /** Column number on the line */
  columnNumber: number;
  /** Original text of the citation (e.g., "[100]" or "[]") */
  originalText: string;
  /** Context before the citation */
  contextBefore: string;
  /** Context after the citation */
  contextAfter: string;
  /** Chapter/section the citation appears in */
  section?: string;
  /** Whether this is a numbered or unnumbered citation */
  type: 'numbered' | 'unnumbered';
}

export interface DocumentStructure {
  /** Document title */
  title: string;
  /** Chapters/sections */
  sections: Section[];
  /** Total character count */
  totalChars: number;
  /** Total line count */
  totalLines: number;
}

export interface Section {
  /** Section title */
  title: string;
  /** Section level (1 = chapter, 2 = section, etc.) */
  level: number;
  /** Start position in document */
  startPosition: number;
  /** End position in document */
  endPosition: number;
  /** Line number where section starts */
  startLine: number;
  /** Line number where section ends */
  endLine: number;
  /** Subsections */
  subsections: Section[];
}

export interface CitationContext {
  /** The citation */
  citation: Citation;
  /** Full sentence containing the citation */
  sentence: string;
  /** Paragraph containing the citation */
  paragraph: string;
  /** Number of words before citation in sentence */
  wordsBefore: number;
  /** Number of words after citation in sentence */
  wordsAfter: number;
}

export interface RIDAssignment {
  /** Original unnumbered citation */
  citation: Citation;
  /** Assigned RID */
  assignedRID: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Reason for assignment */
  reason: string;
  /** Suggested reference match */
  suggestedReference?: Reference;
}

export interface DetectionResult {
  /** All detected citations */
  citations: Citation[];
  /** Number of numbered citations */
  numberedCount: number;
  /** Number of unnumbered citations */
  unnumberedCount: number;
  /** Unique RIDs found */
  uniqueRIDs: Set<string>;
}

export interface ParsingResult {
  /** Successfully parsed references */
  references: Reference[];
  /** References that failed to parse */
  failures: Array<{
    lineNumber: number;
    text: string;
    error: string;
  }>;
  /** Total references processed */
  total: number;
}

export interface AnalyzerConfig {
  /** Context window size (characters before/after citation) */
  contextWindowSize?: number;
  /** Minimum confidence for RID assignment */
  minConfidence?: number;
  /** Rate limiting delay (ms) */
  rateLimitDelay?: number;
  /** Title matching thresholds */
  titleMatching?: {
    primaryThreshold: number;
    secondaryThreshold: number;
  };
}

// ============================================================================
// Component 2: Format Controller Types
// ============================================================================

/**
 * Represents an author with structured name components
 */
export interface Author {
  /** Last name (surname) */
  lastName: string;
  /** First name (optional) */
  firstName?: string;
  /** Middle initial (optional) */
  middleInitial?: string;
  /** Raw string from which this author was extracted */
  raw: string;
}

/**
 * Unified Reference interface (used by all components)
 * Combines parsed bibliographic data (C1-C3) with v1 decisions.txt format (C4-C5)
 */
export interface Reference {
  // ===== Core Identity (both formats) =====
  /** Reference ID - "rid" for C1-C3, "id" for C4-C5 */
  rid: string;
  /** Reference ID (v1 format alias for rid) */
  id?: string;

  // ===== Bibliographic Data (parsed format - C1-C3) =====
  /** Author(s) - can be simple string or structured array */
  authors: string | Author[];
  /** Publication year */
  year: string;
  /** Title of the work */
  title: string;
  /** Publication info (journal, publisher, etc.) */
  publication: string;
  /** Volume number (optional) */
  volume?: string;
  /** Issue number (optional) */
  issue?: string;
  /** Page numbers (optional) */
  pages?: string;
  /** DOI (optional) */
  doi?: string;
  /** ISBN (optional) */
  isbn?: string;

  // ===== Raw Text (both formats) =====
  /** Full raw text of the reference */
  rawText: string;
  /** Raw reference text (v1 format alias) */
  text?: string;

  // ===== URLs (both formats) =====
  /** Single URL (simple format) */
  url?: string;
  /** Primary URL (parsed format) */
  primaryUrl?: string;
  /** Secondary URL (parsed format) */
  secondaryUrl?: string;
  /** Tertiary URL (parsed format) */
  tertiaryUrl?: string;
  /** URLs object (v1 format) */
  urls?: {
    primary?: string;
    secondary?: string;
    tertiary?: string;
  };

  // ===== Format and Relevance =====
  /** Detected citation format */
  format?: CitationFormat;
  /** Relevance description */
  relevance?: string;

  // ===== v1 Decisions.txt Format Fields (C4-C5) =====
  /** Parsed bibliographic data (v1 format) */
  parsed?: {
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
  /** Search queries used to find URLs */
  queries?: string[];
  /** Reference flags (finalized, manual review, etc.) */
  flags?: {
    finalized?: boolean;
    manual_review?: boolean;
    batch_version?: string;
    [key: string]: boolean | string | undefined;
  };
  /** Additional metadata */
  meta?: Record<string, any>;
  metadata?: {
    doi?: string;
    isbn?: string;
    url?: string;
    verified?: boolean;
    [key: string]: string | boolean | undefined;
  };
}

/**
 * Parsed bibliographic data from a reference entry (Component 2 specific)
 * This is an alias for Reference with structured authors
 */
export interface BibliographicData extends Omit<Reference, 'authors'> {
  /** List of authors */
  authors: Author[];
  /** Full text of the reference (Component 3 expects this) */
  fullText?: string;
}

/**
 * Supported citation formats
 */
export type CitationFormat = 'APA' | 'MLA' | 'Chicago' | 'Mixed' | 'Unknown';

/**
 * Result of format validation
 */
export interface FormatValidationResult {
  /** Whether the reference is valid */
  isValid: boolean;
  /** Detected format */
  format: CitationFormat;
  /** Validation errors */
  errors: string[];
  /** Validation warnings */
  warnings: string[];
  /** Missing required fields */
  missingFields: string[];
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Extraction result with success/failure status
 */
export interface ExtractionResult<T> {
  /** Whether extraction succeeded */
  success: boolean;
  /** Extracted data (if successful) */
  data?: T;
  /** Error message (if failed) */
  error?: string;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * URL extraction result
 */
export interface URLExtractionResult {
  /** Primary URL */
  primary?: string;
  /** Secondary URL */
  secondary?: string;
  /** Tertiary URL */
  tertiary?: string;
  /** All URLs found in the text */
  allUrls: string[];
  /** DOI if found */
  doi?: string;
}

/**
 * Options for bibliographic parsing
 */
export interface ParserOptions {
  /** Whether to extract relevance text */
  extractRelevance?: boolean;
  /** Whether to extract URLs */
  extractUrls?: boolean;
  /** Whether to validate format */
  validateFormat?: boolean;
  /** Whether to parse metadata fields */
  parseMetadata?: boolean;
}

// ============================================================================
// Component 3: Search Engine Types
// ============================================================================

/**
 * Search query generated for a reference
 */
export interface SearchQuery {
  /** Query text to send to search engine */
  text: string;
  /** Type of query - primary (full-text) or secondary (reviews) */
  type: 'primary' | 'secondary';
  /** Query number within type (1-8) */
  queryNumber: number;
  /** Reference ID this query is for */
  rid: string;
}

/**
 * Discovered URL candidate after processing search results
 */
export interface URLCandidate {
  /** Normalized URL */
  url: string;
  /** Title of the resource */
  title: string;
  /** Description/snippet */
  snippet: string;
  /** Source query that discovered this URL */
  sourceQuery: string;
  /** Type of source query */
  queryType: 'primary' | 'secondary';
  /** Domain of the URL */
  domain: string;
  /** Type of resource */
  urlType: 'PDF' | 'HTML' | 'DOI' | 'Other';
  /** Initial relevance score (0-100) */
  initialScore: number;
  /** Search rank when discovered (1-10) */
  searchRank: number;
}

/**
 * Configuration for the Search Engine
 */
export interface SearchEngineConfig {
  /** Google Custom Search API key */
  googleApiKey: string;
  /** Google Custom Search Engine ID */
  googleCseId: string;
  /** Total queries per reference */
  queriesPerReference: number;
  /** Number of primary-focused queries */
  primaryQueryCount: number;
  /** Number of secondary-focused queries */
  secondaryQueryCount: number;
  /** Rate limiting configuration */
  rateLimit: RateLimitConfig;
  /** Cost tracking configuration */
  costTracking: CostTrackingConfig;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  /** Maximum queries allowed per day */
  maxQueriesPerDay: number;
  /** Maximum queries per second */
  maxQueriesPerSecond: number;
}

/**
 * Cost tracking configuration
 */
export interface CostTrackingConfig {
  /** Cost per query in USD */
  costPerQuery: number;
  /** Budget threshold for warnings */
  budgetWarningThreshold: number;
}

/**
 * Search statistics for a session
 */
export interface SearchStats {
  /** Total queries executed */
  queriesExecuted: number;
  /** Total URLs discovered */
  urlsDiscovered: number;
  /** Total cost in USD */
  totalCost: number;
  /** Average cost per reference */
  avgCostPerReference: number;
  /** Average URLs discovered per reference */
  avgUrlsPerReference: number;
  /** Number of API errors encountered */
  apiErrors: number;
  /** Number of references processed */
  referencesProcessed: number;
}

/**
 * Cost tracking entry
 */
export interface CostEntry {
  /** Timestamp of the operation */
  timestamp: Date;
  /** Reference ID */
  rid: string;
  /** Operation type */
  operation: 'query_generation' | 'search_execution';
  /** Number of queries */
  queryCount: number;
  /** Cost in USD */
  cost: number;
}

/**
 * Token bucket state for rate limiting
 */
export interface TokenBucketState {
  /** Current number of tokens available */
  tokens: number;
  /** Maximum token capacity */
  capacity: number;
  /** Token refill rate (tokens per second) */
  refillRate: number;
  /** Last refill timestamp */
  lastRefill: Date;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
  /** Whether rate limit allows request */
  allowed: boolean;
  /** Current tokens available */
  tokensAvailable: number;
  /** Tokens required for request */
  tokensRequired: number;
  /** Estimated wait time in milliseconds (if not allowed) */
  waitTimeMs?: number;
}

/**
 * Google Custom Search API response
 */
export interface GoogleSearchResponse {
  /** Search result items */
  items?: GoogleSearchItem[];
  /** Search information */
  searchInformation?: {
    totalResults: string;
    searchTime: number;
  };
  /** Error information if any */
  error?: {
    code: number;
    message: string;
    errors: Array<{
      domain: string;
      reason: string;
      message: string;
    }>;
  };
}

/**
 * Individual search result item from Google
 */
export interface GoogleSearchItem {
  /** Page title */
  title: string;
  /** Page URL */
  link: string;
  /** Display link (formatted) */
  displayLink: string;
  /** Snippet/description */
  snippet: string;
  /** MIME type if available */
  mime?: string;
  /** File format if available */
  fileFormat?: string;
}

/**
 * Search engine error
 */
export class SearchEngineError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'SearchEngineError';
  }
}

/**
 * Rate limit error
 */
export class RateLimitError extends SearchEngineError {
  constructor(message: string, public retryAfterMs: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', { retryAfterMs });
    this.name = 'RateLimitError';
  }
}

/**
 * API error
 */
export class APIError extends SearchEngineError {
  constructor(
    message: string,
    public statusCode: number,
    public apiResponse?: unknown
  ) {
    super(message, 'API_ERROR', { statusCode, apiResponse });
    this.name = 'APIError';
  }
}
