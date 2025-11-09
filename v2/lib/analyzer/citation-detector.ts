/**
 * Citation Detector - Detects citations in multiple formats
 *
 * Supports 10+ citation formats:
 * 1. [100] - Standard numbered bracket citation
 * 2. [] - Unnumbered bracket (needs RID assignment)
 * 3. [100-102] - Range citations
 * 4. [100, 101] - Multiple citations
 * 5. [100; 101] - Semicolon-separated
 * 6. (100) - Parenthetical numbered
 * 7. () - Unnumbered parenthetical
 * 8. ¹ ² ³ - Superscript numbers
 * 9. [Smith 2020] - Author-year in brackets
 * 10. (Smith 2020) - Author-year in parentheses
 * 11. [*] - Asterisk/symbol citations
 * 12. [a] [b] - Letter citations
 */

import { Citation, DetectionResult } from '../types';

export class CitationDetector {
  private document: string;
  private lines: string[];

  constructor(document: string) {
    this.document = document;
    this.lines = document.split('\n');
  }

  /**
   * Detect all citations in the document
   */
  public detectAll(): DetectionResult {
    const citations: Citation[] = [];
    let position = 0;

    for (let lineNumber = 0; lineNumber < this.lines.length; lineNumber++) {
      const line = this.lines[lineNumber];
      const lineCitations = this.detectInLine(line, lineNumber, position);
      citations.push(...lineCitations);
      position += line.length + 1; // +1 for newline
    }

    const numbered = citations.filter(c => c.type === 'numbered');
    const unnumbered = citations.filter(c => c.type === 'unnumbered');
    const uniqueRIDs = new Set(numbered.map(c => c.id).filter(id => id));

    return {
      citations,
      numberedCount: numbered.length,
      unnumberedCount: unnumbered.length,
      uniqueRIDs
    };
  }

  /**
   * Detect citations in a single line
   */
  private detectInLine(line: string, lineNumber: number, startPosition: number): Citation[] {
    const citations: Citation[] = [];

    // Pattern 1-2: [123] or []
    citations.push(...this.detectBracketCitations(line, lineNumber, startPosition));

    // Pattern 6-7: (123) or ()
    citations.push(...this.detectParentheticalNumbers(line, lineNumber, startPosition));

    // Pattern 8: Superscript numbers
    citations.push(...this.detectSuperscripts(line, lineNumber, startPosition));

    // Pattern 9-10: [Author YYYY] or (Author YYYY)
    citations.push(...this.detectAuthorYear(line, lineNumber, startPosition));

    // Pattern 11: [*] or [†] etc.
    citations.push(...this.detectSymbols(line, lineNumber, startPosition));

    // Pattern 12: [a] [b] etc.
    citations.push(...this.detectLetters(line, lineNumber, startPosition));

    return citations;
  }

  /**
   * Detect bracket citations: [123], [], [100-102], [100, 101], [100; 101]
   */
  private detectBracketCitations(line: string, lineNumber: number, startPosition: number): Citation[] {
    const citations: Citation[] = [];
    // Match [numbers/empty] but not [Author YYYY] or [*] or [a]
    const pattern = /\[(\d+(?:\s*[-,;]\s*\d+)*|\s*)\]/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(line)) !== null) {
      const content = match[1].trim();
      const position = startPosition + match.index;
      const columnNumber = match.index;

      if (content === '') {
        // Empty bracket - unnumbered
        citations.push({
          id: '',
          position,
          lineNumber: lineNumber + 1, // 1-indexed
          columnNumber: columnNumber + 1, // 1-indexed
          originalText: match[0],
          contextBefore: '',
          contextAfter: '',
          type: 'unnumbered'
        });
      } else if (content.includes('-')) {
        // Range: [100-102]
        const [start, end] = content.split('-').map(s => s.trim());
        const startNum = parseInt(start);
        const endNum = parseInt(end);

        for (let i = startNum; i <= endNum; i++) {
          citations.push({
            id: i.toString(),
            position,
            lineNumber: lineNumber + 1,
            columnNumber: columnNumber + 1,
            originalText: match[0],
            contextBefore: '',
            contextAfter: '',
            type: 'numbered'
          });
        }
      } else if (content.includes(',') || content.includes(';')) {
        // Multiple: [100, 101] or [100; 101]
        const ids = content.split(/[,;]/).map(s => s.trim()).filter(s => s);
        const originalText = match[0];
        ids.forEach(id => {
          citations.push({
            id,
            position,
            lineNumber: lineNumber + 1,
            columnNumber: columnNumber + 1,
            originalText,
            contextBefore: '',
            contextAfter: '',
            type: 'numbered'
          });
        });
      } else {
        // Single number
        citations.push({
          id: content,
          position,
          lineNumber: lineNumber + 1,
          columnNumber: columnNumber + 1,
          originalText: match[0],
          contextBefore: '',
          contextAfter: '',
          type: 'numbered'
        });
      }
    }

    return citations;
  }

  /**
   * Detect parenthetical citations: (123) or ()
   * Only detect if they look like citations (not part of regular text)
   */
  private detectParentheticalNumbers(line: string, lineNumber: number, startPosition: number): Citation[] {
    const citations: Citation[] = [];
    // Match (numbers) or () - but be careful not to match regular parentheses
    // Look for parentheses with only numbers or empty
    const pattern = /\((\d+(?:\s*[-,;]\s*\d+)*|\s*)\)(?=\s|$|[.,;:])/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(line)) !== null) {
      const content = match[1].trim();
      const position = startPosition + match.index;
      const columnNumber = match.index;

      if (content === '') {
        citations.push({
          id: '',
          position,
          lineNumber: lineNumber + 1,
          columnNumber: columnNumber + 1,
          originalText: match[0],
          contextBefore: '',
          contextAfter: '',
          type: 'unnumbered'
        });
      } else {
        // Handle ranges and multiples similar to brackets
        if (content.includes('-')) {
          const [start, end] = content.split('-').map(s => s.trim());
          const startNum = parseInt(start);
          const endNum = parseInt(end);

          for (let i = startNum; i <= endNum; i++) {
            citations.push({
              id: i.toString(),
              position,
              lineNumber: lineNumber + 1,
              columnNumber: columnNumber + 1,
              originalText: match[0],
              contextBefore: '',
              contextAfter: '',
              type: 'numbered'
            });
          }
        } else if (content.includes(',') || content.includes(';')) {
          const ids = content.split(/[,;]/).map(s => s.trim()).filter(s => s);
          const originalText = match[0];
          ids.forEach(id => {
            citations.push({
              id,
              position,
              lineNumber: lineNumber + 1,
              columnNumber: columnNumber + 1,
              originalText,
              contextBefore: '',
              contextAfter: '',
              type: 'numbered'
            });
          });
        } else {
          citations.push({
            id: content,
            position,
            lineNumber: lineNumber + 1,
            columnNumber: columnNumber + 1,
            originalText: match[0],
            contextBefore: '',
            contextAfter: '',
            type: 'numbered'
          });
        }
      }
    }

    return citations;
  }

  /**
   * Detect superscript citations: ¹ ² ³ etc.
   */
  private detectSuperscripts(line: string, lineNumber: number, startPosition: number): Citation[] {
    const citations: Citation[] = [];
    const superscripts = '⁰¹²³⁴⁵⁶⁷⁸⁹';
    const pattern = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(line)) !== null) {
      const superscriptText = match[0];
      // Convert superscripts to regular numbers
      let id = '';
      for (const char of superscriptText) {
        const index = superscripts.indexOf(char);
        if (index !== -1) {
          id += index.toString();
        }
      }

      const position = startPosition + match.index;
      const columnNumber = match.index;

      citations.push({
        id,
        position,
        lineNumber: lineNumber + 1,
        columnNumber: columnNumber + 1,
        originalText: match[0],
        contextBefore: '',
        contextAfter: '',
        type: 'numbered'
      });
    }

    return citations;
  }

  /**
   * Detect author-year citations: [Smith 2020] or (Smith 2020)
   */
  private detectAuthorYear(line: string, lineNumber: number, startPosition: number): Citation[] {
    const citations: Citation[] = [];

    // Match [Author YYYY] or (Author YYYY)
    // Author can be: Last, Last & Last, Last et al.
    const pattern = /[\[\(]([A-Z][a-zA-Z]+(?:\s+(?:&|and|et al\.?)\s+[A-Z][a-zA-Z]+)?)\s+(\d{4}[a-z]?)[\]\)]/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(line)) !== null) {
      const author = match[1];
      const year = match[2];
      const id = `${author} ${year}`;
      const position = startPosition + match.index;
      const columnNumber = match.index;

      citations.push({
        id,
        position,
        lineNumber: lineNumber + 1,
        columnNumber: columnNumber + 1,
        originalText: match[0],
        contextBefore: '',
        contextAfter: '',
        type: 'numbered'
      });
    }

    return citations;
  }

  /**
   * Detect symbol citations: [*], [†], [‡], etc.
   */
  private detectSymbols(line: string, lineNumber: number, startPosition: number): Citation[] {
    const citations: Citation[] = [];
    const pattern = /[\[\(]([*†‡§¶#])[\]\)]/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(line)) !== null) {
      const symbol = match[1];
      const position = startPosition + match.index;
      const columnNumber = match.index;

      citations.push({
        id: symbol,
        position,
        lineNumber: lineNumber + 1,
        columnNumber: columnNumber + 1,
        originalText: match[0],
        contextBefore: '',
        contextAfter: '',
        type: 'numbered'
      });
    }

    return citations;
  }

  /**
   * Detect letter citations: [a], [b], [c], etc.
   */
  private detectLetters(line: string, lineNumber: number, startPosition: number): Citation[] {
    const citations: Citation[] = [];
    // Only match single lowercase letters in brackets/parentheses
    const pattern = /[\[\(]([a-z])[\]\)]/g;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(line)) !== null) {
      const letter = match[1];
      const position = startPosition + match.index;
      const columnNumber = match.index;

      citations.push({
        id: letter,
        position,
        lineNumber: lineNumber + 1,
        columnNumber: columnNumber + 1,
        originalText: match[0],
        contextBefore: '',
        contextAfter: '',
        type: 'numbered'
      });
    }

    return citations;
  }

  /**
   * Get citations for a specific line
   */
  public getCitationsForLine(lineNumber: number): Citation[] {
    const result = this.detectAll();
    return result.citations.filter(c => c.lineNumber === lineNumber);
  }

  /**
   * Get all unnumbered citations
   */
  public getUnnumberedCitations(): Citation[] {
    const result = this.detectAll();
    return result.citations.filter(c => c.type === 'unnumbered');
  }

  /**
   * Get statistics about detected citations
   */
  public getStatistics(): {
    total: number;
    numbered: number;
    unnumbered: number;
    uniqueRIDs: number;
    byFormat: Record<string, number>;
  } {
    const result = this.detectAll();
    const byFormat: Record<string, number> = {};

    result.citations.forEach(citation => {
      const format = this.getCitationFormat(citation.originalText);
      byFormat[format] = (byFormat[format] || 0) + 1;
    });

    return {
      total: result.citations.length,
      numbered: result.numberedCount,
      unnumbered: result.unnumberedCount,
      uniqueRIDs: result.uniqueRIDs.size,
      byFormat
    };
  }

  /**
   * Determine the format of a citation
   */
  private getCitationFormat(text: string): string {
    if (text.startsWith('[') && text.endsWith(']')) {
      if (text === '[]') return 'unnumbered-bracket';
      if (/\[\d+\]/.test(text)) return 'numbered-bracket';
      if (/\[[A-Z][a-zA-Z]+\s+\d{4}\]/.test(text)) return 'author-year-bracket';
      if (/\[[*†‡§¶#]\]/.test(text)) return 'symbol-bracket';
      if (/\[[a-z]\]/.test(text)) return 'letter-bracket';
    }
    if (text.startsWith('(') && text.endsWith(')')) {
      if (text === '()') return 'unnumbered-paren';
      if (/\(\d+\)/.test(text)) return 'numbered-paren';
      if (/\([A-Z][a-zA-Z]+\s+\d{4}\)/.test(text)) return 'author-year-paren';
    }
    if (/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/.test(text)) return 'superscript';

    return 'unknown';
  }
}

/**
 * Convenience function to detect citations in a document
 */
export function detectCitations(document: string): DetectionResult {
  const detector = new CitationDetector(document);
  return detector.detectAll();
}
