/**
 * Author Extractor - Extracts author names from bibliographic references
 *
 * Handles patterns like:
 * - Single author: "Author, A."
 * - Two authors: "Author, A., & Author, B."
 * - Three+ authors: "Author, A., Author, B., & Author, C."
 * - Many authors: "Author, A., et al."
 */

import type { Author, ExtractionResult } from '../types/index.js';

/**
 * Extracts authors from a reference string
 * @param referenceText - The full reference text
 * @returns Extraction result with author list
 */
export function extractAuthors(referenceText: string): ExtractionResult<Author[]> {
  try {
    // Remove RID prefix if present: [123] or [100]
    let cleanText = referenceText.replace(/^\[\d+\]\s*/, '');

    // Find the year marker to know where authors end
    const yearMatch = cleanText.match(/\((\d{4}[a-z]?|\d{4},\s*[A-Z][a-z]+\s+\d+|in press|forthcoming)\)/);
    if (!yearMatch) {
      return {
        success: false,
        error: 'Could not find year marker to determine author section',
        confidence: 0
      };
    }

    // Extract text before year - this is the author section
    const authorSection = cleanText.substring(0, yearMatch.index).trim();

    // Handle "et al." pattern
    if (authorSection.includes('et al.')) {
      const leadAuthor = authorSection.replace(/,?\s*et al\..*$/, '').trim();
      const parsedLead = parseAuthorName(leadAuthor);
      return {
        success: true,
        data: [parsedLead],
        confidence: 0.8 // Lower confidence due to truncation
      };
    }

    // Split by ampersand or 'and' for multiple authors
    let authorParts: string[] = [];

    if (authorSection.includes(' & ')) {
      authorParts = authorSection.split(' & ');
    } else if (authorSection.includes(', and ')) {
      authorParts = authorSection.split(', and ');
    } else if (authorSection.includes(' and ')) {
      authorParts = authorSection.split(' and ');
    } else {
      // Single author or comma-separated list
      authorParts = [authorSection];
    }

    // Further split comma-separated authors (for 3+ author lists)
    const allAuthorStrings: string[] = [];
    for (const part of authorParts) {
      if (part.includes(',') && !part.match(/^[A-Z][a-z]+,\s*[A-Z]\./)) {
        // Multiple authors in this part (not just "LastName, I." format)
        const subParts = part.split(/,\s*(?=[A-Z])/);
        allAuthorStrings.push(...subParts);
      } else {
        allAuthorStrings.push(part);
      }
    }

    // Parse each author string
    const authors = allAuthorStrings
      .map(str => str.trim())
      .filter(str => str.length > 0)
      .map(parseAuthorName);

    return {
      success: true,
      data: authors,
      confidence: authors.length > 0 ? 0.95 : 0.5
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      confidence: 0
    };
  }
}

/**
 * Parse a single author name string into structured format
 * @param authorString - Author name string (e.g., "Smith, J.", "Smith, John A.")
 * @returns Structured author object
 */
function parseAuthorName(authorString: string): Author {
  const trimmed = authorString.trim();

  // Pattern 1: "LastName, FirstInitial." or "LastName, FirstInitial. MiddleInitial."
  const initialsPattern = /^([A-Z][a-z\s'-]+),\s*([A-Z]\.)(?:\s*([A-Z]\.))?/;
  const initialsMatch = trimmed.match(initialsPattern);

  if (initialsMatch) {
    const lastName = initialsMatch[1].trim();
    const firstInitial = initialsMatch[2];
    const middleInitial = initialsMatch[3];

    return {
      lastName,
      firstName: firstInitial.charAt(0),
      middleInitial: middleInitial ? middleInitial.charAt(0) : undefined,
      raw: trimmed
    };
  }

  // Pattern 2: "LastName, FirstName" or "LastName, FirstName MiddleName"
  const fullNamePattern = /^([A-Z][a-z\s'-]+),\s*([A-Z][a-z]+)(?:\s+([A-Z][a-z]*))?/;
  const fullNameMatch = trimmed.match(fullNamePattern);

  if (fullNameMatch) {
    const lastName = fullNameMatch[1].trim();
    const firstName = fullNameMatch[2];
    const middleName = fullNameMatch[3];

    return {
      lastName,
      firstName,
      middleInitial: middleName ? middleName.charAt(0) : undefined,
      raw: trimmed
    };
  }

  // Pattern 3: "FirstName LastName" (no comma)
  const reversedPattern = /^([A-Z][a-z]+)\s+([A-Z][a-z\s'-]+)$/;
  const reversedMatch = trimmed.match(reversedPattern);

  if (reversedMatch) {
    return {
      lastName: reversedMatch[2],
      firstName: reversedMatch[1],
      raw: trimmed
    };
  }

  // Pattern 4: Corporate author or organization
  if (trimmed.length > 3 && !trimmed.includes(',')) {
    return {
      lastName: trimmed,
      raw: trimmed
    };
  }

  // Fallback: just use the raw string as lastName
  return {
    lastName: trimmed,
    raw: trimmed
  };
}

/**
 * Format an author object back to string
 * @param author - Author object
 * @param format - Output format ('APA' | 'MLA' | 'Chicago')
 * @returns Formatted author string
 */
export function formatAuthor(author: Author, format: 'APA' | 'MLA' | 'Chicago' = 'APA'): string {
  const { lastName, firstName, middleInitial } = author;

  if (!firstName) {
    return lastName;
  }

  const firstPart = firstName.length === 1 ? `${firstName}.` : firstName;
  const middlePart = middleInitial ? ` ${middleInitial}.` : '';

  switch (format) {
    case 'APA':
      return `${lastName}, ${firstPart}${middlePart}`;
    case 'MLA':
      return middleInitial
        ? `${lastName}, ${firstName} ${middleInitial}.`
        : `${lastName}, ${firstName}`;
    case 'Chicago':
      return middleInitial
        ? `${lastName}, ${firstName} ${middleInitial}.`
        : `${lastName}, ${firstName}`;
    default:
      return author.raw;
  }
}

/**
 * Format multiple authors to string
 * @param authors - List of authors
 * @param format - Output format
 * @returns Formatted author list
 */
export function formatAuthors(authors: Author[], format: 'APA' | 'MLA' | 'Chicago' = 'APA'): string {
  if (authors.length === 0) return '';
  if (authors.length === 1) return formatAuthor(authors[0], format);

  const formatted = authors.map(a => formatAuthor(a, format));

  if (authors.length === 2) {
    return `${formatted[0]} & ${formatted[1]}`;
  }

  // 3+ authors
  const allButLast = formatted.slice(0, -1).join(', ');
  const last = formatted[formatted.length - 1];
  return `${allButLast}, & ${last}`;
}
