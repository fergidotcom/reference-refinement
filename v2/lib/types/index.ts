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
 * Unified Reference interface (used by both Component 1 and Component 2)
 * Combines simple and detailed bibliographic data
 */
export interface Reference {
  /** Reference ID (RID) */
  rid: string;
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
  /** Existing URL in the reference (optional) */
  url?: string;
  /** Primary URL if present */
  primaryUrl?: string;
  /** Secondary URL if present */
  secondaryUrl?: string;
  /** Tertiary URL if present */
  tertiaryUrl?: string;
  /** Detected format */
  format?: CitationFormat;
  /** Full raw text of the reference */
  rawText: string;
  /** Relevance description (if present) */
  relevance?: string;
  /** Additional metadata */
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
