import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './i18n';
import App from './App.jsx';
import './styles.css';

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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
