#!/usr/bin/env node

/**
 * Context Analyzer for Training Database
 *
 * Extracts citation context from source documents:
 * - Find citation in source text
 * - Extract surrounding paragraphs
 * - Identify argumentative role
 * - Determine citation purpose (What/Why/How/Evidence)
 *
 * Output: Context metadata for relevance generation
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUTS_DIR = path.join(__dirname, '..', 'inputs', 'source-documents');
const OUTPUTS_DIR = path.join(__dirname, '..', 'outputs');
const CITATIONS_FILE = path.join(OUTPUTS_DIR, 'extracted-citations.json');
const CONTEXT_FILE = path.join(OUTPUTS_DIR, 'context-analysis.json');

class ContextAnalyzer {
  constructor() {
    this.citations = [];
    this.contextsAnalyzed = 0;
    this.log = {
      timestamp: new Date().toISOString(),
      analyzed: 0,
      with_context: 0,
      without_context: 0,
      errors: []
    };
  }

  /**
   * Main analysis workflow
   */
  async analyze() {
    console.log('🔍 Training Database Context Analyzer');
    console.log('====================================\n');

    // Load extracted citations
    await this.loadCitations();

    // Analyze context for each citation
    await this.analyzeAllCitations();

    // Save context analysis
    await this.saveContextAnalysis();

    // Summary
    this.printSummary();
  }

  /**
   * Load extracted citations
   */
  async loadCitations() {
    console.log('📂 Loading extracted citations...\n');

    try {
      const content = await fs.readFile(CITATIONS_FILE, 'utf-8');
      this.citations = JSON.parse(content);

      if (this.citations.length === 0) {
        console.log('⚠️  No citations found!');
        console.log('   Please run citation-extractor.js first.\n');
        process.exit(0);
      }

      console.log(`✓ Loaded ${this.citations.length} citations\n`);
    } catch (error) {
      console.error('❌ Failed to load citations:', error.message);
      console.log('   Run citation-extractor.js first to extract citations.\n');
      process.exit(1);
    }
  }

  /**
   * Analyze context for all citations
   */
  async analyzeAllCitations() {
    console.log('🔍 Analyzing citation contexts...\n');

    const sourceDocCache = new Map();

    for (let i = 0; i < this.citations.length; i++) {
      const citation = this.citations[i];
      const progress = `[${i + 1}/${this.citations.length}]`;

      console.log(`${progress} ${citation.author} (${citation.year})`);

      try {
        // Load source document (cached)
        if (!sourceDocCache.has(citation.sourceDocument)) {
          const docPath = path.join(INPUTS_DIR, citation.sourceDocument);
          const content = await fs.readFile(docPath, 'utf-8');
          sourceDocCache.set(citation.sourceDocument, content);
        }

        const sourceText = sourceDocCache.get(citation.sourceDocument);

        // Extract context
        const context = this.extractContext(citation, sourceText);

        // Attach context to citation
        citation.context = context;

        if (context.found) {
          this.log.with_context++;
          console.log(`  ✓ Context found (${context.surrounding_text.length} chars)\n`);
        } else {
          this.log.without_context++;
          console.log(`  ⚠️  No context found\n`);
        }

        this.log.analyzed++;
      } catch (error) {
        console.error(`  ❌ Error: ${error.message}\n`);
        this.log.errors.push({
          citation_id: citation.id,
          error: error.message
        });
      }
    }
  }

  /**
   * Extract context around a citation in source text
   */
  extractContext(citation, sourceText) {
    const context = {
      found: false,
      citation_location: null,
      surrounding_text: '',
      paragraph_before: '',
      paragraph_containing: '',
      paragraph_after: '',
      argumentative_role: null,
      citation_purpose: null
    };

    // Search patterns for finding citation in text
    const searchPatterns = [
      // (Author, Year) - most common in-text citation
      new RegExp(`\\(${citation.author}[^)]*${citation.year}\\)`, 'i'),
      // Author (Year)
      new RegExp(`${citation.author}[^(]{0,20}\\(${citation.year}\\)`, 'i'),
      // [Author Year] - some styles
      new RegExp(`\\[${citation.author}[^\\]]*${citation.year}\\]`, 'i'),
      // Author's last name only (fuzzy match)
      new RegExp(`${citation.author.split(',')[0]}`, 'i')
    ];

    // Try each pattern
    for (const pattern of searchPatterns) {
      const match = sourceText.match(pattern);
      if (match) {
        context.found = true;
        context.citation_location = match.index;

        // Extract surrounding context (2000 chars before and after)
        const start = Math.max(0, match.index - 2000);
        const end = Math.min(sourceText.length, match.index + match[0].length + 2000);
        context.surrounding_text = sourceText.substring(start, end);

        // Split into paragraphs
        const beforeText = sourceText.substring(start, match.index);
        const afterText = sourceText.substring(match.index + match[0].length, end);

        const paragraphsBefore = beforeText.split('\n\n').filter(p => p.trim().length > 0);
        const paragraphsAfter = afterText.split('\n\n').filter(p => p.trim().length > 0);

        context.paragraph_before = paragraphsBefore[paragraphsBefore.length - 1] || '';
        context.paragraph_after = paragraphsAfter[0] || '';

        // Find paragraph containing citation
        const containingStart = beforeText.lastIndexOf('\n\n');
        const containingEnd = afterText.indexOf('\n\n');
        const containingText = sourceText.substring(
          match.index - (match.index - start - containingStart),
          match.index + match[0].length + (containingEnd === -1 ? afterText.length : containingEnd)
        );
        context.paragraph_containing = containingText.trim();

        // Analyze argumentative role
        context.argumentative_role = this.identifyArgumentativeRole(context);

        // Determine citation purpose
        context.citation_purpose = this.determineCitationPurpose(context);

        break; // Found citation, stop searching
      }
    }

    return context;
  }

  /**
   * Identify the argumentative role of the citation
   */
  identifyArgumentativeRole(context) {
    const text = context.surrounding_text.toLowerCase();

    // Evidence/data support
    if (text.match(/according to|as shown by|demonstrated by|evidence from|data from/)) {
      return 'evidence_support';
    }

    // Theoretical foundation
    if (text.match(/following|building on|based on|framework|theory|approach/)) {
      return 'theoretical_foundation';
    }

    // Contrast/disagreement
    if (text.match(/however|in contrast|unlike|disagreed|argued against/)) {
      return 'contrast_disagreement';
    }

    // Literature review
    if (text.match(/previous research|prior work|studies have shown|research shows/)) {
      return 'literature_review';
    }

    // Methodological reference
    if (text.match(/method|methodology|approach|technique|procedure/)) {
      return 'methodological';
    }

    // Background context
    if (text.match(/background|context|historically|traditionally/)) {
      return 'background_context';
    }

    return 'general_support';
  }

  /**
   * Determine why the citation was used (What/Why/How/Evidence)
   */
  determineCitationPurpose(context) {
    return {
      what: this.extractWhat(context),
      why: this.extractWhy(context),
      how: this.extractHow(context),
      evidence: this.extractEvidence(context)
    };
  }

  extractWhat(context) {
    // What the reference is about
    return 'Description of reference content (to be enhanced by Claude API)';
  }

  extractWhy(context) {
    // Why it was cited
    const role = context.argumentative_role;
    const roleDescriptions = {
      'evidence_support': 'Cited to provide empirical evidence',
      'theoretical_foundation': 'Cited to establish theoretical framework',
      'contrast_disagreement': 'Cited to present contrasting viewpoint',
      'literature_review': 'Cited as part of literature review',
      'methodological': 'Cited for methodological approach',
      'background_context': 'Cited to provide background context',
      'general_support': 'Cited to support argument'
    };
    return roleDescriptions[role] || 'Purpose to be determined';
  }

  extractHow(context) {
    // How it supports the larger argument
    return 'Role in supporting argument (to be enhanced by Claude API)';
  }

  extractEvidence(context) {
    // What data/findings/theory it contributes
    return 'Contribution to research (to be enhanced by Claude API)';
  }

  /**
   * Save context analysis
   */
  async saveContextAnalysis() {
    console.log('💾 Saving context analysis...\n');

    await fs.writeFile(
      CONTEXT_FILE,
      JSON.stringify(this.citations, null, 2),
      'utf-8'
    );

    console.log(`  ✓ Context analysis saved: ${CONTEXT_FILE}\n`);
  }

  /**
   * Print analysis summary
   */
  printSummary() {
    console.log('====================================');
    console.log('📊 Context Analysis Summary');
    console.log('====================================');
    console.log(`Citations analyzed: ${this.log.analyzed}`);
    console.log(`With context: ${this.log.with_context}`);
    console.log(`Without context: ${this.log.without_context}`);
    console.log(`Context rate: ${Math.round((this.log.with_context / this.log.analyzed) * 100)}%`);
    console.log(`Errors: ${this.log.errors.length}`);
    console.log(`\nNext step: Run relevance-generator.js`);
    console.log('====================================\n');
  }
}

// Run analyzer
const analyzer = new ContextAnalyzer();
analyzer.analyze().catch(error => {
  console.error('❌ Analysis failed:', error);
  process.exit(1);
});
