/**
 * Format Validator - Validates bibliographic reference formats
 *
 * Checks for:
 * - Required fields (author, year, title, publication)
 * - Format consistency (APA, MLA, Chicago, etc.)
 * - Common formatting errors
 * - Completeness and quality
 */

import type { BibliographicData, FormatValidationResult, CitationFormat } from '../types/index.js';

/**
 * Validates a parsed bibliographic reference
 * @param data - Parsed bibliographic data
 * @returns Validation result with errors and warnings
 */
export function validateReference(data: BibliographicData): FormatValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingFields: string[] = [];

  // Check required fields
  if (!data.authors || data.authors.length === 0) {
    missingFields.push('authors');
    errors.push('No authors found');
  }

  if (!data.year) {
    missingFields.push('year');
    errors.push('No publication year found');
  }

  if (!data.title || data.title.trim().length === 0) {
    missingFields.push('title');
    errors.push('No title found');
  }

  if (!data.publication || data.publication.trim().length === 0) {
    missingFields.push('publication');
    warnings.push('No publication venue found');
  }

  // Check author format
  if (data.authors && data.authors.length > 0) {
    for (const author of data.authors) {
      if (!author.lastName || author.lastName.trim().length === 0) {
        warnings.push(`Author missing last name: ${author.raw}`);
      }
    }
  }

  // Check year validity
  if (data.year) {
    const yearNum = parseInt(data.year, 10);
    if (!isNaN(yearNum)) {
      const currentYear = new Date().getFullYear();
      if (yearNum < 1800) {
        warnings.push(`Year ${data.year} seems unusually old`);
      }
      if (yearNum > currentYear + 5) {
        warnings.push(`Year ${data.year} is in the future`);
      }
    }
  }

  // Check title length
  if (data.title) {
    const wordCount = data.title.split(/\s+/).length;
    if (wordCount < 2) {
      warnings.push('Title seems too short (less than 2 words)');
    }
    if (wordCount > 50) {
      warnings.push('Title seems unusually long (more than 50 words)');
    }
  }

  // Calculate confidence score
  const totalFields = 4; // authors, year, title, publication
  const presentFields = totalFields - missingFields.length;
  const fieldScore = presentFields / totalFields;

  const errorPenalty = errors.length * 0.15;
  const warningPenalty = warnings.length * 0.05;

  const confidence = Math.max(0, Math.min(1, fieldScore - errorPenalty - warningPenalty));

  const isValid = errors.length === 0 && missingFields.length <= 1;

  return {
    isValid,
    format: data.format || 'Unknown',
    errors,
    warnings,
    missingFields,
    confidence
  };
}

/**
 * Detects the citation format of a reference
 * @param referenceText - The full reference text
 * @returns Detected citation format
 */
export function detectFormat(referenceText: string): CitationFormat {
  const scores = {
    APA: 0,
    MLA: 0,
    Chicago: 0
  };

  // APA indicators
  if (referenceText.match(/\(\d{4}[a-z]?\)\./)) {
    scores.APA += 2; // Year in parentheses followed by period
  }
  if (referenceText.match(/[A-Z]\.\s*[A-Z]\./)) {
    scores.APA += 1; // Author initials with periods
  }
  if (referenceText.match(/&amp;|&/)) {
    scores.APA += 1; // Ampersand between authors
  }
  if (referenceText.match(/https?:\/\/doi\.org/)) {
    scores.APA += 1; // DOI links common in APA
  }

  // MLA indicators
  if (referenceText.match(/[A-Z][a-z]+,\s+[A-Z][a-z]+\./)) {
    scores.MLA += 1; // Full first name
  }
  if (referenceText.match(/[""][^""]+[""]/) && !referenceText.match(/\(\d{4}\)/)) {
    scores.MLA += 1; // Quoted title without year in parens
  }
  if (referenceText.match(/,\s*vol\.\s*\d+,\s*no\.\s*\d+/i)) {
    scores.MLA += 2; // Volume/issue format
  }
  if (referenceText.match(/pp?\.\s*\d+-\d+/)) {
    scores.MLA += 1; // Page numbers with pp.
  }

  // Chicago indicators
  if (referenceText.match(/\d{4}\)?\./)) {
    scores.Chicago += 1; // Year followed by period
  }
  if (referenceText.match(/,\s*no\.\s*\d+\s*\(\d{4}\):/)) {
    scores.Chicago += 2; // Issue number with year in parens and colon
  }
  if (referenceText.match(/[A-Z][a-z]+,\s+[A-Z][a-z]+,?\s+(?:and|&)/)) {
    scores.Chicago += 1; // Full names with 'and'
  }

  // Determine winner
  const maxScore = Math.max(scores.APA, scores.MLA, scores.Chicago);

  if (maxScore === 0) {
    return 'Unknown';
  }

  // Check if mixed (multiple formats with similar scores)
  const highScores = Object.entries(scores).filter(([_, score]) => score === maxScore);
  if (highScores.length > 1) {
    return 'Mixed';
  }

  if (scores.APA === maxScore) return 'APA';
  if (scores.MLA === maxScore) return 'MLA';
  if (scores.Chicago === maxScore) return 'Chicago';

  return 'Unknown';
}

/**
 * Validates raw reference text format
 * @param referenceText - The full reference text
 * @returns Validation result
 */
export function validateRawReference(referenceText: string): FormatValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingFields: string[] = [];

  // Check for RID
  if (!referenceText.match(/^\[\d+\]/)) {
    warnings.push('Reference ID (RID) not found at start');
  }

  // Check for year
  if (!referenceText.match(/\(\d{4}[a-z]?\)/)) {
    missingFields.push('year');
    errors.push('Year in parentheses not found');
  }

  // Check minimum length
  if (referenceText.length < 50) {
    warnings.push('Reference seems too short');
  }

  // Check for common errors
  if (referenceText.includes('  ')) {
    warnings.push('Multiple consecutive spaces found');
  }

  if (referenceText.match(/\(\d{4}\)\s*\(\d{4}\)/)) {
    errors.push('Duplicate year found');
  }

  if (referenceText.match(/,\s*,/)) {
    errors.push('Consecutive commas found');
  }

  if (referenceText.match(/\.\s*\./)) {
    warnings.push('Consecutive periods found');
  }

  // Detect format
  const format = detectFormat(referenceText);

  // Calculate confidence
  const hasRID = referenceText.match(/^\[\d+\]/) ? 1 : 0;
  const hasYear = referenceText.match(/\(\d{4}[a-z]?\)/) ? 1 : 0;
  const hasEnoughLength = referenceText.length >= 50 ? 1 : 0;

  const baseScore = (hasRID + hasYear + hasEnoughLength) / 3;
  const errorPenalty = errors.length * 0.2;
  const warningPenalty = warnings.length * 0.05;

  const confidence = Math.max(0, Math.min(1, baseScore - errorPenalty - warningPenalty));

  const isValid = errors.length === 0;

  return {
    isValid,
    format,
    errors,
    warnings,
    missingFields,
    confidence
  };
}

/**
 * Suggests fixes for common formatting errors
 * @param referenceText - The reference text with errors
 * @returns Suggested fixes
 */
export function suggestFixes(referenceText: string): string[] {
  const suggestions: string[] = [];

  if (referenceText.includes('  ')) {
    suggestions.push('Remove extra spaces');
  }

  if (referenceText.match(/\(\d{4}\)\s*\(\d{4}\)/)) {
    suggestions.push('Remove duplicate year');
  }

  if (referenceText.match(/,\s*,/)) {
    suggestions.push('Remove duplicate comma');
  }

  if (referenceText.match(/\.\s*\./)) {
    suggestions.push('Remove duplicate period');
  }

  if (!referenceText.match(/^\[\d+\]/)) {
    suggestions.push('Add reference ID in format [123]');
  }

  if (!referenceText.match(/\(\d{4}[a-z]?\)/)) {
    suggestions.push('Add publication year in parentheses (YYYY)');
  }

  if (referenceText.endsWith(',')) {
    suggestions.push('Remove trailing comma');
  }

  if (!referenceText.endsWith('.')) {
    suggestions.push('Add period at end of reference');
  }

  return suggestions;
}

/**
 * Checks if a reference is complete enough for URL discovery
 * @param data - Bibliographic data
 * @returns True if reference is complete enough
 */
export function isCompleteForDiscovery(data: BibliographicData): boolean {
  // Must have at least author and title, or title and year
  const hasAuthorAndTitle = data.authors.length > 0 && data.title.length > 0;
  const hasTitleAndYear = data.title.length > 0 && data.year.length > 0;

  return hasAuthorAndTitle || hasTitleAndYear;
}
