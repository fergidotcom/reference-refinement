/**
 * Context Capturer - Extracts context around citations
 *
 * Captures:
 * - Sentence containing the citation
 * - Paragraph containing the citation
 * - N words before/after the citation
 * - Character window before/after the citation
 */

import { Citation, CitationContext } from '../types';

export class ContextCapturer {
  private document: string;
  private contextWindowSize: number;

  constructor(document: string, contextWindowSize: number = 200) {
    this.document = document;
    this.contextWindowSize = contextWindowSize;
  }

  /**
   * Capture context for a single citation
   */
  public captureContext(citation: Citation): CitationContext {
    const sentence = this.extractSentence(citation.position);
    const paragraph = this.extractParagraph(citation.position);

    // Extract context before/after the citation
    const contextBefore = this.extractBefore(citation.position);
    const contextAfter = this.extractAfter(citation.position + citation.originalText.length);

    // Count words before/after in the sentence
    const citationPosInSentence = sentence.indexOf(citation.originalText);
    const beforeCitation = sentence.substring(0, citationPosInSentence);
    const afterCitation = sentence.substring(citationPosInSentence + citation.originalText.length);

    const wordsBefore = this.countWords(beforeCitation);
    const wordsAfter = this.countWords(afterCitation);

    // Update citation with context
    const updatedCitation: Citation = {
      ...citation,
      contextBefore,
      contextAfter
    };

    return {
      citation: updatedCitation,
      sentence,
      paragraph,
      wordsBefore,
      wordsAfter
    };
  }

  /**
   * Capture contexts for multiple citations
   */
  public captureContexts(citations: Citation[]): CitationContext[] {
    return citations.map(citation => this.captureContext(citation));
  }

  /**
   * Extract the sentence containing the citation
   *
   * A sentence is defined as text between:
   * - Start of document or previous sentence ending (. ! ?)
   * - Next sentence ending (. ! ?) or end of document
   */
  private extractSentence(position: number): string {
    // Find sentence start
    let start = position;
    while (start > 0) {
      const char = this.document[start - 1];
      // Sentence endings: . ! ? followed by space or newline
      if (this.isSentenceEnding(start - 1)) {
        break;
      }
      start--;
    }

    // Find sentence end
    let end = position;
    while (end < this.document.length) {
      if (this.isSentenceEnding(end)) {
        end++; // Include the punctuation
        break;
      }
      end++;
    }

    return this.document.substring(start, end).trim();
  }

  /**
   * Check if a position is a sentence ending
   */
  private isSentenceEnding(position: number): boolean {
    if (position < 0 || position >= this.document.length) {
      return false;
    }

    const char = this.document[position];
    if (!['.', '!', '?'].includes(char)) {
      return false;
    }

    // Check if followed by space, newline, or end of document
    const nextChar = position + 1 < this.document.length ? this.document[position + 1] : '';
    if (nextChar === '' || nextChar === ' ' || nextChar === '\n' || nextChar === '\r') {
      // Make sure it's not an abbreviation (e.g., "Dr.", "etc.")
      // Simple heuristic: if preceded by a single capital letter, it's likely an abbreviation
      const prevChar = position - 1 >= 0 ? this.document[position - 1] : '';
      const prevPrevChar = position - 2 >= 0 ? this.document[position - 2] : '';

      // Check for common abbreviations
      if (char === '.' && /[A-Z]/.test(prevChar) && (prevPrevChar === ' ' || prevPrevChar === '')) {
        return false; // Likely an abbreviation like "A."
      }

      // Check for "et al."
      if (position >= 6 && this.document.substring(position - 5, position + 1) === 'et al.') {
        return false;
      }

      return true;
    }

    return false;
  }

  /**
   * Extract the paragraph containing the citation
   *
   * A paragraph is text between newlines
   */
  private extractParagraph(position: number): string {
    // Find paragraph start (previous double newline or start of document)
    let start = position;
    while (start > 0) {
      if (this.document[start - 1] === '\n') {
        // Check if there's another newline before this one (double newline)
        if (start > 1 && this.document[start - 2] === '\n') {
          break;
        }
        // Check if this is the start of the document
        if (start === 1) {
          start = 0;
          break;
        }
      }
      start--;
    }

    // Find paragraph end (next double newline or end of document)
    let end = position;
    while (end < this.document.length - 1) {
      if (this.document[end] === '\n' && this.document[end + 1] === '\n') {
        break;
      }
      end++;
    }

    return this.document.substring(start, end).trim();
  }

  /**
   * Extract context before the citation
   */
  private extractBefore(position: number): string {
    const start = Math.max(0, position - this.contextWindowSize);
    return this.document.substring(start, position);
  }

  /**
   * Extract context after the citation
   */
  private extractAfter(position: number): string {
    const end = Math.min(this.document.length, position + this.contextWindowSize);
    return this.document.substring(position, end);
  }

  /**
   * Count words in a text string
   */
  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Extract a snippet around the citation (for display purposes)
   */
  public extractSnippet(citation: Citation, snippetSize: number = 100): string {
    const start = Math.max(0, citation.position - snippetSize);
    const end = Math.min(this.document.length, citation.position + citation.originalText.length + snippetSize);

    let snippet = this.document.substring(start, end);

    // Add ellipsis if truncated
    if (start > 0) {
      snippet = '...' + snippet;
    }
    if (end < this.document.length) {
      snippet = snippet + '...';
    }

    return snippet;
  }

  /**
   * Get all citations in a sentence
   */
  public getCitationsInSentence(sentence: string, allCitations: Citation[]): Citation[] {
    return allCitations.filter(citation => {
      const context = this.captureContext(citation);
      return context.sentence === sentence;
    });
  }

  /**
   * Get all citations in a paragraph
   */
  public getCitationsInParagraph(paragraph: string, allCitations: Citation[]): Citation[] {
    return allCitations.filter(citation => {
      const context = this.captureContext(citation);
      return context.paragraph === paragraph;
    });
  }

  /**
   * Analyze citation density in the document
   */
  public analyzeDensity(citations: Citation[]): {
    totalCitations: number;
    citationsPerParagraph: number;
    citationsPerSentence: number;
    paragraphsWithCitations: number;
    sentencesWithCitations: number;
  } {
    const paragraphs = new Set<string>();
    const sentences = new Set<string>();

    citations.forEach(citation => {
      const context = this.captureContext(citation);
      paragraphs.add(context.paragraph);
      sentences.add(context.sentence);
    });

    const totalParagraphs = this.document.split(/\n\n+/).length;
    const totalSentences = this.document.split(/[.!?]\s+/).length;

    return {
      totalCitations: citations.length,
      citationsPerParagraph: citations.length / totalParagraphs,
      citationsPerSentence: citations.length / totalSentences,
      paragraphsWithCitations: paragraphs.size,
      sentencesWithCitations: sentences.size
    };
  }

  /**
   * Find citations that appear in clusters
   */
  public findCitationClusters(citations: Citation[], maxDistance: number = 100): Citation[][] {
    if (citations.length === 0) return [];

    // Sort citations by position
    const sorted = [...citations].sort((a, b) => a.position - b.position);

    const clusters: Citation[][] = [];
    let currentCluster: Citation[] = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const distance = sorted[i].position - sorted[i - 1].position;

      if (distance <= maxDistance) {
        currentCluster.push(sorted[i]);
      } else {
        clusters.push(currentCluster);
        currentCluster = [sorted[i]];
      }
    }

    // Add the last cluster
    if (currentCluster.length > 0) {
      clusters.push(currentCluster);
    }

    // Only return clusters with 2+ citations
    return clusters.filter(cluster => cluster.length >= 2);
  }

  /**
   * Get context statistics
   */
  public getStatistics(citations: Citation[]): {
    averageWordsBeforeCitation: number;
    averageWordsAfterCitation: number;
    averageSentenceLength: number;
    averageParagraphLength: number;
    citationClusters: number;
  } {
    const contexts = this.captureContexts(citations);

    const totalWordsBefore = contexts.reduce((sum, ctx) => sum + ctx.wordsBefore, 0);
    const totalWordsAfter = contexts.reduce((sum, ctx) => sum + ctx.wordsAfter, 0);
    const totalSentenceLength = contexts.reduce((sum, ctx) => sum + this.countWords(ctx.sentence), 0);
    const totalParagraphLength = contexts.reduce((sum, ctx) => sum + this.countWords(ctx.paragraph), 0);

    const clusters = this.findCitationClusters(citations);

    return {
      averageWordsBeforeCitation: totalWordsBefore / contexts.length,
      averageWordsAfterCitation: totalWordsAfter / contexts.length,
      averageSentenceLength: totalSentenceLength / contexts.length,
      averageParagraphLength: totalParagraphLength / contexts.length,
      citationClusters: clusters.length
    };
  }
}

/**
 * Convenience function to capture context for a citation
 */
export function captureContext(document: string, citation: Citation, contextWindowSize?: number): CitationContext {
  const capturer = new ContextCapturer(document, contextWindowSize);
  return capturer.captureContext(citation);
}

/**
 * Convenience function to capture contexts for multiple citations
 */
export function captureContexts(document: string, citations: Citation[], contextWindowSize?: number): CitationContext[] {
  const capturer = new ContextCapturer(document, contextWindowSize);
  return capturer.captureContexts(citations);
}
