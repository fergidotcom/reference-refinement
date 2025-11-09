/**
 * Title Extractor - Extracts titles from bibliographic references
 *
 * Handles patterns like:
 * - Article titles in quotes: "Title of article"
 * - Book titles in italics (plain text): Title of Book
 * - Titles with subtitles: "Main title: Subtitle"
 * - Titles ending with periods or other punctuation
 */

import type { ExtractionResult } from '../types/index.js';

/**
 * Extracts title from a reference string
 * @param referenceText - The full reference text
 * @param year - The publication year (to help locate title)
 * @returns Extraction result with title string
 */
export function extractTitle(referenceText: string, year?: string): ExtractionResult<string> {
  try {
    let searchText = referenceText;

    // Remove RID prefix if present
    searchText = searchText.replace(/^\[\d+\]\s*/, '');

    // If we have year, find where the title starts (after year)
    let titleStartIndex = 0;
    if (year) {
      const yearPattern = new RegExp(`\\(${escapeRegex(year)}[,\\)]`);
      const yearMatch = searchText.match(yearPattern);
      if (yearMatch && yearMatch.index !== undefined) {
        titleStartIndex = yearMatch.index + yearMatch[0].length;
      }
    } else {
      // Try to find any year pattern
      const anyYearMatch = searchText.match(/\((\d{4}[a-z]?|in press|forthcoming|n\.d\.)\)/);
      if (anyYearMatch && anyYearMatch.index !== undefined) {
        titleStartIndex = anyYearMatch.index + anyYearMatch[0].length;
      }
    }

    // Extract the text after the year
    const afterYear = searchText.substring(titleStartIndex).trim();

    // Pattern 1: Title in quotes "Title here"
    const quotedTitleMatch = afterYear.match(/^[""]([^"""]+)[""]\.?/);
    if (quotedTitleMatch) {
      const title = quotedTitleMatch[1].trim();
      return {
        success: true,
        data: cleanTitle(title),
        confidence: 0.95
      };
    }

    // Pattern 2: Title without quotes, ending at first period (after 3+ words)
    // Skip leading punctuation like periods, colons
    const textAfterPunctuation = afterYear.replace(/^[.\s:]+/, '');

    // Find the title by looking for the first sentence
    // Title typically ends at the first period followed by a capital letter or known publisher
    const titleMatch = textAfterPunctuation.match(/^([^.]+(?:\.[^.]+){0,2})\.\s+(?:[A-Z]|(?:University|Press|Publisher|McGraw|Penguin|Simon|Harper|MIT|Oxford|Cambridge))/);

    if (titleMatch) {
      let title = titleMatch[1].trim();

      // Remove publication info that might have leaked in
      title = title.replace(/\b(?:ISBN|DOI|https?:\/\/|Retrieved|Available|Vol\.|No\.|pp?\.).*$/i, '').trim();

      if (title.split(/\s+/).length >= 2) {
        return {
          success: true,
          data: cleanTitle(title),
          confidence: 0.85
        };
      }
    }

    // Pattern 3: Title ending at publication venue
    // Look for common publication indicators
    const publicationMatch = textAfterPunctuation.match(/^([^.]+?)\.\s+(?:In\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:Press|University|Publisher|Journal|Review|Studies|Quarterly|Magazine|Times)))/);

    if (publicationMatch) {
      const title = publicationMatch[1].trim();
      if (title.split(/\s+/).length >= 2) {
        return {
          success: true,
          data: cleanTitle(title),
          confidence: 0.8
        };
      }
    }

    // Pattern 4: Fallback - take first substantial chunk before period
    const simpleMatch = textAfterPunctuation.match(/^([^.]{10,}?)\./);
    if (simpleMatch) {
      let title = simpleMatch[1].trim();

      // Clean up common trailing artifacts
      title = title.replace(/\s+\(\d{4}[a-z]?\)$/, ''); // Remove year if it leaked in
      title = title.replace(/\s*,\s*\d+\([^)]+\).*$/, ''); // Remove volume/issue
      title = title.replace(/\s*Vol\.\s*\d+.*$/, ''); // Remove volume

      if (title.split(/\s+/).length >= 2) {
        return {
          success: true,
          data: cleanTitle(title),
          confidence: 0.6
        };
      }
    }

    return {
      success: false,
      error: 'Could not extract title from reference',
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
 * Cleans and normalizes a title string
 * @param title - Raw title string
 * @returns Cleaned title
 */
function cleanTitle(title: string): string {
  let cleaned = title;

  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();

  // Remove leading/trailing punctuation (except terminal punctuation)
  cleaned = cleaned.replace(/^[.,;:]+/, '');

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ');

  // Remove any remaining HTML/markdown formatting
  cleaned = cleaned.replace(/<[^>]+>/g, '');
  cleaned = cleaned.replace(/\*\*/g, '');
  cleaned = cleaned.replace(/__/g, '');

  // Fix common OCR/encoding errors
  cleaned = cleaned.replace(/â€™/g, "'");
  cleaned = cleaned.replace(/â€œ/g, '"');
  cleaned = cleaned.replace(/â€/g, '"');
  cleaned = cleaned.replace(/â€"/, '—');

  return cleaned;
}

/**
 * Escapes special regex characters in a string
 * @param str - String to escape
 * @returns Escaped string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Determines if a title is for an article (vs. book)
 * @param title - Title string
 * @param referenceText - Full reference for context
 * @returns True if likely an article title
 */
export function isArticleTitle(title: string, referenceText: string): boolean {
  // Article titles are typically in quotes
  if (referenceText.includes(`"${title}"`)) {
    return true;
  }

  // Check for journal indicators
  const hasJournalIndicators = /\b(Journal|Review|Quarterly|Studies|Magazine|Proceedings)\b/.test(referenceText);

  // Check for volume/issue numbers
  const hasVolumeIssue = /\b\d+\(\d+\)|\bVol\.\s*\d+|\bNo\.\s*\d+/.test(referenceText);

  return hasJournalIndicators || hasVolumeIssue;
}

/**
 * Formats a title according to citation style
 * @param title - Title string
 * @param format - Citation format
 * @param isArticle - Whether this is an article (vs. book)
 * @returns Formatted title
 */
export function formatTitle(
  title: string,
  format: 'APA' | 'MLA' | 'Chicago' = 'APA',
  isArticle: boolean = false
): string {
  switch (format) {
    case 'APA':
      // APA: Sentence case, no quotes for books, quotes for articles
      const sentenceCase = toSentenceCase(title);
      return isArticle ? `"${sentenceCase}"` : sentenceCase;

    case 'MLA':
      // MLA: Title case, italics for books, quotes for articles
      const titleCase = toTitleCase(title);
      return isArticle ? `"${titleCase}"` : titleCase;

    case 'Chicago':
      // Chicago: Title case, italics for books, quotes for articles
      const chicagoCase = toTitleCase(title);
      return isArticle ? `"${chicagoCase}"` : chicagoCase;

    default:
      return title;
  }
}

/**
 * Converts title to sentence case (first word capitalized)
 * @param title - Title string
 * @returns Sentence case title
 */
function toSentenceCase(title: string): string {
  const words = title.split(/\s+/);
  if (words.length === 0) return title;

  // Capitalize first word
  const result = [capitalizeWord(words[0])];

  // Rest are lowercase unless they're proper nouns or after colons
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const prevWord = words[i - 1];

    if (prevWord.endsWith(':') || isProperNoun(word)) {
      result.push(capitalizeWord(word));
    } else {
      result.push(word.toLowerCase());
    }
  }

  return result.join(' ');
}

/**
 * Converts title to title case
 * @param title - Title string
 * @returns Title case title
 */
function toTitleCase(title: string): string {
  const minorWords = new Set([
    'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at',
    'to', 'from', 'by', 'in', 'of', 'with', 'as', 'is', 'was'
  ]);

  const words = title.split(/\s+/);
  if (words.length === 0) return title;

  // Always capitalize first and last word
  const result = [capitalizeWord(words[0])];

  for (let i = 1; i < words.length - 1; i++) {
    const word = words[i];
    const prevWord = words[i - 1];

    // Capitalize if after colon, or not a minor word
    if (prevWord.endsWith(':') || !minorWords.has(word.toLowerCase())) {
      result.push(capitalizeWord(word));
    } else {
      result.push(word.toLowerCase());
    }
  }

  if (words.length > 1) {
    result.push(capitalizeWord(words[words.length - 1]));
  }

  return result.join(' ');
}

/**
 * Capitalizes the first letter of a word
 * @param word - Word to capitalize
 * @returns Capitalized word
 */
function capitalizeWord(word: string): string {
  if (word.length === 0) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Determines if a word is likely a proper noun
 * @param word - Word to check
 * @returns True if likely a proper noun
 */
function isProperNoun(word: string): boolean {
  // Already capitalized and longer than 1 letter
  if (word.length > 1 && word.charAt(0) === word.charAt(0).toUpperCase()) {
    // Check if it's not all caps (acronym)
    const notAllCaps = word !== word.toUpperCase();
    return notAllCaps;
  }
  return false;
}
