#!/usr/bin/env node

/**
 * Government Reports Collector
 *
 * Downloads government and international organization reports
 * with rich bibliographies and data citations
 *
 * Target: 45 reports total
 * - 25 Federal agencies (BLS, Census, FEC, NIH, EPA, CRS, GAO)
 * - 20 International organizations (WHO, World Bank, OECD, UN)
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, '../inputs/source-documents');

/**
 * Curated list of government reports with rich bibliographies
 * These are real, publicly accessible reports known to have extensive references
 */
const CURATED_REPORTS = [
  // Bureau of Labor Statistics
  {
    agency: 'BLS',
    url: 'https://www.bls.gov/opub/mlr/2023/article/pdf/the-employment-situation-during-the-covid-19-pandemic.pdf',
    filename: 'BLS_2023_employment_covid19.pdf',
    title: 'Employment Situation During COVID-19'
  },
  {
    agency: 'BLS',
    url: 'https://www.bls.gov/opub/mlr/2022/article/pdf/labor-force-participation-trends-and-economic-dependency-ratios.pdf',
    filename: 'BLS_2022_labor_force_trends.pdf',
    title: 'Labor Force Participation Trends'
  },

  // Census Bureau
  {
    agency: 'Census',
    url: 'https://www.census.gov/content/dam/Census/library/publications/2023/demo/p60-280.pdf',
    filename: 'Census_2023_income_poverty.pdf',
    title: 'Income and Poverty in the United States: 2023'
  },
  {
    agency: 'Census',
    url: 'https://www.census.gov/content/dam/Census/library/publications/2022/demo/p25-1147.pdf',
    filename: 'Census_2022_population_projections.pdf',
    title: 'Population Projections 2022'
  },

  // World Bank
  {
    agency: 'WorldBank',
    url: 'https://openknowledge.worldbank.org/server/api/core/bitstreams/c0318b78-5f67-58d7-863d-28c0e6b27c4e/content',
    filename: 'WorldBank_2023_world_development_report.pdf',
    title: 'World Development Report 2023'
  },
  {
    agency: 'WorldBank',
    url: 'https://openknowledge.worldbank.org/server/api/core/bitstreams/30cc28c5-9c2f-5f1c-b53e-8d7e5f93c7da/content',
    filename: 'WorldBank_2023_poverty_prosperity.pdf',
    title: 'Poverty and Shared Prosperity 2023'
  },

  // WHO (World Health Organization)
  {
    agency: 'WHO',
    url: 'https://iris.who.int/bitstream/handle/10665/363534/9789240059511-eng.pdf',
    filename: 'WHO_2023_global_health_estimates.pdf',
    title: 'Global Health Estimates 2023'
  },
  {
    agency: 'WHO',
    url: 'https://iris.who.int/bitstream/handle/10665/365296/9789240074323-eng.pdf',
    filename: 'WHO_2023_world_health_statistics.pdf',
    title: 'World Health Statistics 2023'
  },

  // OECD
  {
    agency: 'OECD',
    url: 'https://www.oecd-ilibrary.org/deliver/5080a39b-en.pdf?itemId=/content/publication/5080a39b-en&mimeType=pdf',
    filename: 'OECD_2023_economic_outlook.pdf',
    title: 'OECD Economic Outlook 2023'
  },

  // UN (United Nations)
  {
    agency: 'UN',
    url: 'https://documents.un.org/doc/undoc/gen/n23/215/51/pdf/n2321551.pdf',
    filename: 'UN_2023_sustainable_development_goals.pdf',
    title: 'Sustainable Development Goals Report 2023'
  }
];

/**
 * Additional reports from APIs or known repositories
 */
const REPORT_SOURCES = [
  // GAO (Government Accountability Office) - reports available via direct URLs
  {
    agency: 'GAO',
    baseUrl: 'https://www.gao.gov/assets',
    reports: [
      { id: 'd24106274', filename: 'GAO_2024_covid_response.pdf', year: 2024 },
      { id: 'd23106598', filename: 'GAO_2023_federal_spending.pdf', year: 2023 },
      { id: 'd22106842', filename: 'GAO_2022_fraud_risk.pdf', year: 2022 },
      { id: 'd21106431', filename: 'GAO_2021_healthcare_access.pdf', year: 2021 },
      { id: 'd20105972', filename: 'GAO_2020_climate_change.pdf', year: 2020 }
    ]
  },

  // Congressional Research Service
  {
    agency: 'CRS',
    baseUrl: 'https://crsreports.congress.gov',
    reports: [
      { path: '/product/pdf/R/R47807', filename: 'CRS_2024_federal_budget.pdf' },
      { path: '/product/pdf/R/R47621', filename: 'CRS_2024_economic_policy.pdf' },
      { path: '/product/pdf/R/R47456', filename: 'CRS_2023_healthcare_policy.pdf' },
      { path: '/product/pdf/R/R47289', filename: 'CRS_2023_immigration_policy.pdf' },
      { path: '/product/pdf/R/R47134', filename: 'CRS_2023_climate_policy.pdf' }
    ]
  },

  // NIH (National Institutes of Health)
  {
    agency: 'NIH',
    baseUrl: 'https://report.nih.gov',
    reports: [
      { path: '/2023/pdf/NIH-BiologicalMechanisms.pdf', filename: 'NIH_2023_biological_mechanisms.pdf' },
      { path: '/2022/pdf/NIH-PrecisionMedicine.pdf', filename: 'NIH_2022_precision_medicine.pdf' }
    ]
  },

  // EPA (Environmental Protection Agency)
  {
    agency: 'EPA',
    baseUrl: 'https://www.epa.gov',
    reports: [
      { path: '/sites/default/files/2023-08/documents/us-ghg-inventory-2023.pdf', filename: 'EPA_2023_ghg_inventory.pdf' },
      { path: '/sites/default/files/2022-07/documents/us-climate-change-indicators-2022.pdf', filename: 'EPA_2022_climate_indicators.pdf' }
    ]
  }
];

/**
 * Download file from URL
 */
async function downloadFile(url, outputPath, retries = 3) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    const attemptDownload = (attemptsLeft) => {
      protocol.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl.startsWith('http')) {
            return downloadFile(redirectUrl, outputPath, attemptsLeft)
              .then(resolve)
              .catch(reject);
          }
        }

        // Handle errors
        if (response.statusCode !== 200) {
          if (attemptsLeft > 0) {
            console.log(`   ⚠️  Status ${response.statusCode}, retrying... (${attemptsLeft} attempts left)`);
            setTimeout(() => attemptDownload(attemptsLeft - 1), 2000);
            return;
          }
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
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
        if (attemptsLeft > 0) {
          console.log(`   ⚠️  Network error, retrying... (${attemptsLeft} attempts left)`);
          setTimeout(() => attemptDownload(attemptsLeft - 1), 2000);
        } else {
          reject(err);
        }
      });
    };

    attemptDownload(retries);
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
async function collectGovernmentReports() {
  console.log('🏛️  Government Reports Collector');
  console.log('================================\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let totalDownloaded = 0;
  const collectionLog = [];

  // Download curated reports
  console.log('📖 Downloading curated reports...\n');
  for (const report of CURATED_REPORTS) {
    const filepath = path.join(OUTPUT_DIR, report.filename);

    // Skip if already exists
    if (fs.existsSync(filepath)) {
      console.log(`   ✓ Already exists: ${report.filename}`);
      totalDownloaded++;
      continue;
    }

    try {
      console.log(`   ⬇️  [${report.agency}] ${report.title}...`);
      await downloadFile(report.url, filepath);

      const stats = fs.statSync(filepath);
      if (stats.size > 5000) { // At least 5KB
        console.log(`   ✓ Downloaded: ${report.filename} (${Math.round(stats.size / 1024)} KB)`);
        totalDownloaded++;

        collectionLog.push({
          agency: report.agency,
          filename: report.filename,
          title: report.title,
          url: report.url,
          size_kb: Math.round(stats.size / 1024)
        });
      } else {
        fs.unlinkSync(filepath);
        console.log(`   ⚠️  Download failed (file too small)`);
      }

      // Rate limiting
      await sleep(2000);

    } catch (err) {
      console.log(`   ❌ Download failed: ${err.message}`);
    }
  }

  console.log();

  // Download reports from known repositories
  console.log('📖 Downloading from agency repositories...\n');
  for (const source of REPORT_SOURCES) {
    console.log(`📁 ${source.agency}...`);

    if (source.reports) {
      for (const report of source.reports) {
        const filepath = path.join(OUTPUT_DIR, report.filename);

        // Skip if already exists
        if (fs.existsSync(filepath)) {
          console.log(`   ✓ Already exists: ${report.filename}`);
          totalDownloaded++;
          continue;
        }

        try {
          let url;
          if (report.id) {
            // GAO-style
            url = `${source.baseUrl}/${report.id}.pdf`;
          } else if (report.path) {
            // CRS/NIH/EPA-style
            url = source.baseUrl + report.path;
          }

          console.log(`   ⬇️  ${report.filename}...`);
          await downloadFile(url, filepath);

          const stats = fs.statSync(filepath);
          if (stats.size > 5000) {
            console.log(`   ✓ Downloaded: ${report.filename} (${Math.round(stats.size / 1024)} KB)`);
            totalDownloaded++;

            collectionLog.push({
              agency: source.agency,
              filename: report.filename,
              url: url,
              size_kb: Math.round(stats.size / 1024)
            });
          } else {
            fs.unlinkSync(filepath);
            console.log(`   ⚠️  Download failed (file too small)`);
          }

          // Rate limiting
          await sleep(2000);

        } catch (err) {
          console.log(`   ❌ Download failed: ${err.message}`);
        }
      }
    }

    console.log();
  }

  // Save collection log
  const logPath = path.join(__dirname, '../inputs/government-collection-log.json');
  fs.writeFileSync(logPath, JSON.stringify({
    collected_at: new Date().toISOString(),
    total_reports: totalDownloaded,
    reports: collectionLog
  }, null, 2));

  console.log('=====================================');
  console.log('📊 Government Reports Summary');
  console.log('=====================================');
  console.log(`Total reports downloaded: ${totalDownloaded}`);
  console.log(`Target: 45`);
  console.log(`Collection log: ${logPath}`);
  console.log('=====================================\n');

  return totalDownloaded;
}

// Run if called directly
if (require.main === module) {
  collectGovernmentReports()
    .then(count => {
      console.log(`✅ Government reports collection complete! Downloaded ${count} reports.`);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Collection failed:', err);
      process.exit(1);
    });
}

module.exports = { collectGovernmentReports };
