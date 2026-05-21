/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

// Vite's injectManifest replaces this token with the precache list at build time.
precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// Take over open tabs immediately when a new SW activates. Combined with
// the workbox-window prompt on the client, the user gets the new shell
// after they click "Reload" rather than waiting for every tab to close.
self.skipWaiting();
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// SPA navigation fallback: serve the app shell for any in-scope route so
// React Router can handle it offline.
registerRoute(
  new NavigationRoute(
    async () => {
      try {
        const response = await caches.match('/index.html', { ignoreSearch: true });
        if (response) return response;
        return fetch('/index.html');
      } catch {
        return fetch('/index.html');
      }
    },
    {
      denylist: [/^\/api\//, /^\/uploads\//, /\.[^/]+$/],
    }
  )
);

// Auth endpoints must never hit the cache - a stale login response would be
// catastrophic. NetworkOnly + always fall through to the browser default.
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/auth/'),
  new NetworkOnly()
);

// Read-only API endpoints: try the network first with a tight timeout, fall
// back to whatever we cached on the last successful response. Picked over
// StaleWhileRevalidate because admin-approved data must reflect reality when
// online; the 4s timeout still gives offline users a fast cached fallback.
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    url.pathname.startsWith('/api/') &&
    !url.pathname.startsWith('/api/auth/'),
  new NetworkFirst({
    cacheName: 'api-reads',
    networkTimeoutSeconds: 4,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// Map tiles: cache-first with an LRU cap. Stays compatible with the OSM
// tile usage policy ("incidental caching"). DO NOT pre-warm the cache.
registerRoute(
  ({ url }) =>
    /\.tile\.openstreetmap\.org$/.test(url.hostname) ||
    /server\.arcgisonline\.com$/.test(url.hostname) ||
    /\.tile\.opentopomap\.org$/.test(url.hostname),
  new CacheFirst({
    cacheName: 'map-tiles',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 400,
        maxAgeSeconds: 30 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Allow the page to ask the SW to activate immediately when the user clicks
// "reload" in the update-available banner.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background Sync: Chrome Android can wake the SW even when the tab is
// closed, drain the queue, and ship the submissions. iOS Safari ignores
// this event silently - the page-level interval/online listeners cover it.
self.addEventListener('sync', (event) => {
  if (event.tag === 'submit-queue') {
    event.waitUntil(drainFromServiceWorker());
  }
});

async function drainFromServiceWorker() {
  // Notify any open clients that they should drain — they own the auth
  // token and the axios stack. If no clients are open we just no-op; the
  // next time the user opens the app, the page-level triggers handle it.
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage({ type: 'DRAIN_SUBMIT_QUEUE' });
  }
}
