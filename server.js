/**
 * Reference Refinement - Express.js Server for Linode VPS
 * Replaces Netlify Functions for migration to Linode
 * Port: 3002 (as per Linode deployment pattern)
 *
 * Converted from 7 Netlify Functions:
 * - health.ts
 * - llm-chat.ts
 * - llm-rank.ts
 * - search-google.ts
 * - dropbox-oauth.ts
 * - resolve-urls.ts
 * - proxy-fetch.ts
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname), {
  extensions: ['html']
}));

// Environment variables
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;
const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY || 'q4ldgkwjmhxv6w2';
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;

console.log('[SERVER] Starting Reference Refinement server on port', PORT);
console.log('[SERVER] Environment variables loaded:', {
  ANTHROPIC_API_KEY: ANTHROPIC_API_KEY ? '✓' : '✗',
  GOOGLE_API_KEY: GOOGLE_API_KEY ? '✓' : '✗',
  GOOGLE_CX: GOOGLE_CX ? '✓' : '✗',
  DROPBOX_APP_KEY: DROPBOX_APP_KEY ? '✓' : '✗',
  DROPBOX_APP_SECRET: DROPBOX_APP_SECRET ? '✓' : '✗'
});

// ===== HEALTH CHECK =====
// Converted from: netlify/functions/health.ts
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    version: 'v18.6.3/v22.0-linode',
    ranking_algorithm: 'v22.0',
    timestamp: new Date().toISOString(),
    service: 'reference-refinement'
  });
});

// ===== ANTHROPIC CLAUDE API - CHAT/QUERY GENERATION =====
// Converted from: netlify/functions/llm-chat.ts
app.post('/api/llm/chat', async (req, res) => {
  try {
    const { prompt, model } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    if (!ANTHROPIC_API_KEY) {
      return res.json({
        result: '',
        error: 'ANTHROPIC_API_KEY not configured in environment variables'
      });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LLM-CHAT] Anthropic API error:', errorText);
      return res.json({
        result: '',
        error: `Anthropic API error: ${response.status}`
      });
    }

    const data = await response.json();
    const result = data.content?.[0]?.text || '';

    res.json({
      result,
      model: data.model,
      tokens_used: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      input_tokens: data.usage?.input_tokens || 0,
      output_tokens: data.usage?.output_tokens || 0
    });

  } catch (error) {
    console.error('[LLM-CHAT] Error:', error);
    res.json({
      result: '',
      error: error.message || 'Chat failed'
    });
  }
});

// ===== ANTHROPIC CLAUDE API - URL RANKING =====
// Converted from: netlify/functions/llm-rank.ts
app.post('/api/llm/rank', async (req, res) => {
  try {
    const { citation, relevance, results, model } = req.body;

    if (!citation || !relevance || !results) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (!ANTHROPIC_API_KEY) {
      return res.json({
        rankedResults: [],
        error: 'ANTHROPIC_API_KEY not configured'
      });
    }

    // Build ranking prompt - v22.0 Enhanced Algorithm
    // Enhancements: Subscription database penalties, direct download detection,
    // Archive.org boost, CV penalties, OSF.io/ResearchGate recognition
    const systemPrompt = `You rank URLs. Reply with ONLY the scores table, nothing else.`;

    const prompt = `Rank these URLs for: "${citation}"
${relevance ? `\nRelevance: ${relevance.substring(0, 200)}...` : ''}

Score each URL independently using content-type detection:

⚠️ CRITICAL MATCHING RULES - VERIFY BEFORE SCORING:
1. ALWAYS check title AND author match TOGETHER before giving high scores
2. Partial title match + WRONG AUTHOR → MAX SCORE 30 (this is a different work)
3. NO title keywords in URL/title/snippet → MAX PRIMARY SCORE 40 (probably irrelevant)
4. Author name absent from URL/title/snippet → Investigate carefully, likely wrong work

Example validation sequence:
- Step 1: Does the URL/title/snippet contain key words from the reference title? If NO → max 40
- Step 2: Does the URL/title/snippet mention the correct author? If NO → max 30
- Step 3: Only if BOTH match → proceed with full scoring

PRIMARY SCORE (0-100) - Detect if this is THE WORK ITSELF or ABOUT the work:

⚠️ CRITICAL MUTUAL EXCLUSIVITY RULES:
• Full-text sources and publisher pages → HIGH PRIMARY scores (60-100)
• Reviews, analyses, thematic discussions → LOW PRIMARY scores (0-55), HIGH SECONDARY scores
• A URL should be EITHER a primary candidate OR a secondary candidate, not both

🎯 v22.0 DIRECT DOWNLOAD DETECTION (HIGHEST PRIORITY - 95-100):
✓ URL contains "action=download", "?download", "/download/", "/providers/osfstorage/"
✓ Direct PDF delivery from OSF.io, ResearchGate, institutional repositories
✓ URLs ending in .pdf with download parameters
✓ Example: osf.io/providers/osfstorage/...?action=download → SCORE 95-100
✓ Example: researchgate.net/.../download → SCORE 95-100
⚠️ These are PERFECT sources - full text immediately accessible

SUBSCRIPTION DATABASE DETECTION (v22.0 - MAX 75):
⚠️ CRITICAL: PsycNET, JSTOR, academic subscription databases → MAX SCORE 75
⚠️ Domains: psycnet.apa.org, jstor.org, proquest.com, ebscohost.com
⚠️ URL patterns: psycnet.apa.org/record/, jstor.org/stable/
⚠️ These require paid subscriptions, not freely accessible
⚠️ Even with perfect title/author match: MAX SCORE 75
⚠️ PRIMARY: 70-75, SECONDARY: 0-30 (listings, not reviews)

AUTHOR CV/RESUME DETECTION (v22.0 - MAX 60 PRIMARY):
⚠️ CRITICAL: URLs containing /cv/, -cv.pdf, /resume/, /vita/ → MAX PRIMARY 60
⚠️ Example: university.edu/faculty/smith-cv.pdf → MAX PRIMARY 60
⚠️ CVs are good for author verification but NOT the work itself
⚠️ Can be good SECONDARY candidates (score 60-75 for citation lists)

ARCHIVE.ORG ENHANCED SCORING (v22.0):
✓ archive.org with "borrow", "preview", or direct PDF → SCORE 90-95
✓ Preferred when publisher versions are paywalled
✓ Often has full text or substantial preview access
✓ Example: archive.org/details/bookname → SCORE 90-95
✓ Note: If archive.org AND publisher paywall both present, prefer archive.org

FULL-TEXT SOURCE INDICATORS (95-100):
✓ Title/URL matches reference title (no "review" language)
✓ Snippet mentions "full text", "complete", "entire work", "read online"
✓ PDF/HTML from academic repository (.edu/.gov/archive.org/researchgate)
✓ No reviewer or different author mentioned in snippet
✓ English language domain (.com, .edu, .org, .gov, .uk)

FULL-TEXT (uncertain) (85-95):
• Free PDF/HTML from non-academic domains
• Snippet unclear about completeness

QUOTATIONS/EXCERPTS/ANTHOLOGIES (max 65):
⚠️ CRITICAL: If title or URL contains "quotations", "excerpts", "anthology", "selections", "reader" → MAX SCORE 65
⚠️ These are PARTIAL collections, not complete works
⚠️ Even from .edu or as PDF, partial content scores lower than full text

PAYWALLED/PREVIEW (70-85):
• Publisher site with preview access
• Paywalled full text access (NOT subscription databases - see above)

EPUB DOWNLOADS (max 40):
⚠️ CRITICAL: URLs ending in .epub or containing /epub/ → MAX SCORE 40
⚠️ EPUB files are ebook downloads that require special readers
⚠️ Not accessible directly in browser like PDF/HTML
⚠️ Prefer PDF or HTML versions for better accessibility

PUBLISHER PAGE (60-75):
• Official purchase page (no full text)
• URL contains "product", "buy", "isbn"

REVIEW/ABOUT THE WORK (max 55):
⚠️ CRITICAL: If title contains "review of", "book review", "reviewed by" → MAX SCORE 55
⚠️ If snippet mentions "reviewer", "I argue that", "this review"
⚠️ If author name in snippet differs from reference author
⚠️ Even if from .edu or as PDF, reviews are NOT the source

NEWS ABOUT RESEARCH (max 55):
⚠️ CRITICAL: If news.mit.edu, sciencedaily.com, phys.org, or university press release
⚠️ If snippet contains "study shows", "researchers found", "according to research"
⚠️ These are NEWS REPORTS about research, not the research itself
⚠️ PRIMARY score: max 55 (this is coverage, not the source)

WRONG WORK (0-30):
• Different work entirely
⚠️ CRITICAL TITLE+AUTHOR MATCHING:
• Partial title match with WRONG AUTHOR → MAX SCORE 30
• ALWAYS verify: Title match + Author match TOGETHER

SECONDARY SCORE (0-100) - Detect if this is a REVIEW or ABOUT the work:

⚠️ CRITICAL MUTUAL EXCLUSIVITY RULES:
• If PRIMARY score is 70+: This is the work itself or a publisher page → SECONDARY score MUST be 0-30
• Full-text sources (PDFs, HTML of the work) → NOT candidates for SECONDARY
• Publisher/seller pages (buy links, product pages) → NOT candidates for SECONDARY
• SECONDARY candidates must be ABOUT the work, not the work itself

SCHOLARLY BOOK REVIEW (90-100):
✓ PDF format AND title contains "review" (actual review article)
✓ From academic journal (.edu, sagepub, oxford, cambridge, etc.) AND title contains "review"
✓ Snippet discusses specific merits, flaws, critique, analysis
✓ Mentions specific pages, chapters, or quotes from the work
✓ Evaluative/analytical language about THIS specific work

NON-ACADEMIC REVIEW (75-90):
✓ Blog, magazine, or news review with critical analysis
✓ Title includes "review", "critique", "thoughts on"
✓ Contains discussion of the work's arguments and quality

REVIEW WEBSITE/AGGREGATOR (max 60):
⚠️ CRITICAL: Sites like complete-review.com, goodreads.com → MAX SCORE 60
⚠️ These AGGREGATE reviews, not original reviews themselves

ACADEMIC DISCUSSION (75-90):
• Paper that cites/discusses the work substantively
• Analyzes themes, applications, or implications
• Scholarly treatment of the work's concepts or methodology

BIBLIOGRAPHY/METADATA PAGE (max 55):
⚠️ CRITICAL: PhilPapers, WorldCat, library catalogs → MAX SCORE 55
⚠️ Just lists: title, author, ISBN, publisher, abstract
⚠️ No critical analysis or evaluation present

UNRELATED (0-30):
• Different work or topic

CANDIDATES:
${results.map((r, i) => `${i}. ${r.title}\n   ${r.url}\n   ${r.snippet || ''}`).join('\n\n')}

IMPORTANT: After scoring, identify:
- PRIMARY RECOMMENDATION: The candidate with the HIGHEST primary score
- SECONDARY RECOMMENDATION: The candidate with the HIGHEST secondary score (that isn't already primary)

Return ONLY this format (one line per candidate, no headers, no explanations):
INDEX|PRIMARY|SECONDARY|PRIMARY_REASON|SECONDARY_REASON|TITLE_MATCH|AUTHOR_MATCH|RECOMMEND

Example:
0|100|40|Direct PDF download from OSF.io|Not a review|exact|yes|primary
1|75|30|PsycNET subscription database|Just a listing|exact|yes|neither
2|90|60|Archive.org full text|Not a review|exact|yes|neither
3|60|85|Author CV with citations|Good citation list|partial|yes|secondary

Rules for RECOMMEND field:
- Mark the ONE candidate with highest primary score as "primary"
- Mark the ONE candidate with highest secondary score (excluding primary) as "secondary"
- All others: "neither"

Use exact/partial/none for TITLE_MATCH, yes/no for AUTHOR_MATCH.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LLM-RANK] Anthropic API error:', errorText);
      return res.json({
        rankings: [],
        allCandidates: results,
        error: `Anthropic API error: ${response.status}`
      });
    }

    const data = await response.json();
    const resultText = data.content?.[0]?.text || '';

    // Parse pipe-delimited response (v22.0 format)
    // Format: INDEX|PRIMARY|SECONDARY|PRIMARY_REASON|SECONDARY_REASON|TITLE_MATCH|AUTHOR_MATCH|RECOMMEND
    try {
      const lines = resultText.trim().split('\n').filter(line => line.trim() && line.includes('|'));
      console.log(`[LLM-RANK] v22.0: Found ${lines.length} pipe-delimited lines`);

      const rankings = lines.map(line => {
        const parts = line.split('|').map(p => p.trim());
        if (parts.length < 8) {
          console.error(`[LLM-RANK] v22.0: Invalid line format (${parts.length} parts): ${line}`);
          return null;
        }

        const index = parseInt(parts[0]);
        const primary = parseInt(parts[1]);
        const secondary = parseInt(parts[2]);

        return {
          index: index,
          primary_score: primary,
          secondary_score: secondary,
          combined_score: Math.round((primary + secondary) / 2),
          primary_fit: parts[3],
          secondary_fit: parts[4],
          title_match: parts[5],
          author_match: parts[6] === 'yes',
          recommended_as: parts[7]
        };
      }).filter(r => r !== null);

      console.log(`[LLM-RANK] v22.0: Successfully parsed ${rankings.length} rankings`);

      res.json({
        rankings: rankings,
        allCandidates: results,
        model: data.model,
        input_tokens: data.usage?.input_tokens || 0,
        output_tokens: data.usage?.output_tokens || 0,
        version: 'v22.0'
      });

    } catch (parseError) {
      console.error('[LLM-RANK] v22.0: Parse error:', parseError);
      console.error('[LLM-RANK] v22.0: Full response:', resultText);
      res.json({
        rankings: [],
        allCandidates: results,
        error: 'Failed to parse ranking response',
        rawResponse: resultText.substring(0, 500)
      });
    }

  } catch (error) {
    console.error('[LLM-RANK] Error:', error);
    res.json({
      rankedResults: req.body.results || [],
      error: error.message || 'Ranking failed'
    });
  }
});

// ===== GOOGLE CUSTOM SEARCH =====
// Converted from: netlify/functions/search-google.ts
app.post('/api/search/google', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter' });
    }

    if (!GOOGLE_API_KEY || !GOOGLE_CX) {
      return res.json({
        results: [],
        error: 'Google API credentials not configured (GOOGLE_API_KEY, GOOGLE_CX)'
      });
    }

    const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
    searchUrl.searchParams.set('key', GOOGLE_API_KEY);
    searchUrl.searchParams.set('cx', GOOGLE_CX);
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('num', '10');

    const response = await fetch(searchUrl.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GOOGLE-SEARCH] API error:', errorText);
      return res.json({
        results: [],
        error: `Google API error: ${response.status}`
      });
    }

    const data = await response.json();

    const results = (data.items || []).map(item => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      displayUrl: item.displayLink,
      query: query
    }));

    res.json({
      results,
      totalResults: data.searchInformation?.totalResults || 0
    });

  } catch (error) {
    console.error('[GOOGLE-SEARCH] Error:', error);
    res.json({
      results: [],
      error: error.message || 'Search failed'
    });
  }
});

// ===== DROPBOX OAUTH =====
// Converted from: netlify/functions/dropbox-oauth.ts
// Note: Uses centralized OAuth library patterns
app.post('/api/dropbox/oauth', async (req, res) => {
  try {
    const { code, code_verifier, grant_type, refresh_token } = req.body;

    if (!DROPBOX_APP_SECRET) {
      return res.status(500).json({ error: 'DROPBOX_APP_SECRET not configured' });
    }

    let result;

    if (grant_type === 'refresh_token' && refresh_token) {
      // Refresh an existing token
      console.log('[DROPBOX-OAUTH] Refreshing access token');

      const tokenResponse = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refresh_token,
          client_id: DROPBOX_APP_KEY,
          client_secret: DROPBOX_APP_SECRET
        }).toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('[DROPBOX-OAUTH] Refresh error:', errorText);
        return res.status(400).json({ error: 'Token refresh failed' });
      }

      const tokenData = await tokenResponse.json();
      result = {
        accessToken: tokenData.access_token,
        refreshToken: refresh_token,  // Keep existing refresh token
        expiresIn: tokenData.expires_in
      };

    } else if (code && code_verifier) {
      // Exchange authorization code for tokens (PKCE flow)
      console.log('[DROPBOX-OAUTH] Exchanging authorization code for tokens');

      const tokenResponse = await fetch('https://api.dropbox.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code: code,
          grant_type: 'authorization_code',
          code_verifier: code_verifier,
          client_id: DROPBOX_APP_KEY,
          client_secret: DROPBOX_APP_SECRET,
          redirect_uri: 'https://refs.fergi.com/'
        }).toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error('[DROPBOX-OAUTH] Exchange error:', errorText);
        return res.status(400).json({ error: 'Authorization code exchange failed' });
      }

      const tokenData = await tokenResponse.json();
      result = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresIn: tokenData.expires_in
      };

    } else {
      return res.status(400).json({ error: 'Missing code or refresh_token' });
    }

    // Return tokens to frontend
    res.json({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      expires_in: result.expiresIn,
      token_type: 'bearer'
    });

  } catch (error) {
    console.error('[DROPBOX-OAUTH] Error:', error);
    res.status(500).json({ error: error.message || 'OAuth failed' });
  }
});

// ===== URL RESOLUTION =====
// Converted from: netlify/functions/resolve-urls.ts
app.post('/api/urls/resolve', async (req, res) => {
  try {
    const { urls = [] } = req.body;
    const resolved = [];

    for (const input of urls) {
      try {
        const response = await fetch(input, {
          method: 'HEAD',
          redirect: 'follow',
          timeout: 5000
        });

        const final = response.url;
        const contentType = response.headers.get('content-type') || '';
        const type = contentType.includes('pdf') || final.toLowerCase().endsWith('.pdf') ? 'pdf' : 'html';

        resolved.push({
          input,
          final,
          type,
          status: response.status
        });
      } catch (error) {
        resolved.push({
          input,
          error: String(error)
        });
      }
    }

    res.json({ resolved });

  } catch (error) {
    console.error('[RESOLVE-URLS] Error:', error);
    res.status(500).json({ error: error.message || 'URL resolution failed' });
  }
});

// ===== CORS PROXY =====
// Converted from: netlify/functions/proxy-fetch.ts
app.get('/api/proxy/fetch', async (req, res) => {
  try {
    const { url, method = 'GET' } = req.query;

    if (!url) {
      return res.status(400).send('missing url');
    }

    const response = await fetch(url, {
      method: method.toUpperCase(),
      redirect: 'follow',
      timeout: 10000
    });

    // Copy headers but remove set-cookie
    const headers = {};
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'set-cookie') {
        headers[key] = value;
      }
    });

    // Set headers on response
    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Stream the response body
    const buffer = await response.arrayBuffer();
    res.status(response.status).send(Buffer.from(buffer));

  } catch (error) {
    console.error('[PROXY-FETCH] Error:', error);
    res.status(500).send(error.message || 'Proxy fetch failed');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
====================================
📚 Reference Refinement Server
====================================
🌐 Port: ${PORT}
🔧 Environment: ${process.env.NODE_ENV || 'development'}
✅ Server ready
  `);
});
