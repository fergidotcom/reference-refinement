/**
 * Reference Refinement v2 - JSON Formatter
 *
 * Formats references as structured JSON for API/programmatic access
 */

import type { Reference } from '../types/index.js';

/**
 * Format references as JSON
 *
 * @param references - Array of references
 * @param pretty - Whether to pretty-print JSON (default: true)
 * @returns JSON string
 */
export function formatJSON(references: Reference[], pretty = true): string {
  // Sort by ID
  const sorted = [...references].sort((a, b) => a.id - b.id);

  // Convert to JSON-friendly format
  const data = {
    version: '2.0',
    generated_at: new Date().toISOString(),
    total_references: sorted.length,
    finalized_count: sorted.filter((r) => r.flags.finalized).length,
    references: sorted.map((ref) => ({
      id: ref.id,
      text: ref.text,
      parsed: ref.parsed,
      urls: ref.urls,
      queries: ref.queries,
      relevance: ref.relevance,
      flags: ref.flags,
      meta: ref.meta,
    })),
  };

  return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
}

/**
 * Parse JSON format back to references
 *
 * @param json - JSON string
 * @returns Array of references
 */
export function parseJSON(json: string): Reference[] {
  const data = JSON.parse(json);

  if (!data.references || !Array.isArray(data.references)) {
    throw new Error('Invalid JSON format: missing references array');
  }

  return data.references.map((item: any) => ({
    id: item.id,
    text: item.text,
    parsed: item.parsed || {},
    urls: item.urls || {},
    queries: item.queries || [],
    relevance: item.relevance,
    flags: item.flags || { finalized: false, manual_review: false },
    meta: item.meta,
  }));
}

/**
 * Format references as JSON Lines (one JSON object per line)
 *
 * Useful for streaming and large datasets
 *
 * @param references - Array of references
 * @returns JSON Lines string
 */
export function formatJSONLines(references: Reference[]): string {
  // Sort by ID
  const sorted = [...references].sort((a, b) => a.id - b.id);

  return sorted
    .map((ref) =>
      JSON.stringify({
        id: ref.id,
        text: ref.text,
        parsed: ref.parsed,
        urls: ref.urls,
        queries: ref.queries,
        relevance: ref.relevance,
        flags: ref.flags,
        meta: ref.meta,
      })
    )
    .join('\n');
}

/**
 * Parse JSON Lines format
 *
 * @param jsonl - JSON Lines string
 * @returns Array of references
 */
export function parseJSONLines(jsonl: string): Reference[] {
  return jsonl
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => {
      const item = JSON.parse(line);
      return {
        id: item.id,
        text: item.text,
        parsed: item.parsed || {},
        urls: item.urls || {},
        queries: item.queries || [],
        relevance: item.relevance,
        flags: item.flags || { finalized: false, manual_review: false },
        meta: item.meta,
      };
    });
}
