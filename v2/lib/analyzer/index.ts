/**
 * Document Analyzer - Component 1 of Reference Refinement v2
 *
 * This module provides comprehensive document analysis capabilities:
 * - Citation detection (10+ formats)
 * - Reference parsing (bibliographic information extraction)
 * - RID assignment (smart reference ID assignment)
 * - Context capture (sentence/paragraph extraction)
 * - Structure analysis (chapters/sections identification)
 */

// Re-export all components
export * from './citation-detector';
export * from './reference-parser';
export * from './rid-assigner';
export * from './context-capturer';
export * from './structure-analyzer';

// Re-export types
export * from '../types';

// Main integration class
import { CitationDetector } from './citation-detector';
import { ReferenceParser } from './reference-parser';
import { RIDAssigner, RIDAssignerConfig } from './rid-assigner';
import { ContextCapturer } from './context-capturer';
import { StructureAnalyzer } from './structure-analyzer';
import {
  Citation,
  Reference,
  RIDAssignment,
  CitationContext,
  DocumentStructure,
  AnalyzerConfig
} from '../types';

export interface DocumentAnalysisResult {
  /** Document structure */
  structure: DocumentStructure;
  /** Detected citations */
  citations: Citation[];
  /** Parsed references */
  references: Reference[];
  /** Citation contexts */
  contexts: CitationContext[];
  /** RID assignments for unnumbered citations */
  assignments: RIDAssignment[];
  /** Statistics */
  statistics: {
    totalCitations: number;
    numberedCitations: number;
    unnumberedCitations: number;
    totalReferences: number;
    successfulAssignments: number;
    averageConfidence: number;
  };
}

export class DocumentAnalyzer {
  private config: AnalyzerConfig;

  constructor(config: AnalyzerConfig = {}) {
    this.config = {
      contextWindowSize: config.contextWindowSize ?? 200,
      minConfidence: config.minConfidence ?? 0.45,
      rateLimitDelay: config.rateLimitDelay ?? 100,
      titleMatching: config.titleMatching ?? {
        primaryThreshold: 0.55,
        secondaryThreshold: 0.45
      }
    };
  }

  /**
   * Analyze a document and its references
   */
  public async analyze(
    documentText: string,
    referencesText: string
  ): Promise<DocumentAnalysisResult> {
    // Step 1: Parse references
    const referenceParser = new ReferenceParser(referencesText);
    const parsingResult = referenceParser.parseAll();

    // Step 2: Detect document structure
    const structureAnalyzer = new StructureAnalyzer(documentText);
    const structure = structureAnalyzer.analyze();

    // Step 3: Detect citations
    const citationDetector = new CitationDetector(documentText);
    const detectionResult = citationDetector.detectAll();

    // Step 4: Capture contexts for all citations
    const contextCapturer = new ContextCapturer(documentText, this.config.contextWindowSize);
    const contexts = contextCapturer.captureContexts(detectionResult.citations);

    // Step 5: Assign RIDs to unnumbered citations
    const unnumberedCitations = detectionResult.citations.filter(c => c.type === 'unnumbered');
    const ridAssigner = new RIDAssigner(documentText, parsingResult.references, {
      primaryThreshold: this.config.titleMatching?.primaryThreshold,
      secondaryThreshold: this.config.titleMatching?.secondaryThreshold,
      rateLimitDelay: this.config.rateLimitDelay
    });

    const assignments = await ridAssigner.assignAll(unnumberedCitations);

    // Calculate statistics
    const assignmentStats = ridAssigner.getStatistics(assignments);

    const statistics = {
      totalCitations: detectionResult.citations.length,
      numberedCitations: detectionResult.numberedCount,
      unnumberedCitations: detectionResult.unnumberedCount,
      totalReferences: parsingResult.references.length,
      successfulAssignments: assignments.length,
      averageConfidence: assignmentStats.averageConfidence
    };

    return {
      structure,
      citations: detectionResult.citations,
      references: parsingResult.references,
      contexts,
      assignments,
      statistics
    };
  }

  /**
   * Analyze only citations (without RID assignment)
   */
  public analyzeCitations(documentText: string): {
    citations: Citation[];
    contexts: CitationContext[];
    structure: DocumentStructure;
  } {
    const citationDetector = new CitationDetector(documentText);
    const detectionResult = citationDetector.detectAll();

    const contextCapturer = new ContextCapturer(documentText, this.config.contextWindowSize);
    const contexts = contextCapturer.captureContexts(detectionResult.citations);

    const structureAnalyzer = new StructureAnalyzer(documentText);
    const structure = structureAnalyzer.analyze();

    return {
      citations: detectionResult.citations,
      contexts,
      structure
    };
  }

  /**
   * Analyze only references (without document)
   */
  public analyzeReferences(referencesText: string): {
    references: Reference[];
    failures: Array<{ lineNumber: number; text: string; error: string }>;
  } {
    const referenceParser = new ReferenceParser(referencesText);
    const result = referenceParser.parseAll();

    return {
      references: result.references,
      failures: result.failures
    };
  }

  /**
   * Generate a comprehensive analysis report
   */
  public async generateReport(
    documentText: string,
    referencesText: string
  ): Promise<string> {
    const result = await this.analyze(documentText, referencesText);

    const lines: string[] = [
      '# Document Analysis Report',
      '',
      '## Overview',
      `- **Total Citations**: ${result.statistics.totalCitations}`,
      `- **Numbered Citations**: ${result.statistics.numberedCitations}`,
      `- **Unnumbered Citations**: ${result.statistics.unnumberedCitations}`,
      `- **Total References**: ${result.statistics.totalReferences}`,
      `- **Successful Assignments**: ${result.statistics.successfulAssignments}`,
      `- **Average Confidence**: ${(result.statistics.averageConfidence * 100).toFixed(1)}%`,
      '',
      '## Document Structure',
      `- **Title**: ${result.structure.title}`,
      `- **Total Sections**: ${result.structure.sections.length}`,
      `- **Total Lines**: ${result.structure.totalLines}`,
      `- **Total Characters**: ${result.structure.totalChars}`,
      '',
      '## Sections',
    ];

    result.structure.sections.forEach((section, i) => {
      lines.push(`${i + 1}. **${section.title}** (Level ${section.level})`);
      if (section.subsections.length > 0) {
        section.subsections.forEach((sub, j) => {
          lines.push(`   ${i + 1}.${j + 1}. ${sub.title} (Level ${sub.level})`);
        });
      }
    });

    lines.push('', '## RID Assignments', '');

    if (result.assignments.length > 0) {
      lines.push('| Citation | Assigned RID | Confidence | Reason |');
      lines.push('|----------|--------------|------------|--------|');

      result.assignments.forEach(assignment => {
        const snippet = assignment.citation.originalText;
        const confidence = (assignment.confidence * 100).toFixed(0) + '%';
        lines.push(
          `| ${snippet} | ${assignment.assignedRID} | ${confidence} | ${assignment.reason} |`
        );
      });
    } else {
      lines.push('*No unnumbered citations found.*');
    }

    return lines.join('\n');
  }
}

/**
 * Convenience function for complete document analysis
 */
export async function analyzeDocument(
  documentText: string,
  referencesText: string,
  config?: AnalyzerConfig
): Promise<DocumentAnalysisResult> {
  const analyzer = new DocumentAnalyzer(config);
  return analyzer.analyze(documentText, referencesText);
}
