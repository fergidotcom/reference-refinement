import { Handler } from '@netlify/functions';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;

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

  // Check if API keys are configured
  if (!GOOGLE_API_KEY || !GOOGLE_CX) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        results: [],
        error: 'Google API credentials not configured in Netlify environment variables (GOOGLE_API_KEY, GOOGLE_CX)'
      })
    };
  }

  try {
    const { query } = JSON.parse(event.body || '{}');

    if (!query) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing query parameter' })
      };
    }

    const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
    searchUrl.searchParams.set('key', GOOGLE_API_KEY);
    searchUrl.searchParams.set('cx', GOOGLE_CX);
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('num', '10');

    const response = await fetch(searchUrl.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Google API error:', errorText);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          results: [],
          error: `Google API error: ${response.status}`
        })
      };
    }

    const data = await response.json();
    
    const results = (data.items || []).map((item: any) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      displayUrl: item.displayLink
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        results,
        totalResults: data.searchInformation?.totalResults || 0
      })
    };

  } catch (error) {
    console.error('Search error:', error);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        results: [],
        error: error instanceof Error ? error.message : 'Search failed'
      })
    };
  }
};
