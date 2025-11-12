#!/usr/bin/env node

/**
 * PubMed Central Paper Collector
 *
 * Automatically downloads 15 open-access medical/health papers from PubMed Central
 * Focuses on systematic reviews and meta-analyses with rich bibliographies
 *
 * Target: 5 papers per discipline × 3 disciplines = 15 papers
 * Disciplines: medicine, public health, psychology
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');

const OUTPUT_DIR = path.join(__dirname, '../inputs/source-documents');

// PubMed E-utilities API configuration
const PUBMED_API_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const PAPERS_PER_DISCIPLINE = 5;

const DISCIPLINES = [
  { name: 'medicine', query: '("systematic review"[Title]) AND medicine[MeSH]', label: 'Medicine' },
  { name: 'public_health', query: '("systematic review"[Title]) AND "public health"[MeSH]', label: 'Public Health' },
  { name: 'psychology', query: '("meta-analysis"[Title]) AND psychology[MeSH]', label: 'Psychology' }
];

/**
 * Search PubMed for papers
 */
async function searchPubMed(query, maxResults = 10) {
  return new Promise((resolve, reject) => {
    const searchUrl = `${PUBMED_API_BASE}/esearch.fcgi?db=pmc&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json&sort=relevance`;

    https.get(searchUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.esearchresult.idlist || []);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Fetch paper details from PubMed
 */
async function fetchPaperDetails(pmcIds) {
  if (pmcIds.length === 0) return [];

  return new Promise((resolve, reject) => {
    const summaryUrl = `${PUBMED_API_BASE}/esummary.fcgi?db=pmc&id=${pmcIds.join(',')}&retmode=json`;

    https.get(summaryUrl, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          const papers = [];

          for (const id of pmcIds) {
            const paper = parsed.result[id];
            if (paper && paper.title) {
              papers.push({
                pmcid: id,
                title: paper.title,
                authors: paper.authors || [],
                pubdate: paper.pubdate || 'Unknown',
                fulljournalname: paper.fulljournalname || 'Unknown Journal'
              });
            }
          }

          resolve(papers);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

/**
 * Download PDF from PubMed Central
 * Note: PMC provides PDFs at: https://www.ncbi.nlm.nih.gov/pmc/articles/PMCID/pdf/
 */
async function downloadPMCPaper(pmcid, outputPath) {
  return new Promise((resolve, reject) => {
    const pdfUrl = `https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${pmcid}/pdf/`;

    https.get(pdfUrl, (response) => {
      // Check if PDF is available
      if (response.statusCode === 404) {
        reject(new Error('PDF not available'));
        return;
      }

      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        return downloadPMCPaper(pmcid, outputPath).then(resolve).catch(reject);
      }

      const file = fs.createWriteStream(outputPath);
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Download paper as XML (fallback if PDF unavailable)
 */
async function downloadPMCXML(pmcid, outputPath) {
  return new Promise((resolve, reject) => {
    const xmlUrl = `${PUBMED_API_BASE}/efetch.fcgi?db=pmc&id=${pmcid}&retmode=xml`;

    https.get(xmlUrl, (response) => {
      const file = fs.createWriteStream(outputPath);
      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(outputPath, () => {});
        reject(err);
      });
    }).on('error', reject);
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
async function collectPubMedPapers() {
  console.log('🏥 PubMed Central Paper Collector');
  console.log('=================================\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let totalDownloaded = 0;
  const collectionLog = [];

  for (const discipline of DISCIPLINES) {
    console.log(`📖 Collecting ${discipline.label}...`);

    try {
      // Search for papers
      const pmcIds = await searchPubMed(discipline.query, PAPERS_PER_DISCIPLINE * 3);
      console.log(`   Found ${pmcIds.length} papers`);

      if (pmcIds.length === 0) {
        console.log(`   ⚠️  No papers found\n`);
        continue;
      }

      // Fetch paper details
      const papers = await fetchPaperDetails(pmcIds);
      console.log(`   Retrieved details for ${papers.length} papers`);

      // Download papers
      let downloaded = 0;
      for (const paper of papers) {
        if (downloaded >= PAPERS_PER_DISCIPLINE) break;

        const filenamePDF = `pubmed_${discipline.name}_PMC${paper.pmcid}.pdf`;
        const filenameXML = `pubmed_${discipline.name}_PMC${paper.pmcid}.xml`;
        const filepathPDF = path.join(OUTPUT_DIR, filenamePDF);
        const filepathXML = path.join(OUTPUT_DIR, filenameXML);

        // Skip if already exists
        if (fs.existsSync(filepathPDF) || fs.existsSync(filepathXML)) {
          console.log(`   ✓ Already exists: PMC${paper.pmcid}`);
          downloaded++;
          continue;
        }

        try {
          console.log(`   ⬇️  Downloading: PMC${paper.pmcid} - ${paper.title.substring(0, 60)}...`);

          // Try PDF first
          try {
            await downloadPMCPaper(paper.pmcid, filepathPDF);
            const stats = fs.statSync(filepathPDF);

            if (stats.size > 1000) {
              console.log(`   ✓ Downloaded PDF: ${filenamePDF} (${Math.round(stats.size / 1024)} KB)`);
              downloaded++;
              totalDownloaded++;

              collectionLog.push({
                discipline: discipline.name,
                pmcid: paper.pmcid,
                filename: filenamePDF,
                format: 'pdf',
                title: paper.title,
                journal: paper.fulljournalname,
                pubdate: paper.pubdate,
                size_kb: Math.round(stats.size / 1024)
              });
            } else {
              fs.unlinkSync(filepathPDF);
              throw new Error('File too small');
            }
          } catch (pdfErr) {
            // Fallback to XML
            console.log(`   ⚠️  PDF unavailable, downloading XML...`);
            await downloadPMCXML(paper.pmcid, filepathXML);
            const stats = fs.statSync(filepathXML);

            if (stats.size > 1000) {
              console.log(`   ✓ Downloaded XML: ${filenameXML} (${Math.round(stats.size / 1024)} KB)`);
              downloaded++;
              totalDownloaded++;

              collectionLog.push({
                discipline: discipline.name,
                pmcid: paper.pmcid,
                filename: filenameXML,
                format: 'xml',
                title: paper.title,
                journal: paper.fulljournalname,
                pubdate: paper.pubdate,
                size_kb: Math.round(stats.size / 1024)
              });
            } else {
              fs.unlinkSync(filepathXML);
              console.log(`   ❌ Download failed (file too small)`);
            }
          }

          // Rate limiting - be nice to NCBI
          await sleep(2000); // 2 seconds between downloads

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
  const logPath = path.join(__dirname, '../inputs/pubmed-collection-log.json');
  fs.writeFileSync(logPath, JSON.stringify({
    collected_at: new Date().toISOString(),
    total_papers: totalDownloaded,
    papers: collectionLog
  }, null, 2));

  console.log('=====================================');
  console.log('📊 PubMed Collection Summary');
  console.log('=====================================');
  console.log(`Total papers downloaded: ${totalDownloaded}`);
  console.log(`Target: ${DISCIPLINES.length * PAPERS_PER_DISCIPLINE}`);
  console.log(`Collection log: ${logPath}`);
  console.log('=====================================\n');

  return totalDownloaded;
}

// Run if called directly
if (require.main === module) {
  collectPubMedPapers()
    .then(count => {
      console.log(`✅ PubMed collection complete! Downloaded ${count} papers.`);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Collection failed:', err);
      process.exit(1);
    });
}

module.exports = { collectPubMedPapers };
