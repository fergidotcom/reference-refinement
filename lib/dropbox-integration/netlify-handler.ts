/**
 * Netlify Function Wrapper for Dropbox OAuth
 *
 * Provides a serverless function handler that uses the core OAuth library.
 * This wrapper handles HTTP request/response and CORS, while the core library
 * handles the OAuth logic.
 *
 * @module netlify-handler
 */

import { Handler } from '@netlify/functions';
import {
  DropboxOAuthConfig,
  exchangeAuthorizationCode,
  refreshAccessToken,
  OAuthError
} from './oauth';

/**
 * Create a Netlify Function handler for Dropbox OAuth
 *
 * @param config - OAuth configuration
 * @returns Netlify Function handler
 *
 * @example
 * ```typescript
 * // In netlify/functions/dropbox-oauth.ts
 * import { createNetlifyHandler } from '~/.claude/lib/dropbox-integration/netlify-handler';
 *
 * const config = {
 *   appKey: 'your_app_key',
 *   appSecret: process.env.DROPBOX_APP_SECRET!,
 *   redirectUri: 'https://yourapp.netlify.app/callback'
 * };
 *
 * export const handler = createNetlifyHandler(config);
 * ```
 */
export function createNetlifyHandler(config: DropboxOAuthConfig): Handler {
  return async (event, context) => {
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

    // Validate configuration
    if (!config.appSecret) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'DROPBOX_APP_SECRET not configured' })
      };
    }

    try {
      const requestBody = JSON.parse(event.body || '{}');
      const { code, code_verifier, grant_type, refresh_token } = requestBody;

      let result;

      if (grant_type === 'refresh_token' && refresh_token) {
        // Refresh an existing token
        console.log('Refreshing Dropbox access token');
        result = await refreshAccessToken(config, { refreshToken: refresh_token });

      } else if (code) {
        // Exchange authorization code for tokens
        console.log('Exchanging authorization code for tokens', {
          has_code_verifier: !!code_verifier,
          code_verifier_length: code_verifier ? code_verifier.length : 0
        });

        result = await exchangeAuthorizationCode(config, {
          code,
          codeVerifier: code_verifier
        });

      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing code or refresh_token' })
        };
      }

      // Return tokens to frontend
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
          expires_in: result.expiresIn,
          token_type: result.tokenType
        })
      };

    } catch (error) {
      console.error('OAuth handler error:', error);

      const oauthError = error as OAuthError;

      return {
        statusCode: oauthError.status || 500,
        headers,
        body: JSON.stringify({
          error: oauthError.error || 'OAuth exchange failed',
          details: oauthError.details,
          hint: 'Check Netlify function logs for full error'
        })
      };
    }
  };
}
