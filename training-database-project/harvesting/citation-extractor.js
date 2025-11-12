#!/usr/bin/env node

/**
 * Citation Extractor for Training Database
 *
 * Parses references from collected source documents:
 * - Bibliography section extraction
 * - In-text citation detection
 * - Reference list parsing
 * - Links citations to source documents
 *
 * Target: Extract ~300 unique references from ~100 documents
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUTS_DIR = path.join(__dirname, '..', 'inputs', 'source-documents');
const OUTPUTS_DIR = path.join(__dirname, '..', 'outputs');
const LOG_FILE = path.join(__dirname, '..', 'inputs', 'citation-extraction-log.json');

class CitationExtractor {
  constructor() {
    this.citations = [];
    this.sourceDocuments = [];
    this.log = {
      timestamp: new Date().toISOString(),
      processed: [],
      extracted: 0,
      unique: 0,
      errors: []
    };
  }

  /**
   * Main extraction workflow
   */
  async extract() {
    console.log('📚 Training Database Citation Extractor');
    console.log('=======================================\n');

    // Ensure outputs directory exists
    await fs.mkdir(OUTPUTS_DIR, { recursive: true });

    // Load source documents
    await this.loadSourceDocuments();

    // Extract citations from each document
    await this.extractFromAllDocuments();

    // Deduplicate citations
    await this.deduplicateCitations();

    // Save extraction results
    await this.saveResults();

    // Summary
    this.printSummary();
  }

  /**
   * Load source documents from inputs directory
   */
  async loadSourceDocuments() {
    console.log('📂 Loading source documents...\n');

    try {
      const files = await fs.readdir(INPUTS_DIR);
      const docFiles = files.filter(f => f.endsWith('.pdf') || f.endsWith('.html') || f.endsWith('.txt'));

      if (docFiles.length === 0) {
        console.log('⚠️  No source documents found!');
        console.log('   Please run document-collector.js first or manually add documents to:');
        console.log(`   ${INPUTS_DIR}\n`);
        process.exit(0);
      }

      this.sourceDocuments = docFiles.map(filename => ({
        filename,
        path: path.join(INPUTS_DIR, filename),
        type: path.extname(filename).slice(1)
      }));

      console.log(`✓ Found ${this.sourceDocuments.length} source documents\n`);
    } catch (error) {
      console.error('❌ Failed to load source documents:', error.message);
      process.exit(1);
    }
  }

  /**
   * Extract citations from all documents
   */
  async extractFromAllDocuments() {
    console.log('🔍 Extracting citations from documents...\n');

    for (const doc of this.sourceDocuments) {
      console.log(`  Processing: ${doc.filename}`);

      try {
        const extracted = await this.extractFromDocument(doc);
        console.log(`    ✓ Extracted ${extracted.length} citations\n`);

        this.log.processed.push({
          filename: doc.filename,
          type: doc.type,
          citations_found: extracted.length
        });
      } catch (error) {
        console.error(`    ❌ Failed: ${error.message}\n`);
        this.log.errors.push({
          filename: doc.filename,
          error: error.message
        });
      }
    }

    this.log.extracted = this.citations.length;
  }

  /**
   * Extract citations from a single document
   */
  async extractFromDocument(doc) {
    // TODO: Implement actual extraction logic
    // For now, this is a placeholder that demonstrates the structure

    const extracted = [];

    if (doc.type === 'pdf') {
      // PDF extraction would use pdf-parse or similar
      console.log('    ⚠️  PDF extraction not yet implemented');
      // extracted = await this.extractFromPDF(doc.path);
    } else if (doc.type === 'html') {
      // HTML extraction would parse bibliography sections
      console.log('    ⚠️  HTML extraction not yet implemented');
      // extracted = await this.extractFromHTML(doc.path);
    } else if (doc.type === 'txt') {
      // Text extraction would look for reference patterns
      const content = await fs.readFile(doc.path, 'utf-8');
      extracted.push(...this.extractFromText(content, doc.filename));
    }

    // Add source document reference to each citation
    extracted.forEach(citation => {
      citation.sourceDocument = doc.filename;
      this.citations.push(citation);
    });

    return extracted;
  }

  /**
   * Extract citations from plain text
   */
  extractFromText(content, sourceFilename) {
    const citations = [];

    // Look for bibliography section
    const bibliographyMatch = content.match(/(?:References|Bibliography|Works Cited)[\s\S]+$/i);
    if (!bibliographyMatch) {
      return citations;
    }

    const bibliography = bibliographyMatch[0];

    // Common citation patterns (basic implementation)
    const patterns = [
      // APA: Author, A. (2020). Title. Publisher.
      /([A-Z][a-z]+(?:,\s+[A-Z]\.)+)\s+\((\d{4})\)\.\s+(.+?)\.\s+(.+?)\./g,
      // MLA: Author, Alice. "Title." Journal, 2020.
      /([A-Z][a-z]+,\s+[A-Z][a-z]+)\.\s+"(.+?)"\.\s+(.+?),\s+(\d{4})\./g,
      // Chicago: Author, Alice. Title. Publisher, 2020.
      /([A-Z][a-z]+,\s+[A-Z][a-z]+)\.\s+(.+?)\.\s+(.+?),\s+(\d{4})\./g
    ];

    let match;
    let citationId = 1;

    for (const pattern of patterns) {
      while ((match = pattern.exec(bibliography)) !== null) {
        citations.push({
          id: `${sourceFilename}_${citationId++}`,
          raw_text: match[0],
          author: match[1],
          year: match[2] || match[4],
          title: match[3] || match[2],
          publication: match[4] || match[3],
          sourceDocument: sourceFilename
        });
      }
    }

    return citations;
  }

  /**
   * Remove duplicate citations
   */
  async deduplicateCitations() {
    console.log('🔄 Deduplicating citations...\n');

    const seen = new Map();
    const unique = [];

    for (const citation of this.citations) {
      // Create fingerprint: author + year + first 50 chars of title
      const fingerprint = `${citation.author}_${citation.year}_${citation.title?.substring(0, 50) || ''}`;

      if (!seen.has(fingerprint)) {
        seen.set(fingerprint, true);
        unique.push(citation);
      }
    }

    this.citations = unique;
    this.log.unique = unique.length;

    console.log(`  Before: ${this.log.extracted} citations`);
    console.log(`  After:  ${this.log.unique} unique citations\n`);
  }

  /**
   * Save extraction results
   */
  async saveResults() {
    console.log('💾 Saving results...\n');

    // Save citations to JSON for next step
    const citationsFile = path.join(OUTPUTS_DIR, 'extracted-citations.json');
    await fs.writeFile(
      citationsFile,
      JSON.stringify(this.citations, null, 2),
      'utf-8'
    );
    console.log(`  ✓ Citations saved: ${citationsFile}`);

    // Update log
    this.log.completed = new Date().toISOString();
    await fs.writeFile(
      LOG_FILE,
      JSON.stringify(this.log, null, 2),
      'utf-8'
    );
    console.log(`  ✓ Log updated: ${LOG_FILE}\n`);
  }

  /**
   * Print extraction summary
   */
  printSummary() {
    console.log('=======================================');
    console.log('📊 Extraction Summary');
    console.log('=======================================');
    console.log(`Documents processed: ${this.log.processed.length}`);
    console.log(`Citations extracted: ${this.log.extracted}`);
    console.log(`Unique citations: ${this.log.unique}`);
    console.log(`Errors: ${this.log.errors.length}`);
    console.log(`\nTarget: 300 unique citations`);
    console.log(`Progress: ${Math.round((this.log.unique / 300) * 100)}%`);
    console.log(`\nNext step: Run context-analyzer.js`);
    console.log('=======================================\n');
  }
}

// Manual extraction guide
function printExtractionGuide() {
  console.log('\n📋 MANUAL EXTRACTION GUIDE');
  console.log('==========================\n');
  console.log('For better extraction results:');
  console.log('  1. Convert PDFs to text: pdftotext document.pdf');
  console.log('  2. Use dedicated PDF libraries: pdf-parse (npm)');
  console.log('  3. For HTML: parse <ol> lists in bibliography sections');
  console.log('  4. For DOIs: Extract and use CrossRef API for metadata\n');
  console.log('Citation quality checks:');
  console.log('  ✓ Complete author information');
  console.log('  ✓ Valid year (1900-2025)');
  console.log('  ✓ Non-empty title');
  console.log('  ✓ Publication venue identified\n');
  console.log('If extraction yields <300 citations:');
  console.log('  • Add more source documents');
  console.log('  • Look for documents with longer bibliographies');
  console.log('  • Use review articles (typically cite 50+ sources)\n');
}

// Run extractor
const extractor = new CitationExtractor();
extractor.extract().then(() => {
  printExtractionGuide();
}).catch(error => {
  console.error('❌ Extraction failed:', error);
  process.exit(1);
});
