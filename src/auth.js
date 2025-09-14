// src/auth.js

import { UserManager } from 'oidc-client-ts';

const cognitoAuthConfig = {
  authority: `https://cognito-idp.us-east-1.amazonaws.com/${import.meta.env.VITE_AWS_COGNITO_POOL_ID}`,
  client_id: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID,
  redirect_uri: import.meta.env.VITE_OAUTH_SIGN_IN_REDIRECT_URL,
  post_logout_redirect_uri: import.meta.env.VITE_OAUTH_SIGN_IN_REDIRECT_URL,
  response_type: 'code',
  scope: 'openid email',
    // no revoke of "access token" (https://github.com/authts/oidc-client-ts/issues/262)
  revokeTokenTypes: ['refresh_token'],
    // no silent renew via "prompt=none" (https://github.com/authts/oidc-client-ts/issues/366)
  automaticSilentRenew: false,
};

// Create a UserManager instance
const userManager = new UserManager({
  ...cognitoAuthConfig,
});

export async function signIn() {
   // Trigger a redirect to the Cognito auth page, so user can authenticate
    await userManager.signinRedirect();
}

// Create a simplified view of the user, with an extra method for creating the auth headers
function formatUser(user) {
  return {
        // If you add any other profile scopes, you can include them here
    username: user.profile['cognito:username'],
    email: user.profile.email,
    idToken: user.id_token,
    accessToken: user.access_token,
    authorizationHeaders: (type = 'application/json') => ({
      'Content-Type': type,
      Authorization: `Bearer ${user.id_token}`,
    }),
  };
}

const CALLBACK_FLAG = 'cognito_signin_handled';

export async function getUser() {
      // First, check if we're handling a signin redirect callback (e.g., is ?code=... in URL)
  if (window.location.search.includes('code=')) {
    if (sessionStorage.getItem(CALLBACK_FLAG) === '1') {
      return null;
    }
    sessionStorage.setItem(CALLBACK_FLAG, '1'); 
    const user = await userManager.signinCallback();
        // Remove the auth code from the URL without triggering a reload
    window.history.replaceState({}, document.title, window.location.pathname);
    return formatUser(user);
  }

    // Otherwise, get the current user
  const user = await userManager.getUser();
  return user ? formatUser(user) : null;
}

export async function signOut() {
  await userManager.signoutRedirect();
}
