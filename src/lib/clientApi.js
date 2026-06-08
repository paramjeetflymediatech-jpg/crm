export async function apiFetch(url, options = {}) {
  let res = await fetch(url, options);
  
  if (res.status === 401) {
    // Attempt to refresh the access token
    try {
      const refreshRes = await fetch('/api/auth/refresh', { method: 'POST' });
      if (refreshRes.ok) {
        // Retry the original request
        res = await fetch(url, options);
      } else {
        // Refresh token is expired or invalid, log out
        if (typeof window !== 'undefined') {
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }
    } catch (err) {
      console.error('Failed to auto-refresh token:', err);
    }
  }
  
  return res;
}
