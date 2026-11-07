
// GURMAD 24 Service Worker
// Cache static app files only. Never cache API or personal data.

const CACHE = 'g24-v4';

const SHELL = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/app.js',
  '/js/core.js',
  '/js/i18n.js',
  '/js/views/public.js',
  '/js/views/patient.js',
  '/js/views/org.js',
  '/js/views/ops.js',
  '/js/views/admin.js',
  '/js/views/shared.js',
  '/manifest.webmanifest',
  '/icon.svg',
  '/img/hero.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

const SHELL_PATHS = new Set(SHELL);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(async cache => {
        await Promise.all(
          SHELL.map(path =>
            cache.add(path).catch(error => {
              console.warn('Could not cache:', path, error);
            })
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key.startsWith('g24-') && key !== CACHE)
            .map(key => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Never intercept POST, API requests or external websites.
  if (
    request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Only handle approved static app files.
  if (!SHELL_PATHS.has(url.pathname)) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);

        if (cached) return cached;

        if (request.mode === 'navigate') {
          return await caches.match('/index.html') ||
            new Response('GURMAD 24 is offline. Please reconnect.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            });
        }

        return new Response('Offline', { status: 503 });
      })
  );
});
