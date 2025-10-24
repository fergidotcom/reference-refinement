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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-sonnet-4-20250514',
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

    console.log('Raw AI response:', resultText.substring(0, 500));

    // Parse JSON from response - try multiple patterns
    let rankings = [];
    let parseError = null;

    // Try to find JSON array in response
    const jsonMatch = resultText.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      try {
        rankings = JSON.parse(jsonMatch[0]);
        console.log('Successfully parsed rankings:', rankings.length);
      } catch (e) {
        parseError = e instanceof Error ? e.message : 'JSON parse error';
        console.error('Failed to parse rankings JSON:', parseError);
        console.error('Matched text:', jsonMatch[0].substring(0, 500));
      }
    } else {
      console.error('No JSON array found in response');
      parseError = 'No JSON array found in AI response';
    }

    // If parsing failed, return error
    if (rankings.length === 0 && parseError) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          rankings: [],
          error: `Failed to parse rankings: ${parseError}`,
          raw_response_preview: resultText.substring(0, 200)
        })
      };
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
