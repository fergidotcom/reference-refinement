/**
 * Bibliographic Parser - Main parser for bibliographic references
 *
 * Orchestrates all extraction modules to parse complete bibliographic data
 * from formatted reference text.
 */

import type { BibliographicData, ParserOptions } from '../types/index.js';
import { extractAuthors } from './author-extractor.js';
import { extractYear } from './year-extractor.js';
import { extractTitle } from './title-extractor.js';
import { extractURLs } from './url-extractor.js';
import { detectFormat } from './format-validator.js';

/**
 * Parses a single bibliographic reference
 * @param referenceText - The full reference text
 * @param options - Parser options
 * @returns Parsed bibliographic data
 */
export function parseReference(
  referenceText: string,
  options: ParserOptions = {}
): BibliographicData {
  const {
    extractRelevance = true,
    extractUrls = true,
    parseMetadata = true
  } = options;

  // Extract RID
  const ridMatch = referenceText.match(/^\[(\d+)\]/);
  const rid = ridMatch ? ridMatch[1] : '';

  // Extract year first (helps locate other fields)
  const yearResult = extractYear(referenceText);
  const year = yearResult.success && yearResult.data ? yearResult.data : '';

  // Extract authors
  const authorsResult = extractAuthors(referenceText);
  const authors = authorsResult.success && authorsResult.data ? authorsResult.data : [];

  // Extract title (using year to help locate it)
  const titleResult = extractTitle(referenceText, year);
  const title = titleResult.success && titleResult.data ? titleResult.data : '';

  // Extract publication venue
  const publication = extractPublication(referenceText, title, year);

  // Extract URLs if requested
  let primaryUrl: string | undefined;
  let secondaryUrl: string | undefined;
  let tertiaryUrl: string | undefined;
  let doi: string | undefined;

  if (extractUrls) {
    const urlResult = extractURLs(referenceText);
    primaryUrl = urlResult.primary;
    secondaryUrl = urlResult.secondary;
    tertiaryUrl = urlResult.tertiary;
    doi = urlResult.doi;
  }

  // Extract relevance if requested
  let relevance: string | undefined;
  if (extractRelevance) {
    const relevanceResult = extractRelevance_(referenceText);
    if (relevanceResult) {
      relevance = relevanceResult;
    }
  }

  // Extract metadata if requested
  let metadata: Record<string, string> | undefined;
  let volume: string | undefined;
  let issue: string | undefined;
  let pages: string | undefined;
  let isbn: string | undefined;

  if (parseMetadata) {
    const metadataResult = extractMetadata(referenceText);
    metadata = metadataResult;
    volume = metadataResult.volume;
    issue = metadataResult.issue;
    pages = metadataResult.pages;
    isbn = metadataResult.isbn;
    doi = doi || metadataResult.doi;
  }

  // Detect format
  const format = detectFormat(referenceText);

  return {
    rid,
    authors,
    year,
    title,
    publication,
    volume,
    issue,
    pages,
    doi,
    isbn,
    primaryUrl,
    secondaryUrl,
    tertiaryUrl,
    format,
    rawText: referenceText,
    relevance,
    metadata
  };
}

/**
 * Parses multiple references from text
 * @param text - Text containing multiple references
 * @param options - Parser options
 * @returns Array of parsed bibliographic data
 */
export function parseReferences(
  text: string,
  options: ParserOptions = {}
): BibliographicData[] {
  // Split on reference IDs
  const lines = text.split('\n');
  const references: BibliographicData[] = [];
  let currentRef = '';

  for (const line of lines) {
    // Check if this line starts a new reference
    if (line.match(/^\[\d+\]/)) {
      // Parse previous reference if exists
      if (currentRef.trim().length > 0) {
        try {
          const parsed = parseReference(currentRef, options);
          references.push(parsed);
        } catch (error) {
          console.error('Error parsing reference:', error);
        }
      }
      // Start new reference
      currentRef = line;
    } else {
      // Continue current reference
      currentRef += '\n' + line;
    }
  }

  // Parse last reference
  if (currentRef.trim().length > 0) {
    try {
      const parsed = parseReference(currentRef, options);
      references.push(parsed);
    } catch (error) {
      console.error('Error parsing reference:', error);
    }
  }

  return references;
}

/**
 * Extracts publication venue from reference
 * @param referenceText - Full reference text
 * @param title - Already extracted title
 * @param year - Already extracted year
 * @returns Publication venue string
 */
function extractPublication(
  referenceText: string,
  title: string,
  year: string
): string {
  try {
    // Find text after title
    let searchStart = 0;

    if (title) {
      const titleIndex = referenceText.indexOf(title);
      if (titleIndex !== -1) {
        searchStart = titleIndex + title.length;
      }
    } else if (year) {
      const yearPattern = new RegExp(`\\(${year.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)`);
      const yearMatch = referenceText.match(yearPattern);
      if (yearMatch && yearMatch.index !== undefined) {
        searchStart = yearMatch.index + yearMatch[0].length;
      }
    }

    const afterTitle = referenceText.substring(searchStart).trim();

    // Remove leading punctuation
    const cleaned = afterTitle.replace(/^[.,:\s]+/, '');

    // Pattern 1: Publication name until first period or URL
    const pubMatch = cleaned.match(/^([^.]+?)(?:\.|https?:\/\/|ISBN|DOI|Retrieved|Vol\.|pp?\.)/);
    if (pubMatch) {
      let pub = pubMatch[1].trim();

      // Remove volume/issue if leaked in
      pub = pub.replace(/,?\s*\d+\([^)]+\).*$/, '');
      pub = pub.replace(/,?\s*Vol\.\s*\d+.*$/, '');

      // Remove trailing commas
      pub = pub.replace(/,\s*$/, '');

      if (pub.length > 0) {
        return pub;
      }
    }

    // Pattern 2: Just take first substantial chunk
    const simpleMatch = cleaned.match(/^([A-Z][^.]{5,}?)\./);
    if (simpleMatch) {
      return simpleMatch[1].trim();
    }

    return '';

  } catch {
    return '';
  }
}

/**
 * Extracts relevance text from reference
 * @param referenceText - Full reference text
 * @returns Relevance text or undefined
 */
function extractRelevance_(referenceText: string): string | undefined {
  // Pattern 1: "Relevance:" marker
  const relevanceMatch = referenceText.match(/Relevance:\s*([^]+?)(?:FLAGS\[|PRIMARY_URL|SECONDARY_URL|$)/);
  if (relevanceMatch) {
    return relevanceMatch[1].trim();
  }

  // Pattern 2: Text after main citation before URLs
  // Look for descriptive text between the citation and URLs
  const descMatch = referenceText.match(/\.\s+([^]+?)(?:Primary URL:|PRIMARYURL|FLAGS\[|https?:\/\/|$)/);
  if (descMatch) {
    const desc = descMatch[1].trim();
    // Only return if it's substantial (more than just metadata)
    if (desc.length > 50 && !desc.match(/^(?:ISBN|DOI|Retrieved|Available)/)) {
      return desc;
    }
  }

  return undefined;
}

/**
 * Extracts metadata fields from reference
 * @param referenceText - Full reference text
 * @returns Metadata object
 */
function extractMetadata(referenceText: string): Record<string, string> {
  const metadata: Record<string, string> = {};

  // Volume
  const volumeMatch = referenceText.match(/\b(?:Vol\.|Volume)\s*(\d+)/i);
  if (volumeMatch) {
    metadata.volume = volumeMatch[1];
  } else {
    // Sometimes just a number before issue: "10(2)"
    const implicitVolumeMatch = referenceText.match(/\b(\d+)\(\d+\)/);
    if (implicitVolumeMatch) {
      metadata.volume = implicitVolumeMatch[1];
    }
  }

  // Issue
  const issueMatch = referenceText.match(/\b(?:No\.|Issue)\s*(\d+)/i);
  if (issueMatch) {
    metadata.issue = issueMatch[1];
  } else {
    // Issue in parentheses: "10(2)"
    const implicitIssueMatch = referenceText.match(/\d+\((\d+)\)/);
    if (implicitIssueMatch) {
      metadata.issue = implicitIssueMatch[1];
    }
  }

  // Pages
  const pagesMatch = referenceText.match(/\b(?:pp?\.|pages)\s*(\d+(?:-\d+)?)/i);
  if (pagesMatch) {
    metadata.pages = pagesMatch[1];
  } else {
    // Pages without prefix: ", 123-145"
    const implicitPagesMatch = referenceText.match(/,\s*(\d+-\d+)(?:\.|,|\s|$)/);
    if (implicitPagesMatch) {
      metadata.pages = implicitPagesMatch[1];
    }
  }

  // ISBN
  const isbnMatch = referenceText.match(/\bISBN:?\s*([0-9-]+)/i);
  if (isbnMatch) {
    metadata.isbn = isbnMatch[1];
  }

  // DOI (if not already extracted by URL extractor)
  const doiMatch = referenceText.match(/\bDOI:?\s*(10\.\d+\/[^\s]+)/i);
  if (doiMatch) {
    metadata.doi = `https://doi.org/${doiMatch[1]}`;
  }

  // Publisher
  const publisherPatterns = [
    /\b((?:University|Press|Publishing|Publisher|Books|Ltd|Inc|LLC)[^.]*)\./i,
    /\b([A-Z][a-z]+\s+(?:Press|Books|Publishing))/i
  ];

  for (const pattern of publisherPatterns) {
    const match = referenceText.match(pattern);
    if (match) {
      metadata.publisher = match[1].trim();
      break;
    }
  }

  // Location (city)
  const locationMatch = referenceText.match(/([A-Z][a-z]+(?:,\s*[A-Z]{2})?(?:,\s*[A-Z][a-z]+)?):/);
  if (locationMatch) {
    metadata.location = locationMatch[1];
  }

  return metadata;
}
