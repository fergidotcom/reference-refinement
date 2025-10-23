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
    const { reference, candidates, model } = JSON.parse(event.body || '{}');

    if (!reference || !candidates || !Array.isArray(candidates)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing reference or candidates' })
      };
    }

    const prompt = `Rank these search results for BOTH primary and secondary URL fitness.

PRIMARY CRITERIA (authority-focused):
- PDF availability (free=100, paywalled=80, none=0)
- Publisher/official source (=90)
- Author's own site/paper (=85)
- Author CV/bio (=70)
- Wikipedia/authoritative encyclopedia (=60)
- Social media/X/Twitter (=20)

SECONDARY CRITERIA (theme-focused):
- Review of this specific work (=100)
- Discussion of key themes from Relevance text (=90)
- Related scholarly work (=70)
- Author bio (=50)

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
    "recommended_as": "primary"
  }
]

Mark duplicates if same URL serves both purposes well. Use index 0-${candidates.length - 1}.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-3-5-sonnet-20241022',
        max_tokens: 3000,
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
