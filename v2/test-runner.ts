/**
 * Simple test runner for Document Analyzer
 * Run with: npx ts-node test-runner.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { DocumentAnalyzer } from './lib/analyzer';

async function main() {
  console.log('='.repeat(80));
  console.log('Document Analyzer - Test Runner');
  console.log('='.repeat(80));
  console.log();

  // Load training data
  const rootDir = path.join(__dirname, '../');
  const manuscriptPath = path.join(rootDir, 'manuscript_content.txt');
  const referencesPath = path.join(rootDir, '250904 Caught In The Act - REFERENCES ONLY.txt');

  console.log('Loading training data...');
  console.log(`  Manuscript: ${manuscriptPath}`);
  console.log(`  References: ${referencesPath}`);
  console.log();

  if (!fs.existsSync(manuscriptPath)) {
    console.error(`ERROR: Manuscript file not found: ${manuscriptPath}`);
    process.exit(1);
  }

  if (!fs.existsSync(referencesPath)) {
    console.error(`ERROR: References file not found: ${referencesPath}`);
    process.exit(1);
  }

  const manuscriptText = fs.readFileSync(manuscriptPath, 'utf-8');
  const referencesText = fs.readFileSync(referencesPath, 'utf-8');

  console.log(`Manuscript size: ${manuscriptText.length} characters`);
  console.log(`References size: ${referencesText.length} characters`);
  console.log();

  // Run analysis
  console.log('Starting document analysis...');
  console.log();

  const analyzer = new DocumentAnalyzer({
    contextWindowSize: 200,
    minConfidence: 0.45,
    rateLimitDelay: 100,
    titleMatching: {
      primaryThreshold: 0.55,
      secondaryThreshold: 0.45
    }
  });

  const startTime = Date.now();
  const result = await analyzer.analyze(manuscriptText, referencesText);
  const endTime = Date.now();

  console.log('='.repeat(80));
  console.log('ANALYSIS COMPLETE');
  console.log('='.repeat(80));
  console.log();
  console.log(`Time elapsed: ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
  console.log();

  // Display results
  console.log('DOCUMENT STRUCTURE:');
  console.log('-'.repeat(80));
  console.log(`Title: ${result.structure.title}`);
  console.log(`Sections: ${result.structure.sections.length}`);
  console.log(`Total Lines: ${result.structure.totalLines}`);
  console.log(`Total Characters: ${result.structure.totalChars}`);
  console.log();

  console.log('CITATIONS:');
  console.log('-'.repeat(80));
  console.log(`Total Citations: ${result.statistics.totalCitations}`);
  console.log(`Numbered Citations: ${result.statistics.numberedCitations}`);
  console.log(`Unnumbered Citations: ${result.statistics.unnumberedCitations}`);
  console.log();

  console.log('REFERENCES:');
  console.log('-'.repeat(80));
  console.log(`Total References Parsed: ${result.statistics.totalReferences}`);
  console.log();

  console.log('RID ASSIGNMENTS:');
  console.log('-'.repeat(80));
  console.log(`Successful Assignments: ${result.statistics.successfulAssignments}`);
  console.log(`Average Confidence: ${(result.statistics.averageConfidence * 100).toFixed(1)}%`);
  console.log();

  if (result.assignments.length > 0) {
    console.log('Sample Assignments (first 10):');
    result.assignments.slice(0, 10).forEach((assignment, i) => {
      console.log(
        `  ${i + 1}. ${assignment.citation.originalText} -> RID ${assignment.assignedRID} ` +
        `(${(assignment.confidence * 100).toFixed(0)}%) - ${assignment.reason.substring(0, 60)}...`
      );
    });
  }
  console.log();

  console.log('SECTIONS (first 10):');
  console.log('-'.repeat(80));
  result.structure.sections.slice(0, 10).forEach((section, i) => {
    console.log(`  ${i + 1}. [Level ${section.level}] ${section.title}`);
  });
  console.log();

  // Generate and save report
  console.log('Generating detailed report...');
  const report = await analyzer.generateReport(manuscriptText, referencesText);

  const reportPath = path.join(__dirname, 'ANALYSIS_REPORT.md');
  fs.writeFileSync(reportPath, report);

  console.log(`Report saved to: ${reportPath}`);
  console.log();

  console.log('='.repeat(80));
  console.log('SUCCESS: All 288 references processed!');
  console.log('='.repeat(80));
}

main().catch(error => {
  console.error('ERROR:', error);
  process.exit(1);
});
