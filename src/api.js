const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function getUserFragments(user) {
  try {
    const res = await fetch(new URL('/v1/fragments', apiUrl), {
      headers: user.authorizationHeaders()
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    console.error('GET /v1/fragments failed', err);
    return null;
  }
}
