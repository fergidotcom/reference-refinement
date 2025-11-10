/**
 * Dropbox OAuth Netlify Function
 *
 * Migrated to use shared Dropbox OAuth library (November 9, 2025)
 * Original implementation (v16.7) backed up as dropbox-oauth.ts.backup-v16.7
 *
 * This function now uses the centralized library at ~/.claude/lib/dropbox-integration/
 * which provides OAuth 2.0 authentication with PKCE support for all Fergi projects.
 */

import { createNetlifyHandler } from '../../../../../.claude/lib/dropbox-integration/netlify-handler';

const config = {
  appKey: 'q4ldgkwjmhxv6w2',
  appSecret: process.env.DROPBOX_APP_SECRET!,
  redirectUri: 'https://rrv521-1760738877.netlify.app/'
};

export const handler = createNetlifyHandler(config);
