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

    // Extra logs so the console clearly shows status + fragments
    console.log('Fragments API response:', {
      status: data.status,
      fragments: data.fragments,
    });
    console.log('status:', data.status);
    console.log('fragments:', Array.isArray(data.fragments) ? data.fragments : []);

    console.log('Successfully got user fragments data', { data });
    return data;
  } catch (err) {
    console.error('Unable to call GET /v1/fragments', { err });
    return null;
  }
}
