/**
 * Reference Parser - Extracts bibliographic information from reference entries
 *
 * Parses references in formats like:
 * [100] Author, A. (YYYY). Title. Publisher/Journal. [metadata]
 * [100] Author, A., & Author, B. (YYYY). Title. Journal, volume(issue), pages.
 */

import { Reference, ParsingResult } from '../types';

export class ReferenceParser {
  private referenceText: string;
  private lines: string[];

  constructor(referenceText: string) {
    this.referenceText = referenceText;
    this.lines = referenceText.split('\n');
  }

  /**
   * Parse all references from the text
   */
  public parseAll(): ParsingResult {
    const references: Reference[] = [];
    const failures: Array<{ lineNumber: number; text: string; error: string }> = [];

    let currentReference: string[] = [];
    let currentLineNumber = 0;
    let refStartLine = 0;

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i].trim();

      // Skip empty lines
      if (!line) {
        if (currentReference.length > 0) {
          // Process accumulated reference
          const refText = currentReference.join('\n');
          try {
            const ref = this.parseReference(refText);
            references.push(ref);
          } catch (error) {
            failures.push({
              lineNumber: refStartLine + 1,
              text: refText,
              error: error instanceof Error ? error.message : String(error)
            });
          }
          currentReference = [];
        }
        continue;
      }

      // Check if this is the start of a new reference (starts with [number])
      if (/^\[\d+\]/.test(line)) {
        // Process previous reference if any
        if (currentReference.length > 0) {
          const refText = currentReference.join('\n');
          try {
            const ref = this.parseReference(refText);
            references.push(ref);
          } catch (error) {
            failures.push({
              lineNumber: refStartLine + 1,
              text: refText,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }

        // Start new reference
        currentReference = [line];
        refStartLine = i;
      } else {
        // Continuation of current reference
        currentReference.push(line);
      }
    }

    // Process last reference
    if (currentReference.length > 0) {
      const refText = currentReference.join('\n');
      try {
        const ref = this.parseReference(refText);
        references.push(ref);
      } catch (error) {
        failures.push({
          lineNumber: refStartLine + 1,
          text: refText,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return {
      references,
      failures,
      total: references.length + failures.length
    };
  }

  /**
   * Parse a single reference entry
   */
  public parseReference(text: string): Reference {
    const rawText = text;

    // Extract RID: [123]
    const ridMatch = text.match(/^\[(\d+)\]/);
    if (!ridMatch) {
      throw new Error('Could not find RID in reference');
    }
    const rid = ridMatch[1];

    // Remove RID from text
    text = text.replace(/^\[\d+\]\s*/, '');

    // Extract metadata (URLs, ISBN, DOI, etc.) from the end
    const metadata = this.extractMetadata(text);

    // Remove metadata from text for easier parsing
    text = this.removeMetadata(text);

    // Parse author-year-title-publication
    const components = this.parseComponents(text);

    return {
      rid,
      authors: components.authors,
      year: components.year,
      title: components.title,
      publication: components.publication,
      rawText,
      metadata
    };
  }

  /**
   * Extract metadata (DOI, ISBN, URLs, etc.) from reference text
   */
  private extractMetadata(text: string): Reference['metadata'] {
    const metadata: Reference['metadata'] = {};

    // Extract DOI
    const doiMatch = text.match(/DOI:\s*(10\.\S+)/i);
    if (doiMatch) {
      metadata.doi = doiMatch[1];
    }

    // Extract ISBN
    const isbnMatch = text.match(/ISBN:\s*([\d-]+)/i);
    if (isbnMatch) {
      metadata.isbn = isbnMatch[1];
    }

    // Extract URLs (Primary URL, Secondary URL, etc.)
    const urlMatch = text.match(/(?:Primary URL|Secondary URL|URL):\s*(https?:\/\/\S+)/i);
    if (urlMatch) {
      metadata.url = urlMatch[1];
    }

    // Check for [VERIFIED] marker
    if (text.includes('[VERIFIED]')) {
      metadata.verified = true;
    }

    return metadata;
  }

  /**
   * Remove metadata from text to make parsing easier
   */
  private removeMetadata(text: string): string {
    // Remove URLs
    text = text.replace(/(?:Primary URL|Secondary URL|Tertiary URL|URL):\s*https?:\/\/\S+/gi, '');

    // Remove DOI
    text = text.replace(/DOI:\s*10\.\S+/gi, '');

    // Remove ISBN
    text = text.replace(/ISBN:\s*[\d-]+/gi, '');

    // Remove [VERIFIED]
    text = text.replace(/\[VERIFIED\]/gi, '');

    // Remove multiple spaces
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Parse the main components: author, year, title, publication
   *
   * Common formats:
   * - Author, A. (YYYY). Title. Publication.
   * - Author, A., & Author, B. (YYYY). Title. Journal, volume(issue), pages.
   * - Author, A., Author, B., & Author, C. (YYYY). Title. In Editor (Ed.), Book Title (pp. pages). Publisher.
   */
  private parseComponents(text: string): {
    authors: string;
    year: string;
    title: string;
    publication: string;
  } {
    // Default values
    let authors = '';
    let year = '';
    let title = '';
    let publication = '';

    try {
      // Find year in parentheses: (YYYY)
      const yearMatch = text.match(/\((\d{4}[a-z]?)\)/);
      if (yearMatch) {
        year = yearMatch[1];

        // Authors are everything before (YYYY)
        const authorsPart = text.substring(0, yearMatch.index).trim();
        authors = authorsPart.replace(/\.$/, '').trim(); // Remove trailing period

        // Everything after (YYYY)
        let remainder = text.substring(yearMatch.index! + yearMatch[0].length).trim();

        // Remove leading period/comma
        remainder = remainder.replace(/^[.,]\s*/, '');

        // Title is typically before the first period after year
        // But we need to be careful with periods in titles (e.g., "U.S.A.")
        // Look for sentence-ending period (followed by capital letter or end of string)
        const titleMatch = remainder.match(/^(.*?)\.\s+([A-Z]|$)/);
        if (titleMatch) {
          title = titleMatch[1].trim();
          publication = remainder.substring(titleMatch[0].length - 1).trim();
        } else {
          // No clear title/publication split - might be a journal article
          // Format: Title. Journal, volume(issue), pages. or Title. Publisher.
          const parts = remainder.split(/\.\s+/);
          if (parts.length >= 1) {
            title = parts[0].trim();
            publication = parts.slice(1).join('. ').trim();
          } else {
            title = remainder;
          }
        }
      } else {
        // No year found - try alternative parsing
        // Some references might use different formats
        // For now, use the whole text as title
        title = text;
      }

      // Clean up extracted fields
      authors = authors.replace(/\s+/g, ' ').trim();
      title = title.replace(/\s+/g, ' ').trim();
      publication = publication.replace(/\s+/g, ' ').trim();

      // Remove quotes from title if present
      title = title.replace(/^["']|["']$/g, '');

    } catch (error) {
      throw new Error(`Failed to parse components: ${error instanceof Error ? error.message : String(error)}`);
    }

    return { authors, year, title, publication };
  }

  /**
   * Find a reference by RID
   */
  public findByRID(rid: string): Reference | undefined {
    const result = this.parseAll();
    return result.references.find(ref => ref.rid === rid);
  }

  /**
   * Get all references in a RID range
   */
  public getRIDRange(startRID: string, endRID: string): Reference[] {
    const start = parseInt(startRID);
    const end = parseInt(endRID);
    const result = this.parseAll();

    return result.references.filter(ref => {
      const rid = parseInt(ref.rid);
      return rid >= start && rid <= end;
    });
  }

  /**
   * Search references by title (fuzzy matching)
   */
  public searchByTitle(query: string, threshold: number = 0.5): Reference[] {
    const result = this.parseAll();
    const queryLower = query.toLowerCase();

    return result.references.filter(ref => {
      const titleLower = ref.title.toLowerCase();
      const similarity = this.calculateSimilarity(queryLower, titleLower);
      return similarity >= threshold;
    });
  }

  /**
   * Calculate similarity between two strings (simple Jaccard similarity)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Get statistics about parsed references
   */
  public getStatistics(): {
    total: number;
    successful: number;
    failed: number;
    ridRange: { min: number; max: number } | null;
    missingYears: number;
    missingTitles: number;
  } {
    const result = this.parseAll();

    const rids = result.references.map(r => parseInt(r.rid)).filter(n => !isNaN(n));
    const ridRange = rids.length > 0
      ? { min: Math.min(...rids), max: Math.max(...rids) }
      : null;

    const missingYears = result.references.filter(r => !r.year).length;
    const missingTitles = result.references.filter(r => !r.title).length;

    return {
      total: result.total,
      successful: result.references.length,
      failed: result.failures.length,
      ridRange,
      missingYears,
      missingTitles
    };
  }
}

/**
 * Convenience function to parse references
 */
export function parseReferences(text: string): ParsingResult {
  const parser = new ReferenceParser(text);
  return parser.parseAll();
}

/**
 * Convenience function to parse a single reference
 */
export function parseReference(text: string): Reference {
  const parser = new ReferenceParser(text);
  return parser.parseReference(text);
}
