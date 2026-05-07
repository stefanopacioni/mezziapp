// MezziApp Service Worker
// Bump this version string whenever you deploy an update to GitHub Pages.
// The browser detects the change, installs the new SW, and refreshes the cache.
const CACHE_VERSION = 'mezziapp-v6';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500&display=swap'
];

// ── Install: pre-cache shell ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      // Cache the app shell; font URL may fail offline — ignore errors
      return cache.addAll(ASSETS).catch(() => cache.add('./index.html'));
    }).then(() => self.skipWaiting())
  );
});

// ── Activate: delete old caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for app shell, network-first for rest ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always serve index.html from cache when offline (navigation requests)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Cache-first for same-origin assets and fonts
  if (url.origin === self.location.origin || url.hostname === 'fonts.gstatic.com' || url.hostname === 'fonts.googleapis.com') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const network = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_VERSION).then(c => c.put(event.request, response.clone()));
          }
          return response;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Default: network with cache fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// ── Push Notifications ────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  self.registration.showNotification(data.title || 'MezziApp', {
    body: data.body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: data.tag || 'mezziapp',
    renotify: true
  });
});
