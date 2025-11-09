/**
 * Unit Tests for Query Generation
 *
 * Tests query generation logic without making API calls.
 */

import { describe, test, expect } from '@jest/globals';
import { QueryGenerator } from '../../lib/search-engine/query-generator.js';
import type { BibliographicData } from '../../lib/types/index.js';

describe('QueryGenerator', () => {
  const generator = new QueryGenerator({
    primaryQueryCount: 4,
    secondaryQueryCount: 4,
  });

  describe('Primary Queries', () => {
    test('should generate queries for a complete reference', () => {
      const bibData: BibliographicData = {
        rid: '100',
        fullText: '[100] Pariser, E. (2011). The filter bubble. Penguin Press.',
        author: 'Pariser, E.',
        year: '2011',
        title: 'The filter bubble',
        publication: 'Penguin Press',
      };

      const queries = generator.generateQueries(bibData);

      const primaryQueries = queries.filter((q) => q.type === 'primary');
      expect(primaryQueries).toHaveLength(4);

      // Check first query contains key elements
      const q1 = primaryQueries[0];
      expect(q1.text).toContain('The filter bubble');
      expect(q1.text).toContain('Pariser');
      expect(q1.queryNumber).toBe(1);

      // All queries should be valid
      primaryQueries.forEach((q) => {
        expect(generator.validateQuery(q.text)).toBe(true);
      });
    });

    test('should include free source operators', () => {
      const bibData: BibliographicData = {
        rid: '101',
        fullText: '[101] Anderson, B. (1983). Imagined communities. Verso.',
        author: 'Anderson, B.',
        year: '1983',
        title: 'Imagined communities',
        publication: 'Verso',
      };

      const queries = generator.generateQueries(bibData);
      const primaryQueries = queries.filter((q) => q.type === 'primary');

      // Should have queries targeting free sources
      const hasFreeQuery = primaryQueries.some(
        (q) =>
          q.text.includes('site:edu') ||
          q.text.includes('site:gov') ||
          q.text.includes('site:archive.org') ||
          q.text.includes('free full text')
      );

      expect(hasFreeQuery).toBe(true);
    });

    test('should handle references with missing data', () => {
      const bibData: BibliographicData = {
        rid: '102',
        fullText: '[102] Unknown work',
        title: 'Unknown work',
      };

      const queries = generator.generateQueries(bibData);

      expect(queries.length).toBeGreaterThan(0);
      queries.forEach((q) => {
        expect(q.text).toBeTruthy();
        expect(q.text.length).toBeGreaterThan(0);
      });
    });

    test('should include DOI query if DOI is available', () => {
      const bibData: BibliographicData = {
        rid: '103',
        fullText: '[103] Test article',
        title: 'Test article',
        doi: '10.1234/test.2023',
      };

      const queries = generator.generateQueries(bibData);
      const primaryQueries = queries.filter((q) => q.type === 'primary');

      const doiQuery = primaryQueries.find((q) => q.text.includes('10.1234/test.2023'));
      expect(doiQuery).toBeDefined();
    });
  });

  describe('Secondary Queries', () => {
    test('should generate review-focused queries', () => {
      const bibData: BibliographicData = {
        rid: '200',
        fullText: '[200] Pariser, E. (2011). The filter bubble. Penguin Press.',
        author: 'Pariser, E.',
        year: '2011',
        title: 'The filter bubble',
        publication: 'Penguin Press',
      };

      const queries = generator.generateQueries(bibData);
      const secondaryQueries = queries.filter((q) => q.type === 'secondary');

      expect(secondaryQueries).toHaveLength(4);

      // Should include review-specific terms
      const hasReviewQuery = secondaryQueries.some(
        (q) =>
          q.text.includes('review') ||
          q.text.includes('analysis') ||
          q.text.includes('critique') ||
          q.text.includes('discussion')
      );

      expect(hasReviewQuery).toBe(true);
    });

    test('should target academic sources', () => {
      const bibData: BibliographicData = {
        rid: '201',
        fullText: '[201] Smith, A. (2020). Academic work. Publisher.',
        author: 'Smith, A.',
        year: '2020',
        title: 'Academic work',
        publication: 'Publisher',
      };

      const queries = generator.generateQueries(bibData);
      const secondaryQueries = queries.filter((q) => q.type === 'secondary');

      // Should target .edu or scholarly databases
      const hasAcademicQuery = secondaryQueries.some(
        (q) =>
          q.text.includes('site:edu') ||
          q.text.includes('JSTOR') ||
          q.text.includes('EBSCO') ||
          q.text.includes('scholarly')
      );

      expect(hasAcademicQuery).toBe(true);
    });
  });

  describe('Query Quality', () => {
    test('should respect length limits', () => {
      const bibData: BibliographicData = {
        rid: '300',
        fullText:
          '[300] Author, A. (2020). Very long title that should be truncated if it exceeds the maximum length allowed for search queries. Publisher.',
        author: 'Author, A.',
        year: '2020',
        title:
          'Very long title that should be truncated if it exceeds the maximum length allowed for search queries',
        publication: 'Publisher',
      };

      const queries = generator.generateQueries(bibData);

      queries.forEach((q) => {
        expect(q.text.length).toBeLessThanOrEqual(120);
      });
    });

    test('should validate queries correctly', () => {
      expect(generator.validateQuery('short query with meaning')).toBe(true);
      expect(generator.validateQuery('a')).toBe(false); // too short
      expect(generator.validateQuery('the and or')).toBe(false); // only stopwords
      expect(generator.validateQuery('a'.repeat(130))).toBe(false); // too long
    });

    test('should extract author last name correctly', () => {
      const testCases: Array<[string, string]> = [
        ['Smith, J.', 'Smith'],
        ['Smith', 'Smith'],
        ['Smith, John', 'Smith'],
        ['van der Berg, A.', 'van'],
      ];

      testCases.forEach(([input, expected]) => {
        const bibData: BibliographicData = {
          rid: 'TEST',
          fullText: 'Test',
          author: input,
          title: 'Test',
        };

        const queries = generator.generateQueries(bibData);
        const firstQuery = queries[0];

        // Last name should appear in query
        expect(firstQuery.text).toContain(expected);
      });
    });
  });

  describe('Query Allocation', () => {
    test('should respect custom allocation (6+2)', () => {
      const customGenerator = new QueryGenerator({
        primaryQueryCount: 6,
        secondaryQueryCount: 2,
      });

      const bibData: BibliographicData = {
        rid: '400',
        fullText: '[400] Test, T. (2020). Test. Publisher.',
        author: 'Test, T.',
        year: '2020',
        title: 'Test',
        publication: 'Publisher',
      };

      const queries = customGenerator.generateQueries(bibData);

      expect(queries.filter((q) => q.type === 'primary')).toHaveLength(6);
      expect(queries.filter((q) => q.type === 'secondary')).toHaveLength(2);
    });

    test('should respect custom allocation (2+6)', () => {
      const customGenerator = new QueryGenerator({
        primaryQueryCount: 2,
        secondaryQueryCount: 6,
      });

      const bibData: BibliographicData = {
        rid: '401',
        fullText: '[401] Test, T. (2020). Test. Publisher.',
        author: 'Test, T.',
        year: '2020',
        title: 'Test',
        publication: 'Publisher',
      };

      const queries = customGenerator.generateQueries(bibData);

      expect(queries.filter((q) => q.type === 'primary')).toHaveLength(2);
      expect(queries.filter((q) => q.type === 'secondary')).toHaveLength(6);
    });
  });
});
