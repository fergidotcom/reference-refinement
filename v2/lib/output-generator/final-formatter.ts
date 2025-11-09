/**
 * Reference Refinement v2 - Final.txt Formatter
 *
 * Formats references in Final.txt format (clean publication format)
 *
 * Format:
 * [ID] Author (YEAR). Title. Publication.
 * Primary URL: https://...
 * Secondary URL: https://...
 *
 * Only includes finalized references.
 * No queries, relevance, or flags.
 *
 * Based on v1 Final.txt format
 */

import type { Reference } from '../types/index.js';

/**
 * Format a single reference in Final.txt format
 *
 * @param ref - Reference to format
 * @returns Formatted reference text or null if not finalized
 */
export function formatReference(ref: Reference): string | null {
  // Only include finalized references
  if (!ref.flags.finalized) {
    return null;
  }

  const lines: string[] = [];

  // Line 1: [ID] Reference text
  lines.push(`[${ref.id}] ${ref.text}`);

  // URLs (only if present)
  if (ref.urls.primary) {
    lines.push(`Primary URL: ${ref.urls.primary}`);
  }
  if (ref.urls.secondary) {
    lines.push(`Secondary URL: ${ref.urls.secondary}`);
  }

  return lines.join('\n');
}

/**
 * Format multiple references in Final.txt format
 *
 * @param references - Array of references to format
 * @returns Complete Final.txt content
 */
export function formatFinalFile(references: Reference[]): string {
  // Filter to finalized only
  const finalized = references.filter((ref) => ref.flags.finalized);

  // Sort by ID
  const sorted = [...finalized].sort((a, b) => a.id - b.id);

  // Format each reference
  const formatted = sorted
    .map((ref) => formatReference(ref))
    .filter((text): text is string => text !== null);

  // Join with blank line separator
  return formatted.join('\n\n') + '\n';
}

/**
 * Get statistics for Final.txt output
 *
 * @param references - Array of references
 * @returns Statistics object
 */
export function getFinalStatistics(references: Reference[]): {
  total_references: number;
  finalized_references: number;
  finalized_with_primary: number;
  finalized_with_secondary: number;
  finalized_with_both: number;
  primary_coverage: number;
  secondary_coverage: number;
} {
  const finalized = references.filter((ref) => ref.flags.finalized);
  const withPrimary = finalized.filter((ref) => ref.urls.primary);
  const withSecondary = finalized.filter((ref) => ref.urls.secondary);
  const withBoth = finalized.filter((ref) => ref.urls.primary && ref.urls.secondary);

  return {
    total_references: references.length,
    finalized_references: finalized.length,
    finalized_with_primary: withPrimary.length,
    finalized_with_secondary: withSecondary.length,
    finalized_with_both: withBoth.length,
    primary_coverage: finalized.length > 0 ? withPrimary.length / finalized.length : 0,
    secondary_coverage: finalized.length > 0 ? withSecondary.length / finalized.length : 0,
  };
}
