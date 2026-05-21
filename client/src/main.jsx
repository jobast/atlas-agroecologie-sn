import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './i18n';
import App from './App.jsx';
import './styles.css';
import { startReplay } from './utils/replayQueue';

// Sliding-session: swap any X-Refreshed-Token the server sent back into
// localStorage so active users never face a hard logout while the app is open.
axios.interceptors.response.use(
  (response) => {
    const refreshed = response?.headers?.['x-refreshed-token'];
    if (refreshed && typeof refreshed === 'string') {
      try { localStorage.setItem('token', refreshed); } catch { /* ignore */ }
    }
    return response;
  },
  (error) => {
    // 401 means the JWT was rejected (missing / invalid / expired). Wipe local
    // session state and bounce to /login with a flag so the page can explain
    // why. We avoid the redirect when we're already on /login (prevents loops
    // when the login POST itself returns 401 for wrong credentials).
    if (error?.response?.status === 401) {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth-change'));
      } catch { /* ignore */ }
      const path = window.location.pathname;
      if (!path.startsWith('/login') && !path.startsWith('/reset-password') && !path.startsWith('/forgot-password')) {
        const ret = window.location.pathname + window.location.search;
        window.location.replace(`/login?session_expired=1&from=${encodeURIComponent(ret)}`);
      }
    }
    return Promise.reject(error);
  }
);

// Register the service worker and wire up the offline replay queue. We use
// workbox-window so we can show a "new version available" prompt instead of
// silently swapping the shell out from under the user.
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return; // dev server skips SW (see vite.config.js)
  try {
    const { Workbox } = await import('workbox-window');
    const wb = new Workbox('/sw.js');
    wb.addEventListener('waiting', () => {
      // A new SW is waiting to activate. Surface a soft prompt; the user
      // chooses when to reload (avoids losing in-progress form input).
      const wantsUpdate = window.confirm(
        'Une nouvelle version d\'Atlas est disponible. Recharger maintenant ?'
      );
      if (wantsUpdate) {
        wb.addEventListener('controlling', () => window.location.reload());
        wb.messageSkipWaiting();
      }
    });
    // The SW can ask the page to drain the offline queue (e.g. after a
    // Background Sync fires on Chrome Android while the tab was idle).
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event?.data?.type === 'DRAIN_SUBMIT_QUEUE') {
        import('./utils/replayQueue').then(m => m.startReplay && m.startReplay());
      }
    });
    await wb.register();
  } catch (e) {
    console.warn('SW registration failed:', e);
  }
}

startReplay();
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
