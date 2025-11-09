/**
 * Integration tests for Format Controller
 * Tests against real reference data (288 references from "Caught In The Act")
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { FormatController } from '../../lib/format-controller/index.js';

describe('FormatController Integration Tests', () => {
  let controller: FormatController;
  let referencesText: string;
  let decisionsText: string;

  beforeAll(() => {
    controller = new FormatController();

    // Load real reference data
    const referencesPath = join(__dirname, '../../../250904 Caught In The Act - REFERENCES ONLY.txt');
    const decisionsPath = join(__dirname, '../../../caught_in_the_act_decisions.txt');

    referencesText = readFileSync(referencesPath, 'utf-8');
    decisionsText = readFileSync(decisionsPath, 'utf-8');
  });

  describe('Parsing All References', () => {
    test('should parse all 288 references from REFERENCES ONLY file', () => {
      const parsed = controller.parseMany(referencesText);

      // Should have 288 references
      expect(parsed.length).toBeGreaterThanOrEqual(280);
      expect(parsed.length).toBeLessThanOrEqual(290);

      // All should have RIDs
      const withRID = parsed.filter(ref => ref.rid.length > 0);
      expect(withRID.length).toBeGreaterThan(280);

      console.log(`Parsed ${parsed.length} references`);
    });

    test('should parse all references from decisions.txt', () => {
      const parsed = controller.parseMany(decisionsText);

      expect(parsed.length).toBeGreaterThanOrEqual(280);

      console.log(`Parsed ${parsed.length} references from decisions.txt`);
    });

    test('should extract authors from >95% of references', () => {
      const parsed = controller.parseMany(referencesText);
      const withAuthors = parsed.filter(ref => ref.authors.length > 0);

      const successRate = withAuthors.length / parsed.length;
      console.log(`Author extraction success rate: ${(successRate * 100).toFixed(1)}%`);

      expect(successRate).toBeGreaterThan(0.95);
    });

    test('should extract year from >95% of references', () => {
      const parsed = controller.parseMany(referencesText);
      const withYear = parsed.filter(ref => ref.year.length > 0);

      const successRate = withYear.length / parsed.length;
      console.log(`Year extraction success rate: ${(successRate * 100).toFixed(1)}%`);

      expect(successRate).toBeGreaterThan(0.95);
    });

    test('should extract title from >95% of references', () => {
      const parsed = controller.parseMany(referencesText);
      const withTitle = parsed.filter(ref => ref.title.length > 0);

      const successRate = withTitle.length / parsed.length;
      console.log(`Title extraction success rate: ${(successRate * 100).toFixed(1)}%`);

      expect(successRate).toBeGreaterThan(0.95);
    });

    test('should extract publication from >90% of references', () => {
      const parsed = controller.parseMany(referencesText);
      const withPublication = parsed.filter(ref => ref.publication.length > 0);

      const successRate = withPublication.length / parsed.length;
      console.log(`Publication extraction success rate: ${(successRate * 100).toFixed(1)}%`);

      expect(successRate).toBeGreaterThan(0.90);
    });
  });

  describe('URL Extraction from decisions.txt', () => {
    test('should extract primary URLs from finalized references', () => {
      const parsed = controller.parseMany(decisionsText);
      const withPrimary = parsed.filter(ref => ref.primaryUrl && ref.primaryUrl.length > 0);

      console.log(`References with primary URLs: ${withPrimary.length}/${parsed.length}`);

      // Most references should have primary URLs in decisions.txt
      expect(withPrimary.length).toBeGreaterThan(280);
    });

    test('should extract secondary URLs', () => {
      const parsed = controller.parseMany(decisionsText);
      const withSecondary = parsed.filter(ref => ref.secondaryUrl && ref.secondaryUrl.length > 0);

      console.log(`References with secondary URLs: ${withSecondary.length}/${parsed.length}`);

      // Many references should have secondary URLs
      expect(withSecondary.length).toBeGreaterThan(250);
    });

    test('should validate extracted URLs', () => {
      const parsed = controller.parseMany(decisionsText);
      let validCount = 0;
      let totalUrls = 0;

      for (const ref of parsed) {
        if (ref.primaryUrl) {
          totalUrls++;
          if (controller.validateURL(ref.primaryUrl)) {
            validCount++;
          }
        }
        if (ref.secondaryUrl) {
          totalUrls++;
          if (controller.validateURL(ref.secondaryUrl)) {
            validCount++;
          }
        }
      }

      const validRate = validCount / totalUrls;
      console.log(`URL validation rate: ${(validRate * 100).toFixed(1)}%`);

      // >99% of URLs should be valid
      expect(validRate).toBeGreaterThan(0.99);
    });
  });

  describe('Sample Reference Parsing', () => {
    test('should correctly parse reference [1] - Ferguson', () => {
      const ref1 = '[1] Ferguson, J. (2024). Authoritarian ascent in the USA: How we got here and what comes next. Independently published on Amazon.';

      const parsed = controller.parse(ref1);

      expect(parsed.rid).toBe('1');
      expect(parsed.authors).toHaveLength(1);
      expect(parsed.authors[0].lastName).toBe('Ferguson');
      expect(parsed.authors[0].firstName).toBe('J');
      expect(parsed.year).toBe('2024');
      expect(parsed.title).toContain('Authoritarian ascent');
    });

    test('should correctly parse reference [2] - Gergen', () => {
      const ref2 = '[2] Gergen, K. J. (1999). An Invitation to Social Construction. London: SAGE Publications.';

      const parsed = controller.parse(ref2);

      expect(parsed.rid).toBe('2');
      expect(parsed.authors).toHaveLength(1);
      expect(parsed.authors[0].lastName).toBe('Gergen');
      expect(parsed.year).toBe('1999');
      expect(parsed.title).toContain('Invitation to Social Construction');
      expect(parsed.publication).toContain('SAGE');
    });

    test('should correctly parse reference [3] - Berger & Luckmann (two authors)', () => {
      const ref3 = '[3] Berger, P. L., & Luckmann, T. (1966). The Social Construction of Reality: A Treatise in the Sociology of Knowledge. Garden City, NY: Doubleday.';

      const parsed = controller.parse(ref3);

      expect(parsed.rid).toBe('3');
      expect(parsed.authors).toHaveLength(2);
      expect(parsed.authors[0].lastName).toBe('Berger');
      expect(parsed.authors[1].lastName).toBe('Luckmann');
      expect(parsed.year).toBe('1966');
      expect(parsed.title).toContain('Social Construction of Reality');
    });

    test('should correctly parse reference [5] - Journal article with DOI', () => {
      const ref5 = '[5] Tversky, A., & Kahneman, D. (1974). Judgment under uncertainty: Heuristics and biases. Science, 185(4157), 1124-1131.';

      const parsed = controller.parse(ref5);

      expect(parsed.rid).toBe('5');
      expect(parsed.authors).toHaveLength(2);
      expect(parsed.year).toBe('1974');
      expect(parsed.title).toContain('Judgment under uncertainty');
      expect(parsed.publication).toContain('Science');
      expect(parsed.volume).toBe('185');
      expect(parsed.issue).toBe('4157');
      expect(parsed.pages).toBe('1124-1131');
    });
  });

  describe('Format Detection', () => {
    test('should detect APA format', () => {
      const apaRef = '[1] Smith, J. (2020). Article title. Journal Name, 10(2), 123-145. https://doi.org/10.1234/example';

      const format = controller.detectFormat(apaRef);

      expect(format).toBe('APA');
    });

    test('should detect format consistency across all references', () => {
      const parsed = controller.parseMany(referencesText);
      const formats = parsed.map(ref => ref.format);

      const formatCounts = formats.reduce((acc, fmt) => {
        acc[fmt] = (acc[fmt] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('Format distribution:', formatCounts);

      // Most should be APA or Mixed
      const apaOrMixed = (formatCounts['APA'] || 0) + (formatCounts['Mixed'] || 0);
      expect(apaOrMixed).toBeGreaterThan(parsed.length * 0.8);
    });
  });

  describe('Validation', () => {
    test('should validate references with high confidence', () => {
      const parsed = controller.parseMany(referencesText);
      let highConfidenceCount = 0;

      for (const ref of parsed) {
        const validation = controller.validate(ref);
        if (validation.confidence > 0.8) {
          highConfidenceCount++;
        }
      }

      const highConfidenceRate = highConfidenceCount / parsed.length;
      console.log(`High confidence validation rate: ${(highConfidenceRate * 100).toFixed(1)}%`);

      expect(highConfidenceRate).toBeGreaterThan(0.90);
    });

    test('should identify references complete enough for discovery', () => {
      const parsed = controller.parseMany(referencesText);
      const completeForDiscovery = parsed.filter(ref =>
        controller.isCompleteForDiscovery(ref)
      );

      const completeRate = completeForDiscovery.length / parsed.length;
      console.log(`Complete for discovery rate: ${(completeRate * 100).toFixed(1)}%`);

      expect(completeRate).toBeGreaterThan(0.95);
    });
  });

  describe('URL Categorization', () => {
    test('should categorize URLs correctly', () => {
      const urls = [
        'https://doi.org/10.1234/example',
        'https://www.jstor.org/stable/123456',
        'https://archive.org/details/book',
        'https://scholar.google.com/scholar',
        'https://www.amazon.com/book/dp/123'
      ];

      const categories = urls.map(url => controller.categorizeURL(url));

      expect(categories).toContain('DOI');
      expect(categories).toContain('JSTOR');
      expect(categories).toContain('Internet Archive');
      expect(categories).toContain('Google Scholar');
      expect(categories).toContain('Retail');
    });

    test('should identify open access URLs', () => {
      const openAccessUrls = [
        'https://archive.org/details/book',
        'https://arxiv.org/abs/1234.5678',
        'https://university.edu/paper.pdf'
      ];

      openAccessUrls.forEach(url => {
        expect(controller.isLikelyOpenAccess(url)).toBe(true);
      });
    });

    test('should identify paywalled URLs', () => {
      const paywalledUrls = [
        'https://www.jstor.org/stable/123456',
        'https://link.springer.com/article/10.1234/example',
        'https://www.amazon.com/book/dp/123'
      ];

      paywalledUrls.forEach(url => {
        expect(controller.isLikelyPaywalled(url)).toBe(true);
      });
    });
  });

  describe('Performance', () => {
    test('should parse all references in <5 seconds', () => {
      const startTime = Date.now();
      controller.parseMany(referencesText);
      const endTime = Date.now();

      const duration = endTime - startTime;
      console.log(`Parse time for ${referencesText.split('\n').length} lines: ${duration}ms`);

      expect(duration).toBeLessThan(5000);
    });
  });
});
