/**
 * RID Assigner - Smart assignment of Reference IDs to unnumbered citations
 *
 * Key Rules:
 * 1. Only assign RIDs to empty brackets []
 * 2. Preserve numbered brackets [42] exactly
 * 3. Title matching: ≥0.55 Primary, ≥0.45 Secondary
 * 4. Chapter-based assignment: Chapter 1 = 100-199, Chapter 2 = 200-299, etc.
 * 5. Rate limiting: 100ms between operations
 */

import { Citation, Reference, RIDAssignment, CitationContext } from '../types';
import { StructureAnalyzer } from './structure-analyzer';
import { ContextCapturer } from './context-capturer';

export interface RIDAssignerConfig {
  /** Title matching threshold for primary matches (default: 0.55) */
  primaryThreshold?: number;
  /** Title matching threshold for secondary matches (default: 0.45) */
  secondaryThreshold?: number;
  /** Rate limiting delay in ms (default: 100) */
  rateLimitDelay?: number;
  /** Chapter-based RID ranges */
  chapterRIDRanges?: Record<number, { start: number; end: number }>;
}

export class RIDAssigner {
  private document: string;
  private references: Reference[];
  private config: Required<RIDAssignerConfig>;
  private structureAnalyzer: StructureAnalyzer;
  private contextCapturer: ContextCapturer;
  private assignedRIDs: Set<string> = new Set();

  constructor(
    document: string,
    references: Reference[],
    config: RIDAssignerConfig = {}
  ) {
    this.document = document;
    this.references = references;
    this.structureAnalyzer = new StructureAnalyzer(document);
    this.contextCapturer = new ContextCapturer(document);

    // Initialize config with defaults
    this.config = {
      primaryThreshold: config.primaryThreshold ?? 0.55,
      secondaryThreshold: config.secondaryThreshold ?? 0.45,
      rateLimitDelay: config.rateLimitDelay ?? 100,
      chapterRIDRanges: config.chapterRIDRanges ?? {
        1: { start: 100, end: 199 },
        2: { start: 200, end: 299 },
        3: { start: 300, end: 399 },
        4: { start: 400, end: 499 },
        5: { start: 500, end: 599 },
        6: { start: 600, end: 699 },
        7: { start: 700, end: 799 },
        8: { start: 800, end: 899 },
        9: { start: 900, end: 999 }
      }
    };

    // Track already-assigned RIDs from numbered citations
    this.references.forEach(ref => this.assignedRIDs.add(ref.rid));
  }

  /**
   * Assign RIDs to all unnumbered citations
   */
  public async assignAll(unnumberedCitations: Citation[]): Promise<RIDAssignment[]> {
    const assignments: RIDAssignment[] = [];

    for (const citation of unnumberedCitations) {
      // Only process unnumbered citations
      if (citation.type !== 'unnumbered') {
        continue;
      }

      // Rate limiting
      if (this.config.rateLimitDelay > 0) {
        await this.sleep(this.config.rateLimitDelay);
      }

      const assignment = await this.assignRID(citation);
      if (assignment) {
        assignments.push(assignment);
        this.assignedRIDs.add(assignment.assignedRID);
      }
    }

    return assignments;
  }

  /**
   * Assign a RID to a single unnumbered citation
   */
  public async assignRID(citation: Citation): Promise<RIDAssignment | null> {
    // Capture context
    const context = this.contextCapturer.captureContext(citation);

    // Find the chapter/section containing this citation
    const section = this.structureAnalyzer.findSectionAtPosition(citation.position);

    // Extract keywords from context for matching
    const keywords = this.extractKeywords(context);

    // Find matching references
    const matches = this.findMatchingReferences(keywords, section);

    if (matches.length === 0) {
      return null;
    }

    // Use the best match
    const bestMatch = matches[0];

    // Determine RID based on chapter
    const assignedRID = this.determineRID(section, bestMatch.reference);

    return {
      citation,
      assignedRID,
      confidence: bestMatch.score,
      reason: bestMatch.reason,
      suggestedReference: bestMatch.reference
    };
  }

  /**
   * Extract keywords from citation context
   */
  private extractKeywords(context: CitationContext): string[] {
    const text = `${context.sentence} ${context.paragraph}`;

    // Extract potential author names (capitalized words)
    const authorPattern = /\b[A-Z][a-z]+(?:\s+(?:and|&|et al\.?)\s+[A-Z][a-z]+)?\b/g;
    const authors = text.match(authorPattern) || [];

    // Extract years
    const yearPattern = /\b(19|20)\d{2}\b/g;
    const years = text.match(yearPattern) || [];

    // Extract significant words (3+ chars, not common words)
    const commonWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
      'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how',
      'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did',
      'its', 'let', 'put', 'say', 'she', 'too', 'use', 'this', 'that', 'with',
      'they', 'have', 'from', 'been', 'were', 'what', 'when', 'your', 'said'
    ]);

    const words = text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length >= 3 && !commonWords.has(word));

    return [...new Set([...authors, ...years, ...words])];
  }

  /**
   * Find references matching the keywords
   */
  private findMatchingReferences(
    keywords: string[],
    section: any
  ): Array<{ reference: Reference; score: number; reason: string }> {
    const matches: Array<{ reference: Reference; score: number; reason: string }> = [];

    for (const reference of this.references) {
      const score = this.calculateMatchScore(reference, keywords);
      const reason = this.getMatchReason(reference, keywords, score);

      if (score >= this.config.secondaryThreshold) {
        matches.push({ reference, score, reason });
      }
    }

    // Sort by score descending
    return matches.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate match score between reference and keywords
   */
  private calculateMatchScore(reference: Reference, keywords: string[]): number {
    let score = 0;
    let matches = 0;

    const refText = `${reference.authors} ${reference.year} ${reference.title} ${reference.publication}`.toLowerCase();
    const refWords = new Set(refText.split(/\W+/).filter(w => w.length >= 3));

    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();

      // Exact match in title (highest weight)
      if (reference.title.toLowerCase().includes(keywordLower)) {
        score += 0.3;
        matches++;
      }

      // Match in authors
      const authorsStr = typeof reference.authors === 'string'
        ? reference.authors
        : reference.authors.map(a => `${a.firstName} ${a.lastName}`).join(' ');
      if (authorsStr.toLowerCase().includes(keywordLower)) {
        score += 0.2;
        matches++;
      }

      // Match in year
      if (reference.year === keyword) {
        score += 0.15;
        matches++;
      }

      // Word match in any field
      if (refWords.has(keywordLower)) {
        score += 0.05;
        matches++;
      }
    }

    // Normalize by number of keywords
    if (keywords.length > 0) {
      score = (score * matches) / keywords.length;
    }

    return Math.min(1.0, score);
  }

  /**
   * Get reason for match
   */
  private getMatchReason(reference: Reference, keywords: string[], score: number): string {
    const reasons: string[] = [];

    // Check what matched
    const titleMatches = keywords.filter(k =>
      reference.title.toLowerCase().includes(k.toLowerCase())
    );

    const authorsStr = typeof reference.authors === 'string'
      ? reference.authors
      : reference.authors.map(a => `${a.firstName} ${a.lastName}`).join(' ');
    const authorMatches = keywords.filter(k =>
      authorsStr.toLowerCase().includes(k.toLowerCase())
    );

    const yearMatches = keywords.filter(k => reference.year === k);

    if (titleMatches.length > 0) {
      reasons.push(`Title match: ${titleMatches.join(', ')}`);
    }

    if (authorMatches.length > 0) {
      reasons.push(`Author match: ${authorMatches.join(', ')}`);
    }

    if (yearMatches.length > 0) {
      reasons.push(`Year match: ${yearMatches[0]}`);
    }

    if (reasons.length === 0) {
      reasons.push('General keyword match');
    }

    const level = score >= this.config.primaryThreshold ? 'Primary' : 'Secondary';
    return `${level} (${(score * 100).toFixed(0)}%): ${reasons.join('; ')}`;
  }

  /**
   * Determine RID based on chapter and reference
   */
  private determineRID(section: any, reference: Reference): string {
    // If reference already has a RID, use it
    if (reference.rid && !this.assignedRIDs.has(reference.rid)) {
      return reference.rid;
    }

    // Determine chapter number
    const chapterNum = this.getChapterNumber(section);

    // Get RID range for chapter
    const range = this.config.chapterRIDRanges[chapterNum] || { start: 100, end: 199 };

    // Find next available RID in range
    for (let rid = range.start; rid <= range.end; rid++) {
      const ridStr = rid.toString();
      if (!this.assignedRIDs.has(ridStr)) {
        return ridStr;
      }
    }

    // If range is exhausted, just use the reference's existing RID
    return reference.rid || '999';
  }

  /**
   * Get chapter number from section
   */
  private getChapterNumber(section: any): number {
    if (!section) return 1;

    // Extract chapter number from title
    const chapterMatch = section.title.match(/Chapter\s+(\d+)/i);
    if (chapterMatch) {
      return parseInt(chapterMatch[1]);
    }

    // If it's a top-level section, use section level as chapter
    if (section.level === 1) {
      return 1;
    }

    return 1; // Default to chapter 1
  }

  /**
   * Sleep for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get statistics about RID assignment
   */
  public getStatistics(assignments: RIDAssignment[]): {
    total: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    averageConfidence: number;
    byChapter: Record<number, number>;
  } {
    const highConfidence = assignments.filter(a => a.confidence >= this.config.primaryThreshold).length;
    const mediumConfidence = assignments.filter(
      a => a.confidence >= this.config.secondaryThreshold && a.confidence < this.config.primaryThreshold
    ).length;
    const lowConfidence = assignments.filter(a => a.confidence < this.config.secondaryThreshold).length;

    const totalConfidence = assignments.reduce((sum, a) => sum + a.confidence, 0);
    const averageConfidence = assignments.length > 0 ? totalConfidence / assignments.length : 0;

    const byChapter: Record<number, number> = {};
    assignments.forEach(assignment => {
      const rid = parseInt(assignment.assignedRID);
      const chapter = Math.floor(rid / 100);
      byChapter[chapter] = (byChapter[chapter] || 0) + 1;
    });

    return {
      total: assignments.length,
      highConfidence,
      mediumConfidence,
      lowConfidence,
      averageConfidence,
      byChapter
    };
  }

  /**
   * Validate assignments (check for conflicts, duplicates)
   */
  public validateAssignments(assignments: RIDAssignment[]): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const ridCounts = new Map<string, number>();

    // Count RID usage
    assignments.forEach(assignment => {
      const count = ridCounts.get(assignment.assignedRID) || 0;
      ridCounts.set(assignment.assignedRID, count + 1);
    });

    // Check for duplicates
    ridCounts.forEach((count, rid) => {
      if (count > 1) {
        errors.push(`RID ${rid} assigned to ${count} different citations`);
      }
    });

    // Check for low confidence assignments
    const lowConfidence = assignments.filter(a => a.confidence < this.config.secondaryThreshold);
    if (lowConfidence.length > 0) {
      warnings.push(`${lowConfidence.length} assignments have confidence below secondary threshold`);
    }

    // Check for chapter boundary violations
    const structure = this.structureAnalyzer.analyze();
    const chapters = structure.sections.filter(s => s.level === 1);

    if (chapters.length > 0) {
      assignments.forEach(assignment => {
        const section = this.structureAnalyzer.findSectionAtPosition(assignment.citation.position);
        const expectedChapter = this.getChapterNumber(section);
        const assignedChapter = Math.floor(parseInt(assignment.assignedRID) / 100);

        if (expectedChapter !== assignedChapter) {
          warnings.push(
            `Citation in Chapter ${expectedChapter} assigned RID ${assignment.assignedRID} (Chapter ${assignedChapter})`
          );
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

/**
 * Convenience function to assign RIDs
 */
export async function assignRIDs(
  document: string,
  references: Reference[],
  unnumberedCitations: Citation[],
  config?: RIDAssignerConfig
): Promise<RIDAssignment[]> {
  const assigner = new RIDAssigner(document, references, config);
  return assigner.assignAll(unnumberedCitations);
}
