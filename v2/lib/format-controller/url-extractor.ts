/**
 * URL Extractor - Extracts URLs from bibliographic references
 *
 * Handles patterns like:
 * - HTTP/HTTPS URLs: https://example.com/article
 * - DOI: https://doi.org/10.1234/example or doi:10.1234/example
 * - "Retrieved from" or "Available at" URLs
 * - Primary/Secondary URL markers in decisions.txt format
 */

import type { URLExtractionResult } from '../types/index.js';

/**
 * Extracts all URLs from a reference string
 * @param referenceText - The full reference text
 * @returns URL extraction result with categorized URLs
 */
export function extractURLs(referenceText: string): URLExtractionResult {
  const result: URLExtractionResult = {
    allUrls: []
  };

  // Pattern 1: Primary/Secondary/Tertiary URL markers (decisions.txt format)
  const primaryMatch = referenceText.match(/PRIMARY_URL\[([^\]]+)\]/);
  if (primaryMatch) {
    result.primary = cleanURL(primaryMatch[1]);
  }

  const secondaryMatch = referenceText.match(/SECONDARY_URL\[([^\]]+)\]/);
  if (secondaryMatch) {
    result.secondary = cleanURL(secondaryMatch[1]);
  }

  const tertiaryMatch = referenceText.match(/TERTIARY_URL\[([^\]]+)\]/);
  if (tertiaryMatch) {
    result.tertiary = cleanURL(tertiaryMatch[1]);
  }

  // Pattern 2: "Primary URL:" or "Secondary URL:" (plain text format)
  const plainPrimaryMatch = referenceText.match(/Primary URL:\s*(https?:\/\/[^\s]+)/i);
  if (plainPrimaryMatch && !result.primary) {
    result.primary = cleanURL(plainPrimaryMatch[1]);
  }

  const plainSecondaryMatch = referenceText.match(/Secondary URL:\s*(https?:\/\/[^\s]+)/i);
  if (plainSecondaryMatch && !result.secondary) {
    result.secondary = cleanURL(plainSecondaryMatch[1]);
  }

  const plainTertiaryMatch = referenceText.match(/Tertiary URL:\s*(https?:\/\/[^\s]+)/i);
  if (plainTertiaryMatch && !result.tertiary) {
    result.tertiary = cleanURL(plainTertiaryMatch[1]);
  }

  // Pattern 3: DOI
  const doiMatch = referenceText.match(/(?:https?:\/\/)?(?:dx\.)?doi\.org\/(10\.\d+\/[^\s\]]+)/i);
  if (doiMatch) {
    result.doi = `https://doi.org/${doiMatch[1]}`;
  } else {
    // Try bare DOI pattern
    const bareDOIMatch = referenceText.match(/\bDOI:\s*(10\.\d+\/[^\s\]]+)/i);
    if (bareDOIMatch) {
      result.doi = `https://doi.org/${bareDOIMatch[1]}`;
    }
  }

  // Pattern 4: All HTTP/HTTPS URLs in the text
  const urlPattern = /https?:\/\/[^\s\])\[,]+/gi;
  const urlMatches = referenceText.matchAll(urlPattern);

  for (const match of urlMatches) {
    const url = cleanURL(match[0]);
    if (!result.allUrls.includes(url)) {
      result.allUrls.push(url);
    }
  }

  // Add DOI to allUrls if found
  if (result.doi && !result.allUrls.includes(result.doi)) {
    result.allUrls.push(result.doi);
  }

  return result;
}

/**
 * Cleans and normalizes a URL
 * @param url - Raw URL string
 * @returns Cleaned URL
 */
function cleanURL(url: string): string {
  let cleaned = url.trim();

  // Remove trailing punctuation
  cleaned = cleaned.replace(/[.,;:!?)\]]+$/, '');

  // Remove HTML entities
  cleaned = cleaned.replace(/&amp;/g, '&');

  // Normalize common encoding issues
  cleaned = cleaned.replace(/%E2%80%99/g, "'");
  cleaned = cleaned.replace(/%20/g, ' ');

  return cleaned;
}

/**
 * Validates a URL
 * @param url - URL string to validate
 * @returns True if URL appears valid
 */
export function validateURL(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Must have http or https protocol
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    // Must have a hostname
    if (!parsed.hostname || parsed.hostname.length === 0) {
      return false;
    }

    // Must have at least a TLD
    if (!parsed.hostname.includes('.')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Determines the type of URL
 * @param url - URL string
 * @returns URL type category
 */
export function categorizeURL(url: string): string {
  const lower = url.toLowerCase();

  if (lower.includes('doi.org')) {
    return 'DOI';
  }

  if (lower.includes('jstor.org')) {
    return 'JSTOR';
  }

  if (lower.includes('archive.org')) {
    return 'Internet Archive';
  }

  if (lower.includes('arxiv.org')) {
    return 'arXiv';
  }

  if (lower.includes('researchgate.net')) {
    return 'ResearchGate';
  }

  if (lower.includes('scholar.google')) {
    return 'Google Scholar';
  }

  if (lower.includes('pubmed') || lower.includes('ncbi.nlm.nih.gov')) {
    return 'PubMed';
  }

  if (lower.includes('springer.com')) {
    return 'Springer';
  }

  if (lower.includes('sciencedirect.com')) {
    return 'ScienceDirect';
  }

  if (lower.includes('wiley.com')) {
    return 'Wiley';
  }

  if (lower.includes('cambridge.org')) {
    return 'Cambridge';
  }

  if (lower.includes('oup.com') || lower.includes('oxford')) {
    return 'Oxford';
  }

  if (lower.includes('.edu')) {
    return 'Educational';
  }

  if (lower.includes('.gov')) {
    return 'Government';
  }

  if (lower.includes('.org')) {
    return 'Organization';
  }

  if (lower.includes('amazon.com') || lower.includes('bookshop.org')) {
    return 'Retail';
  }

  return 'General';
}

/**
 * Extracts domain from URL
 * @param url - URL string
 * @returns Domain name
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return '';
  }
}

/**
 * Checks if URL is likely open access
 * @param url - URL string
 * @returns True if URL is likely open access
 */
export function isLikelyOpenAccess(url: string): boolean {
  const lower = url.toLowerCase();

  const openAccessIndicators = [
    'archive.org',
    'arxiv.org',
    'pmc.ncbi.nlm.nih.gov', // PubMed Central
    'doaj.org',
    'plos.org',
    'frontiersin.org',
    'mdpi.com',
    'elifesciences.org',
    'biomedcentral.com',
    'nature.com/articles/s41', // Nature Communications
    '.pdf', // Direct PDF links often OA
    '/pdf/',
    'repository',
    'researchgate',
    '.edu/' // Many .edu sites host PDFs
  ];

  return openAccessIndicators.some(indicator => lower.includes(indicator));
}

/**
 * Checks if URL is a paywall
 * @param url - URL string
 * @returns True if URL is likely paywalled
 */
export function isLikelyPaywalled(url: string): boolean {
  const lower = url.toLowerCase();

  const paywallIndicators = [
    'jstor.org',
    'springer.com/article',
    'sciencedirect.com/science/article',
    'wiley.com/doi',
    'tandfonline.com',
    'sagepub.com',
    'cambridge.org/core/journals',
    'amazon.com', // Retail purchase
    'bookshop.org'
  ];

  return paywallIndicators.some(indicator => lower.includes(indicator));
}
