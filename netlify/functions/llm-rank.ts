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

    const systemPrompt = `You are an expert at identifying academic references and ranking URLs by their suitability as primary and secondary sources.

${disableSearch
  ? 'IMPORTANT: You already have a large set of candidates to evaluate. DO NOT use the search_web tool - just rank the existing candidates.'
  : `You have access to a search_web tool. Use it strategically when:
- No exact title+author match exists in current candidates
- Current candidates are articles ABOUT the work, not the work itself
- Need to verify author or title information
- All candidates score below 60 and better results are needed

IMPORTANT: Limit tool use to 2-3 searches maximum. Be strategic - don't search unless necessary.`}`;

    const initialPrompt = `Rank these search results for BOTH primary and secondary URL fitness.

CRITICAL MATCHING REQUIREMENTS FOR PRIMARY URLS:

1. EXACT TITLE MATCH (MANDATORY):
   - The candidate title MUST match the reference title exactly or very closely
   - Acceptable variations: "The Title" vs "Title, The", subtitle omissions, punctuation differences
   - NOT acceptable: Similar topics, related works, different editions with significantly different titles
   - If no exact title match exists among candidates: PRIMARY score MUST be ≤ 50 (disqualified)

2. AUTHOR MATCH (MANDATORY):
   - The candidate MUST be BY or ABOUT the specified author
   - For multi-author works, at least the first/primary author must match
   - Author CVs/bios are acceptable only if they mention this specific work
   - If author doesn't match: PRIMARY score MUST be ≤ 50 (disqualified)

3. WORK ITSELF vs ABOUT THE WORK:
   - Primary URLs should be the actual reference (book, article, PDF)
   - NOT articles about it, reviews of it, or references to it (unless no direct source exists)

If a candidate does not meet BOTH title and author requirements, it CANNOT be a primary URL candidate, regardless of domain authority.

PRIMARY CRITERIA (authority & accessibility - only apply if title+author match):
1. FREE PDF from trusted source (=100):
   - Institutional repositories: archive.org, dtic.mil, .edu repositories
   - Academic publishers with free access: methods.sagepub.com, JSTOR open, etc.

2. KNOWN publisher with free PDF (=95):
   - SAGE, Oxford, Cambridge, MIT Press, etc. with accessible PDFs

3. Institutional archive (=90):
   - .gov archives, university digital libraries

4. Publisher official page with PDF preview (=85):
   - Publisher site that shows book/article with preview

5. Publisher official page paywalled (=70):
   - Official but requires purchase/subscription

6. Author's personal site with PDF (=80)

7. Author CV/bio mentioning work (=60)

PENALTIES:
- Unknown CDN domains (cdn.*.com): -30 points
- Articles ABOUT the work (not the work itself): -40 points
- Aggregators (Google Scholar profiles, ResearchGate): -50 points
- Random WordPress/blog sites (unless known academic): -20 points
- Paywalled with no preview: -15 points

SECONDARY CRITERIA (backup sources - must still relate to the work):
CRITICAL: Secondary URLs are BACKUP sources for the same work, NOT just authoritative sites discussing similar themes.
A secondary URL should still be ABOUT this specific work or author, just from a different source/format.

ACCEPTABLE SECONDARY URLS:
- Alternative format of the same work (e.g., HTML vs PDF, different edition) (=100)
- Review/critique of THIS specific work (=100)
- Author's CV/bio page that discusses THIS specific work (=90)
- Publisher's alternative page for the same work (=90)
- Related work BY THE SAME AUTHOR on similar topic (=70)
- Scholarly discussion that extensively cites THIS specific work (=60)

DISQUALIFIED (score ≤30 even if high domain authority):
- Articles about similar themes but NOT mentioning this work or author
- Law review / journal articles on related topics by different authors
- Generic academic discussions of similar concepts
- Any URL where neither the title NOR author appears in the snippet/title

EXAMPLE:
Reference: Gergen, K.J. (1999). An Invitation to Social Construction
✓ GOOD Secondary: ResearchGate article "The Social Constructionist Movement in Modern Psychology" by Gergen
✗ BAD Secondary: Law review article discussing "social construction" but NOT by/about Gergen

REFERENCE:
Title: ${reference.title || 'Unknown'}
Authors: ${reference.authors || 'Unknown'}
Year: ${reference.year || 'Unknown'}
Other: ${reference.other || 'Unknown'}

RELEVANCE (why this matters - extract themes for secondary scoring):
${reference.relevance_text || 'No context provided'}

CANDIDATES:
${candidates.map((c, i) => `${i}. ${c.title}\n   URL: ${c.url}\n   Snippet: ${c.snippet || 'No snippet'}`).join('\n\n')}

Return JSON array ranked by COMBINED utility (primary_score + secondary_score) / 2:
[
  {
    "index": 0,
    "primary_score": 95,
    "secondary_score": 40,
    "combined_score": 67,
    "primary_fit": "Official publisher page",
    "secondary_fit": "No thematic discussion",
    "title_match": "exact",
    "author_match": true,
    "recommended_as": "primary"
  }
]

IMPORTANT SCORING RULES:
- If NO candidate has primary_score > 60 with exact title+author match: Include a note in primary_fit explaining why (e.g., "No exact title match found")
- If NO candidate has secondary_score > 60: Include a note in secondary_fit explaining why
- Mark the BEST candidate as "primary" even if score is low, so user knows the best available option
- Mark the BEST secondary candidate similarly

Use index 0-${candidates.length - 1}.`;

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
        max_tokens: 4000,
        system: systemPrompt,
        messages: messages
      };

      // Only include tools if search is enabled (< 50 candidates)
      if (!disableSearch) {
        apiPayload.tools = tools;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(apiPayload)
      });

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

      // Parse JSON from response - try multiple patterns
      let rankings = [];
      let parseError = null;

      // Try to find JSON array in response
      const jsonMatch = resultText.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        try {
          rankings = JSON.parse(jsonMatch[0]);
          console.log('Successfully parsed rankings:', rankings.length);
          finalRankings = rankings;
          break; // Successfully parsed, exit loop
        } catch (e) {
          parseError = e instanceof Error ? e.message : 'JSON parse error';
          console.error('Failed to parse rankings JSON:', parseError);
        }
      } else {
        parseError = 'No JSON array found in AI response';
        console.error(parseError);
      }

      // If search is disabled (large candidate set), don't retry - just fail with error
      if (disableSearch && rankings.length === 0) {
        console.log('Search disabled and parsing failed - returning error');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            rankings: [],
            allCandidates: allCandidates,
            error: `Failed to parse rankings for ${allCandidates.length} candidates: ${parseError}`,
            raw_response_preview: resultText.substring(0, 500),
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
