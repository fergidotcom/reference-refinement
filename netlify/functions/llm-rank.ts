import { Handler } from '@netlify/functions';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;

// Helper function to execute Google search
async function executeSearch(query: string, maxResults: number = 10): Promise<any[]> {
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    console.error('Google API credentials not configured');
    return [];
  }

  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&num=${maxResults}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error('Google Search API error:', response.status);
      return [];
    }

    const data = await response.json();
    const results = (data.items || []).map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      displayUrl: item.displayLink
    }));

    return results;
  } catch (error) {
    console.error('Search execution error:', error);
    return [];
  }
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Check if API key is configured
  if (!ANTHROPIC_API_KEY) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        rankings: [],
        error: 'ANTHROPIC_API_KEY not configured in Netlify environment variables'
      })
    };
  }

  try {
    const { reference, candidates, model } = JSON.parse(event.body || '{}');

    if (!reference || !candidates || !Array.isArray(candidates)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing reference or candidates' })
      };
    }

    // Define tools available to Claude
    const tools = [
      {
        name: "search_web",
        description: "Search the web to find additional candidates or verify information about existing candidates. Use this when: 1) No exact title/author match found in current candidates, 2) Candidates appear to be reviews/articles ABOUT the work rather than the work itself, 3) Need to verify if a URL is the actual reference or something about it, 4) All scores are low and need better candidates.",
        input_schema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query to execute. Be specific: include exact title in quotes, author name, and publication details."
            },
            reason: {
              type: "string",
              description: "Why this search is needed (for logging and debugging)"
            },
            max_results: {
              type: "number",
              description: "Maximum number of results to return (default: 5, max: 10)"
            }
          },
          required: ["query", "reason"]
        }
      }
    ];

    // Disable search tool entirely to prevent timeouts (v13.6)
    // Search was causing 29s delays even with small batches because frontend sends batches < 50
    // We already do 8 queries upfront, so additional search isn't needed
    const disableSearch = true;

    const systemPrompt = `You rank URLs. Reply with ONLY the scores table, nothing else.`;

    const initialPrompt = `Rank these URLs for: "${reference.title || 'Unknown'}" by ${reference.authors || 'Unknown'} (${reference.year || 'Unknown'})
${reference.other ? `\nPublication Info: ${reference.other}` : ''}
${reference.relevance ? `\nRelevance: ${reference.relevance.substring(0, 200)}...` : ''}

Score each URL independently using content-type detection:

PRIMARY SCORE (0-100) - Detect if this is THE WORK ITSELF or ABOUT the work:

⚠️ CRITICAL MUTUAL EXCLUSIVITY RULES:
• Full-text sources and publisher pages → HIGH PRIMARY scores (60-100)
• Reviews, analyses, thematic discussions → LOW PRIMARY scores (0-55), HIGH SECONDARY scores
• A URL should be EITHER a primary candidate OR a secondary candidate, not both

LANGUAGE MISMATCH (max 70):
⚠️ CRITICAL: Non-English domain indicators → MAX SCORE 70
⚠️ Domain: .de (German), .fr (French), .li (Liechtenstein/German), .es (Spanish), .it (Italian), .jp (Japanese), .cn (Chinese)
⚠️ books.google.li, books.google.de, books.google.fr → Likely non-English content
⚠️ Exception: If snippet clearly shows English text, score normally

FULL-TEXT SOURCE INDICATORS (95-100):
✓ Title/URL matches book title (no "review" language)
✓ Snippet mentions "full text", "complete", "entire work", "read online"
✓ PDF/HTML from academic repository (.edu/.gov/archive.org/researchgate)
✓ No reviewer or different author mentioned in snippet
✓ English language domain (.com, .edu, .org, .gov, .uk)

FULL-TEXT (uncertain) (85-95):
• Free PDF/HTML from non-academic domains
• Archive.org links with "borrow" or "preview" signals (not guaranteed full text)
• Snippet unclear about completeness

QUOTATIONS/EXCERPTS/ANTHOLOGIES (max 65):
⚠️ CRITICAL: If title or URL contains "quotations", "excerpts", "anthology", "selections", "reader" → MAX SCORE 65
⚠️ These are PARTIAL collections, not complete works
⚠️ Example: "Peter Berger Quotations" ≠ Full text of Berger's work
⚠️ Example: "Readings in..." or "Selected Works" ≠ Complete book
⚠️ Even from .edu or as PDF, partial content scores lower than full text

PAYWALLED/PREVIEW (70-85):
• Publisher site with preview access
• Paywalled full text access

PUBLISHER PAGE (60-75):
• Official purchase page (no full text)
• URL contains "product", "buy", "isbn"

REVIEW/ABOUT THE WORK (max 55):
⚠️ CRITICAL: If title contains "review of", "book review", "reviewed by" → MAX SCORE 55
⚠️ If snippet mentions "reviewer", "I argue that", "this review"
⚠️ If author name in snippet differs from book author
⚠️ If from journal domain but appears to be a review article
⚠️ Even if from .edu or as PDF, reviews are NOT the source

NEWS ABOUT RESEARCH (max 55):
⚠️ CRITICAL: If news.mit.edu, sciencedaily.com, phys.org, or university press release
⚠️ If snippet contains "study shows", "researchers found", "according to research"
⚠️ These are NEWS REPORTS about research, not the research itself
⚠️ The actual journal article is the primary source, news coverage is secondary
⚠️ PRIMARY score: max 55 (this is coverage, not the source)
⚠️ Note: These CAN be good SECONDARY candidates (score 60-75 for coverage)

WRONG WORK (0-30):
• Different book/article entirely
⚠️ CRITICAL TITLE+AUTHOR MATCHING:
• Partial title match with WRONG AUTHOR → MAX SCORE 30
• Example: "Web of Politics" by Aberbach ≠ "Web of Politics" by Davis
• ALWAYS verify: Title match + Author match TOGETHER
• When title is ambiguous, author match is REQUIRED for high scores

SECONDARY SCORE (0-100) - Detect if this is a REVIEW or just a LISTING:

⚠️ CRITICAL MUTUAL EXCLUSIVITY RULES:
• If PRIMARY score is 70+: This is the work itself or a publisher page → SECONDARY score MUST be 0-30
• Full-text sources (PDFs, HTML of the work) → NOT candidates for SECONDARY
• Publisher/seller pages (buy links, product pages) → NOT candidates for SECONDARY
• SECONDARY candidates must be ABOUT the work, not the work itself

SCHOLARLY BOOK REVIEW (90-100):
✓ PDF format AND title contains "review" (actual review article)
✓ From academic journal (.edu, sagepub, oxford, cambridge, etc.) AND title contains "review"
✓ Snippet discusses specific merits, flaws, critique, analysis of the book
✓ Mentions specific pages, chapters, or quotes from the book
✓ Evaluative/analytical language about THIS specific work

NON-ACADEMIC REVIEW (75-90):
✓ Blog, magazine, or news review with critical analysis
✓ Title includes "review", "critique", "thoughts on"
✓ Contains discussion of book's arguments and quality
✓ Still analytical, just not scholarly

REVIEW WEBSITE/AGGREGATOR (max 60):
⚠️ CRITICAL: Sites like complete-review.com, goodreads.com → MAX SCORE 60
⚠️ These are ABOUT reviews or AGGREGATE reviews, not reviews themselves
⚠️ URL patterns: complete-review.com/reviews/*, goodreads.com/book/*
⚠️ Typically show excerpts or summaries OF other reviews
⚠️ Not original critical analysis

ACADEMIC DISCUSSION (75-90):
• Paper that cites/discusses the work substantively
• Analyzes themes, applications, or implications of this specific work
• Scholarly treatment of the work's concepts or methodology
• Not a review but still work-focused analysis
• Contextualizes the work within broader literature

BIBLIOGRAPHY/METADATA PAGE (max 55):
⚠️ CRITICAL: PhilPapers, WorldCat, library catalogs → MAX SCORE 55
⚠️ Just lists: title, author, ISBN, publisher, abstract
⚠️ No critical analysis or evaluation present
⚠️ URL pattern: philpapers.org/rec/, worldcat.org, library catalogs
⚠️ Even if title appears, these are listings not reviews

TOPIC DISCUSSION (60-75):
• Discusses broader concepts or themes from the work
• Contextualizes work within field or theoretical framework
• Thematic exploration that includes this work
• Not specific to this work alone but relevant and substantial

UNRELATED (0-30):
• Different work or topic

CANDIDATES:
${candidates.map((c, i) => `${i}. ${c.title}\n   ${c.url}\n   ${c.snippet || ''}`).join('\n\n')}

IMPORTANT: After scoring, identify:
- PRIMARY RECOMMENDATION: The candidate with the HIGHEST primary score
- SECONDARY RECOMMENDATION: The candidate with the HIGHEST secondary score (that isn't already primary)

Return ONLY this format (one line per candidate, no headers, no explanations):
INDEX|PRIMARY|SECONDARY|PRIMARY_REASON|SECONDARY_REASON|TITLE_MATCH|AUTHOR_MATCH|RECOMMEND

Example:
0|100|40|Free PDF from archive.org|Not a review|exact|yes|primary
1|80|95|Publisher paywalled|Scholarly review of this work|exact|yes|secondary
2|45|60|Review article|Discusses same concepts|partial|yes|neither

Rules for RECOMMEND field:
- Mark the ONE candidate with highest primary score as "primary"
- Mark the ONE candidate with highest secondary score (excluding primary) as "secondary"
- All others: "neither"

Use exact/partial/none for TITLE_MATCH, yes/no for AUTHOR_MATCH.`;

    // Tool calling loop
    let allCandidates = [...candidates];
    const messages: any[] = [{ role: 'user', content: initialPrompt }];
    let searchCount = 0;
    const maxSearches = 3;
    let finalRankings: any[] = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    while (searchCount < maxSearches) {
      const apiPayload: any = {
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: 800,  // v13.9: Reduced from 1500 to 800 (v13.8 still timing out)
        system: systemPrompt,
        messages: messages
      };

      // Only include tools if search is enabled (< 50 candidates)
      if (!disableSearch) {
        apiPayload.tools = tools;
      }

      // Add timeout to prevent Netlify function timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 18000); // 18 second timeout

      console.log(`[llm-rank] Calling Claude API with ${candidates.length} candidates...`);
      const startTime = Date.now();

      let response;
      try {
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(apiPayload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        console.log(`[llm-rank] Claude API responded in ${Date.now() - startTime}ms`);
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          console.error('[llm-rank] Claude API timeout after 18 seconds');
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              rankings: [],
              error: 'API timeout - try with fewer candidates or simpler reference'
            })
          };
        }
        throw error;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Anthropic API error:', errorText);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            rankings: [],
            error: `Anthropic API error: ${response.status}`
          })
        };
      }

      const data = await response.json();
      console.log('Claude stop_reason:', data.stop_reason);

      // Track token usage
      if (data.usage) {
        totalInputTokens += data.usage.input_tokens || 0;
        totalOutputTokens += data.usage.output_tokens || 0;
      }

      // Add assistant's response to message history
      messages.push({ role: 'assistant', content: data.content });

      // Check if Claude wants to use a tool
      if (data.stop_reason === 'tool_use') {
        // Find tool use blocks
        const toolUseBlocks = data.content.filter((block: any) => block.type === 'tool_use');

        if (toolUseBlocks.length === 0) {
          break; // No tool use found, exit loop
        }

        // Execute each tool call
        const toolResults: any[] = [];
        let totalNewCandidates = 0;

        for (const toolUse of toolUseBlocks) {
          console.log(`Claude wants to use tool: ${toolUse.name}`, toolUse.input);

          if (toolUse.name === 'search_web') {
            const { query, reason, max_results = 5 } = toolUse.input;
            searchCount++;

            console.log(`Executing search #${searchCount}: "${query}" (Reason: ${reason})`);

            // Execute the search
            const searchResults = await executeSearch(query, Math.min(max_results, 10));

            // Add new candidates to allCandidates array with new indices
            const startIndex = allCandidates.length;
            const newCandidates = searchResults.map((result, i) => ({
              ...result,
              _newCandidate: true,
              _sourceQuery: query
            }));

            allCandidates = allCandidates.concat(newCandidates);
            totalNewCandidates += newCandidates.length;

            // Prepare tool result for Claude
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify({
                found: searchResults.length,
                message: `Found ${searchResults.length} results. These have been added as candidates ${startIndex}-${allCandidates.length - 1}.`,
                results: searchResults.map((r, i) => ({
                  index: startIndex + i,
                  title: r.title,
                  url: r.url,
                  snippet: r.snippet
                }))
              })
            });
          }
        }

        // Add tool results to messages
        messages.push({ role: 'user', content: toolResults });

        // Update the prompt with new candidates
        const updatedPrompt = `Now rank ALL ${allCandidates.length} candidates (indices 0-${allCandidates.length - 1}), including the ${totalNewCandidates} new candidates just found.

UPDATED CANDIDATES:
${allCandidates.map((c, i) => `${i}. ${c.title}\n   URL: ${c.url}\n   Snippet: ${c.snippet || 'No snippet'}${c._newCandidate ? ' [NEW from search]' : ''}`).join('\n\n')}

Return the complete JSON rankings array for ALL candidates now.`;

        messages.push({ role: 'user', content: updatedPrompt });

        // Continue loop to get Claude's next response
        continue;
      }

      // If no tool use, extract rankings from text response
      const resultText = data.content.find((block: any) => block.type === 'text')?.text || '';
      console.log('Final response length:', resultText.length);

      // Parse pipe-delimited response
      let rankings = [];
      let parseError = null;

      console.log(`[llm-rank] AI response length: ${resultText.length} chars`);
      console.log(`[llm-rank] AI response preview: ${resultText.substring(0, 300)}`);

      try {
        // Split into lines and parse each
        const lines = resultText.trim().split('\n').filter(line => line.trim() && line.includes('|'));
        console.log(`[llm-rank] Found ${lines.length} pipe-delimited lines`);

        rankings = lines.map(line => {
          const parts = line.split('|').map(p => p.trim());
          if (parts.length < 8) {
            console.error(`[llm-rank] Invalid line format (${parts.length} parts): ${line}`);
            return null;
          }

          const primary = parseInt(parts[1]);
          const secondary = parseInt(parts[2]);

          return {
            index: parseInt(parts[0]),
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

        console.log(`[llm-rank] Successfully parsed ${rankings.length} rankings`);
        finalRankings = rankings;
        break; // Successfully parsed, exit loop
      } catch (e) {
        parseError = e instanceof Error ? e.message : 'Parse error';
        console.error(`[llm-rank] Failed to parse response: ${parseError}`);
        console.error(`[llm-rank] Full response: ${resultText}`);
      }

      // If search is disabled (large candidate set), don't retry - just fail with error
      if (disableSearch && rankings.length === 0) {
        console.log('[llm-rank] Search disabled and parsing failed - returning error');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            rankings: [],
            allCandidates: allCandidates,
            error: `Failed to parse rankings (expected pipe-delimited format): ${parseError}`,
            raw_response: resultText, // Return full response for debugging
            searches_performed: searchCount
          })
        };
      }

      // If parsing failed and we haven't exhausted searches, continue loop
      if (rankings.length === 0 && searchCount < maxSearches) {
        console.log('Parsing failed, continuing loop to try again...');
        continue;
      }

      // If parsing failed and no more searches allowed, return error
      if (rankings.length === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            rankings: [],
            allCandidates: allCandidates,
            error: `Failed to parse rankings: ${parseError}`,
            raw_response_preview: resultText.substring(0, 500),
            searches_performed: searchCount
          })
        };
      }

      break; // Exit loop
    }

    // Return final rankings
    console.log(`Ranking complete. Total candidates: ${allCandidates.length}, Searches performed: ${searchCount}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        rankings: finalRankings,
        allCandidates: allCandidates,
        searches_performed: searchCount,
        model: model || 'claude-sonnet-4-20250514',
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens
      })
    };

  } catch (error) {
    console.error('LLM rank error:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        rankings: [],
        error: error instanceof Error ? error.message : 'Ranking failed'
      })
    };
  }
};
