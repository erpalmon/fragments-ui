// src/api.js
// Vite-style env (client-side)
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function getUserFragments(user) {
  console.log('Requesting user fragments data...');
  try {
    const res = await fetch(new URL('/v1/fragments', apiUrl), {
      headers: user.authorizationHeaders(),
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const data = await res.json();
    console.log('Successfully got user fragments data', { data });
    return data;
  } catch (err) {
    console.error('GET /v1/fragments failed', err);
    return null;
  }
}
