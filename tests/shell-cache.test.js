'use strict';
// Every stylesheet linked from index.html must be precached by the service worker, and the
// phone navigation must keep an Account destination reachable.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const pub = p => fs.readFileSync(path.join(__dirname, '..', 'public', p), 'utf8');

test('service worker precaches every stylesheet linked in index.html', () => {
  const css = [...pub('index.html').matchAll(/rel="stylesheet" href="([^"]+)"/g)].map(m => m[1]);
  assert.ok(css.includes('/css/v41-account.css'));
  const sw = pub('sw.js');
  for (const c of css) assert.ok(sw.includes(`'${c}'`), `sw.js SHELL is missing ${c}`);
});

test('account is reachable: avatar links to the account page and nav keeps a priority Account slot', () => {
  const publicView = pub('js/views/public.js');
  assert.ok(publicView.includes("S.user.role === 'patient' ? '/me/account' : '/account'"));
  assert.ok(publicView.includes("href: '#' + accountPath"));
  const app = pub('js/app.js');
  assert.ok(app.includes("'/me/account']") && app.includes("'/account']"));
});


test('emergency map requests road geometry and exposes a safe fallback', () => {
  const map = pub('js/map.js');
  const app = fs.readFileSync(path.join(__dirname, '..', 'src', 'app.js'), 'utf8');
  assert.ok(map.includes('https://router.project-osrm.org/route/v1/driving/'));
  assert.ok(map.includes('overview=full&geometries=geojson'));
  assert.ok(map.includes('tm-route-fallback'));
  assert.ok(map.includes('Road routing unavailable'));
  assert.ok(app.includes("connect-src 'self' https://router.project-osrm.org"));
});

test('native home map shortcut opens the shared Web App map route', () => {
  const native = fs.readFileSync(path.join(__dirname, '..', 'mobile-native', 'App.tsx'), 'utf8');
  assert.ok(native.includes("setWebPath('/#/map')"));
  assert.ok(native.includes('<WebPage path={webPath} />'));
});
