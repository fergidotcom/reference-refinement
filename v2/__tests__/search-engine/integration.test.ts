/**
 * Integration Tests for Search Engine
 *
 * Tests the complete search workflow with real Google CSE API.
 * Requires valid API credentials in .env file.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { SearchEngine } from '../../lib/search-engine/index.js';
import type { BibliographicData } from '../../lib/types/index.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

describe('SearchEngine Integration Tests', () => {
  let searchEngine: SearchEngine;

  beforeAll(() => {
    // Check for required environment variables
    if (!process.env.GOOGLE_API_KEY || !process.env.GOOGLE_CSE_ID) {
      throw new Error(
        'Integration tests require GOOGLE_API_KEY and GOOGLE_CSE_ID environment variables'
      );
    }

    searchEngine = new SearchEngine({
      googleApiKey: process.env.GOOGLE_API_KEY,
      googleCseId: process.env.GOOGLE_CSE_ID,
      primaryQueryCount: 4,
      secondaryQueryCount: 4,
    });
  });

  test('should connect to Google API', async () => {
    const connected = await searchEngine.testConnection();
    expect(connected).toBe(true);
  });

  test('should generate queries for a reference', () => {
    const bibData: BibliographicData = {
      rid: '100',
      fullText: '[100] Pariser, E. (2011). The filter bubble. Penguin Press.',
      author: 'Pariser, E.',
      year: '2011',
      title: 'The filter bubble',
      publication: 'Penguin Press',
    };

    const queries = searchEngine.generateQueries(bibData);

    expect(queries).toHaveLength(8);
    expect(queries.filter((q) => q.type === 'primary')).toHaveLength(4);
    expect(queries.filter((q) => q.type === 'secondary')).toHaveLength(4);

    // Check query structure
    queries.forEach((query) => {
      expect(query.rid).toBe('100');
      expect(query.text).toBeTruthy();
      expect(query.text.length).toBeGreaterThan(0);
      expect(query.text.length).toBeLessThanOrEqual(120);
    });
  });

  test('should search for a reference and discover URLs', async () => {
    const bibData: BibliographicData = {
      rid: '100',
      fullText: '[100] Pariser, E. (2011). The filter bubble. Penguin Press.',
      author: 'Pariser, E.',
      year: '2011',
      title: 'The filter bubble',
      publication: 'Penguin Press',
    };

    const result = await searchEngine.searchForReference(bibData);

    // Check queries were generated
    expect(result.queries).toHaveLength(8);
    expect(result.queriesExecuted).toBe(8);

    // Check search results were returned
    expect(result.searchResults.length).toBeGreaterThan(0);

    // Check URL candidates were discovered
    expect(result.urlCandidates.length).toBeGreaterThan(0);
    expect(result.urlCandidates.length).toBeGreaterThanOrEqual(10); // At least 10 unique URLs

    // Check URL candidate structure
    const firstCandidate = result.urlCandidates[0];
    expect(firstCandidate.url).toBeTruthy();
    expect(firstCandidate.domain).toBeTruthy();
    expect(firstCandidate.urlType).toMatch(/PDF|HTML|DOI|Other/);
    expect(firstCandidate.initialScore).toBeGreaterThanOrEqual(0);
    expect(firstCandidate.initialScore).toBeLessThanOrEqual(100);

    // Check cost calculation
    expect(result.cost).toBe(0.04); // 8 queries × $0.005

    // Check no errors
    expect(result.errors).toHaveLength(0);

    // Log results for manual verification
    console.log('\nSearch Results for "The Filter Bubble":');
    console.log(`  Queries executed: ${result.queriesExecuted}`);
    console.log(`  Search results: ${result.searchResults.length}`);
    console.log(`  URL candidates: ${result.urlCandidates.length}`);
    console.log(`  Cost: $${result.cost.toFixed(4)}`);
    console.log('\nTop 5 URL Candidates:');
    result.urlCandidates.slice(0, 5).forEach((c, i) => {
      console.log(
        `  ${i + 1}. [${c.initialScore}] ${c.urlType} - ${c.url.substring(0, 80)}...`
      );
    });
  }, 30000); // 30 second timeout

  test('should track costs correctly', async () => {
    searchEngine.reset();

    const bibData: BibliographicData = {
      rid: '101',
      fullText: '[101] Anderson, B. (1983). Imagined communities. Verso.',
      author: 'Anderson, B.',
      year: '1983',
      title: 'Imagined communities',
      publication: 'Verso',
    };

    await searchEngine.searchForReference(bibData);

    const stats = searchEngine.getStats();

    expect(stats.referencesProcessed).toBe(1);
    expect(stats.queriesExecuted).toBe(8);
    expect(stats.totalCost).toBe(0.04);
    expect(stats.avgCostPerReference).toBe(0.04);
    expect(stats.urlsDiscovered).toBeGreaterThan(0);
    expect(stats.avgUrlsPerReference).toBeGreaterThan(0);

    // Check cost summary
    const summary = searchEngine.getCostSummary();
    expect(summary).toContain('COST TRACKING SUMMARY');
    expect(summary).toContain('References processed:  1');
    expect(summary).toContain('Queries executed:      8');
  }, 30000);

  test('should handle rate limiting', async () => {
    const quotaBefore = searchEngine.getQuotaInfo();

    const bibData: BibliographicData = {
      rid: '102',
      fullText: '[102] Test reference',
      title: 'Test',
    };

    await searchEngine.searchForReference(bibData);

    const quotaAfter = searchEngine.getQuotaInfo();

    // Daily quota should decrease
    expect(quotaAfter.perDayAvailable).toBeLessThan(quotaBefore.perDayAvailable);
  }, 30000);

  test('should process multiple references', async () => {
    searchEngine.reset();

    const references: BibliographicData[] = [
      {
        rid: '200',
        fullText: '[200] Smith, A. (2020). Test Book. Publisher.',
        author: 'Smith, A.',
        year: '2020',
        title: 'Test Book',
        publication: 'Publisher',
      },
      {
        rid: '201',
        fullText: '[201] Jones, B. (2019). Another Book. Publisher.',
        author: 'Jones, B.',
        year: '2019',
        title: 'Another Book',
        publication: 'Publisher',
      },
    ];

    const results = await searchEngine.searchForReferences(references);

    expect(results).toHaveLength(2);
    expect(results[0].rid).toBe('200');
    expect(results[1].rid).toBe('201');

    const stats = searchEngine.getStats();
    expect(stats.referencesProcessed).toBe(2);
    expect(stats.queriesExecuted).toBe(16); // 8 per reference
    expect(stats.totalCost).toBe(0.08); // $0.04 × 2
  }, 60000); // 60 second timeout
});
