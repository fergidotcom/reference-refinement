/**
 * Year Extractor - Extracts publication years from bibliographic references
 *
 * Handles patterns like:
 * - (2020)
 * - (2020a, 2020b) - multiple works same year
 * - (2020, May 10) - specific dates
 * - (in press)
 * - (forthcoming)
 * - (n.d.) - no date
 */

import type { ExtractionResult } from '../types/index.js';

/** Valid year range for references */
const MIN_YEAR = 1800;
const MAX_YEAR = new Date().getFullYear() + 5; // Allow up to 5 years in future

/**
 * Extracts publication year from a reference string
 * @param referenceText - The full reference text
 * @returns Extraction result with year string
 */
export function extractYear(referenceText: string): ExtractionResult<string> {
  try {
    // Pattern 1: (YYYY) or (YYYYa) - most common
    const basicYearMatch = referenceText.match(/\((\d{4}[a-z]?)\)/);
    if (basicYearMatch) {
      const year = basicYearMatch[1];
      const numericYear = parseInt(year, 10);

      if (numericYear >= MIN_YEAR && numericYear <= MAX_YEAR) {
        return {
          success: true,
          data: year,
          confidence: 0.98
        };
      }
    }

    // Pattern 2: (YYYY, Month Day) - specific date
    const dateYearMatch = referenceText.match(/\((\d{4}),\s*[A-Z][a-z]+\s+\d+\)/);
    if (dateYearMatch) {
      const year = dateYearMatch[1];
      const numericYear = parseInt(year, 10);

      if (numericYear >= MIN_YEAR && numericYear <= MAX_YEAR) {
        return {
          success: true,
          data: year,
          confidence: 0.95
        };
      }
    }

    // Pattern 3: (in press) or (forthcoming)
    if (referenceText.match(/\((in press|forthcoming)\)/i)) {
      return {
        success: true,
        data: 'in press',
        confidence: 0.9
      };
    }

    // Pattern 4: (n.d.) - no date
    if (referenceText.match(/\(n\.d\.\)/i)) {
      return {
        success: true,
        data: 'n.d.',
        confidence: 0.9
      };
    }

    // Pattern 5: Year without parentheses (some formats)
    // Look for a 4-digit year after authors but before title
    const yearWithoutParens = referenceText.match(/[A-Z][a-z]+,?\s+([A-Z]\.\s+)*(\d{4})[a-z]?\./);
    if (yearWithoutParens) {
      const year = yearWithoutParens[2];
      const numericYear = parseInt(year, 10);

      if (numericYear >= MIN_YEAR && numericYear <= MAX_YEAR) {
        return {
          success: true,
          data: year,
          confidence: 0.85 // Lower confidence for non-standard format
        };
      }
    }

    return {
      success: false,
      error: 'No valid year found in reference',
      confidence: 0
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
 * Validates a year string
 * @param year - Year string to validate
 * @returns True if year is valid
 */
export function validateYear(year: string): boolean {
  // Special cases
  if (year === 'in press' || year === 'forthcoming' || year === 'n.d.') {
    return true;
  }

  // Numeric year (with optional letter suffix)
  const match = year.match(/^(\d{4})[a-z]?$/);
  if (!match) {
    return false;
  }

  const numericYear = parseInt(match[1], 10);
  return numericYear >= MIN_YEAR && numericYear <= MAX_YEAR;
}

/**
 * Normalizes a year string (removes letter suffixes)
 * @param year - Year string
 * @returns Normalized year
 */
export function normalizeYear(year: string): string {
  if (year === 'in press' || year === 'forthcoming') {
    return 'in press';
  }

  if (year === 'n.d.') {
    return 'n.d.';
  }

  // Remove letter suffix if present
  return year.replace(/^(\d{4})[a-z]?$/, '$1');
}

/**
 * Compares two years for sorting
 * @param year1 - First year
 * @param year2 - Second year
 * @returns Negative if year1 < year2, positive if year1 > year2, 0 if equal
 */
export function compareYears(year1: string, year2: string): number {
  const norm1 = normalizeYear(year1);
  const norm2 = normalizeYear(year2);

  // Special cases go to the end
  if (norm1 === 'in press' && norm2 !== 'in press') return 1;
  if (norm2 === 'in press' && norm1 !== 'in press') return -1;
  if (norm1 === 'n.d.' && norm2 !== 'n.d.') return 1;
  if (norm2 === 'n.d.' && norm1 !== 'n.d.') return -1;

  // Both numeric - compare as numbers
  const num1 = parseInt(norm1, 10);
  const num2 = parseInt(norm2, 10);

  if (!isNaN(num1) && !isNaN(num2)) {
    return num1 - num2;
  }

  // Fallback to string comparison
  return norm1.localeCompare(norm2);
}
