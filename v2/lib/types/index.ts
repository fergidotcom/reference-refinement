/**
 * Type definitions for Reference Refinement v2 - Format Controller
 */

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
 * Parsed bibliographic data from a reference entry
 */
export interface BibliographicData {
  /** Reference ID (e.g., "100", "101") */
  rid: string;
  /** List of authors */
  authors: Author[];
  /** Publication year */
  year: string;
  /** Title of the work */
  title: string;
  /** Publication venue (journal, publisher, etc.) */
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
  format: CitationFormat;
  /** Raw reference text */
  rawText: string;
  /** Relevance description (if present) */
  relevance?: string;
  /** Additional metadata fields */
  metadata?: Record<string, string>;
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
