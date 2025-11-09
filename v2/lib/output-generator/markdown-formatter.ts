/**
 * Reference Refinement v2 - Markdown Formatter
 *
 * Formats references as Markdown for documentation and readable reports
 */

import type { Reference } from '../types/index.js';

/**
 * Format a single reference as Markdown
 *
 * @param ref - Reference to format
 * @param includeDetails - Include queries, relevance, and metadata
 * @returns Markdown text
 */
export function formatReference(ref: Reference, includeDetails = true): string {
  const lines: string[] = [];

  // Header
  lines.push(`### [${ref.id}] ${ref.parsed.title || 'Untitled'}`);
  lines.push('');

  // Reference text
  lines.push(`**Full Citation:** ${ref.text}`);
  lines.push('');

  // Bibliographic info
  if (ref.parsed.authors || ref.parsed.year || ref.parsed.publication) {
    lines.push('**Bibliographic Information:**');
    if (ref.parsed.authors) lines.push(`- **Authors:** ${ref.parsed.authors}`);
    if (ref.parsed.year) lines.push(`- **Year:** ${ref.parsed.year}`);
    if (ref.parsed.publication) lines.push(`- **Publication:** ${ref.parsed.publication}`);
    lines.push('');
  }

  // URLs
  if (ref.urls.primary || ref.urls.secondary || ref.urls.tertiary) {
    lines.push('**URLs:**');
    if (ref.urls.primary) {
      lines.push(`- **Primary:** [${new URL(ref.urls.primary).hostname}](${ref.urls.primary})`);
    }
    if (ref.urls.secondary) {
      lines.push(`- **Secondary:** [${new URL(ref.urls.secondary).hostname}](${ref.urls.secondary})`);
    }
    if (ref.urls.tertiary) {
      lines.push(`- **Tertiary:** [${new URL(ref.urls.tertiary).hostname}](${ref.urls.tertiary})`);
    }
    lines.push('');
  }

  // Flags
  const flags: string[] = [];
  if (ref.flags.finalized) flags.push('✅ Finalized');
  if (ref.flags.manual_review) flags.push('⚠️ Manual Review');
  if (ref.flags.batch_version) flags.push(`🤖 Batch ${ref.flags.batch_version}`);

  if (flags.length > 0) {
    lines.push(`**Status:** ${flags.join(' | ')}`);
    lines.push('');
  }

  // Details (optional)
  if (includeDetails) {
    // Relevance
    if (ref.relevance) {
      lines.push('**Relevance:**');
      lines.push(`> ${ref.relevance}`);
      lines.push('');
    }

    // Queries
    if (ref.queries && ref.queries.length > 0) {
      lines.push('**Search Queries:**');
      ref.queries.forEach((query, i) => {
        lines.push(`${i + 1}. \`${query}\``);
      });
      lines.push('');
    }

    // Metadata
    if (ref.meta) {
      lines.push('<details>');
      lines.push('<summary>Metadata</summary>');
      lines.push('');
      if (ref.meta.processed_at) {
        lines.push(`- **Processed:** ${new Date(ref.meta.processed_at).toISOString()}`);
      }
      if (ref.meta.cost) {
        lines.push(`- **Cost:** $${ref.meta.cost.toFixed(4)}`);
      }
      if (ref.meta.candidates_count) {
        lines.push(`- **Candidates:** ${ref.meta.candidates_count}`);
      }
      if (ref.meta.primary_confidence) {
        lines.push(`- **Primary Confidence:** ${(ref.meta.primary_confidence * 100).toFixed(0)}%`);
      }
      if (ref.meta.secondary_confidence) {
        lines.push(`- **Secondary Confidence:** ${(ref.meta.secondary_confidence * 100).toFixed(0)}%`);
      }
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Format references as Markdown document
 *
 * @param references - Array of references
 * @param options - Formatting options
 * @returns Complete Markdown document
 */
export function formatMarkdown(
  references: Reference[],
  options: {
    title?: string;
    includeDetails?: boolean;
    includeTOC?: boolean;
    includeStats?: boolean;
  } = {}
): string {
  const { title = 'References', includeDetails = true, includeTOC = true, includeStats = true } = options;

  const lines: string[] = [];

  // Title
  lines.push(`# ${title}`);
  lines.push('');

  // Statistics
  if (includeStats) {
    const stats = calculateStatistics(references);
    lines.push('## Summary Statistics');
    lines.push('');
    lines.push(`- **Total References:** ${stats.total}`);
    lines.push(`- **Finalized:** ${stats.finalized} (${(stats.finalized_rate * 100).toFixed(1)}%)`);
    lines.push(`- **With Primary URL:** ${stats.with_primary} (${(stats.primary_coverage * 100).toFixed(1)}%)`);
    lines.push(`- **With Secondary URL:** ${stats.with_secondary} (${(stats.secondary_coverage * 100).toFixed(1)}%)`);
    lines.push(`- **Manual Review Needed:** ${stats.manual_review}`);
    if (stats.batch_versions.length > 0) {
      lines.push(`- **Batch Versions:** ${stats.batch_versions.join(', ')}`);
    }
    lines.push('');
  }

  // Table of Contents
  if (includeTOC && references.length > 10) {
    lines.push('## Table of Contents');
    lines.push('');
    references.forEach((ref) => {
      const title = ref.parsed.title || 'Untitled';
      const anchor = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      lines.push(`- [${ref.id}. ${title}](#${ref.id}-${anchor})`);
    });
    lines.push('');
  }

  // References
  lines.push('## References');
  lines.push('');

  // Sort by ID
  const sorted = [...references].sort((a, b) => a.id - b.id);

  sorted.forEach((ref, index) => {
    if (index > 0) lines.push('---');
    lines.push('');
    lines.push(formatReference(ref, includeDetails));
  });

  return lines.join('\n');
}

/**
 * Calculate statistics for references
 */
function calculateStatistics(references: Reference[]): {
  total: number;
  finalized: number;
  finalized_rate: number;
  with_primary: number;
  with_secondary: number;
  primary_coverage: number;
  secondary_coverage: number;
  manual_review: number;
  batch_versions: string[];
} {
  const total = references.length;
  const finalized = references.filter((r) => r.flags.finalized).length;
  const with_primary = references.filter((r) => r.urls.primary).length;
  const with_secondary = references.filter((r) => r.urls.secondary).length;
  const manual_review = references.filter((r) => r.flags.manual_review).length;

  const batch_versions = [
    ...new Set(
      references.map((r) => r.flags.batch_version).filter((v): v is string => v !== undefined)
    ),
  ].sort();

  return {
    total,
    finalized,
    finalized_rate: total > 0 ? finalized / total : 0,
    with_primary,
    with_secondary,
    primary_coverage: total > 0 ? with_primary / total : 0,
    secondary_coverage: total > 0 ? with_secondary / total : 0,
    manual_review,
    batch_versions,
  };
}

/**
 * Format references as simple table
 *
 * @param references - Array of references
 * @returns Markdown table
 */
export function formatTable(references: Reference[]): string {
  const lines: string[] = [];

  // Header
  lines.push('| ID | Title | Authors | Year | Primary | Secondary | Status |');
  lines.push('|----|-------|---------|------|---------|-----------|--------|');

  // Sort by ID
  const sorted = [...references].sort((a, b) => a.id - b.id);

  // Rows
  sorted.forEach((ref) => {
    const id = ref.id;
    const title = (ref.parsed.title || 'Untitled').substring(0, 40);
    const authors = (ref.parsed.authors || 'Unknown').substring(0, 30);
    const year = ref.parsed.year || '-';
    const primary = ref.urls.primary ? '✓' : '-';
    const secondary = ref.urls.secondary ? '✓' : '-';
    const status = ref.flags.finalized ? '✅' : ref.flags.manual_review ? '⚠️' : '-';

    lines.push(`| ${id} | ${title} | ${authors} | ${year} | ${primary} | ${secondary} | ${status} |`);
  });

  return lines.join('\n');
}
