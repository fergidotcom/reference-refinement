#!/usr/bin/env node

/**
 * Automated Document Collection Master Script
 *
 * Orchestrates the collection of 80+ source documents from:
 * - arXiv (20 papers)
 * - PubMed Central (15 papers)
 * - Government agencies (45+ reports)
 *
 * After collection completes, automatically proceeds to Phase 2 (Citation Extraction)
 */

const { collectArxivPapers } = require('./arxiv-collector');
const { collectPubMedPapers } = require('./pubmed-collector');
const { collectGovernmentReports } = require('./government-collector');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Main orchestration function
 */
async function runAutomatedCollection() {
  console.log('🚀 Automated Document Collection Pipeline');
  console.log('==========================================');
  console.log('Target: 80+ source documents');
  console.log('Sources: arXiv, PubMed Central, Government agencies');
  console.log('==========================================\n');

  const startTime = Date.now();
  let totalDocuments = 0;
  const results = {
    arxiv: 0,
    pubmed: 0,
    government: 0
  };

  try {
    // Collection Phase 1: arXiv papers (20 papers)
    console.log('📚 Phase 1/3: arXiv Academic Papers');
    console.log('===================================\n');
    try {
      results.arxiv = await collectArxivPapers();
      totalDocuments += results.arxiv;
      console.log(`✅ arXiv collection complete: ${results.arxiv} papers\n`);
    } catch (err) {
      console.error(`❌ arXiv collection failed: ${err.message}\n`);
    }

    // Collection Phase 2: PubMed Central papers (15 papers)
    console.log('🏥 Phase 2/3: PubMed Central Papers');
    console.log('===================================\n');
    try {
      results.pubmed = await collectPubMedPapers();
      totalDocuments += results.pubmed;
      console.log(`✅ PubMed collection complete: ${results.pubmed} papers\n`);
    } catch (err) {
      console.error(`❌ PubMed collection failed: ${err.message}\n`);
    }

    // Collection Phase 3: Government reports (45+ reports)
    console.log('🏛️  Phase 3/3: Government Reports');
    console.log('===================================\n');
    try {
      results.government = await collectGovernmentReports();
      totalDocuments += results.government;
      console.log(`✅ Government collection complete: ${results.government} reports\n`);
    } catch (err) {
      console.error(`❌ Government collection failed: ${err.message}\n`);
    }

    const elapsedTime = Math.round((Date.now() - startTime) / 1000);

    console.log('\n');
    console.log('==========================================');
    console.log('📊 COLLECTION COMPLETE');
    console.log('==========================================');
    console.log(`Total documents collected: ${totalDocuments}`);
    console.log(`  • arXiv papers: ${results.arxiv}`);
    console.log(`  • PubMed papers: ${results.pubmed}`);
    console.log(`  • Government reports: ${results.government}`);
    console.log(`Time elapsed: ${elapsedTime} seconds`);
    console.log('==========================================\n');

    // Check if we have enough documents to proceed
    if (totalDocuments < 30) {
      console.log('⚠️  WARNING: Only collected ${totalDocuments} documents (target: 80+)');
      console.log('   Some sources may have failed. Review logs above.');
      console.log('   You may want to add documents manually before proceeding.\n');
      return totalDocuments;
    }

    console.log(`✅ Successfully collected ${totalDocuments} documents!`);
    console.log('   Ready to proceed to Phase 2: Citation Extraction\n');

    // Automatically proceed to Phase 2
    console.log('🔄 Auto-proceeding to Phase 2: Citation Extraction...\n');
    console.log('==========================================\n');

    try {
      const { stdout, stderr } = await execPromise('node harvesting/citation-extractor.js', {
        cwd: require('path').join(__dirname, '..')
      });
      console.log(stdout);
      if (stderr) console.error(stderr);

      // Proceed to Phase 3
      console.log('🔄 Auto-proceeding to Phase 3: Context Analysis...\n');
      console.log('==========================================\n');

      const phase3 = await execPromise('node harvesting/context-analyzer.js', {
        cwd: require('path').join(__dirname, '..')
      });
      console.log(phase3.stdout);
      if (phase3.stderr) console.error(phase3.stderr);

      // Proceed to Phase 4 (requires ANTHROPIC_API_KEY)
      if (process.env.ANTHROPIC_API_KEY) {
        console.log('🔄 Auto-proceeding to Phase 4: Relevance Generation...\n');
        console.log('==========================================\n');
        console.log('⚠️  This will make ~300 Claude API calls ($5-10 estimated cost)\n');

        const phase4 = await execPromise('node harvesting/relevance-generator.js', {
          cwd: require('path').join(__dirname, '..')
        });
        console.log(phase4.stdout);
        if (phase4.stderr) console.error(phase4.stderr);

        console.log('\n✅ PIPELINE COMPLETE!');
        console.log('==========================================');
        console.log('Output: outputs/TrainingDecisions.txt');
        console.log('Ready for v21.0 algorithm development!');
        console.log('==========================================\n');
      } else {
        console.log('\n⚠️  ANTHROPIC_API_KEY not set');
        console.log('   Phase 4 (Relevance Generation) requires API key');
        console.log('   Set key and run: node harvesting/relevance-generator.js\n');
      }

    } catch (err) {
      console.error('\n❌ Pipeline failed at later phase:');
      console.error(err.message);
      console.error('\nYou can resume by running phases manually:');
      console.error('  node harvesting/citation-extractor.js');
      console.error('  node harvesting/context-analyzer.js');
      console.error('  node harvesting/relevance-generator.js\n');
    }

    return totalDocuments;

  } catch (err) {
    console.error('\n❌ Collection pipeline failed:', err);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAutomatedCollection()
    .then(count => {
      process.exit(0);
    })
    .catch(err => {
      console.error('Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { runAutomatedCollection };
