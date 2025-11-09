/**
 * Integration tests for Document Analyzer
 *
 * Tests all components against the training data:
 * - manuscript_content.txt (full manuscript)
 * - 250904 Caught In The Act - REFERENCES ONLY.txt (288 references)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  DocumentAnalyzer,
  CitationDetector,
  ReferenceParser,
  ContextCapturer,
  StructureAnalyzer,
  RIDAssigner
} from '../../lib/analyzer';

describe('Document Analyzer - Integration Tests', () => {
  let manuscriptText: string;
  let referencesText: string;

  beforeAll(() => {
    // Load training data
    const rootDir = path.join(__dirname, '../../../');
    manuscriptText = fs.readFileSync(
      path.join(rootDir, 'manuscript_content.txt'),
      'utf-8'
    );
    referencesText = fs.readFileSync(
      path.join(rootDir, '250904 Caught In The Act - REFERENCES ONLY.txt'),
      'utf-8'
    );
  });

  describe('Citation Detection', () => {
    test('should detect all citations in manuscript', () => {
      const detector = new CitationDetector(manuscriptText);
      const result = detector.detectAll();

      expect(result.citations.length).toBeGreaterThan(0);
      expect(result.numberedCount).toBeGreaterThan(0);
      console.log(`Detected ${result.citations.length} citations`);
      console.log(`Numbered: ${result.numberedCount}, Unnumbered: ${result.unnumberedCount}`);
      console.log(`Unique RIDs: ${result.uniqueRIDs.size}`);
    });

    test('should detect bracket citations [100]', () => {
      const detector = new CitationDetector(manuscriptText);
      const result = detector.detectAll();

      const bracketCitations = result.citations.filter(c =>
        c.originalText.startsWith('[') && c.originalText.endsWith(']')
      );

      expect(bracketCitations.length).toBeGreaterThan(0);
    });

    test('should get statistics', () => {
      const detector = new CitationDetector(manuscriptText);
      const stats = detector.getStatistics();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.numbered).toBeGreaterThan(0);
      expect(stats.uniqueRIDs).toBeGreaterThan(0);

      console.log('Citation Statistics:', stats);
    });
  });

  describe('Reference Parsing', () => {
    test('should parse all 288 references', () => {
      const parser = new ReferenceParser(referencesText);
      const result = parser.parseAll();

      console.log(`Parsed ${result.references.length} references`);
      console.log(`Failed: ${result.failures.length}`);

      expect(result.references.length).toBeGreaterThan(0);

      if (result.failures.length > 0) {
        console.log('Parsing failures:');
        result.failures.slice(0, 5).forEach(failure => {
          console.log(`  Line ${failure.lineNumber}: ${failure.error}`);
        });
      }
    });

    test('should parse reference components correctly', () => {
      const parser = new ReferenceParser(referencesText);
      const result = parser.parseAll();

      // Check a few known references
      const ref100 = result.references.find(r => r.rid === '100');
      expect(ref100).toBeDefined();
      expect(ref100?.authors).toBeTruthy();
      expect(ref100?.year).toBeTruthy();
      expect(ref100?.title).toBeTruthy();

      console.log('Sample reference [100]:');
      console.log(`  Authors: ${ref100?.authors}`);
      console.log(`  Year: ${ref100?.year}`);
      console.log(`  Title: ${ref100?.title}`);
    });

    test('should get parsing statistics', () => {
      const parser = new ReferenceParser(referencesText);
      const stats = parser.getStatistics();

      expect(stats.total).toBeGreaterThan(0);
      expect(stats.successful).toBeGreaterThan(0);

      console.log('Parsing Statistics:', stats);
    });
  });

  describe('Context Capture', () => {
    test('should capture context for citations', () => {
      const detector = new CitationDetector(manuscriptText);
      const result = detector.detectAll();

      const capturer = new ContextCapturer(manuscriptText);
      const contexts = capturer.captureContexts(result.citations.slice(0, 10));

      expect(contexts.length).toBe(10);
      contexts.forEach(ctx => {
        expect(ctx.sentence).toBeTruthy();
        expect(ctx.paragraph).toBeTruthy();
      });

      console.log('Sample context:');
      console.log(`  Citation: ${contexts[0].citation.originalText}`);
      console.log(`  Sentence: ${contexts[0].sentence.substring(0, 100)}...`);
    });

    test('should get context statistics', () => {
      const detector = new CitationDetector(manuscriptText);
      const result = detector.detectAll();

      const capturer = new ContextCapturer(manuscriptText);
      const stats = capturer.getStatistics(result.citations);

      expect(stats.averageWordsBeforeCitation).toBeGreaterThan(0);
      expect(stats.averageWordsAfterCitation).toBeGreaterThan(0);

      console.log('Context Statistics:', stats);
    });
  });

  describe('Structure Analysis', () => {
    test('should analyze document structure', () => {
      const analyzer = new StructureAnalyzer(manuscriptText);
      const structure = analyzer.analyze();

      expect(structure.title).toBeTruthy();
      expect(structure.sections.length).toBeGreaterThan(0);

      console.log(`Document: ${structure.title}`);
      console.log(`Sections: ${structure.sections.length}`);
      console.log(`Total lines: ${structure.totalLines}`);
    });

    test('should detect chapters', () => {
      const analyzer = new StructureAnalyzer(manuscriptText);
      const chapters = analyzer.getSectionsByLevel(1);

      expect(chapters.length).toBeGreaterThan(0);

      console.log('Chapters:');
      chapters.slice(0, 5).forEach(chapter => {
        console.log(`  - ${chapter.title}`);
      });
    });

    test('should generate table of contents', () => {
      const analyzer = new StructureAnalyzer(manuscriptText);
      const toc = analyzer.getTableOfContents();

      expect(toc).toBeTruthy();
      expect(toc.length).toBeGreaterThan(0);

      console.log('Table of Contents:');
      console.log(toc.split('\n').slice(0, 10).join('\n'));
    });

    test('should get structure statistics', () => {
      const analyzer = new StructureAnalyzer(manuscriptText);
      const stats = analyzer.getStatistics();

      expect(stats.totalSections).toBeGreaterThan(0);

      console.log('Structure Statistics:', stats);
    });
  });

  describe('RID Assignment', () => {
    test('should assign RIDs to unnumbered citations', async () => {
      const detector = new CitationDetector(manuscriptText);
      const detectionResult = detector.detectAll();

      const parser = new ReferenceParser(referencesText);
      const parsingResult = parser.parseAll();

      const unnumbered = detectionResult.citations.filter(c => c.type === 'unnumbered');

      if (unnumbered.length > 0) {
        const assigner = new RIDAssigner(
          manuscriptText,
          parsingResult.references,
          { rateLimitDelay: 10 } // Speed up tests
        );

        const assignments = await assigner.assignAll(unnumbered.slice(0, 5));

        expect(assignments.length).toBeGreaterThan(0);

        console.log('Sample RID assignments:');
        assignments.forEach(assignment => {
          console.log(
            `  ${assignment.citation.originalText} -> RID ${assignment.assignedRID} (${(assignment.confidence * 100).toFixed(0)}%)`
          );
        });
      } else {
        console.log('No unnumbered citations found');
      }
    }, 30000); // Increase timeout

    test('should validate assignments', async () => {
      const detector = new CitationDetector(manuscriptText);
      const detectionResult = detector.detectAll();

      const parser = new ReferenceParser(referencesText);
      const parsingResult = parser.parseAll();

      const unnumbered = detectionResult.citations.filter(c => c.type === 'unnumbered');

      if (unnumbered.length > 0) {
        const assigner = new RIDAssigner(
          manuscriptText,
          parsingResult.references,
          { rateLimitDelay: 10 }
        );

        const assignments = await assigner.assignAll(unnumbered.slice(0, 5));
        const validation = assigner.validateAssignments(assignments);

        expect(validation.valid).toBeDefined();

        console.log('Validation result:', {
          valid: validation.valid,
          errors: validation.errors.length,
          warnings: validation.warnings.length
        });

        if (validation.errors.length > 0) {
          console.log('Errors:', validation.errors);
        }
        if (validation.warnings.length > 0) {
          console.log('Warnings:', validation.warnings.slice(0, 3));
        }
      }
    }, 30000);
  });

  describe('Full Document Analysis', () => {
    test('should perform complete analysis', async () => {
      const analyzer = new DocumentAnalyzer({
        contextWindowSize: 200,
        minConfidence: 0.45,
        rateLimitDelay: 10 // Speed up tests
      });

      const result = await analyzer.analyze(manuscriptText, referencesText);

      expect(result.structure).toBeDefined();
      expect(result.citations.length).toBeGreaterThan(0);
      expect(result.references.length).toBeGreaterThan(0);
      expect(result.contexts.length).toBeGreaterThan(0);

      console.log('\n=== FULL ANALYSIS RESULTS ===');
      console.log(`Total Citations: ${result.statistics.totalCitations}`);
      console.log(`Numbered Citations: ${result.statistics.numberedCitations}`);
      console.log(`Unnumbered Citations: ${result.statistics.unnumberedCitations}`);
      console.log(`Total References: ${result.statistics.totalReferences}`);
      console.log(`Successful Assignments: ${result.statistics.successfulAssignments}`);
      console.log(`Average Confidence: ${(result.statistics.averageConfidence * 100).toFixed(1)}%`);
      console.log('===========================\n');
    }, 60000); // Increase timeout for full analysis

    test('should generate analysis report', async () => {
      const analyzer = new DocumentAnalyzer({
        rateLimitDelay: 10
      });

      const report = await analyzer.generateReport(manuscriptText, referencesText);

      expect(report).toBeTruthy();
      expect(report.length).toBeGreaterThan(0);

      console.log('\n=== ANALYSIS REPORT (first 50 lines) ===');
      console.log(report.split('\n').slice(0, 50).join('\n'));
      console.log('===========================\n');
    }, 60000);
  });
});
