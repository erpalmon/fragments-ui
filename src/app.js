// ===================== COGNITO CONFIG =====================
const COG_DOMAIN = 'us-east-17yb7gxpks.auth.us-east-1.amazoncognito.com';
const COG_CLIENTID = '315h8v1g0t6vmlf4lbg2cd5bjn';

const COG_SCOPES = ['openid', 'email', 'profile'];
// Must exactly match the Callback/Sign-out URLs in your App Client
const REDIRECT_URI = 'http://localhost:1234';
// ==========================================================

// --- Token storage helpers (session-scoped) ---
const TOKEN_KEY = 'cognito_access_token';
const setToken = (t) => sessionStorage.setItem(TOKEN_KEY, t);
const getToken = () => sessionStorage.getItem(TOKEN_KEY) || '';
const clearToken = () => sessionStorage.removeItem(TOKEN_KEY);

// --- Hosted UI URLs ---
function buildAuthorizeUrl() {
  const params = new URLSearchParams({
    client_id: COG_CLIENTID,
    // Request BOTH so we can prefer id_token for the API
    response_type: 'id_token token',
    scope: COG_SCOPES.join(' '),
    redirect_uri: REDIRECT_URI,
  });
  // NEW: use canonical authorize endpoint
  return `https://${COG_DOMAIN}/oauth2/authorize?${params.toString()}`;
}

function buildLogoutUrl() {
  const params = new URLSearchParams({
    client_id: COG_CLIENTID,
    logout_uri: REDIRECT_URI, // must be in Allowed sign-out URLs
  });
  return `https://${COG_DOMAIN}/logout?${params.toString()}`;
}

// --- Capture token(s) on the redirect back from Cognito ---
function captureTokenFromHash() {
  const hash = window.location.hash?.replace(/^#/, '');
  if (!hash) return null;

  const params = new URLSearchParams(hash);
  // Prefer id_token for the API (your server verifies ID tokens)
  const idt = params.get('id_token');
  const act = params.get('access_token');
  const token = idt || act;

  if (token) {
    setToken(token);
    // Clean the fragment from the address bar
    history.replaceState(null, '', REDIRECT_URI);
  }
  return token ? (idt ? 'id_token' : 'access_token') : null;
}

document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const resEl = $('result');

  // 1) Handle redirect-from-login, wire auth buttons
  const capturedType = captureTokenFromHash();

  const btnIn = $('btnSignIn');
  const btnOut = $('btnSignOut');
  const status = $('authStatus');
  const tokenInput = $('token');

  // reflect saved token into the textbox
  const saved = getToken();
  if (saved && tokenInput) tokenInput.value = saved; // NEW: mirror captured/saved token into the input

  function updateStatus(extra = '') {
    const base = getToken() ? 'Signed in' : 'Signed out';
    status && (status.textContent = extra ? `${base} (${extra})` : base);
  }
  updateStatus(capturedType || '');

  btnIn && btnIn.addEventListener('click', () => {
    window.location.href = buildAuthorizeUrl();
  });

  btnOut && btnOut.addEventListener('click', () => {
    clearToken();
    if (tokenInput) tokenInput.value = '';
    updateStatus();
    window.location.href = buildLogoutUrl(); // clear Cognito session, bounce back here
  });

  // 2) Existing tester UI wiring (Create/List)
  const btnCreate = $('btnCreate');
  const btnList = $('btnList');

  // If some external auth.js exists, prefer its token (no-op otherwise)
  try {
    if (typeof window.getAccessToken === 'function') {
      const t = window.getAccessToken();
      if (t) {
        setToken(t);
        if (tokenInput) tokenInput.value = t;
        updateStatus();
      }
    }
  } catch (_) {}

  const writeResult = (title, data, extras = {}) => {
    const pre = document.createElement('pre');
    const header = document.createElement('div');
    header.innerHTML = `<strong>${title}</strong>`;
    const block = { ...extras, ...(typeof data === 'string' ? { text: data } : data) };
    pre.textContent = JSON.stringify(block, null, 2);
    resEl.replaceChildren(header, pre);
  };

  const getConfig = () => {
    const apiBase = ($('apiBase')?.value || '').trim() || 'http://localhost:8080';
    const tokenFromBox = (tokenInput?.value || '').trim();
    const token = tokenFromBox || getToken();
    if (!token) throw new Error('Missing token. Paste your ID token or click Sign in.');
    return { apiBase, token };
  };

  btnCreate && btnCreate.addEventListener('click', async () => {
    try {
      const { apiBase, token } = getConfig();
      const type = $('fragType').value;
      let body = $('content').value || '';

      if (type === 'application/json') {
        try {
          JSON.parse(body || '');
        } catch {
          writeResult('Error', { error: 'Invalid JSON. Fix the JSON and try again.' });
          return;
        }
      }

      const res = await fetch(`${apiBase}/v1/fragments`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': type,
        },
        body,
      });

      const location = res.headers.get('Location') || res.headers.get('location');
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }

      writeResult(`POST /v1/fragments → ${res.status}`, json, { Location: location });
    } catch (err) {
      writeResult('Error', { message: err.message || String(err) });
    }
  });

  btnList && btnList.addEventListener('click', async () => {
    try {
      const { apiBase, token } = getConfig();
      const res = await fetch(`${apiBase}/v1/fragments?expand=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      writeResult(`GET /v1/fragments?expand=1 → ${res.status}`, json);
    } catch (err) {
      writeResult('Error', { message: err.message || String(err) });
    }
  });

  // Convenience: prefill API from ?api= query param
  const params = new URLSearchParams(location.search);
  if (params.get('api') && $('apiBase')) $('apiBase').value = params.get('api');
});
