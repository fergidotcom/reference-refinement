/**
 * Reference Refinement v2 - Decisions.txt Formatter
 *
 * Formats references in decisions.txt format (working file format)
 *
 * Format:
 * [ID] Author (YEAR). Title. Publication.
 * [FLAGS]
 * Relevance: Description...
 * Primary URL: https://...
 * Secondary URL: https://...
 * Tertiary URL: https://...
 * Q: search query 1
 * Q: search query 2
 * ...
 *
 * Based on v1 decisions.txt format
 */

import type { Reference } from '../types/index.js';

/**
 * Format a single reference in decisions.txt format
 *
 * @param ref - Reference to format
 * @returns Formatted reference text
 */
export function formatReference(ref: Reference): string {
  const lines: string[] = [];

  // Line 1: [ID] Reference text
  lines.push(`[${ref.id}] ${ref.text}`);

  // Line 2: Flags
  const flags: string[] = [];
  if (ref.flags.finalized) {
    flags.push('FINALIZED');
  }
  if (ref.flags.manual_review) {
    flags.push('MANUAL_REVIEW');
  }
  if (ref.flags.batch_version) {
    flags.push(`BATCH_${ref.flags.batch_version}`);
  }

  if (flags.length > 0) {
    lines.push(`[${flags.join(' ')}]`);
  }

  // Relevance (if present)
  if (ref.relevance && ref.relevance.trim()) {
    lines.push(`Relevance: ${ref.relevance.trim()}`);
  }

  // URLs
  if (ref.urls.primary) {
    lines.push(`Primary URL: ${ref.urls.primary}`);
  }
  if (ref.urls.secondary) {
    lines.push(`Secondary URL: ${ref.urls.secondary}`);
  }
  if (ref.urls.tertiary) {
    lines.push(`Tertiary URL: ${ref.urls.tertiary}`);
  }

  // Queries
  if (ref.queries && ref.queries.length > 0) {
    for (const query of ref.queries) {
      lines.push(`Q: ${query}`);
    }
  }

  return lines.join('\n');
}

/**
 * Format multiple references in decisions.txt format
 *
 * @param references - Array of references to format
 * @returns Complete decisions.txt content
 */
export function formatDecisionsFile(references: Reference[]): string {
  // Sort by ID
  const sorted = [...references].sort((a, b) => a.id - b.id);

  // Format each reference
  const formatted = sorted.map((ref) => formatReference(ref));

  // Join with blank line separator
  return formatted.join('\n\n') + '\n';
}

/**
 * Parse decisions.txt file into references
 *
 * @param content - decisions.txt file content
 * @returns Array of parsed references
 */
export function parseDecisionsFile(content: string): Reference[] {
  const references: Reference[] = [];
  const blocks = content.split('\n\n').filter((block) => block.trim());

  for (const block of blocks) {
    try {
      const ref = parseReferenceBlock(block);
      if (ref) {
        references.push(ref);
      }
    } catch (error) {
      // Skip malformed blocks
      console.warn('Failed to parse reference block:', error);
      continue;
    }
  }

  return references;
}

/**
 * Parse a single reference block
 *
 * @param block - Reference block text
 * @returns Parsed reference or null
 */
function parseReferenceBlock(block: string): Reference | null {
  const lines = block.split('\n').filter((line) => line.trim());
  if (lines.length === 0) return null;

  // Parse first line: [ID] Reference text
  const firstLine = lines[0];
  const idMatch = firstLine.match(/^\[(\d+)\]\s+(.+)$/);
  if (!idMatch) return null;

  const id = parseInt(idMatch[1]);
  const text = idMatch[2];

  // Initialize reference
  const ref: Reference = {
    id,
    text,
    parsed: {},
    queries: [],
    urls: {},
    flags: {
      finalized: false,
      manual_review: false,
    },
  };

  // Parse remaining lines
  let currentLine = 1;

  // Check for flags line
  if (currentLine < lines.length && lines[currentLine].startsWith('[')) {
    const flagsLine = lines[currentLine];
    const flagsMatch = flagsLine.match(/^\[(.+)\]$/);
    if (flagsMatch) {
      const flagsStr = flagsMatch[1];
      const flags = flagsStr.split(/\s+/);

      ref.flags.finalized = flags.includes('FINALIZED');
      ref.flags.manual_review = flags.includes('MANUAL_REVIEW');

      const batchFlag = flags.find((f) => f.startsWith('BATCH_'));
      if (batchFlag) {
        ref.flags.batch_version = batchFlag.replace('BATCH_', '');
      }

      currentLine++;
    }
  }

  // Parse remaining lines
  for (let i = currentLine; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('Relevance:')) {
      ref.relevance = line.substring('Relevance:'.length).trim();
    } else if (line.startsWith('Primary URL:')) {
      ref.urls.primary = line.substring('Primary URL:'.length).trim();
    } else if (line.startsWith('Secondary URL:')) {
      ref.urls.secondary = line.substring('Secondary URL:'.length).trim();
    } else if (line.startsWith('Tertiary URL:')) {
      ref.urls.tertiary = line.substring('Tertiary URL:'.length).trim();
    } else if (line.startsWith('Q:')) {
      const query = line.substring('Q:'.length).trim();
      if (query) {
        ref.queries.push(query);
      }
    }
  }

  // Parse bibliographic info from text
  // Simple parsing - can be enhanced with more sophisticated parser
  const yearMatch = text.match(/\((\d{4}[a-z]?)\)/);
  if (yearMatch) {
    ref.parsed.year = yearMatch[1];

    // Try to extract author (before year)
    const beforeYear = text.substring(0, text.indexOf(yearMatch[0])).trim();
    const authorMatch = beforeYear.match(/^([^(]+)/);
    if (authorMatch) {
      ref.parsed.authors = authorMatch[1].trim().replace(/,$/, '');
    }

    // Try to extract title (after year, before period or publication info)
    const afterYear = text.substring(text.indexOf(yearMatch[0]) + yearMatch[0].length).trim();
    const titleMatch = afterYear.match(/^\.?\s*([^.]+)/);
    if (titleMatch) {
      ref.parsed.title = titleMatch[1].trim();
    }
  }

  return ref;
}

/**
 * Filter references by criteria
 *
 * @param references - Array of references
 * @param criteria - Filter criteria
 * @returns Filtered references
 */
export function filterReferences(
  references: Reference[],
  criteria: {
    finalized?: boolean;
    manual_review?: boolean;
    has_primary?: boolean;
    has_secondary?: boolean;
    batch_version?: string;
  }
): Reference[] {
  return references.filter((ref) => {
    if (criteria.finalized !== undefined && ref.flags.finalized !== criteria.finalized) {
      return false;
    }
    if (criteria.manual_review !== undefined && ref.flags.manual_review !== criteria.manual_review) {
      return false;
    }
    if (criteria.has_primary !== undefined) {
      const hasPrimary = !!ref.urls.primary;
      if (hasPrimary !== criteria.has_primary) return false;
    }
    if (criteria.has_secondary !== undefined) {
      const hasSecondary = !!ref.urls.secondary;
      if (hasSecondary !== criteria.has_secondary) return false;
    }
    if (criteria.batch_version !== undefined && ref.flags.batch_version !== criteria.batch_version) {
      return false;
    }
    return true;
  });
}
