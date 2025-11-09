/**
 * Reference Refinement v2 - Integration Tests
 *
 * Tests the complete pipeline with mock data
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { OutputGenerator, DecisionsFormatter } from '../../lib/output-generator/index.js';
import type { Reference, PipelineConfig } from '../../lib/types/index.js';
import { createDefaultConfig } from '../../lib/pipeline/pipeline-config.js';

describe('Reference Pipeline Integration', () => {
  let config: PipelineConfig;

  beforeAll(() => {
    // Create test configuration
    // Note: These are mock API keys for testing
    config = createDefaultConfig({
      google_api_key: process.env.GOOGLE_API_KEY || 'test-google-key',
      google_cse_id: process.env.GOOGLE_CSE_ID || 'test-cse-id',
      anthropic_api_key: process.env.ANTHROPIC_API_KEY || 'test-anthropic-key',
    });
  });

  test('should create pipeline configuration', () => {
    expect(config).toBeDefined();
    expect(config.search.queries_per_reference).toBe(8);
    expect(config.refinement.primary_threshold).toBe(75);
    expect(config.refinement.secondary_threshold).toBe(75);
  });

  test('should format reference in decisions.txt format', () => {
    const ref: Reference = {
      id: 100,
      text: 'Pariser, E. (2011). The filter bubble. Penguin Press.',
      parsed: {
        authors: 'Pariser, E.',
        year: '2011',
        title: 'The filter bubble',
        publication: 'Penguin Press',
      },
      queries: [
        '"The filter bubble" Pariser 2011 filetype:pdf site:edu',
        '"The filter bubble" Pariser free full text',
      ],
      urls: {
        primary: 'https://archive.org/details/filterbubble00pari',
        secondary: 'https://www.jstor.org/stable/review-article',
      },
      flags: {
        finalized: true,
        manual_review: false,
        batch_version: 'v2.0',
      },
      relevance: 'This seminal work on algorithmic filtering...',
    };

    const outputGen = new OutputGenerator();
    const formatted = outputGen.format([ref], 'decisions');

    expect(formatted).toContain('[100]');
    expect(formatted).toContain('Pariser, E. (2011)');
    expect(formatted).toContain('[FINALIZED BATCH_v2.0]');
    expect(formatted).toContain('Primary URL: https://archive.org');
    expect(formatted).toContain('Secondary URL: https://www.jstor.org');
    expect(formatted).toContain('Q: "The filter bubble"');
  });

  test('should format reference in Final.txt format', () => {
    const ref: Reference = {
      id: 100,
      text: 'Pariser, E. (2011). The filter bubble. Penguin Press.',
      parsed: {},
      queries: [],
      urls: {
        primary: 'https://archive.org/details/filterbubble00pari',
        secondary: 'https://www.jstor.org/stable/review-article',
      },
      flags: {
        finalized: true,
        manual_review: false,
      },
    };

    const outputGen = new OutputGenerator();
    const formatted = outputGen.format([ref], 'final');

    expect(formatted).toContain('[100]');
    expect(formatted).toContain('Primary URL:');
    expect(formatted).toContain('Secondary URL:');
    expect(formatted).not.toContain('Q:'); // No queries in final format
    expect(formatted).not.toContain('Relevance:'); // No relevance in final format
  });

  test('should not include unfinalized references in Final.txt', () => {
    const refs: Reference[] = [
      {
        id: 100,
        text: 'Reference 1',
        parsed: {},
        queries: [],
        urls: { primary: 'https://example.com' },
        flags: { finalized: true, manual_review: false },
      },
      {
        id: 101,
        text: 'Reference 2',
        parsed: {},
        queries: [],
        urls: { primary: 'https://example.com' },
        flags: { finalized: false, manual_review: false },
      },
    ];

    const outputGen = new OutputGenerator();
    const formatted = outputGen.format(refs, 'final');

    expect(formatted).toContain('[100]');
    expect(formatted).not.toContain('[101]');
  });

  test('should parse decisions.txt format', () => {
    const content = `[100] Pariser, E. (2011). The filter bubble. Penguin Press.
[FINALIZED BATCH_v2.0]
Relevance: This seminal work on algorithmic filtering...
Primary URL: https://archive.org/details/filterbubble00pari
Secondary URL: https://www.jstor.org/stable/review-article
Q: "The filter bubble" Pariser 2011 filetype:pdf site:edu
Q: "The filter bubble" Pariser free full text

[101] Anderson, B. (1983). Imagined communities. Verso.
[MANUAL_REVIEW]
Primary URL: https://example.com/anderson
`;

    const references = DecisionsFormatter.parseDecisionsFile(content);

    expect(references).toHaveLength(2);

    expect(references[0].id).toBe(100);
    expect(references[0].flags.finalized).toBe(true);
    expect(references[0].flags.batch_version).toBe('v2.0');
    expect(references[0].queries).toHaveLength(2);
    expect(references[0].urls.primary).toBe('https://archive.org/details/filterbubble00pari');

    expect(references[1].id).toBe(101);
    expect(references[1].flags.manual_review).toBe(true);
    expect(references[1].urls.primary).toBe('https://example.com/anderson');
  });

  test('should calculate statistics correctly', () => {
    const refs: Reference[] = [
      {
        id: 100,
        text: 'Ref 1',
        parsed: {},
        queries: [],
        urls: { primary: 'https://example.com/1', secondary: 'https://example.com/2' },
        flags: { finalized: true, manual_review: false },
      },
      {
        id: 101,
        text: 'Ref 2',
        parsed: {},
        queries: [],
        urls: { primary: 'https://example.com/3' },
        flags: { finalized: true, manual_review: false },
      },
      {
        id: 102,
        text: 'Ref 3',
        parsed: {},
        queries: [],
        urls: {},
        flags: { finalized: false, manual_review: true },
      },
    ];

    const outputGen = new OutputGenerator();
    const stats = outputGen.getStatistics(refs);

    expect(stats.total).toBe(3);
    expect(stats.finalized).toBe(2);
    expect(stats.unfinalized).toBe(1);
    expect(stats.with_primary).toBe(2);
    expect(stats.with_secondary).toBe(1);
    expect(stats.needs_review).toBe(1);
    expect(stats.primary_coverage).toBeCloseTo(2 / 3);
    expect(stats.secondary_coverage).toBeCloseTo(1 / 3);
  });
});
