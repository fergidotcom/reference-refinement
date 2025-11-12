#!/usr/bin/env node

/**
 * Document Collector for Training Database
 *
 * Collects diverse source documents from multiple academic repositories:
 * - arXiv.org (STEM fields)
 * - PubMed Central (medical/health)
 * - Government reports (federal and international agencies)
 * - News archives (major newspapers and international media)
 *
 * Target: ~100 documents with rich bibliographies for citation extraction
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUTS_DIR = path.join(__dirname, '..', 'inputs', 'source-documents');
const LOG_FILE = path.join(__dirname, '..', 'inputs', 'citation-extraction-log.json');

// Collection strategy based on Claude.ai perspective
const COLLECTION_STRATEGY = {
  academic_papers: {
    arxiv: {
      disciplines: ['physics', 'cs', 'math', 'biology', 'economics'],
      papers_per_discipline: 4,
      total: 20
    },
    pubmed_central: {
      disciplines: ['medicine', 'public_health', 'psychology'],
      papers_per_discipline: 5,
      total: 15
    },
    google_scholar: {
      disciplines: ['social_sciences', 'humanities'],
      papers_per_discipline: 5,
      total: 10
    }
  },
  government_reports: {
    federal: {
      agencies: ['BLS', 'Census', 'FEC', 'NIH', 'EPA'],
      reports_per_agency: 3,
      total: 15
    },
    international: {
      organizations: ['WHO', 'World_Bank', 'OECD', 'UN'],
      reports_per_org: 3,
      total: 12
    }
  },
  news_articles: {
    major_newspapers: {
      sources: ['NYTimes', 'WSJ', 'WaPo'],
      articles_per_source: 5,
      total: 15
    },
    international: {
      sources: ['BBC', 'Reuters', 'Guardian'],
      articles_per_source: 3,
      total: 9
    }
  }
};

class DocumentCollector {
  constructor() {
    this.collectedDocs = [];
    this.log = {
      timestamp: new Date().toISOString(),
      strategy: COLLECTION_STRATEGY,
      collected: [],
      errors: []
    };
  }

  /**
   * Main collection workflow
   */
  async collect() {
    console.log('📚 Training Database Document Collector');
    console.log('=====================================\n');

    // Ensure inputs directory exists
    await fs.mkdir(INPUTS_DIR, { recursive: true });

    // Collection phases
    await this.collectAcademicPapers();
    await this.collectGovernmentReports();
    await this.collectNewsArticles();

    // Save collection log
    await this.saveLog();

    // Summary
    this.printSummary();
  }

  /**
   * Collect academic papers from various sources
   */
  async collectAcademicPapers() {
    console.log('\n📖 Phase 1: Collecting Academic Papers');
    console.log('---------------------------------------');

    // arXiv papers
    console.log('\n  🔬 arXiv.org papers:');
    for (const discipline of COLLECTION_STRATEGY.academic_papers.arxiv.disciplines) {
      console.log(`    • ${discipline}: Searching for papers with rich bibliographies...`);
      // TODO: Implement arXiv API search
      // For now, provide manual collection instructions
      console.log(`      ⚠️  Manual collection required - see collection guide`);
    }

    // PubMed Central
    console.log('\n  🏥 PubMed Central papers:');
    for (const discipline of COLLECTION_STRATEGY.academic_papers.pubmed_central.disciplines) {
      console.log(`    • ${discipline}: Searching for open-access articles...`);
      // TODO: Implement PubMed Central API search
      console.log(`      ⚠️  Manual collection required - see collection guide`);
    }

    // Google Scholar
    console.log('\n  🎓 Google Scholar papers:');
    for (const discipline of COLLECTION_STRATEGY.academic_papers.google_scholar.disciplines) {
      console.log(`    • ${discipline}: Searching for highly-cited papers...`);
      // TODO: Implement Google Scholar scraping (or manual collection)
      console.log(`      ⚠️  Manual collection required - see collection guide`);
    }

    console.log(`\n  ✓ Academic papers: Target ${COLLECTION_STRATEGY.academic_papers.arxiv.total + COLLECTION_STRATEGY.academic_papers.pubmed_central.total + COLLECTION_STRATEGY.academic_papers.google_scholar.total} documents`);
  }

  /**
   * Collect government reports
   */
  async collectGovernmentReports() {
    console.log('\n🏛️  Phase 2: Collecting Government Reports');
    console.log('----------------------------------------');

    // Federal agencies
    console.log('\n  🇺🇸 Federal agency reports:');
    for (const agency of COLLECTION_STRATEGY.government_reports.federal.agencies) {
      console.log(`    • ${agency}: Searching for data-rich reports...`);
      // TODO: Implement agency-specific collection
      console.log(`      ⚠️  Manual collection required - see collection guide`);
    }

    // International organizations
    console.log('\n  🌍 International organization reports:');
    for (const org of COLLECTION_STRATEGY.government_reports.international.organizations) {
      console.log(`    • ${org}: Searching for research reports...`);
      // TODO: Implement org-specific collection
      console.log(`      ⚠️  Manual collection required - see collection guide`);
    }

    console.log(`\n  ✓ Government reports: Target ${COLLECTION_STRATEGY.government_reports.federal.total + COLLECTION_STRATEGY.government_reports.international.total} documents`);
  }

  /**
   * Collect news articles
   */
  async collectNewsArticles() {
    console.log('\n📰 Phase 3: Collecting News Articles');
    console.log('-----------------------------------');

    // Major newspapers
    console.log('\n  📄 Major newspapers:');
    for (const source of COLLECTION_STRATEGY.news_articles.major_newspapers.sources) {
      console.log(`    • ${source}: Searching for in-depth articles with citations...`);
      // TODO: Implement news archive search
      console.log(`      ⚠️  Manual collection required - see collection guide`);
    }

    // International media
    console.log('\n  🌐 International media:');
    for (const source of COLLECTION_STRATEGY.news_articles.international.sources) {
      console.log(`    • ${source}: Searching for investigative articles...`);
      // TODO: Implement international news search
      console.log(`      ⚠️  Manual collection required - see collection guide`);
    }

    console.log(`\n  ✓ News articles: Target ${COLLECTION_STRATEGY.news_articles.major_newspapers.total + COLLECTION_STRATEGY.news_articles.international.total} documents`);
  }

  /**
   * Save collection log
   */
  async saveLog() {
    this.log.completed = new Date().toISOString();
    this.log.collected_count = this.collectedDocs.length;

    await fs.writeFile(
      LOG_FILE,
      JSON.stringify(this.log, null, 2),
      'utf-8'
    );

    console.log(`\n✓ Collection log saved: ${LOG_FILE}`);
  }

  /**
   * Print collection summary
   */
  printSummary() {
    const totalTarget =
      COLLECTION_STRATEGY.academic_papers.arxiv.total +
      COLLECTION_STRATEGY.academic_papers.pubmed_central.total +
      COLLECTION_STRATEGY.academic_papers.google_scholar.total +
      COLLECTION_STRATEGY.government_reports.federal.total +
      COLLECTION_STRATEGY.government_reports.international.total +
      COLLECTION_STRATEGY.news_articles.major_newspapers.total +
      COLLECTION_STRATEGY.news_articles.international.total;

    console.log('\n=====================================');
    console.log('📊 Collection Summary');
    console.log('=====================================');
    console.log(`Target documents: ${totalTarget}`);
    console.log(`Collected: ${this.collectedDocs.length}`);
    console.log(`\nNext step: Run citation-extractor.js`);
    console.log('=====================================\n');
  }
}

// Manual collection guide
function printCollectionGuide() {
  console.log('\n📋 MANUAL COLLECTION GUIDE');
  console.log('==========================\n');
  console.log('For each source category, manually download documents and save to:');
  console.log(`  ${INPUTS_DIR}\n`);
  console.log('File naming convention:');
  console.log('  - Academic: arxiv_[discipline]_[id].pdf');
  console.log('  - Government: [agency]_[year]_[title].pdf');
  console.log('  - News: [source]_[date]_[slug].pdf or .html\n');
  console.log('Selection criteria:');
  console.log('  ✓ Rich bibliography (20+ references)');
  console.log('  ✓ Diverse citation types (academic, data, news)');
  console.log('  ✓ Clear in-text citations');
  console.log('  ✓ Recent publications (2015-2025)');
  console.log('  ✓ Open access preferred\n');
  console.log('Target: ~100 documents → ~300 unique citations\n');
}

// Run collector
const collector = new DocumentCollector();
collector.collect().then(() => {
  printCollectionGuide();
}).catch(error => {
  console.error('❌ Collection failed:', error);
  process.exit(1);
});
