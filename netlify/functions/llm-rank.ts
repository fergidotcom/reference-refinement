import { Handler } from '@netlify/functions';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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
    const { reference, candidates } = JSON.parse(event.body || '{}');

    if (!reference || !candidates || !Array.isArray(candidates)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing reference or candidates' })
      };
    }

    const prompt = `You are helping rank candidate URLs for an academic reference. 

Reference Information:
Title: ${reference.title || 'Unknown'}
Authors: ${reference.authors || 'Unknown'}
Year: ${reference.year || 'Unknown'}
Container: ${reference.container_title || 'Unknown'}
Relevance: ${reference.relevance_text || 'No context provided'}

Candidate URLs to rank:
${candidates.map((c, i) => `${i + 1}. ${c.title}\n   URL: ${c.url}\n   Snippet: ${c.snippet || 'No snippet'}`).join('\n\n')}

Rank these candidates from best to worst match for this reference. Consider:
- Accuracy of match (does it match the title, authors, year?)
- Source quality (academic, publisher, archive vs random blog)
- Accessibility (direct access vs paywall)

Return ONLY a JSON array of rankings with this exact format:
[
  {"index": 0, "score": 95, "reason": "Perfect match..."},
  {"index": 1, "score": 60, "reason": "Partial match..."}
]

Use index numbers 0-${candidates.length - 1}. Scores 0-100.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
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
    const resultText = data.content?.[0]?.text || '';

    // Parse JSON from response
    const jsonMatch = resultText.match(/\[[\s\S]*\]/);
    let rankings = [];
    
    if (jsonMatch) {
      try {
        rankings = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('Failed to parse rankings JSON:', e);
        rankings = [];
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        rankings,
        model: data.model,
        tokens_used: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
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
