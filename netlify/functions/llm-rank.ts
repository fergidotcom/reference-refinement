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

    const systemPrompt = `You rank academic URLs. Return ONLY valid JSON, no other text.`;

    const initialPrompt = `Rank these URLs for: "${reference.title || 'Unknown'}" by ${reference.authors || 'Unknown'} (${reference.year || 'Unknown'})

PRIMARY (score 0-100):
- 100: Free PDF from .edu/.gov/publisher
- 80-90: Publisher official page
- 60+: Exact title+author match required
- <60: No match or wrong work

SECONDARY (score 0-100):
- 90-100: Alt format, review, author's CV
- 60-80: Related work by same author
- <60: Different author or generic topic

CANDIDATES:
${candidates.map((c, i) => `${i}. ${c.title}\nURL: ${c.url}\nSnippet: ${c.snippet || 'N/A'}`).join('\n\n')}

IMPORTANT: Return ONLY a JSON array with NO other text before or after. Each entry must have:
- index (0-${candidates.length - 1})
- primary_score (0-100)
- secondary_score (0-100)
- combined_score (average of primary and secondary)
- primary_fit (brief reason)
- secondary_fit (brief reason)
- title_match ("exact", "partial", or "none")
- author_match (true/false)
- recommended_as ("primary", "secondary", or "neither")

Example: [{"index":0,"primary_score":95,"secondary_score":40,"combined_score":67,"primary_fit":"Publisher PDF","secondary_fit":"No backup","title_match":"exact","author_match":true,"recommended_as":"primary"}]`;

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

      // Parse JSON from response - try multiple patterns
      let rankings = [];
      let parseError = null;

      console.log(`[llm-rank] AI response length: ${resultText.length} chars`);
      console.log(`[llm-rank] AI response preview: ${resultText.substring(0, 300)}`);

      // Try to find JSON array in response
      const jsonMatch = resultText.match(/\[[\s\S]*\]/);

      if (jsonMatch) {
        console.log(`[llm-rank] Found JSON match, length: ${jsonMatch[0].length} chars`);
        try {
          rankings = JSON.parse(jsonMatch[0]);
          console.log(`[llm-rank] Successfully parsed ${rankings.length} rankings`);
          finalRankings = rankings;
          break; // Successfully parsed, exit loop
        } catch (e) {
          parseError = e instanceof Error ? e.message : 'JSON parse error';
          console.error(`[llm-rank] Failed to parse JSON: ${parseError}`);
          console.error(`[llm-rank] Invalid JSON: ${jsonMatch[0].substring(0, 500)}`);
        }
      } else {
        parseError = 'No JSON array found in AI response';
        console.error(`[llm-rank] ${parseError}`);
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
            error: `Failed to parse rankings for ${allCandidates.length} candidates: ${parseError}`,
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
