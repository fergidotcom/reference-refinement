import { Handler } from '@netlify/functions';

const DROPBOX_APP_KEY = 'q4ldgkwjmhxv6w2';
const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;
const REDIRECT_URI = 'https://rrv521-1760738877.netlify.app/rr_v60.html';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (!DROPBOX_APP_SECRET) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'DROPBOX_APP_SECRET not configured' })
    };
  }

  try {
    const { code, code_verifier, grant_type, refresh_token } = JSON.parse(event.body || '{}');

    let tokenRequestBody;

    if (grant_type === 'refresh_token' && refresh_token) {
      // Refresh an existing token
      tokenRequestBody = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
        client_id: DROPBOX_APP_KEY,
        client_secret: DROPBOX_APP_SECRET
      });
    } else if (code) {
      // Exchange authorization code for tokens (PKCE flow)
      const params: any = {
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
        client_id: DROPBOX_APP_KEY
      };

      // Include code_verifier for PKCE flow
      if (code_verifier) {
        params.code_verifier = code_verifier;
      } else {
        // Fallback to client_secret for non-PKCE flow
        params.client_secret = DROPBOX_APP_SECRET;
      }

      tokenRequestBody = new URLSearchParams(params);
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing code or refresh_token' })
      };
    }

    // Log what we're sending (for debugging)
    console.log('Sending token request to Dropbox:', {
      url: 'https://api.dropboxapi.com/oauth2/token',
      grant_type: grant_type || 'authorization_code',
      has_code: !!code,
      has_code_verifier: !!code_verifier,
      code_verifier_length: code_verifier ? code_verifier.length : 0,
      has_refresh_token: !!refresh_token,
      client_id: DROPBOX_APP_KEY,
      redirect_uri: code ? REDIRECT_URI : undefined
    });

    // Exchange with Dropbox
    const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenRequestBody.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Dropbox OAuth error:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText,
        requestParams: {
          has_code: !!code,
          has_code_verifier: !!code_verifier,
          has_refresh_token: !!refresh_token,
          grant_type: grant_type || 'authorization_code'
        }
      });

      // Try to parse error as JSON
      let errorDetail = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = JSON.stringify(errorJson, null, 2);
      } catch (e) {
        // Not JSON, use as-is
      }

      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: 'Dropbox OAuth failed',
          status: response.status,
          details: errorDetail,
          hint: 'Check Netlify function logs for full error'
        })
      };
    }

    const data = await response.json();

    // Return tokens to frontend
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        token_type: data.token_type
      })
    };

  } catch (error) {
    console.error('OAuth handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error instanceof Error ? error.message : 'OAuth exchange failed'
      })
    };
  }
};
