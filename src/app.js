import { signIn as oidcSignIn, signOut as oidcSignOut, getUser } from './auth.js';

// ===================== COGNITO CONFIG =====================
// COGNITO CONFIG (exact)
const COG_DOMAIN  = 'us-east-17yb7gxpks.auth.us-east-1.amazoncognito.com';
const COG_CLIENTID = '315h8v1g0t6vmlf4lbg2cd5bjn';
const COG_SCOPES = ['openid'];
const REDIRECT_URI = 'http://localhost:1234/';

// ==========================================================

// --- Token storage helpers (session-scoped) ---
const TOKEN_KEY = 'cognito_access_token';
const setToken   = (t) => sessionStorage.setItem(TOKEN_KEY, t);
const getToken   = () => sessionStorage.getItem(TOKEN_KEY) || '';
const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

// --- Hosted UI URLs ---
function buildAuthorizeUrl() {
  const params = new URLSearchParams({
    client_id: COG_CLIENTID,
    response_type: 'id_token token',
    scope: COG_SCOPES.join(' '),
    redirect_uri: REDIRECT_URI,
  });
  const url = `https://${COG_DOMAIN}/oauth2/authorize?${params.toString()}`;
  console.log('[Cognito] authorize URL:', url);
  return url;
}

function buildLogoutUrl() {
  const params = new URLSearchParams({
    client_id: COG_CLIENTID,
    logout_uri: REDIRECT_URI,
  });
  const url = `https://${COG_DOMAIN}/logout?${params.toString()}`;
  console.log('[Cognito] logout URL:', url);
  return url;
}

// --- Capture token(s) on the redirect back from Cognito ---
function captureTokenFromHash() {
  // No-op: we no longer use implicit flow tokens in the URL hash.
  return null;
}

document.addEventListener('DOMContentLoaded', () => {
  console.log('[app.js] DOMContentLoaded');
  const $ = (id) => document.getElementById(id);
  const resEl = $('result');

  const capturedType = '';

  const btnIn = $('btnSignIn');
  const btnOut = $('btnSignOut');
  const status = $('authStatus');
  const tokenInput = $('token');
  console.log('[app.js] buttons', { hasSignIn: !!btnIn, hasSignOut: !!btnOut });

  const saved = getToken();
  if (saved && tokenInput) tokenInput.value = saved;

  function updateStatus(extra = '') {
    const base = getToken() ? 'Signed in' : 'Signed out';
    if (status) status.textContent = extra ? `${base} (${extra})` : base;
  }

  const isJwt = (s) => typeof s === 'string' && s.split('.').length === 3;
  const parseJwt = (t) => {
    try { return JSON.parse(atob(t.split('.')[1] || '')); } catch { return {}; }
  };

  async function ensureIdToken() {
    // Prefer the input, then session storage
    let t = (tokenInput?.value || '').trim() || getToken();
    if (!isJwt(t)) {
      // Try to recover from the current OIDC session
      const u = await getUser().catch(() => null);
      if (u && u.idToken) {
        t = u.idToken;
        setToken(t);
        if (tokenInput) tokenInput.value = t;
        updateStatus('id_token');
      }
    } else {
      const claims = parseJwt(t);
      if (claims && claims.token_use) updateStatus(claims.token_use);
    }
    if (!isJwt(t)) throw new Error('Invalid or missing ID token. Please sign in.');
    return t;
  }
  updateStatus(capturedType || '');

  // Try to complete OIDC code-flow callback and populate token
  getUser()
    .then((u) => {
      if (u && tokenInput) {
        setToken(u.idToken);
        tokenInput.value = u.idToken;
        updateStatus('id_token');
      }
    })
    .catch(() => {/* ignore if not in callback */});

  btnIn && btnIn.addEventListener('click', async () => {
    console.log('[app.js] Sign in clicked');
    try {
      await oidcSignIn();
    } catch (e) { console.error(e); alert('Could not start sign-in.'); }
  });

  btnOut && btnOut.addEventListener('click', async () => {
    console.log('[app.js] Sign out clicked');
    try {
      clearToken();
      if (tokenInput) tokenInput.value = '';
      updateStatus();
      await oidcSignOut();
    } catch (e) { console.error(e); alert('Could not start sign-out.'); }
  });

  const writeResult = (title, data, extras = {}) => {
    const pre = document.createElement('pre');
    const header = document.createElement('div');
    header.innerHTML = `<strong>${title}</strong>`;
    const block = { ...extras, ...(typeof data === 'string' ? { text: data } : data) };
    pre.textContent = JSON.stringify(block, null, 2);
    resEl.replaceChildren(header, pre);
  };

  const getConfig = async () => {
    const apiBase = ($('apiBase')?.value || '').trim() || 'http://localhost:8080';
    const token = await ensureIdToken();
    return { apiBase, token };
  };

  const btnCreate = $('btnCreate');
  const btnList   = $('btnList');

  btnCreate && btnCreate.addEventListener('click', async () => {
    try {
      const { apiBase, token } = await getConfig();
      const type = $('fragType').value;
      let body = $('content').value || '';
      if (type === 'application/json') {
        try { JSON.parse(body || ''); } catch { return writeResult('Error', { error: 'Invalid JSON.' }); }
      }
      const res = await fetch(`${apiBase}/v1/fragments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': type },
        body,
      });
      const location = res.headers.get('Location') || res.headers.get('location');
      const text = await res.text();
      let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
      writeResult(`POST /v1/fragments → ${res.status}`, json, { Location: location });
    } catch (err) { writeResult('Error', { message: err.message || String(err) }); }
  });

  btnList && btnList.addEventListener('click', async () => {
    try {
      const { apiBase, token } = await getConfig();
      const res = await fetch(`${apiBase}/v1/fragments?expand=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      writeResult(`GET /v1/fragments?expand=1 → ${res.status}`, json);
    } catch (err) { writeResult('Error', { message: err.message || String(err) }); }
  });

  const params = new URLSearchParams(location.search);
  if (params.get('api') && $('apiBase')) $('apiBase').value = params.get('api');
});
