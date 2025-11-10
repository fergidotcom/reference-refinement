/**
 * Dropbox OAuth Integration Library
 *
 * Provides OAuth 2.0 authentication for Dropbox API access.
 * Supports both PKCE (Proof Key for Code Exchange) and standard OAuth flows.
 * Handles token exchange and refresh operations.
 *
 * @module dropbox-oauth
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Configuration for Dropbox OAuth
 */
export interface DropboxOAuthConfig {
  /** Dropbox app key (client ID) */
  appKey: string;

  /** Dropbox app secret (required for non-PKCE flows and token refresh) */
  appSecret: string;

  /** OAuth redirect URI (must match Dropbox app settings) */
  redirectUri: string;

  /** Optional custom Dropbox OAuth endpoint (defaults to official endpoint) */
  tokenEndpoint?: string;
}

/**
 * Request for exchanging authorization code for tokens
 */
export interface TokenExchangeRequest {
  /** Authorization code from OAuth callback */
  code: string;

  /** PKCE code verifier (optional, for PKCE flow) */
  codeVerifier?: string;
}

/**
 * Request for refreshing an access token
 */
export interface TokenRefreshRequest {
  /** Refresh token from previous authentication */
  refreshToken: string;
}

/**
 * Successful OAuth token response
 */
export interface TokenResponse {
  /** Access token for API calls */
  accessToken: string;

  /** Refresh token for getting new access tokens */
  refreshToken?: string;

  /** Token expiration time in seconds */
  expiresIn: number;

  /** Token type (usually "bearer") */
  tokenType: string;
}

/**
 * OAuth error response
 */
export interface OAuthError {
  /** Error type/code */
  error: string;

  /** HTTP status code */
  status?: number;

  /** Detailed error message */
  details?: string;
}

// ============================================================================
// Core OAuth Functions
// ============================================================================

/**
 * Exchange an authorization code for access and refresh tokens.
 * Supports both PKCE and standard OAuth flows.
 *
 * @param config - OAuth configuration
 * @param request - Token exchange request with authorization code
 * @returns Promise resolving to access/refresh tokens
 * @throws OAuthError if exchange fails
 *
 * @example
 * ```typescript
 * const config = {
 *   appKey: 'your_app_key',
 *   appSecret: process.env.DROPBOX_APP_SECRET!,
 *   redirectUri: 'https://yourapp.com/oauth/callback'
 * };
 *
 * const tokens = await exchangeAuthorizationCode(config, {
 *   code: 'authorization_code_from_callback',
 *   codeVerifier: 'pkce_code_verifier' // optional
 * });
 * ```
 */
export async function exchangeAuthorizationCode(
  config: DropboxOAuthConfig,
  request: TokenExchangeRequest
): Promise<TokenResponse> {
  const endpoint = config.tokenEndpoint || 'https://api.dropboxapi.com/oauth2/token';

  // Build token request parameters
  const params: Record<string, string> = {
    code: request.code,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
    client_id: config.appKey
  };

  // Add PKCE code verifier or client secret
  if (request.codeVerifier) {
    params.code_verifier = request.codeVerifier;
  } else {
    params.client_secret = config.appSecret;
  }

  return await performTokenRequest(endpoint, params);
}

/**
 * Refresh an expired access token using a refresh token.
 *
 * @param config - OAuth configuration
 * @param request - Token refresh request with refresh token
 * @returns Promise resolving to new access token
 * @throws OAuthError if refresh fails
 *
 * @example
 * ```typescript
 * const newTokens = await refreshAccessToken(config, {
 *   refreshToken: 'stored_refresh_token'
 * });
 * ```
 */
export async function refreshAccessToken(
  config: DropboxOAuthConfig,
  request: TokenRefreshRequest
): Promise<TokenResponse> {
  const endpoint = config.tokenEndpoint || 'https://api.dropboxapi.com/oauth2/token';

  const params = {
    grant_type: 'refresh_token',
    refresh_token: request.refreshToken,
    client_id: config.appKey,
    client_secret: config.appSecret
  };

  return await performTokenRequest(endpoint, params);
}

/**
 * Internal function to perform token request to Dropbox API
 */
async function performTokenRequest(
  endpoint: string,
  params: Record<string, string>
): Promise<TokenResponse> {
  const body = new URLSearchParams(params);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Try to parse as JSON error
      let errorDetail = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = JSON.stringify(errorJson, null, 2);
      } catch (e) {
        // Not JSON, use as-is
      }

      const error: OAuthError = {
        error: 'Dropbox OAuth failed',
        status: response.status,
        details: errorDetail
      };

      throw error;
    }

    const data = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type
    };

  } catch (error) {
    if ((error as OAuthError).error) {
      throw error; // Re-throw OAuthError
    }

    // Wrap other errors
    const oauthError: OAuthError = {
      error: error instanceof Error ? error.message : 'OAuth exchange failed'
    };
    throw oauthError;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate PKCE code verifier (random string)
 * Use this before initiating OAuth flow.
 *
 * @param length - Length of verifier (default 128, min 43, max 128)
 * @returns Random code verifier string
 *
 * @example
 * ```typescript
 * const verifier = generateCodeVerifier();
 * localStorage.setItem('pkce_verifier', verifier);
 * // Then compute challenge and start OAuth flow
 * ```
 */
export function generateCodeVerifier(length: number = 128): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues)
    .map(v => charset[v % charset.length])
    .join('');
}

/**
 * Generate PKCE code challenge from verifier
 * Use this when constructing OAuth authorization URL.
 *
 * @param verifier - Code verifier from generateCodeVerifier()
 * @returns Promise resolving to base64url-encoded SHA256 hash
 *
 * @example
 * ```typescript
 * const verifier = generateCodeVerifier();
 * const challenge = await generateCodeChallenge(verifier);
 * const authUrl = `https://www.dropbox.com/oauth2/authorize?` +
 *   `client_id=${appKey}&` +
 *   `response_type=code&` +
 *   `redirect_uri=${redirectUri}&` +
 *   `code_challenge=${challenge}&` +
 *   `code_challenge_method=S256`;
 * ```
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);

  // Convert to base64url
  return base64UrlEncode(new Uint8Array(hash));
}

/**
 * Base64URL encoding (RFC 4648 §5)
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Check if access token is expired or about to expire
 *
 * @param expiresAt - Unix timestamp (seconds) when token expires
 * @param bufferSeconds - Seconds before expiry to consider expired (default 300 = 5 min)
 * @returns True if token should be refreshed
 *
 * @example
 * ```typescript
 * const expiresAt = Date.now() / 1000 + 3600; // 1 hour from now
 * if (isTokenExpired(expiresAt)) {
 *   // Refresh token
 * }
 * ```
 */
export function isTokenExpired(expiresAt: number, bufferSeconds: number = 300): boolean {
  const now = Date.now() / 1000;
  return now >= (expiresAt - bufferSeconds);
}
