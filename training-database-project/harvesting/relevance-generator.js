#!/usr/bin/env node

/**
 * Relevance Generator for Training Database
 *
 * Generates 200-word relevance text for each citation using Claude API.
 *
 * Relevance text structure (What + Why + How + Evidence):
 * 1. What: Brief description of reference content
 * 2. Why: Specific reason it was cited in source document
 * 3. How: Role in supporting larger argument/research
 * 4. Evidence: What data/findings/theory it contributes
 *
 * Output: TrainingDecisions.txt with 300 references ready for algorithm testing
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUTS_DIR = path.join(__dirname, '..', 'outputs');
const CONTEXT_FILE = path.join(OUTPUTS_DIR, 'context-analysis.json');
const OUTPUT_FILE = path.join(OUTPUTS_DIR, 'TrainingDecisions.txt');

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

class RelevanceGenerator {
  constructor() {
    this.citations = [];
    this.generated = 0;
    this.failed = 0;
    this.totalTokens = 0;
    this.log = {
      timestamp: new Date().toISOString(),
      generated: 0,
      failed: 0,
      total_tokens: 0,
      estimated_cost: 0
    };
  }

  /**
   * Main generation workflow
   */
  async generate() {
    console.log('✨ Training Database Relevance Generator');
    console.log('=======================================\n');

    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('❌ ANTHROPIC_API_KEY environment variable not set!');
      console.log('   Set it with: export ANTHROPIC_API_KEY=your_key_here\n');
      process.exit(1);
    }

    // Load citations with context
    await this.loadCitationsWithContext();

    // Generate relevance text for each citation
    await this.generateAllRelevance();

    // Write to TrainingDecisions.txt
    await this.writeTrainingFile();

    // Summary
    this.printSummary();
  }

  /**
   * Load citations with context analysis
   */
  async loadCitationsWithContext() {
    console.log('📂 Loading citations with context...\n');

    try {
      const content = await fs.readFile(CONTEXT_FILE, 'utf-8');
      this.citations = JSON.parse(content);

      if (this.citations.length === 0) {
        console.log('⚠️  No citations found!');
        console.log('   Please run context-analyzer.js first.\n');
        process.exit(0);
      }

      console.log(`✓ Loaded ${this.citations.length} citations with context\n`);
    } catch (error) {
      console.error('❌ Failed to load citations:', error.message);
      console.log('   Run context-analyzer.js first to analyze citation contexts.\n');
      process.exit(1);
    }
  }

  /**
   * Generate relevance text for all citations
   */
  async generateAllRelevance() {
    console.log('✨ Generating 200-word relevance text...\n');
    console.log('This may take a while (300 citations × ~10 seconds each = ~50 minutes)\n');

    for (let i = 0; i < this.citations.length; i++) {
      const citation = this.citations[i];
      const progress = `[${i + 1}/${this.citations.length}]`;

      console.log(`${progress} ${citation.author} (${citation.year})`);

      try {
        const relevance = await this.generateRelevanceText(citation);
        citation.relevance_text = relevance;
        this.generated++;

        console.log(`  ✓ Generated (${relevance.length} words)\n`);

        // Rate limiting: wait 1 second between API calls
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`  ❌ Failed: ${error.message}\n`);
        citation.relevance_text = 'GENERATION_FAILED';
        this.failed++;
        this.log.failed++;
      }
    }

    this.log.generated = this.generated;
  }

  /**
   * Generate 200-word relevance text for a single citation using Claude API
   */
  async generateRelevanceText(citation) {
    const prompt = this.buildRelevancePrompt(citation);

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      temperature: 1.0,
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    // Track token usage
    this.totalTokens += response.usage.input_tokens + response.usage.output_tokens;
    this.log.total_tokens = this.totalTokens;

    // Estimate cost (Claude Sonnet 4.5: $3/$15 per million tokens)
    const inputCost = (response.usage.input_tokens / 1000000) * 3;
    const outputCost = (response.usage.output_tokens / 1000000) * 15;
    this.log.estimated_cost += (inputCost + outputCost);

    return response.content[0].text.trim();
  }

  /**
   * Build prompt for relevance generation
   */
  buildRelevancePrompt(citation) {
    const hasContext = citation.context && citation.context.found;

    let prompt = `Generate a 200-word relevance explanation for this academic reference:

**Reference:**
${citation.raw_text}

**Author:** ${citation.author}
**Year:** ${citation.year}
**Title:** ${citation.title}
**Publication:** ${citation.publication}

`;

    if (hasContext) {
      prompt += `**Citation Context from Source Document:**
${citation.context.surrounding_text}

**Argumentative Role:** ${citation.context.argumentative_role}

`;
    }

    prompt += `**Task:** Generate a 200-word relevance explanation following this structure:

1. **What (1-2 sentences):** Brief description of what this reference is and its main contribution
2. **Why (2-3 sentences):** Specific reason it was cited in the source document
3. **How (2-3 sentences):** How it supports or relates to the larger argument/research
4. **Evidence (2-3 sentences):** What specific data, findings, or theory it contributes

**Requirements:**
- Exactly 180-220 words (target: 200)
- Use scholarly tone appropriate for academic writing
- Be specific about the reference's contribution
- Explain the citation purpose clearly
- Focus on why this reference matters in scholarly context

**Output:** Only the 200-word relevance text, no other commentary.`;

    return prompt;
  }

  /**
   * Write TrainingDecisions.txt file
   */
  async writeTrainingFile() {
    console.log('📝 Writing TrainingDecisions.txt...\n');

    let output = '';

    for (let i = 0; i < this.citations.length; i++) {
      const citation = this.citations[i];
      const refId = String(i + 1).padStart(3, '0');

      output += `[${refId}] ${citation.raw_text}\n`;
      output += `Relevance: ${citation.relevance_text || 'GENERATION_FAILED'}\n`;
      output += `Primary URL:\n`;
      output += `Secondary URL:\n`;
      output += `Q:\n`;
      output += `FLAGS[TRAINING]\n\n`;
    }

    await fs.writeFile(OUTPUT_FILE, output, 'utf-8');

    console.log(`  ✓ TrainingDecisions.txt saved: ${OUTPUT_FILE}\n`);
  }

  /**
   * Print generation summary
   */
  printSummary() {
    console.log('=======================================');
    console.log('📊 Relevance Generation Summary');
    console.log('=======================================');
    console.log(`Citations processed: ${this.citations.length}`);
    console.log(`Successfully generated: ${this.generated}`);
    console.log(`Failed: ${this.failed}`);
    console.log(`Success rate: ${Math.round((this.generated / this.citations.length) * 100)}%`);
    console.log(`\nAPI Usage:`);
    console.log(`  Total tokens: ${this.log.total_tokens.toLocaleString()}`);
    console.log(`  Estimated cost: $${this.log.estimated_cost.toFixed(2)}`);
    console.log(`\nOutput file: ${OUTPUT_FILE}`);
    console.log(`\n✅ Training database ready for v21.0 algorithm testing!`);
    console.log('=======================================\n');
  }
}

// Cost estimation helper
function estimateCost(citations) {
  // Average: 500 tokens input + 400 tokens output per citation
  const avgInputTokens = 500;
  const avgOutputTokens = 400;
  const totalInputTokens = citations * avgInputTokens;
  const totalOutputTokens = citations * avgOutputTokens;

  // Claude Sonnet 4.5 pricing: $3/$15 per million tokens
  const inputCost = (totalInputTokens / 1000000) * 3;
  const outputCost = (totalOutputTokens / 1000000) * 15;
  const totalCost = inputCost + outputCost;

  console.log('\n💰 Cost Estimation');
  console.log('==================');
  console.log(`Citations: ${citations}`);
  console.log(`Estimated input tokens: ${totalInputTokens.toLocaleString()}`);
  console.log(`Estimated output tokens: ${totalOutputTokens.toLocaleString()}`);
  console.log(`Estimated cost: $${totalCost.toFixed(2)}`);
  console.log(`\nActual cost will vary based on context length and generation length.\n`);
}

// Check for --estimate flag
if (process.argv.includes('--estimate')) {
  const citations = parseInt(process.argv[process.argv.indexOf('--estimate') + 1]) || 300;
  estimateCost(citations);
  process.exit(0);
}

// Run generator
const generator = new RelevanceGenerator();
generator.generate().catch(error => {
  console.error('❌ Generation failed:', error);
  process.exit(1);
});
