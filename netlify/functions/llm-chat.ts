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
        result: '',
        error: 'ANTHROPIC_API_KEY not configured in Netlify environment variables'
      })
    };
  }

  try {
    const { prompt, model } = JSON.parse(event.body || '{}');

    if (!prompt) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing prompt' })
      };
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
      console.error('Anthropic API error:', errorText);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          result: '',
          error: `Anthropic API error: ${response.status}`
        })
      };
    }

    const data = await response.json();
    const result = data.content?.[0]?.text || '';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        result,
        model: data.model,
        tokens_used: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
      })
    };

  } catch (error) {
    console.error('LLM chat error:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        result: '',
        error: error instanceof Error ? error.message : 'Chat failed'
      })
    };
  }
};
