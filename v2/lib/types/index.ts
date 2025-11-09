/**
 * Type definitions for Reference Refinement v2 - Document Analyzer
 */

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

export interface Reference {
  /** Reference ID (RID) */
  rid: string;
  /** Author(s) */
  authors: string;
  /** Publication year */
  year: string;
  /** Title of the work */
  title: string;
  /** Publication info (journal, publisher, etc.) */
  publication: string;
  /** Full raw text of the reference */
  rawText: string;
  /** Additional metadata */
  metadata?: {
    doi?: string;
    isbn?: string;
    url?: string;
    verified?: boolean;
  };
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
