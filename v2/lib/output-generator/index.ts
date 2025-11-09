/**
 * Reference Refinement v2 - Output Generator
 *
 * Formats references in multiple output formats:
 * - decisions.txt: Working format with queries, relevance, flags
 * - Final.txt: Clean format with just URLs (finalized only)
 * - JSON: Structured data for API/programmatic access
 * - Markdown: Readable documentation format
 */

import * as fs from 'fs/promises';
import type { Reference } from '../types/index.js';

// Import formatters
import * as DecisionsFormatter from './decisions-formatter.js';
import * as FinalFormatter from './final-formatter.js';
import * as JSONFormatter from './json-formatter.js';
import * as MarkdownFormatter from './markdown-formatter.js';

/**
 * Output format type
 */
export type OutputFormat = 'decisions' | 'final' | 'json' | 'jsonl' | 'markdown';

/**
 * Output Generator
 *
 * Handles formatting and writing references to various output formats.
 */
export class OutputGenerator {
  /**
   * Format references in specified format
   *
   * @param references - Array of references
   * @param format - Output format
   * @param options - Format-specific options
   * @returns Formatted output string
   */
  format(
    references: Reference[],
    format: OutputFormat,
    options: Record<string, any> = {}
  ): string {
    switch (format) {
      case 'decisions':
        return DecisionsFormatter.formatDecisionsFile(references);

      case 'final':
        return FinalFormatter.formatFinalFile(references);

      case 'json':
        return JSONFormatter.formatJSON(references, options.pretty !== false);

      case 'jsonl':
        return JSONFormatter.formatJSONLines(references);

      case 'markdown':
        return MarkdownFormatter.formatMarkdown(references, options);

      default:
        throw new Error(`Unsupported output format: ${format}`);
    }
  }

  /**
   * Write references to file
   *
   * @param references - Array of references
   * @param filepath - Output file path
   * @param format - Output format (auto-detected from extension if not specified)
   * @param options - Format-specific options
   */
  async writeFile(
    references: Reference[],
    filepath: string,
    format?: OutputFormat,
    options: Record<string, any> = {}
  ): Promise<void> {
    // Auto-detect format from extension if not specified
    if (!format) {
      format = this.detectFormat(filepath);
    }

    // Format content
    const content = this.format(references, format, options);

    // Write to file
    await fs.writeFile(filepath, content, 'utf-8');
  }

  /**
   * Read and parse references from file
   *
   * @param filepath - Input file path
   * @param format - Input format (auto-detected from extension if not specified)
   * @returns Array of parsed references
   */
  async readFile(filepath: string, format?: OutputFormat): Promise<Reference[]> {
    // Auto-detect format from extension if not specified
    if (!format) {
      format = this.detectFormat(filepath);
    }

    // Read file
    const content = await fs.readFile(filepath, 'utf-8');

    // Parse based on format
    switch (format) {
      case 'decisions':
        return DecisionsFormatter.parseDecisionsFile(content);

      case 'json':
        return JSONFormatter.parseJSON(content);

      case 'jsonl':
        return JSONFormatter.parseJSONLines(content);

      default:
        throw new Error(`Cannot parse format: ${format}`);
    }
  }

  /**
   * Detect output format from file extension
   *
   * @param filepath - File path
   * @returns Detected format
   */
  private detectFormat(filepath: string): OutputFormat {
    const ext = filepath.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'json':
        return 'json';
      case 'jsonl':
      case 'ndjson':
        return 'jsonl';
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'txt':
        // Check if filename contains 'final'
        if (filepath.toLowerCase().includes('final')) {
          return 'final';
        }
        return 'decisions';
      default:
        return 'decisions';
    }
  }

  /**
   * Get output statistics
   *
   * @param references - Array of references
   * @returns Statistics object
   */
  getStatistics(references: Reference[]): {
    total: number;
    finalized: number;
    unfinalized: number;
    with_primary: number;
    with_secondary: number;
    needs_review: number;
    primary_coverage: number;
    secondary_coverage: number;
  } {
    const total = references.length;
    const finalized = references.filter((r) => r.flags.finalized).length;
    const unfinalized = total - finalized;
    const with_primary = references.filter((r) => r.urls.primary).length;
    const with_secondary = references.filter((r) => r.urls.secondary).length;
    const needs_review = references.filter((r) => r.flags.manual_review).length;

    return {
      total,
      finalized,
      unfinalized,
      with_primary,
      with_secondary,
      needs_review,
      primary_coverage: total > 0 ? with_primary / total : 0,
      secondary_coverage: total > 0 ? with_secondary / total : 0,
    };
  }
}

// Re-export formatters
export { DecisionsFormatter, FinalFormatter, JSONFormatter, MarkdownFormatter };

// Re-export types
export type { Reference };
