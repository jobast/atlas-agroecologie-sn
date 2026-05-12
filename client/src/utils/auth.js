// Decode a JWT payload without verifying the signature.
// Returns null if the token is missing or malformed.
function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(padded + '==='.slice((padded.length + 3) % 4));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Returns one of: 'missing' | 'expired' | 'valid'.
// 'valid' only means "token is present and not past its exp"; the server is still the source of truth.
export function getTokenStatus() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) return 'missing';
  const payload = decodeJwtPayload(token);
  if (!payload) return 'missing';
  if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
    return 'expired';
  }
  return 'valid';
}
