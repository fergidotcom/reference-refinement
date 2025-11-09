/**
 * Format Controller - Main entry point for bibliographic format operations
 *
 * Provides a unified interface for:
 * - Parsing bibliographic references
 * - Extracting structured data (authors, title, year, etc.)
 * - Validating reference formats
 * - Formatting references in different styles
 */

import type {
  BibliographicData,
  ParserOptions,
  FormatValidationResult,
  Author
} from '../types/index.js';

import { parseReference, parseReferences } from './bibliographic-parser.js';
import { extractAuthors, formatAuthors } from './author-extractor.js';
import { extractYear, validateYear, normalizeYear, compareYears } from './year-extractor.js';
import { extractTitle, formatTitle, isArticleTitle } from './title-extractor.js';
import { extractURLs, validateURL, categorizeURL, extractDomain, isLikelyOpenAccess, isLikelyPaywalled } from './url-extractor.js';
import {
  validateReference,
  validateRawReference,
  detectFormat,
  suggestFixes,
  isCompleteForDiscovery
} from './format-validator.js';

/**
 * FormatController - Main class for bibliographic format operations
 */
export class FormatController {
  /**
   * Parses a single bibliographic reference
   * @param referenceText - The full reference text
   * @param options - Parser options
   * @returns Parsed bibliographic data
   */
  public parse(referenceText: string, options?: ParserOptions): BibliographicData {
    return parseReference(referenceText, options);
  }

  /**
   * Parses multiple bibliographic references from text
   * @param text - Text containing multiple references
   * @param options - Parser options
   * @returns Array of parsed bibliographic data
   */
  public parseMany(text: string, options?: ParserOptions): BibliographicData[] {
    return parseReferences(text, options);
  }

  /**
   * Validates a parsed reference
   * @param data - Parsed bibliographic data
   * @returns Validation result
   */
  public validate(data: BibliographicData): FormatValidationResult {
    return validateReference(data);
  }

  /**
   * Validates raw reference text
   * @param referenceText - The full reference text
   * @returns Validation result
   */
  public validateRaw(referenceText: string): FormatValidationResult {
    return validateRawReference(referenceText);
  }

  /**
   * Detects the citation format
   * @param referenceText - The full reference text
   * @returns Citation format
   */
  public detectFormat(referenceText: string) {
    return detectFormat(referenceText);
  }

  /**
   * Suggests fixes for formatting errors
   * @param referenceText - The reference text with errors
   * @returns Array of suggested fixes
   */
  public suggestFixes(referenceText: string): string[] {
    return suggestFixes(referenceText);
  }

  /**
   * Checks if reference is complete enough for URL discovery
   * @param data - Parsed bibliographic data
   * @returns True if complete enough
   */
  public isCompleteForDiscovery(data: BibliographicData): boolean {
    return isCompleteForDiscovery(data);
  }

  /**
   * Extracts authors from reference text
   * @param referenceText - The full reference text
   * @returns Extraction result with authors
   */
  public extractAuthors(referenceText: string) {
    return extractAuthors(referenceText);
  }

  /**
   * Formats authors according to citation style
   * @param authors - Array of authors
   * @param format - Citation format
   * @returns Formatted author string
   */
  public formatAuthors(authors: Author[], format: 'APA' | 'MLA' | 'Chicago' = 'APA'): string {
    return formatAuthors(authors, format);
  }

  /**
   * Extracts publication year from reference
   * @param referenceText - The full reference text
   * @returns Extraction result with year
   */
  public extractYear(referenceText: string) {
    return extractYear(referenceText);
  }

  /**
   * Validates a year string
   * @param year - Year to validate
   * @returns True if valid
   */
  public validateYear(year: string): boolean {
    return validateYear(year);
  }

  /**
   * Normalizes a year string
   * @param year - Year to normalize
   * @returns Normalized year
   */
  public normalizeYear(year: string): string {
    return normalizeYear(year);
  }

  /**
   * Compares two years for sorting
   * @param year1 - First year
   * @param year2 - Second year
   * @returns Comparison result
   */
  public compareYears(year1: string, year2: string): number {
    return compareYears(year1, year2);
  }

  /**
   * Extracts title from reference
   * @param referenceText - The full reference text
   * @param year - Optional year to help locate title
   * @returns Extraction result with title
   */
  public extractTitle(referenceText: string, year?: string) {
    return extractTitle(referenceText, year);
  }

  /**
   * Determines if title is for an article
   * @param title - Title string
   * @param referenceText - Full reference for context
   * @returns True if article title
   */
  public isArticleTitle(title: string, referenceText: string): boolean {
    return isArticleTitle(title, referenceText);
  }

  /**
   * Formats a title according to citation style
   * @param title - Title string
   * @param format - Citation format
   * @param isArticle - Whether this is an article
   * @returns Formatted title
   */
  public formatTitle(
    title: string,
    format: 'APA' | 'MLA' | 'Chicago' = 'APA',
    isArticle: boolean = false
  ): string {
    return formatTitle(title, format, isArticle);
  }

  /**
   * Extracts URLs from reference
   * @param referenceText - The full reference text
   * @returns URL extraction result
   */
  public extractURLs(referenceText: string) {
    return extractURLs(referenceText);
  }

  /**
   * Validates a URL
   * @param url - URL to validate
   * @returns True if valid
   */
  public validateURL(url: string): boolean {
    return validateURL(url);
  }

  /**
   * Categorizes a URL by type
   * @param url - URL to categorize
   * @returns URL category
   */
  public categorizeURL(url: string): string {
    return categorizeURL(url);
  }

  /**
   * Extracts domain from URL
   * @param url - URL string
   * @returns Domain name
   */
  public extractDomain(url: string): string {
    return extractDomain(url);
  }

  /**
   * Checks if URL is likely open access
   * @param url - URL to check
   * @returns True if likely open access
   */
  public isLikelyOpenAccess(url: string): boolean {
    return isLikelyOpenAccess(url);
  }

  /**
   * Checks if URL is likely paywalled
   * @param url - URL to check
   * @returns True if likely paywalled
   */
  public isLikelyPaywalled(url: string): boolean {
    return isLikelyPaywalled(url);
  }
}

// Export all types and functions for direct use
export * from '../types/index.js';
export * from './bibliographic-parser.js';
export * from './author-extractor.js';
export * from './year-extractor.js';
export * from './title-extractor.js';
export * from './url-extractor.js';
export * from './format-validator.js';

// Create and export default instance
export const formatController = new FormatController();
export default formatController;
