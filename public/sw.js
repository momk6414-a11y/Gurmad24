
// GURMAD 24 - Service Worker
// Version 10: refreshes old app cache and keeps API/personal data uncached.

const CACHE = 'g24-v10';

const SHELL = [
  '/',
  '/index.html',
  '/css/app.css',
  '/js/app.js',
  '/js/core.js',
  '/js/i18n.js',
  '/js/map.js',
  '/js/views/public.js',
  '/js/views/patient.js',
  '/js/views/org.js',
  '/js/views/ops.js',
  '/js/views/admin.js',
  '/js/views/shared.js',
  '/manifest.webmanifest',
  '/icon.svg',
  '/img/hero.svg',
  '/img/empty.svg',
  '/img/card-mint.svg',
  '/img/card-blue.svg',
  '/img/card-violet.svg',
  '/img/org-hospital.svg',
  '/img/org-lab.svg',
  '/img/org-ambulance.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

const SHELL_PATHS = new Set(SHELL);

// Install the new cache.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(async cache => {
        await Promise.all(
          SHELL.map(async path => {
            try {
              await cache.add(new Request(path, { cache: 'reload' }));
            } catch (error) {
              console.warn('GURMAD 24: Could not cache:', path, error);
            }
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Delete old GURMAD caches and activate the new worker.
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

// Network-first strategy for approved static app files only.
self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache API requests or external websites.
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Ignore files outside the approved app shell.
  if (!SHELL_PATHS.has(url.pathname)) return;

  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then(response => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();

          caches.open(CACHE)
            .then(cache => cache.put(request, copy))
            .catch(error => {
              console.warn('GURMAD 24: Cache update failed:', error);
            });
        }

        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);

        if (cached) return cached;

        if (request.mode === 'navigate') {
          const index = await caches.match('/index.html');

          if (index) return index;

          return new Response(
            'GURMAD 24 is offline. Please reconnect.',
            {
              status: 503,
              headers: {
                'Content-Type': 'text/plain; charset=utf-8'
              }
            }
          );
        }

        return new Response('Offline', { status: 503 });
      })
  );
});
