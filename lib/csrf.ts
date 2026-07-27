let cachedToken = '';
let pendingToken: Promise<string> | null = null;

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export async function csrfHeaders(method = 'POST') {
  if (SAFE_METHODS.has(String(method || 'GET').toUpperCase())) return {};
  return { 'x-csrf-token': await csrfToken() };
}

export async function csrfToken() {
  if (cachedToken) return cachedToken;
  if (!pendingToken) {
    pendingToken = fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store'
    })
      .then(async response => {
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.csrfToken) throw new Error(data?.error || 'csrf token unavailable');
        cachedToken = data.csrfToken;
        return cachedToken;
      })
      .finally(() => {
        pendingToken = null;
      });
  }
  return pendingToken;
}

export function clearCsrfToken() {
  cachedToken = '';
}
