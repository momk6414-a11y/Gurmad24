// GURMAD 24 - Service Worker
// V47 refreshes the premium black shell; personal/API data remains uncached.
const CACHE = 'g24-v47-premium-black';
const SHELL = [
  '/', '/index.html',
  '/css/app.css', '/css/design-v4.css', '/css/brand-tokens.css', '/css/splash.css',
  '/css/home-premium.css', '/css/onboarding.css', '/css/home-app.css',
  '/css/v40-premium.css', '/css/v41-account.css', '/css/v41-map.css',
  '/css/v30-1-premium.css', '/css/v44-nextgen.css', '/css/v45-brand-motion.css', '/css/v41-hospital.css',
  '/js/onboarding.js', '/assets/onboarding/ob-sos.svg', '/assets/onboarding/ob-care.svg',
  '/assets/onboarding/ob-map.svg', '/js/splash.js', '/assets/gurmad-logo.svg',
  '/fonts/Poppins-Regular.ttf', '/fonts/Poppins-Bold.ttf',
  '/js/app.js', '/js/core.js', '/js/i18n.js', '/js/map.js', '/js/qr.js',
  '/js/assistant.js', '/js/native.js', '/js/views/public.js', '/js/views/patient.js',
  '/js/views/org.js', '/js/views/ops.js', '/js/views/admin.js', '/js/views/shared.js',
  '/js/views/travel.js', '/manifest.webmanifest', '/icon.svg',
  '/img/hero.svg', '/img/empty.svg', '/img/card-mint.svg', '/img/card-blue.svg',
  '/img/card-violet.svg', '/img/org-hospital.svg', '/img/banner-admin.svg',
  '/img/banner-security.svg', '/img/banner-ops.svg', '/img/banner-ambulance.svg',
  '/img/banner-police.svg', '/img/banner-fire.svg', '/img/banner-hospital.svg',
  '/img/banner-lab.svg', '/img/banner-patient.svg', '/img/org-lab.svg',
  '/img/org-ambulance.svg', '/icons/icon-192.png', '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];
const SHELL_PATHS = new Set(SHELL);
const OFFLINE_API = new Set(['/api/hospitals', '/api/providers', '/api/config']);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    await Promise.all(SHELL.map(async path => {
      try { await cache.add(new Request(path, {cache:'reload'})); }
      catch (error) { console.warn('GURMAD 24: Could not cache:', path, error); }
    }));
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith('g24-') && key !== CACHE && key !== CACHE + '-api').map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (OFFLINE_API.has(url.pathname + url.search)) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) { const copy=response.clone(); caches.open(CACHE+'-api').then(c=>c.put(request,copy)).catch(()=>{}); }
      return response;
    }).catch(async () => (await caches.match(request,{cacheName:CACHE+'-api'})) ||
      new Response('{"error":"offline"}',{status:503,headers:{'Content-Type':'application/json'}})));
    return;
  }
  if (url.pathname.startsWith('/api/') || !SHELL_PATHS.has(url.pathname)) return;
  event.respondWith(fetch(request,{cache:'no-cache'}).then(response => {
    if (response.ok && response.type === 'basic') {
      const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});
    }
    return response;
  }).catch(async () => {
    const cached=await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') return (await caches.match('/index.html')) ||
      new Response('GURMAD 24 is offline. Please reconnect.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    return new Response('Offline',{status:503});
  }));
});