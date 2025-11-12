#!/usr/bin/env node

/**
 * Query Evolution Project - Experiment Runner
 *
 * Main execution engine for overnight research run.
 * Tests 3,000+ query/ranking combinations to discover optimal URL discovery algorithms.
 *
 * Usage:
 *   node experiment-runner.js [--dry-run] [--tier=1] [--limit=100]
 */

import fs from 'fs/promises';
import Database from 'better-sqlite3';
import yaml from 'js-yaml';
import fetch from 'node-fetch';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  INPUTS: {
    decisions: './inputs/decisions.txt',
    manualReview: './inputs/manual-review-refs.json',
    allSets: './inputs/all-reference-sets.json',
    baseline: './inputs/v20.1-baseline.json',
    strategies: './strategies-catalog.yaml',
    matrix: './experiment-matrix.yaml',
    domains: './domain-database.json'
  },
  OUTPUTS: {
    database: './outputs/experiments.db',
    results: './outputs/results/',
    checkpoints: './outputs/checkpoints/'
  },
  BUDGET: {
    available: 900,
    target: 630,
    costPerExperiment: 0.20
  },
  API_ENDPOINTS: {
    // Netlify functions or local backend
    queryGen: process.env.QUERY_GEN_URL || 'https://rrv521-1760738877.netlify.app/api/llm-chat',
    ranking: process.env.RANKING_URL || 'https://rrv521-1760738877.netlify.app/api/llm-rank',
    search: process.env.SEARCH_URL || 'https://rrv521-1760738877.netlify.app/api/search-google'
  }
};

// ============================================================================
// DATABASE SETUP
// ============================================================================

class ExperimentDatabase {
  constructor(dbPath) {
    this.db = new Database(dbPath);
    this.initializeTables();
  }

  initializeTables() {
    // Experiments table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS experiments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        reference_id INTEGER NOT NULL,
        tier VARCHAR(20) NOT NULL,
        strategy_id VARCHAR(50) NOT NULL,
        ranking_id VARCHAR(50) NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        query_generated TEXT,
        urls_found INTEGER,
        top_url TEXT,
        top_url_score REAL,
        current_v20_url TEXT,
        current_v20_score REAL,
        improvement_score REAL,
        winner VARCHAR(20),
        cost_usd REAL,
        execution_time_ms INTEGER,
        notes TEXT
      )
    `);

    // Results summary table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS results_summary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tier VARCHAR(20),
        strategy_id VARCHAR(50),
        ranking_id VARCHAR(50),
        experiments_count INTEGER,
        wins_count INTEGER,
        avg_improvement REAL,
        total_cost REAL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Domain intelligence table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS domain_intelligence (
        domain VARCHAR(255) PRIMARY KEY,
        accessibility VARCHAR(50),
        authority VARCHAR(50),
        boost INTEGER DEFAULT 0,
        penalty INTEGER DEFAULT 0,
        encounters INTEGER DEFAULT 1,
        successful_urls INTEGER DEFAULT 0,
        notes TEXT,
        discovered_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Budget tracking table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS budget_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        experiment_count INTEGER,
        total_spent REAL,
        remaining REAL,
        note TEXT
      )
    `);

    console.log('✅ Database initialized');
  }

  recordExperiment(data) {
    const stmt = this.db.prepare(`
      INSERT INTO experiments (
        reference_id, tier, strategy_id, ranking_id,
        query_generated, urls_found, top_url, top_url_score,
        current_v20_url, current_v20_score, improvement_score,
        winner, cost_usd, execution_time_ms, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      data.reference_id,
      data.tier,
      data.strategy_id,
      data.ranking_id,
      data.query_generated,
      data.urls_found,
      data.top_url,
      data.top_url_score,
      data.current_v20_url,
      data.current_v20_score,
      data.improvement_score,
      data.winner,
      data.cost_usd,
      data.execution_time_ms,
      data.notes || null
    );
  }

  updateBudget(experimentCount, spent, remaining, note) {
    const stmt = this.db.prepare(`
      INSERT INTO budget_tracking (experiment_count, total_spent, remaining, note)
      VALUES (?, ?, ?, ?)
    `);
    return stmt.run(experimentCount, spent, remaining, note);
  }

  getStrategyPerformance(tier = null) {
    let query = `
      SELECT
        strategy_id,
        ranking_id,
        COUNT(*) as experiments,
        SUM(CASE WHEN winner = 'new' THEN 1 ELSE 0 END) as wins,
        AVG(improvement_score) as avg_improvement,
        SUM(cost_usd) as total_cost
      FROM experiments
    `;

    if (tier) {
      query += ` WHERE tier = '${tier}'`;
    }

    query += ` GROUP BY strategy_id, ranking_id ORDER BY avg_improvement DESC`;

    return this.db.prepare(query).all();
  }

  getExperimentCount() {
    const result = this.db.prepare('SELECT COUNT(*) as count FROM experiments').get();
    return result.count;
  }

  getTotalSpent() {
    const result = this.db.prepare('SELECT SUM(cost_usd) as total FROM experiments').get();
    return result.total || 0;
  }
}

// ============================================================================
// EXPERIMENT EXECUTOR
// ============================================================================

class ExperimentExecutor {
  constructor(db, strategies, matrix, domains) {
    this.db = db;
    this.strategies = strategies;
    this.matrix = matrix;
    this.domains = domains;
    this.totalSpent = 0;
    this.experimentCount = 0;
  }

  async executeExperiment(reference, strategyId, rankingId, tier) {
    const startTime = Date.now();

    try {
      // Step 1: Generate query using strategy
      const query = await this.generateQuery(reference, strategyId);

      // Step 2: Search for URLs
      const searchResults = await this.searchUrls(query);

      // Step 3: Rank URLs
      const rankedUrls = await this.rankUrls(searchResults, rankingId, reference);

      // Step 4: Validate top URL
      const topUrl = rankedUrls[0];
      const topUrlScore = await this.scoreUrl(topUrl);

      // Step 5: Score current v20.1 URL
      const currentUrl = reference.primaryUrl;
      const currentScore = currentUrl ? await this.scoreUrl(currentUrl) : 0;

      // Step 6: Compare
      const improvement = topUrlScore - currentScore;
      const winner = improvement >= 20 ? 'new' : 'current';

      // Calculate cost
      const cost = CONFIG.BUDGET.costPerExperiment;
      this.totalSpent += cost;
      this.experimentCount++;

      // Record result
      const experimentData = {
        reference_id: reference.id,
        tier,
        strategy_id: strategyId,
        ranking_id: rankingId,
        query_generated: query,
        urls_found: searchResults.length,
        top_url: topUrl?.url || null,
        top_url_score: topUrlScore,
        current_v20_url: currentUrl,
        current_v20_score: currentScore,
        improvement_score: improvement,
        winner,
        cost_usd: cost,
        execution_time_ms: Date.now() - startTime
      };

      this.db.recordExperiment(experimentData);

      return {
        success: true,
        improvement,
        winner,
        cost
      };

    } catch (error) {
      console.error(`❌ Experiment failed: ${error.message}`);

      const experimentData = {
        reference_id: reference.id,
        tier,
        strategy_id: strategyId,
        ranking_id: rankingId,
        query_generated: null,
        urls_found: 0,
        top_url: null,
        top_url_score: 0,
        current_v20_url: reference.primaryUrl,
        current_v20_score: 0,
        improvement_score: 0,
        winner: 'error',
        cost_usd: 0.05, // Partial cost for failed experiment
        execution_time_ms: Date.now() - startTime,
        notes: error.message
      };

      this.db.recordExperiment(experimentData);

      return {
        success: false,
        error: error.message,
        cost: 0.05
      };
    }
  }

  async generateQuery(reference, strategyId) {
    const strategy = this.strategies.query_strategies.find(s => s.id === strategyId);

    if (!strategy) {
      console.warn(`Strategy ${strategyId} not found, using default`);
      return `${reference.title} ${reference.author}`;
    }

    if (strategy.requires_claude) {
      // Use Claude API for intelligent query generation
      try {
        const response = await fetch(CONFIG.API_ENDPOINTS.queryGen, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{
              role: 'user',
              content: `${strategy.prompt}\n\nReference:\nTitle: ${reference.title}\nAuthor: ${reference.author}\nYear: ${reference.year || ''}\nJournal: ${reference.journal || ''}\nPublisher: ${reference.publisher || ''}`
            }]
          })
        });

        const data = await response.json();
        if (data.error) {
          console.warn(`Claude API error: ${data.error}`);
          return this.fallbackQuery(reference, strategy);
        }

        return data.response || this.fallbackQuery(reference, strategy);
      } catch (error) {
        console.warn(`Query generation failed: ${error.message}`);
        return this.fallbackQuery(reference, strategy);
      }
    } else {
      // Use template-based query generation
      return this.fallbackQuery(reference, strategy);
    }
  }

  fallbackQuery(reference, strategy) {
    // Simple template-based fallback
    const template = strategy.template || '{title} {author}';
    return template
      .replace('{title}', reference.title || '')
      .replace('{author}', reference.author || '')
      .replace('{year}', reference.year || '')
      .replace('{journal}', reference.journal || '')
      .replace('{publisher}', reference.publisher || '')
      .trim();
  }

  async searchUrls(query) {
    try {
      const response = await fetch(CONFIG.API_ENDPOINTS.search, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });

      const data = await response.json();

      if (data.error) {
        console.warn(`Search failed: ${data.error}`);
        return [];
      }

      // Return results in expected format
      return (data.results || []).map(result => ({
        url: result.url,
        title: result.title || '',
        snippet: result.snippet || '',
        displayUrl: result.displayUrl || result.url
      }));
    } catch (error) {
      console.warn(`Search request failed: ${error.message}`);
      return [];
    }
  }

  async rankUrls(urls, rankingId, reference) {
    if (!urls || urls.length === 0) {
      return [];
    }

    const algorithm = this.strategies.ranking_algorithms.find(a => a.id === rankingId);
    if (!algorithm) {
      console.warn(`Ranking algorithm ${rankingId} not found, using default order`);
      return urls;
    }

    try {
      // Prepare candidates for ranking API
      const candidates = urls.map(url => ({
        title: url.title || '',
        url: url.url,
        snippet: url.snippet || '',
        displayUrl: url.displayUrl || url.url
      }));

      // Call ranking endpoint with reference context
      const response = await fetch(CONFIG.API_ENDPOINTS.ranking, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: {
            title: reference.title,
            author: reference.author,
            year: reference.year,
            journal: reference.journal,
            publisher: reference.publisher
          },
          candidates,
          weights: algorithm.weights || {}
        })
      });

      const data = await response.json();

      if (data.error) {
        console.warn(`Ranking failed: ${data.error}`);
        return this.fallbackRanking(urls, algorithm, reference);
      }

      // Return ranked URLs with scores
      return data.rankedCandidates || this.fallbackRanking(urls, algorithm, reference);
    } catch (error) {
      console.warn(`Ranking request failed: ${error.message}`);
      return this.fallbackRanking(urls, algorithm, reference);
    }
  }

  fallbackRanking(urls, algorithm, reference) {
    // Simple fallback ranking based on algorithm weights
    return urls.map(url => {
      const score = this.scoreUrlSimple(url, algorithm.weights || {}, reference);
      return { ...url, score };
    }).sort((a, b) => b.score - a.score);
  }

  scoreUrlSimple(url, weights, reference) {
    let score = 50;

    // Domain authority
    const domain = new URL(url.url).hostname.replace('www.', '');
    const domainInfo = this.domains.domains[domain];
    if (domainInfo) {
      score += (domainInfo.boost || 0) * (weights.domain_authority || 1);
      score -= (domainInfo.penalty || 0) * (weights.domain_authority || 1);
    }

    // Title match
    if (url.title && reference.title) {
      const titleWords = reference.title.toLowerCase().split(/\s+/);
      const urlTitle = url.title.toLowerCase();
      const matches = titleWords.filter(word => word.length > 3 && urlTitle.includes(word)).length;
      score += matches * 5 * (weights.title_match || 1);
    }

    // Accessibility (free vs paywall)
    if (domainInfo && domainInfo.accessibility === 'free') {
      score += 20 * (weights.accessibility || 1);
    }

    return Math.max(0, Math.min(100, score));
  }

  async scoreUrl(url, reference) {
    if (!url || !url.url) return 0;

    let score = 50; // Base score

    try {
      // Extract domain
      const urlObj = new URL(url.url);
      const domain = urlObj.hostname.replace('www.', '');

      // Component 1: Domain Authority (0-30 points)
      const domainInfo = this.domains.domains[domain];
      if (domainInfo) {
        // Accessibility scoring
        if (domainInfo.accessibility === 'free') {
          score += 15;
        } else if (domainInfo.accessibility === 'paywall') {
          score -= 20;
        } else if (domainInfo.accessibility === 'mixed') {
          score += 5;
        }

        // Authority boost/penalty
        if (domainInfo.boost) {
          score += Math.min(15, domainInfo.boost);
        }
        if (domainInfo.penalty) {
          score -= Math.min(15, domainInfo.penalty);
        }

        // Type-specific bonuses
        if (domainInfo.type === 'government') score += 10;
        if (domainInfo.type === 'preprint') score += 8;
        if (domainInfo.type === 'institutional') score += 7;
      } else {
        // Unknown domain - slight penalty
        score -= 5;
      }

      // Component 2: Title Match (0-25 points)
      if (url.title && reference && reference.title) {
        const refTitle = reference.title.toLowerCase();
        const urlTitle = url.title.toLowerCase();
        const refWords = refTitle.split(/\s+/).filter(w => w.length > 3);

        let matches = 0;
        let totalWords = refWords.length;

        refWords.forEach(word => {
          if (urlTitle.includes(word)) matches++;
        });

        const matchRatio = totalWords > 0 ? matches / totalWords : 0;
        score += matchRatio * 25;

        // Bonus for exact title match
        if (urlTitle.includes(refTitle) || refTitle.includes(urlTitle)) {
          score += 10;
        }
      }

      // Component 3: Content Quality Indicators (0-20 points)

      // PDF bonus (likely full-text)
      if (url.url.toLowerCase().endsWith('.pdf')) {
        score += 15;
      }

      // DOI or persistent identifier bonus
      if (url.url.includes('doi.org') || url.url.includes('/doi/')) {
        score += 10;
      }

      // Snippet relevance
      if (url.snippet && reference && reference.author) {
        const snippet = url.snippet.toLowerCase();
        const author = reference.author.toLowerCase();
        if (snippet.includes(author)) {
          score += 5;
        }
      }

      // Component 4: URL Structure Quality (0-10 points)

      // Clean, readable URLs are better
      const pathLength = urlObj.pathname.length;
      if (pathLength < 100) {
        score += 5;
      } else if (pathLength > 200) {
        score -= 5;
      }

      // Penalize tracking parameters
      if (urlObj.search && urlObj.search.includes('utm_')) {
        score -= 3;
      }

      // Academic URL patterns (bonus)
      if (url.url.includes('/abstract') || url.url.includes('/article') || url.url.includes('/paper')) {
        score += 5;
      }

      // Expand domain database if new quality domain found
      if (!domainInfo && score > 70) {
        this.learnNewDomain(domain, url, score);
      }

    } catch (error) {
      // URL parsing failed - return low score
      console.warn(`Error scoring URL ${url.url}: ${error.message}`);
      return 20;
    }

    return Math.max(0, Math.min(100, score));
  }

  learnNewDomain(domain, url, score) {
    // Add new domain to database for future experiments
    if (!this.domains.domains[domain]) {
      this.domains.domains[domain] = {
        accessibility: score > 70 ? 'free' : 'unknown',
        authority: score > 80 ? 'high' : 'medium',
        type: 'academic', // Conservative default
        boost: 0,
        penalty: 0,
        discovered_in_experiment: true
      };

      // Log for later analysis
      console.log(`📚 Discovered new quality domain: ${domain} (score: ${score})`);
    }
  }
}

// ============================================================================
// TIER EXECUTOR
// ============================================================================

class TierExecutor {
  constructor(executor, db, matrix, strategies) {
    this.executor = executor;
    this.db = db;
    this.matrix = matrix;
    this.strategies = strategies;
  }

  async executeTier(tierName, references) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔬 Executing ${tierName.toUpperCase()}`);
    console.log(`${'='.repeat(70)}`);

    const tierConfig = this.matrix.tiers[tierName];

    // Get all ranking algorithm IDs from strategies catalog
    const rankingAlgorithms = this.strategies.ranking_algorithms.map(alg => alg.id);

    let tierExperiments = 0;
    let tierWins = 0;

    for (const reference of references) {
      console.log(`\n  📄 REF [${reference.id}]: ${reference.title.substring(0, 60)}...`);

      for (const strategyId of tierConfig.strategies_to_test) {
        for (const rankingAlg of rankingAlgorithms) {

          const result = await this.executor.executeExperiment(
            reference,
            strategyId,
            rankingAlg,
            tierName
          );

          tierExperiments++;

          if (result.winner === 'new') {
            tierWins++;
            console.log(`    ✅ ${strategyId} + ${rankingAlg}: +${result.improvement.toFixed(1)} (WIN)`);
          } else {
            console.log(`    ⚪ ${strategyId} + ${rankingAlg}: ${result.improvement >= 0 ? '+' : ''}${result.improvement.toFixed(1)}`);
          }

          // Checkpoint every 100 experiments
          if (this.executor.experimentCount % 100 === 0) {
            await this.checkpoint();
          }

          // Check budget
          if (this.executor.totalSpent > CONFIG.BUDGET.available) {
            console.log('\n🚨 BUDGET EXHAUSTED - STOPPING');
            return;
          }
        }
      }
    }

    console.log(`\n📊 ${tierName} Summary:`);
    console.log(`   Experiments: ${tierExperiments}`);
    console.log(`   Wins: ${tierWins} (${(tierWins / tierExperiments * 100).toFixed(1)}%)`);
    console.log(`   Spent: $${this.executor.totalSpent.toFixed(2)}`);
  }

  async checkpoint() {
    console.log(`\n💾 CHECKPOINT @ ${this.executor.experimentCount} experiments`);
    console.log(`   Total Spent: $${this.executor.totalSpent.toFixed(2)}`);
    console.log(`   Remaining: $${(CONFIG.BUDGET.available - this.executor.totalSpent).toFixed(2)}`);

    // Update budget tracking
    this.db.updateBudget(
      this.executor.experimentCount,
      this.executor.totalSpent,
      CONFIG.BUDGET.available - this.executor.totalSpent,
      `Checkpoint at ${this.executor.experimentCount} experiments`
    );

    // Show top strategies
    const topStrategies = this.db.getStrategyPerformance();
    console.log('\n   Top 3 Strategies:');
    topStrategies.slice(0, 3).forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.strategy_id}: ${s.wins}/${s.experiments} wins (${(s.avg_improvement || 0).toFixed(1)} avg)`);
    });
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🔬 Query Evolution Project - Experiment Runner');
  console.log('='.repeat(70));
  console.log(`Budget: $${CONFIG.BUDGET.available} (target: $${CONFIG.BUDGET.target})`);
  console.log(`Estimated experiments: 2,700-3,300`);
  console.log('='.repeat(70));

  // Load configuration files
  console.log('\n📂 Loading configuration...');

  const strategiesYaml = await fs.readFile(CONFIG.INPUTS.strategies, 'utf-8');
  const strategies = yaml.load(strategiesYaml);

  const matrixYaml = await fs.readFile(CONFIG.INPUTS.matrix, 'utf-8');
  const matrix = yaml.load(matrixYaml);

  const domainsJson = await fs.readFile(CONFIG.INPUTS.domains, 'utf-8');
  const domains = JSON.parse(domainsJson);

  console.log('✅ Configuration loaded');

  // Initialize database
  console.log('\n💾 Initializing database...');
  await fs.mkdir(CONFIG.OUTPUTS.results, { recursive: true });
  await fs.mkdir(CONFIG.OUTPUTS.checkpoints, { recursive: true });
  const db = new ExperimentDatabase(CONFIG.OUTPUTS.database);

  // Load reference data
  console.log('\n📚 Loading references...');
  const manualReviewJson = await fs.readFile(CONFIG.INPUTS.manualReview, 'utf-8');
  const manualReviewRefs = JSON.parse(manualReviewJson);

  const allSetsJson = await fs.readFile(CONFIG.INPUTS.allSets, 'utf-8');
  const allSets = JSON.parse(allSetsJson);

  console.log(`✅ Loaded ${manualReviewRefs.length} MANUAL_REVIEW references`);
  console.log(`✅ Loaded ${allSets.edgeCases.length} edge case references`);

  // Initialize executors
  const executor = new ExperimentExecutor(db, strategies, matrix, domains);
  const tierExecutor = new TierExecutor(executor, db, matrix, strategies);

  // Execute tiers
  console.log('\n🚀 Starting experiments...\n');

  // Tier 1: MANUAL_REVIEW
  await tierExecutor.executeTier('tier_1_manual_review', manualReviewRefs);

  // Tier 2: Edge Cases (sample 40 of 61)
  const edgeCasesSample = allSets.edgeCases.slice(0, 40);
  await tierExecutor.executeTier('tier_2_edge_cases', edgeCasesSample);

  // Tier 3: Validation (if budget allows)
  if (executor.totalSpent < CONFIG.BUDGET.available - 100) {
    // Load baseline to get all references
    const baselineJson = await fs.readFile(CONFIG.INPUTS.baseline, 'utf-8');
    const baseline = JSON.parse(baselineJson);

    // Get IDs already used in Tier 1 and Tier 2
    const usedIds = new Set([
      ...manualReviewRefs.map(r => r.id),
      ...edgeCasesSample.map(r => r.id)
    ]);

    // Get all other references with URLs (good baseline references)
    const availableRefs = baseline.references.filter(ref =>
      !usedIds.has(ref.id) && ref.primaryUrl
    );

    // Random sample 30 references
    const sampleSize = Math.min(30, availableRefs.length);
    const validationSample = [];
    const indices = new Set();

    while (validationSample.length < sampleSize) {
      const randomIndex = Math.floor(Math.random() * availableRefs.length);
      if (!indices.has(randomIndex)) {
        indices.add(randomIndex);
        validationSample.push(availableRefs[randomIndex]);
      }
    }

    console.log(`\n✅ Sampled ${validationSample.length} references for Tier 3 validation`);
    await tierExecutor.executeTier('tier_3_validation', validationSample);
  } else {
    console.log('\n⏭️  Tier 3 (Validation) - Skipped (budget limit reached)');
  }

  // Final summary
  console.log('\n' + '='.repeat(70));
  console.log('✅ EXPERIMENT RUN COMPLETE');
  console.log('='.repeat(70));
  console.log(`Total Experiments: ${executor.experimentCount}`);
  console.log(`Total Spent: $${executor.totalSpent.toFixed(2)}`);
  console.log(`Database: ${CONFIG.OUTPUTS.database}`);
  console.log('\n📊 Run analysis-framework.js to generate reports');
}

// Run main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { ExperimentExecutor, ExperimentDatabase, TierExecutor };
