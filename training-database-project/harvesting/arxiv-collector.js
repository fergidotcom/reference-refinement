#!/usr/bin/env node

/**
 * arXiv Paper Collector
 *
 * Automatically downloads 20 academic papers from arXiv.org
 * Focuses on review articles with rich bibliographies (30+ references)
 *
 * Target: 4 papers per discipline × 5 disciplines = 20 papers
 * Disciplines: physics, cs, math, q-bio (biology), econ (economics)
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');

const OUTPUT_DIR = path.join(__dirname, '../inputs/source-documents');

// arXiv API configuration
const ARXIV_API_BASE = 'http://export.arxiv.org/api/query';
const PAPERS_PER_DISCIPLINE = 4;

const DISCIPLINES = [
  { name: 'physics', category: 'physics:hep-th', label: 'High Energy Physics' },
  { name: 'cs', category: 'cs.AI', label: 'Computer Science - AI' },
  { name: 'math', category: 'math.AG', label: 'Algebraic Geometry' },
  { name: 'q-bio', category: 'q-bio.QM', label: 'Quantitative Biology' },
  { name: 'econ', category: 'econ.GN', label: 'Economics - General' }
];

/**
 * Fetch papers from arXiv API
 */
async function fetchArxivPapers(category, maxResults = 10) {
  return new Promise((resolve, reject) => {
    // Search for review papers (often have "review" or "survey" in title)
    const query = `cat:${category}+AND+(ti:review+OR+ti:survey)`;
    const url = `${ARXIV_API_BASE}?search_query=${encodeURIComponent(query)}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`;

    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Parse arXiv API XML response
 */
async function parseArxivResponse(xml) {
  const parsed = await parseStringPromise(xml);
  const entries = parsed.feed.entry || [];

  return entries.map(entry => ({
    id: entry.id[0].split('/').pop(),
    title: entry.title[0].replace(/\s+/g, ' ').trim(),
    authors: (entry.author || []).map(a => a.name[0]),
    published: entry.published[0],
    summary: entry.summary[0].replace(/\s+/g, ' ').trim(),
    pdfUrl: entry.link.find(l => l.$.title === 'pdf')?.$.href || null
  }));
}

/**
 * Download PDF from URL
 */
async function downloadPDF(url, outputPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(outputPath);

    protocol.get(url, (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadPDF(response.headers.location, outputPath)
          .then(resolve)
          .catch(reject);
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(outputPath, () => {});
      reject(err);
    });
  });
}

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main collection function
 */
async function collectArxivPapers() {
  console.log('📚 arXiv Paper Collector');
  console.log('========================\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let totalDownloaded = 0;
  const collectionLog = [];

  for (const discipline of DISCIPLINES) {
    console.log(`📖 Collecting ${discipline.label} (${discipline.name})...`);

    try {
      // Fetch papers
      const xml = await fetchArxivPapers(discipline.category, PAPERS_PER_DISCIPLINE * 2);
      const papers = await parseArxivResponse(xml);

      console.log(`   Found ${papers.length} papers`);

      // Download first N papers
      let downloaded = 0;
      for (const paper of papers) {
        if (downloaded >= PAPERS_PER_DISCIPLINE) break;
        if (!paper.pdfUrl) continue;

        const filename = `arxiv_${discipline.name}_${paper.id}.pdf`;
        const filepath = path.join(OUTPUT_DIR, filename);

        // Skip if already exists
        if (fs.existsSync(filepath)) {
          console.log(`   ✓ Already exists: ${filename}`);
          downloaded++;
          continue;
        }

        try {
          console.log(`   ⬇️  Downloading: ${paper.id} - ${paper.title.substring(0, 60)}...`);
          await downloadPDF(paper.pdfUrl, filepath);

          // Verify file was downloaded
          const stats = fs.statSync(filepath);
          if (stats.size > 1000) { // At least 1KB
            console.log(`   ✓ Downloaded: ${filename} (${Math.round(stats.size / 1024)} KB)`);
            downloaded++;
            totalDownloaded++;

            collectionLog.push({
              discipline: discipline.name,
              arxiv_id: paper.id,
              filename: filename,
              title: paper.title,
              authors: paper.authors.slice(0, 3).join(', ') + (paper.authors.length > 3 ? ' et al.' : ''),
              published: paper.published,
              size_kb: Math.round(stats.size / 1024)
            });

            // Rate limiting - be nice to arXiv
            await sleep(3000); // 3 seconds between downloads
          } else {
            console.log(`   ⚠️  Download failed (file too small): ${filename}`);
            fs.unlinkSync(filepath);
          }
        } catch (err) {
          console.log(`   ❌ Download failed: ${err.message}`);
        }
      }

      console.log(`   ✓ Collected ${downloaded} papers from ${discipline.label}\n`);

      // Rate limiting between disciplines
      await sleep(2000);

    } catch (err) {
      console.error(`   ❌ Failed to fetch papers: ${err.message}\n`);
    }
  }

  // Save collection log
  const logPath = path.join(__dirname, '../inputs/arxiv-collection-log.json');
  fs.writeFileSync(logPath, JSON.stringify({
    collected_at: new Date().toISOString(),
    total_papers: totalDownloaded,
    papers: collectionLog
  }, null, 2));

  console.log('=====================================');
  console.log('📊 arXiv Collection Summary');
  console.log('=====================================');
  console.log(`Total papers downloaded: ${totalDownloaded}`);
  console.log(`Target: ${DISCIPLINES.length * PAPERS_PER_DISCIPLINE}`);
  console.log(`Collection log: ${logPath}`);
  console.log('=====================================\n');

  return totalDownloaded;
}

// Run if called directly
if (require.main === module) {
  collectArxivPapers()
    .then(count => {
      console.log(`✅ arXiv collection complete! Downloaded ${count} papers.`);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Collection failed:', err);
      process.exit(1);
    });
}

module.exports = { collectArxivPapers };
