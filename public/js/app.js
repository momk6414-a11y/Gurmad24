
// App shell: session, navigation per role, hash router, service worker.
import { S, t, h, icon, GET, POST, setLang, errText, loading, emptyState, toast, ApiError } from './core.js';
import * as P from './views/public.js';
import * as PT from './views/patient.js';
import * as O from './views/org.js';
import * as OPS from './views/ops.js';
import * as A from './views/admin.js';
import { mountAssistant } from './assistant.js';

const ROLE_HOME = { patient: '/', hospital_admin: '/org', provider_admin: '/org', operator: '/ops', admin: '/admin' };
const ORG = ['hospital_admin', 'provider_admin'];

// [pattern, allowed roles (null = everyone), handler]
const ROUTES = [
  ['/', null, P.home], ['/cards', null, P.cards], ['/cards/:id', null, P.cardDetail], ['/compare', null, P.compare], ['/hospitals', null, P.hospitals], ['/hospitals/:id', null, P.hospitalDetail],
  ['/services', null, P.services], ['/map', null, P.puntlandMap], ['/system', null, P.system], ['/emergency', null, P.emergency], ['/login', null, P.login], ['/register', null, P.register], ['/register-org', null, P.registerOrg], ['/privacy', null, P.privacy],
  ['/me/orders', ['patient'], PT.orders], ['/me/orders/:id', ['patient'], PT.orderDetail], ['/me/appointments', ['patient'], PT.appointments], ['/me/support', ['patient'], PT.support], ['/me/account', ['patient'], PT.account], ['/account', ['hospital_admin', 'provider_admin', 'operator', 'admin'], PT.account],
  ['/org', ORG, O.dashboard], ['/org/cards', ['hospital_admin'], O.cards], ['/org/services', ORG, O.servicesPage], ['/org/appointments', ORG, O.appointments], ['/org/sales', ORG, O.sales], ['/org/subscription', ORG, O.subscription],
  ['/org/complaints', ORG, O.complaints], ['/org/profile', ORG, O.profile], ['/org/requests', ['provider_admin'], O.requests],
  ['/ops', ['operator', 'admin'], OPS.dashboard], ['/ops/case/:id', ['operator', 'admin'], OPS.caseDetail], ['/ops/directory', ['operator', 'admin'], OPS.directory],
  ['/admin', ['admin'], A.overview], ['/admin/orgs', ['admin'], A.orgs], ['/admin/users', ['admin'], A.users], ['/admin/cards', ['admin'], A.cards], ['/admin/finance', ['admin'], A.finance],
  ['/admin/revenue', ['admin'], A.revenue], ['/admin/settings', ['admin'], A.settings], ['/admin/complaints', ['admin'], A.complaints], ['/admin/audit', ['admin'], A.audit],
].map(([p, roles, fn]) => {
  const keys = [];
  const re = new RegExp('^' + p.replace(/:(\w+)/g, (_, k) => {
    keys.push(k);
    return '([^/]+)';
  }) + '$');
  return { p, re, keys, roles, fn };
});

function navItems() {
  const u = S.user;
  const org = S.org;

  if (!u) return [
    ['/', 'home', 'Home'],
    ['/cards', 'card', 'Cards'],
    ['/hospitals', 'hospital', 'Hospitals'],
    ['/services', 'ambulance', 'Services'],
    ['/me/support', 'chat', 'Support'],
    ['/map', 'pin', 'Map'],
    ['/emergency', 'alert', 'Emergency'],
    ['/login', 'user', 'Log in']
  ];

  switch (u.role) {
    case 'patient':
      return [
        ['/', 'home', 'Home'],
        ['/cards', 'card', 'Cards'],
        ['/hospitals', 'hospital', 'Hospitals'],
        ['/me/support', 'chat', 'Support'],
        ['/me/orders', 'bag', 'Orders'],
        ['/me/appointments', 'calendar', 'Appointments'],
        ['/services', 'ambulance', 'Services'],
        ['/map', 'pin', 'Map'],
    ['/emergency', 'alert', 'Emergency'],
        ['/me/account', 'user', 'Account']
      ];

    case 'hospital_admin':
      return [
        ['/org', 'dash', 'Dashboard'],
        ['/org/cards', 'card', 'Cards'],
        ['/org/services', 'list', 'Services'],
        ['/org/appointments', 'calendar', 'Appointments'],
        ['/org/sales', 'chart', 'Sales'],
        ['/org/subscription', 'receipt', 'Subscription'],
        ['/org/complaints', 'chat', 'Support'],
        ['/org/profile', 'hospital', 'Profile'],
        ['/account', 'user', 'Account']
      ];

    case 'provider_admin':
      return [
        ['/org', 'dash', 'Dashboard'],
        ...(org && ['ambulance', 'police', 'fire'].includes(org.type) ? [['/org/requests', 'alert', 'Requests']] : []),
        ...(org && ['police', 'fire'].includes(org.type) ? [] : [
          ['/org/services', 'list', 'Services'],
          ['/org/appointments', 'calendar', 'Appointments'],
          ['/org/sales', 'chart', 'Revenue'],
          ['/org/subscription', 'receipt', 'Subscription']
        ]),
        ['/org/profile', 'hospital', 'Profile'],
        ['/account', 'user', 'Account']
      ];

    case 'operator':
      return [
        ['/ops', 'alert', 'Cases'],
        ['/ops/directory', 'hospital', 'Directory'],
        ['/account', 'user', 'Account']
      ];

    case 'admin':
      return [
        ['/admin', 'dash', 'Overview'],
        ['/admin/orgs', 'hospital', 'Organisations'],
        ['/admin/users', 'users', 'Users'],
        ['/admin/cards', 'card', 'Cards'],
        ['/admin/finance', 'receipt', 'Finance'],
        ['/admin/revenue', 'chart', 'Revenue'],
        ['/admin/settings', 'settings', 'Settings'],
        ['/admin/complaints', 'chat', 'Support'],
        ['/admin/audit', 'audit', 'Audit'],
        ['/ops', 'alert', 'Cases'],
        ['/account', 'user', 'Account']
      ];
  }

  return [];
}

function chrome() {
  const view = document.getElementById('view');

  document.getElementById('top').replaceChildren(
    h('a', { class: 'brand', href: '#/' },
      h('img', { class: 'logo-img', src: '/icon.svg', width: 42, height: 42, alt: '' }),
      h('div',
        h('b', 'GURMAD 24'),
        h('small', t('Emergency Coordination & Health Marketplace'))
      )
    ),
    h('div', { class: 'top-actions' },
      h('div', { class: 'seg', role: 'group', 'aria-label': t('Language') },
        [['so', 'SO'], ['en', 'EN']].map(([l, n]) =>
          h('button', {
            'aria-pressed': S.lang === l,
            onclick: () => {
              setLang(l);
              chrome();
              render(true);
            }
          }, n)
        )
      ),
      S.user
        ? h('button', { class: 'btn sm ghost', onclick: logout }, icon('logout', 16), t('Log out'))
        : null
    )
  );

  // Persistent internet status and demo safety notice.
  const banner = document.getElementById('demoBanner');

  if (banner) {
    const demoMessage = t('SAFE TEST MODE: demo data, sandbox payments, no live dispatch. Not for real emergencies.');
    const offlineMessage = 'OFFLINE: Internet connection is unavailable. Changes have not been sent.';
    banner.textContent = navigator.onLine
      ? demoMessage
      : offlineMessage + ' ' + demoMessage;
    banner.setAttribute('role', 'status');
    banner.setAttribute('aria-live', 'polite');
  }

  const cur = currentPath();
  const items = navItems();

  const best = items
    .filter(([p]) => cur === p || (p !== '/' && cur.startsWith(p + '/')))
    .sort((a, b) => b[0].length - a[0].length)[0];

  document.getElementById('nav').replaceChildren(
    ...items.map(([p, ic, label]) =>
      h('a', {
        href: '#' + p,
        'aria-current': best && best[0] === p ? 'page' : null
      }, icon(ic, 20), t(label))
    )
  );

  document.getElementById('footer').replaceChildren(
    h('div', t('GURMAD 24 - pilot: Gaalkacyo. Demo only: not insurance, not a medical service, not for live emergency use.')),
    h('a', { href: '#/privacy' }, t('Privacy notice'))
  );

  document.title = 'GURMAD 24';
  void view;
}

async function logout() {
  try {
    await POST('/auth/logout');
  } catch (_) {
    // Ignore logout network errors.
  }

  S.user = null;
  S.org = null;
  chrome();
  location.hash = '#/';
  render(true);
}

async function loadMe() {
  try {
    const r = await GET('/auth/me');
    S.user = r.user;
    S.org = r.org || null;

    if (S.user && S.user.lang && !localStorage.getItem('g24-lang')) {
      setLang(S.user.lang);
    }
  } catch (_) {
    S.user = null;
  }
}

const currentPath = () =>
  (location.hash.replace(/^#/, '') || '/').split('?')[0];

let lastKey = '';

async function render(keepScroll) {
  if (S.poll) { clearInterval(S.poll); S.poll = null; } // live views start their own timer
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const query = Object.fromEntries(new URLSearchParams(qs || ''));
  const view = document.getElementById('view');

  const route = ROUTES.find(r => r.re.test(path));
  chrome();

  if (!route) {
    view.replaceChildren(
      emptyState('Page not found.', h('a', { class: 'btn', href: '#/' }, t('Home')))
    );
    return;
  }

  if (route.roles && !S.user) {
    sessionStorage.setItem('g24-after', '#' + raw);
    location.hash = '#/login';
    return;
  }

  if (route.roles && !route.roles.includes(S.user.role)) {
    view.replaceChildren(
      emptyState(
        'You do not have access to this page.',
        h('a', { class: 'btn', href: '#' + ROLE_HOME[S.user.role] }, t('Home'))
      )
    );
    return;
  }

  if (path === '/' && S.user && S.user.role !== 'patient') {
    location.hash = '#' + ROLE_HOME[S.user.role];
    return;
  }

  const m = route.re.exec(path);
  const params = { query };

  route.keys.forEach((k, i) => {
    params[k] = decodeURIComponent(m[i + 1]);
  });

  const y = window.scrollY;
  const key = raw;

  view.replaceChildren(loading());

  try {
    const node = await route.fn(params);

    if (
      location.hash.replace(/^#/, '') !== raw &&
      (location.hash.replace(/^#/, '') || '/') !== raw
    ) return;

    view.replaceChildren(node);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      S.user = null;
      chrome();
      sessionStorage.setItem('g24-after', '#' + raw);
      location.hash = '#/login';
      return;
    }

    view.replaceChildren(
      emptyState(
        e instanceof ApiError ? errText(e) : 'Something went wrong.',
        h('button', { class: 'btn', onclick: () => render() }, t('Try again'))
      )
    );

    if (!(e instanceof ApiError)) console.error(e);
  }

  if (keepScroll || key === lastKey) {
    window.scrollTo(0, y);
  } else {
    window.scrollTo(0, 0);
    view.focus({ preventScroll: true });
  }

  lastKey = key;

  document.title =
    (view.querySelector('h2') ? view.querySelector('h2').textContent + ' | ' : '') +
    'GURMAD 24';
}

// Navigation.
window.addEventListener('hashchange', () => render());

// Authentication changes.
window.addEventListener('g24-auth', async () => {
  await loadMe();
  chrome();
});

// Internet connection status.
window.addEventListener('offline', () => {
  chrome();
  toast('Internet is disconnected. Changes have not been sent.', 'err');
});

window.addEventListener('online', () => {
  chrome();
  toast('Internet connection restored. Please retry any unsent actions.');
});

// Start application. Paint the shell before waiting for network requests.
(async function boot() {
  document.documentElement.lang = S.lang;
  chrome();
  const view = document.getElementById('view');
  view.replaceChildren(loading());

  try {
    // Render a usable first screen immediately; public views handle API errors themselves.
    await render();

    const results = await Promise.allSettled([GET('/config'), loadMe()]);
    if (results[0].status === 'fulfilled') S.config = results[0].value;
    if (results[1].status === 'rejected') {
      S.user = null;
      S.org = null;
    }
    // Refresh role-aware navigation after session lookup completes.
    await render(true);
  } catch (error) {
    console.error('GURMAD 24 startup failed:', error);
    chrome();
    view.replaceChildren(emptyState(
      'GURMAD 24 could not finish loading. Check your connection and try again.',
      h('button', { class: 'btn', type: 'button', onclick: () => location.reload() }, t('Try again'))
    ));
  }

  try {
    mountAssistant();
  } catch (error) {
    console.error('GURMAD 24 assistant could not start:', error);
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then(registration => registration && registration.update && registration.update())
      .catch(error => console.error('GURMAD 24 service worker update failed:', error));
  }
})();
