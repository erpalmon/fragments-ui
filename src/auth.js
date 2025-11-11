// src/auth.js
import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

// ---- helpers ----
const withTrailingSlash = (u) => (u && !u.endsWith('/') ? `${u}/` : u);

// ---- env (from .env/.env.local/.env.prod) ----
const DOMAIN    = process.env.AWS_COGNITO_HOSTED_UI_DOMAIN;   // e.g. us-east-17yb7gxpks.auth.us-east-1.amazoncognito.com
const CLIENT_ID = process.env.AWS_COGNITO_CLIENT_ID;          // e.g. 315h8v1g0t6vmlf4lbg2cd5bjn
const POOL_ID   = process.env.AWS_COGNITO_POOL_ID;            // e.g. us-east-1_7yB7gxPkS

const REDIRECT  = withTrailingSlash(process.env.OAUTH_SIGN_IN_REDIRECT_URL);   // e.g. http://localhost:1234/
const SIGNOUT   = withTrailingSlash(process.env.OAUTH_SIGN_OUT_REDIRECT_URL);  // e.g. http://localhost:1234/

// Optional: allow scopes from env, else default to standard trio
const SCOPES = (process.env.OAUTH_SCOPES || 'openid email profile')
  .split(/\s+/)
  .filter(Boolean)
  .join(' ');

// IMPORTANT: authority must be the Hosted UI domain (not cognito-idp.*)
const authority = `https://${DOMAIN}`;

// Provide explicit metadata so oidc-client-ts knows where to call
const metadata = {
  // Issuer is the IdP (user pool) — this is what your API will validate against
  issuer: `https://cognito-idp.us-east-1.amazonaws.com/${POOL_ID}`,

  // Hosted UI OAuth endpoints
  authorization_endpoint: `https://${DOMAIN}/oauth2/authorize`,
  token_endpoint:         `https://${DOMAIN}/oauth2/token`,
  userinfo_endpoint:      `https://${DOMAIN}/oauth2/userInfo`,
  end_session_endpoint:   `https://${DOMAIN}/logout`,

  // JWKs live on the IdP side
  jwks_uri: `https://cognito-idp.us-east-1.amazonaws.com/${POOL_ID}/.well-known/jwks.json`,
};

// Final config for oidc-client-ts (Authorization Code + PKCE)
const config = {
  authority,
  metadata,
  client_id: CLIENT_ID,
  redirect_uri: REDIRECT,
  post_logout_redirect_uri: SIGNOUT,
  response_type: 'code',
  scope: SCOPES,

  loadUserInfo: true,
  automaticSilentRenew: false,

  // keep tokens only for this tab/session
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
};

// For quick troubleshooting
console.log('[OIDC config]', {
  authority,
  redirect_uri: REDIRECT,
  post_logout_redirect_uri: SIGNOUT,
  client_id: CLIENT_ID,
  scopes: SCOPES,
});

const userManager = new UserManager(config);

// ---- public API ----
export async function signIn() {
  // Redirects to Cognito Hosted UI (code flow)
  await userManager.signinRedirect();
}

export async function signOut() {
  // Best effort: clear local user and bounce through Hosted UI logout
  try {
    await userManager.removeUser();
  } catch (_) {}

  // Some Cognito setups don't complete signoutRedirect properly; build URL explicitly
  const url =
    `${metadata.end_session_endpoint}` +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&logout_uri=${encodeURIComponent(SIGNOUT)}`;

  window.location.href = url;
}

// Create a simplified view of the user and a helper to attach auth headers
function formatUser(user) {
  if (!user) return null;
  return {
    username: user.profile?.['cognito:username'],
    email: user.profile?.email,
    idToken: user.id_token,
    accessToken: user.access_token,
    authorizationHeaders: (type = 'application/json') => ({
      'Content-Type': type,
      Authorization: `Bearer ${user.id_token}`,
    }),
  };
}

// Handles the ?code=... callback and returns the current user (or null)
export async function getUser() {
  try {
    // If we just returned from Cognito, complete the code→token exchange
    if (window.location.search.includes('code=')) {
      await userManager.signinCallback(window.location.href);
      // Clean the URL so reloads don't reprocess the callback
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const user = await userManager.getUser();
    return formatUser(user);
  } catch (err) {
    console.error('[auth.getUser] failed', err);
    // Clean URL on failure too
    if (window.location.search.includes('code=')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    return null;
  }
}
