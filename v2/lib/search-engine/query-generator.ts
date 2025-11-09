/**
 * Query Generator
 *
 * Generates search queries from bibliographic data.
 * Implements proven patterns from v1 for optimal search results.
 */

import type { BibliographicData, SearchQuery } from '../types/index.js';

/**
 * Query generation configuration
 */
export interface QueryGeneratorConfig {
  /** Number of primary queries to generate */
  primaryQueryCount: number;
  /** Number of secondary queries to generate */
  secondaryQueryCount: number;
}

/**
 * Query generator for search operations
 *
 * @example
 * ```typescript
 * const generator = new QueryGenerator({
 *   primaryQueryCount: 4,
 *   secondaryQueryCount: 4
 * });
 *
 * const bibData = {
 *   rid: '100',
 *   author: 'Pariser, E.',
 *   year: '2011',
 *   title: 'The filter bubble',
 *   publication: 'Penguin Press'
 * };
 *
 * const queries = generator.generateQueries(bibData);
 * // Returns 8 queries (4 primary + 4 secondary)
 * ```
 */
export class QueryGenerator {
  constructor(private config: QueryGeneratorConfig) {}

  /**
   * Generate all queries for a reference
   *
   * @param bibData - Bibliographic data
   * @returns Array of search queries
   */
  generateQueries(bibData: BibliographicData): SearchQuery[] {
    const queries: SearchQuery[] = [];

    // Generate primary queries (full-text sources)
    const primaryQueries = this.generatePrimaryQueries(bibData);
    queries.push(...primaryQueries.slice(0, this.config.primaryQueryCount));

    // Generate secondary queries (reviews/analyses)
    const secondaryQueries = this.generateSecondaryQueries(bibData);
    queries.push(...secondaryQueries.slice(0, this.config.secondaryQueryCount));

    return queries;
  }

  /**
   * Generate primary queries (find full-text sources)
   *
   * Primary queries focus on finding the work itself:
   * - Free full-text PDFs/HTML from .edu/.gov/archive.org
   * - Publisher/purchase pages as fallback
   *
   * @param bibData - Bibliographic data
   * @returns Array of primary search queries
   */
  private generatePrimaryQueries(bibData: BibliographicData): SearchQuery[] {
    const queries: SearchQuery[] = [];
    const { title, author, year, publication } = bibData;

    // Extract last name from author
    const authorLastName = this.extractAuthorLastName(author);

    // Q1: Free PDF from academic/government sites
    if (title && authorLastName) {
      queries.push({
        text: this.buildQuery([
          `"${title}"`,
          authorLastName,
          year,
          'filetype:pdf',
          'site:edu OR site:gov OR site:archive.org',
        ]),
        type: 'primary',
        queryNumber: queries.length + 1,
        rid: bibData.rid,
        bibliographicData: bibData,
      });
    }

    // Q2: Free full text (any format)
    if (title && authorLastName) {
      queries.push({
        text: this.buildQuery([`"${title}"`, authorLastName, 'free full text', '-buy', '-purchase']),
        type: 'primary',
        queryNumber: queries.length + 1,
        rid: bibData.rid,
        bibliographicData: bibData,
      });
    }

    // Q3: ResearchGate or Academia.edu
    if (title && authorLastName) {
      queries.push({
        text: this.buildQuery([
          title,
          authorLastName,
          year,
          'ResearchGate OR Academia.edu',
        ]),
        type: 'primary',
        queryNumber: queries.length + 1,
        rid: bibData.rid,
        bibliographicData: bibData,
      });
    }

    // Q4: Publisher page (fallback)
    if (title && publication) {
      queries.push({
        text: this.buildQuery([`"${title}"`, authorLastName, publication]),
        type: 'primary',
        queryNumber: queries.length + 1,
        rid: bibData.rid,
        bibliographicData: bibData,
      });
    }

    // Q5: General search with year
    if (title && authorLastName && year) {
      queries.push({
        text: this.buildQuery([`"${title}"`, authorLastName, year, 'pdf OR html']),
        type: 'primary',
        queryNumber: queries.length + 1,
        rid: bibData.rid,
        bibliographicData: bibData,
      });
    }

    // Q6: DOI search if available
    if (bibData.doi) {
      queries.push({
        text: bibData.doi,
        type: 'primary',
        queryNumber: queries.length + 1,
        rid: bibData.rid,
        bibliographicData: bibData,
      });
    }

    // Q7-8: Additional variations
    if (title) {
      // Full title search
      queries.push({
        text: this.buildQuery([`"${title}"`, 'full text', 'pdf']),
        type: 'primary',
        queryNumber: queries.length + 1,
        rid: bibData.rid,
        bibliographicData: bibData,
      });

      // Open access repositories
      queries.push({
        text: this.buildQuery([
          `"${title}"`,
          authorLastName,
          'site:arxiv.org OR site:jstor.org OR site:sciencedirect.com',
        ]),
        type: 'primary',
        queryNumber: queries.length + 1,
        rid: bibData.rid,
        bibliographicData: bibData,
      });
    }

    return queries;
  }

  /**
   * Generate secondary queries (find reviews/analyses)
   *
   * Secondary queries focus on finding content ABOUT the work:
   * - Scholarly reviews from .edu sites
   * - Critical analyses from JSTOR/EBSCO
   * - Broader topic discussions
   *
   * @param bibData - Bibliographic data
   * @returns Array of secondary search queries
   */
  private generateSecondaryQueries(bibData: BibliographicData): SearchQuery[] {
    const queries: SearchQuery[] = [];
    const { title, author, year } = bibData;

    // Extract last name from author
    const authorLastName = this.extractAuthorLastName(author);

    // Q1: Explicit review search
    if (title && authorLastName) {
      queries.push({
        text: this.buildQuery([`"review of"`, `"${title}"`, authorLastName]),
        type: 'secondary',
        queryNumber: queries.length + 1,
        rid: bibData.rid,
        bibliographicData: bibData,
      });
    }

    // Q2: Academic analysis
    if (title && authorLastName) {
      queries.push({
        text: this.buildQuery([
          `"${title}"`,
          authorLastName,
          'analysis OR critique',
          'site:edu',
        ]),
        type: 'secondary',
        queryNumber: queries.length + 1,
        rid: bibData.rid,
        bibliographicData: bibData,
      });
    }

    // Q3: Scholarly review from databases
    if (title && authorLastName) {
      queries.push({
        text: this.buildQuery([
          `"${title}"`,
          authorLastName,
          'scholarly review',
          'JSTOR OR EBSCO',
        ]),
        type: 'secondary',
        queryNumber: queries.length + 1,
        rid: bibData.rid,
        bibliographicData: bibData,
      });
    }

    // Q4: Broader topic discussion
    if (title) {
      // Extract key concept from title (simplified - take first few words)
      const concept = this.extractConcept(title);
      queries.push({
        text: this.buildQuery([concept, 'concept OR theory', 'site:edu']),
        type: 'secondary',
        queryNumber: queries.length + 1,
        rid: bibData.rid,
        bibliographicData: bibData,
      });
    }

    // Q5: Book review (if it's a book)
    if (title && authorLastName) {
      queries.push({
        text: this.buildQuery([`"${title}"`, authorLastName, 'book review']),
        type: 'secondary',
        queryNumber: queries.length + 1,
        rid: bibData.rid,
        bibliographicData: bibData,
      });
    }

    // Q6: Critical response
    if (title && authorLastName) {
      queries.push({
        text: this.buildQuery([
          `"${title}"`,
          authorLastName,
          'response OR discussion',
          year,
        ]),
        type: 'secondary',
        queryNumber: queries.length + 1,
        rid: bibData.rid,
        bibliographicData: bibData,
      });
    }

    // Q7: Academic discourse
    if (title) {
      queries.push({
        text: this.buildQuery([`"${title}"`, 'academic discourse', 'site:edu OR site:org']),
        type: 'secondary',
        queryNumber: queries.length + 1,
        rid: bibData.rid,
        bibliographicData: bibData,
      });
    }

    // Q8: Citation context
    if (title && authorLastName) {
      queries.push({
        text: this.buildQuery([`"${title}"`, authorLastName, 'cited by', 'scholarly']),
        type: 'secondary',
        queryNumber: queries.length + 1,
        rid: bibData.rid,
        bibliographicData: bibData,
      });
    }

    return queries;
  }

  /**
   * Build query string from components
   *
   * Follows best practices:
   * - Keep queries 40-80 characters (max 120)
   * - Use 1-2 quoted phrases per query max
   * - Filter out undefined/empty values
   *
   * @param components - Query components
   * @returns Formatted query string
   */
  private buildQuery(components: (string | undefined)[]): string {
    // Filter out undefined/empty components
    const filtered = components.filter((c) => c && c.trim() !== '');

    // Join with spaces and trim
    let query = filtered.join(' ').trim();

    // Enforce max length (120 characters)
    if (query.length > 120) {
      query = query.substring(0, 120).trim();
    }

    return query;
  }

  /**
   * Extract author last name from author string
   *
   * Handles formats:
   * - "Smith, J." -> "Smith"
   * - "Smith" -> "Smith"
   * - "Smith, John" -> "Smith"
   *
   * @param author - Author string
   * @returns Last name
   */
  private extractAuthorLastName(author: string | undefined): string {
    if (!author) return '';

    // Split on comma and take first part
    const parts = author.split(',');
    if (parts.length > 0) {
      return parts[0].trim();
    }

    // If no comma, take first word
    const words = author.split(' ');
    return words[0].trim();
  }

  /**
   * Extract key concept from title for broader searches
   *
   * Simplified approach: take first meaningful phrase (2-4 words)
   *
   * @param title - Title string
   * @returns Extracted concept
   */
  private extractConcept(title: string): string {
    // Remove common stopwords
    const stopwords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'];

    const words = title
      .toLowerCase()
      .split(' ')
      .filter((w) => !stopwords.includes(w) && w.length > 2);

    // Take first 2-3 meaningful words
    return words.slice(0, 3).join(' ');
  }

  /**
   * Validate query quality
   *
   * @param query - Query to validate
   * @returns True if query meets quality standards
   */
  validateQuery(query: string): boolean {
    // Min length check
    if (query.length < 10) return false;

    // Max length check
    if (query.length > 120) return false;

    // Should not be just stopwords
    const words = query.toLowerCase().split(' ');
    const meaningfulWords = words.filter(
      (w) => !['the', 'a', 'an', 'and', 'or'].includes(w) && w.length > 2
    );

    return meaningfulWords.length >= 2;
  }
}
