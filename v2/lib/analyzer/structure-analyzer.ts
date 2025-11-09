/**
 * Structure Analyzer - Identifies document structure (chapters, sections, etc.)
 *
 * Detects:
 * - Document title
 * - Chapter headings (e.g., "Chapter 1: Title")
 * - Section headings (numbered: "1.1", "1.2.3", etc.)
 * - Section headings (text-based)
 * - Hierarchical structure
 */

import { DocumentStructure, Section } from '../types';

export class StructureAnalyzer {
  private document: string;
  private lines: string[];

  constructor(document: string) {
    this.document = document;
    this.lines = document.split('\n');
  }

  /**
   * Analyze the entire document structure
   */
  public analyze(): DocumentStructure {
    const title = this.detectTitle();
    const sections = this.detectSections();

    return {
      title,
      sections,
      totalChars: this.document.length,
      totalLines: this.lines.length
    };
  }

  /**
   * Detect the document title
   * Usually the first non-empty line or a line near the top
   */
  private detectTitle(): string {
    // Look at first 20 lines for a title
    for (let i = 0; i < Math.min(20, this.lines.length); i++) {
      const line = this.lines[i].trim();

      // Skip empty lines
      if (!line) continue;

      // Skip copyright notices
      if (line.toLowerCase().includes('copyright')) continue;

      // Skip "all rights reserved"
      if (line.toLowerCase().includes('all rights reserved')) continue;

      // If it's a reasonably short line (likely a title), use it
      if (line.length < 200 && !line.endsWith('.')) {
        return line;
      }

      // If it ends with a period and is short, might still be a title
      if (line.length < 100) {
        return line.replace(/\.$/, '');
      }
    }

    return 'Untitled Document';
  }

  /**
   * Detect all sections in the document
   */
  private detectSections(): Section[] {
    const sections: Section[] = [];
    let currentPosition = 0;

    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i].trim();
      currentPosition += this.lines[i].length + 1; // +1 for newline

      // Skip empty lines
      if (!line) continue;

      // Check if this line is a section heading
      const sectionInfo = this.isSectionHeading(line, i);
      if (sectionInfo) {
        const section = this.createSection(
          sectionInfo.title,
          sectionInfo.level,
          currentPosition - this.lines[i].length - 1,
          i
        );
        sections.push(section);
      }
    }

    // Calculate end positions for each section
    this.calculateEndPositions(sections);

    // Build hierarchical structure
    return this.buildHierarchy(sections);
  }

  /**
   * Check if a line is a section heading and return its info
   */
  private isSectionHeading(line: string, lineNumber: number): { title: string; level: number } | null {
    // Pattern 1: "Chapter N: Title" or "Chapter N - Title"
    const chapterMatch = line.match(/^Chapter\s+(\d+)[:—-]\s*(.+)$/i);
    if (chapterMatch) {
      return {
        title: chapterMatch[2].trim(),
        level: 1
      };
    }

    // Pattern 2: "Chapter N" (just chapter number)
    const chapterNumMatch = line.match(/^Chapter\s+(\d+)\s*$/i);
    if (chapterNumMatch) {
      return {
        title: `Chapter ${chapterNumMatch[1]}`,
        level: 1
      };
    }

    // Pattern 3: Numbered section "1.1 Title" or "1.2.3 Title"
    const numberedMatch = line.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
    if (numberedMatch) {
      const numberParts = numberedMatch[1].split('.');
      return {
        title: numberedMatch[2].trim(),
        level: numberParts.length
      };
    }

    // Pattern 4: "Introduction", "Conclusion", "Foreword", etc. (special sections)
    const specialSections = [
      'introduction', 'conclusion', 'foreword', 'preface', 'acknowledgments',
      'abstract', 'summary', 'appendix', 'references', 'bibliography'
    ];
    if (specialSections.some(s => line.toLowerCase() === s)) {
      return {
        title: line,
        level: 1
      };
    }

    // Pattern 5: ALL CAPS heading (at least 3 words)
    if (line === line.toUpperCase() && line.split(/\s+/).length >= 3 && !line.includes('[')) {
      return {
        title: line,
        level: 2
      };
    }

    // Pattern 6: Short line followed by blank line (potential heading)
    // Must be:
    // - Relatively short (< 100 chars)
    // - Not end with a period
    // - Followed by a blank line
    // - Title case or similar
    if (
      line.length < 100 &&
      !line.endsWith('.') &&
      !line.includes('[') &&
      lineNumber + 1 < this.lines.length &&
      this.lines[lineNumber + 1].trim() === ''
    ) {
      // Check if it looks like a title (starts with capital)
      if (/^[A-Z]/.test(line)) {
        return {
          title: line,
          level: 2
        };
      }
    }

    return null;
  }

  /**
   * Create a section object
   */
  private createSection(title: string, level: number, startPosition: number, startLine: number): Section {
    return {
      title,
      level,
      startPosition,
      endPosition: startPosition, // Will be calculated later
      startLine: startLine + 1, // 1-indexed
      endLine: startLine + 1, // Will be calculated later
      subsections: []
    };
  }

  /**
   * Calculate end positions for sections
   */
  private calculateEndPositions(sections: Section[]): void {
    for (let i = 0; i < sections.length; i++) {
      if (i + 1 < sections.length) {
        // End position is the start of the next section
        sections[i].endPosition = sections[i + 1].startPosition;
        sections[i].endLine = sections[i + 1].startLine - 1;
      } else {
        // Last section ends at the end of the document
        sections[i].endPosition = this.document.length;
        sections[i].endLine = this.lines.length;
      }
    }
  }

  /**
   * Build hierarchical structure from flat sections
   */
  private buildHierarchy(flatSections: Section[]): Section[] {
    if (flatSections.length === 0) return [];

    const root: Section[] = [];
    const stack: Section[] = [];

    for (const section of flatSections) {
      // Pop sections from stack that are not parents of current section
      while (stack.length > 0 && stack[stack.length - 1].level >= section.level) {
        stack.pop();
      }

      if (stack.length === 0) {
        // Top-level section
        root.push(section);
      } else {
        // Add as subsection of the last section in stack
        stack[stack.length - 1].subsections.push(section);
      }

      stack.push(section);
    }

    return root;
  }

  /**
   * Find section containing a specific position
   */
  public findSectionAtPosition(position: number): Section | null {
    const structure = this.analyze();
    return this.findSectionInTree(structure.sections, position);
  }

  /**
   * Helper to find section in tree structure
   */
  private findSectionInTree(sections: Section[], position: number): Section | null {
    for (const section of sections) {
      if (position >= section.startPosition && position < section.endPosition) {
        // Check subsections first (more specific)
        const subsection = this.findSectionInTree(section.subsections, position);
        return subsection || section;
      }
    }
    return null;
  }

  /**
   * Find section containing a specific line
   */
  public findSectionAtLine(lineNumber: number): Section | null {
    const structure = this.analyze();
    return this.findSectionInTreeByLine(structure.sections, lineNumber);
  }

  /**
   * Helper to find section by line number
   */
  private findSectionInTreeByLine(sections: Section[], lineNumber: number): Section | null {
    for (const section of sections) {
      if (lineNumber >= section.startLine && lineNumber <= section.endLine) {
        // Check subsections first (more specific)
        const subsection = this.findSectionInTreeByLine(section.subsections, lineNumber);
        return subsection || section;
      }
    }
    return null;
  }

  /**
   * Get all sections at a specific level
   */
  public getSectionsByLevel(level: number): Section[] {
    const structure = this.analyze();
    const sections: Section[] = [];

    const collectSections = (sectionList: Section[]) => {
      for (const section of sectionList) {
        if (section.level === level) {
          sections.push(section);
        }
        if (section.subsections.length > 0) {
          collectSections(section.subsections);
        }
      }
    };

    collectSections(structure.sections);
    return sections;
  }

  /**
   * Get table of contents
   */
  public getTableOfContents(): string {
    const structure = this.analyze();
    const lines: string[] = [`# ${structure.title}`, ''];

    const addSection = (section: Section, depth: number = 0) => {
      const indent = '  '.repeat(depth);
      const prefix = depth === 0 ? '##' : '-';
      lines.push(`${indent}${prefix} ${section.title}`);

      for (const subsection of section.subsections) {
        addSection(subsection, depth + 1);
      }
    };

    for (const section of structure.sections) {
      addSection(section);
    }

    return lines.join('\n');
  }

  /**
   * Get statistics about document structure
   */
  public getStatistics(): {
    totalSections: number;
    sectionsByLevel: Record<number, number>;
    averageSectionLength: number;
    longestSection: { title: string; length: number } | null;
    shortestSection: { title: string; length: number } | null;
  } {
    const structure = this.analyze();
    const allSections: Section[] = [];
    const sectionsByLevel: Record<number, number> = {};

    const collectSections = (sectionList: Section[]) => {
      for (const section of sectionList) {
        allSections.push(section);
        sectionsByLevel[section.level] = (sectionsByLevel[section.level] || 0) + 1;
        if (section.subsections.length > 0) {
          collectSections(section.subsections);
        }
      }
    };

    collectSections(structure.sections);

    const lengths = allSections.map(s => s.endPosition - s.startPosition);
    const averageSectionLength = lengths.length > 0
      ? lengths.reduce((a, b) => a + b, 0) / lengths.length
      : 0;

    let longestSection: { title: string; length: number } | null = null;
    let shortestSection: { title: string; length: number } | null = null;

    for (const section of allSections) {
      const length = section.endPosition - section.startPosition;
      if (!longestSection || length > longestSection.length) {
        longestSection = { title: section.title, length };
      }
      if (!shortestSection || length < shortestSection.length) {
        shortestSection = { title: section.title, length };
      }
    }

    return {
      totalSections: allSections.length,
      sectionsByLevel,
      averageSectionLength,
      longestSection,
      shortestSection
    };
  }
}

/**
 * Convenience function to analyze document structure
 */
export function analyzeStructure(document: string): DocumentStructure {
  const analyzer = new StructureAnalyzer(document);
  return analyzer.analyze();
}

/**
 * Convenience function to get table of contents
 */
export function getTableOfContents(document: string): string {
  const analyzer = new StructureAnalyzer(document);
  return analyzer.getTableOfContents();
}
