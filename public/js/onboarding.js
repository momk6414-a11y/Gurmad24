// First-run onboarding: three short slides (Next / Skip), then the log in / sign in screen.
// Shown once per device and only when the person lands on the home route, so deep links and
// emergency pages are never blocked. A "Request help now" link stays visible on every slide.
import { S, h, t, go, setLang } from './core.js';

const KEY = 'g24-onboarded';

const seen = () => { try { return localStorage.getItem(KEY) === '1'; } catch (_) { return false; } };
const mark = () => { try { localStorage.setItem(KEY, '1'); } catch (_) { /* private mode: show again next time */ } };

const SLIDES = [
  { img: '/assets/onboarding/ob-sos.svg', title: 'Help is one tap away', text: 'Reach ambulance, police and fire services from one simple screen.', note: 'Pilot demo: emergency dispatch is simulated.' },
  { img: '/assets/onboarding/ob-care.svg', title: 'Trusted hospitals and health cards', text: 'Find verified hospitals, compare health cards and request appointments.' },
  { img: '/assets/onboarding/ob-map.svg', title: 'See everything on the live map', text: 'Locate hospitals and services near you, in Somali or English.' }
];

const isHome = () => ['', '/'].includes((location.hash.replace(/^#/, '') || '/').split('?')[0]);

export function maybeShowOnboarding() {
  if (seen() || S.user || !isHome() || document.getElementById('g24Onboarding')) return;
  mark(); // mark on display so a refresh mid-way does not repeat it
  showOnboarding();
}

export function showOnboarding(startAt = 0) {
  let index = Math.min(Math.max(startAt, 0), SLIDES.length - 1);
  const root = h('div', { class: 'g24-ob', id: 'g24Onboarding', role: 'dialog', 'aria-modal': 'true', 'aria-label': t('Welcome to GURMAD 24'), tabindex: '-1' });
  document.body.classList.add('g24-ob-active');
  document.body.appendChild(root);

  const close = destination => {
    root.classList.add('is-leaving');
    document.body.classList.remove('g24-ob-active');
    document.removeEventListener('keydown', onKey);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => root.remove(), reduced ? 0 : 320);
    if (destination) go(destination);
  };
  // Skip and finishing both lead to the sign-in screen; "guest" keeps the public app usable without an account.
  const toLogin = () => close('/login');
  const toGuest = () => close('/');
  const toHelp = () => close('/emergency');
  const last = () => index === SLIDES.length - 1;
  const next = () => (last() ? toLogin() : move(index + 1));

  function move(to) {
    index = Math.min(Math.max(to, 0), SLIDES.length - 1);
    draw();
  }

  function onKey(e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); move(index + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); move(index - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); toLogin(); }
  }
  document.addEventListener('keydown', onKey);

  // Swipe between slides.
  let startX = null;
  root.addEventListener('pointerdown', e => { startX = e.clientX; });
  root.addEventListener('pointerup', e => {
    if (startX === null) return;
    const dx = e.clientX - startX; startX = null;
    if (Math.abs(dx) > 48) move(index + (dx < 0 ? 1 : -1));
  });
  root.addEventListener('pointercancel', () => { startX = null; });

  function draw() {
    const slide = SLIDES[index];
    // Keep keyboard focus on the same control after a redraw; start on the dialog itself.
    const active = document.activeElement;
    const keep = active && root.contains(active) && active.classList.length ? active.classList[0] : null;
    root.replaceChildren(...[
      h('div', { class: 'g24-ob__top' },
        h('div', { class: 'g24-ob__brand' }, h('img', { src: '/assets/gurmad-logo.svg', width: 34, height: 34, alt: '' }), h('b', 'Gurmad')),
        h('div', { class: 'g24-ob__top-actions' },
          h('div', { class: 'g24-ob__lang', role: 'group', 'aria-label': t('Language') },
            [['so', 'SO'], ['en', 'EN']].map(([l, n]) => h('button', { type: 'button', 'aria-pressed': S.lang === l, onclick: () => { setLang(l); draw(); } }, n))),
          h('button', { type: 'button', class: 'g24-ob__skip', onclick: toLogin }, t('Skip'))
        )
      ),
      h('div', { class: 'g24-ob__stage', 'aria-live': 'polite' },
        h('img', { class: 'g24-ob__art', src: slide.img, width: 360, height: 300, alt: '', decoding: 'async' }),
        h('h2', { class: 'g24-ob__title' }, t(slide.title)),
        h('p', { class: 'g24-ob__text' }, t(slide.text)),
        slide.note ? h('p', { class: 'g24-ob__note' }, t(slide.note)) : null
      ),
      h('div', { class: 'g24-ob__dots', role: 'tablist', 'aria-label': t('Steps') },
        SLIDES.map((_, i) => h('button', { type: 'button', role: 'tab', class: 'g24-ob__dot', 'aria-selected': i === index, 'aria-label': (i + 1) + ' / ' + SLIDES.length, onclick: () => move(i) }))
      ),
      h('div', { class: 'g24-ob__actions' },
        index > 0 ? h('button', { type: 'button', class: 'g24-ob__back', onclick: () => move(index - 1) }, t('Back')) : h('span'),
        h('button', { type: 'button', class: 'g24-ob__next', onclick: next }, last() ? t('Get started') : t('Next'), h('span', { class: 'g24-ob__arrow', 'aria-hidden': 'true' }, '→'))
      ),
      last() ? h('button', { type: 'button', class: 'g24-ob__guest', onclick: toGuest }, t('Continue as guest')) : null,
      h('button', { type: 'button', class: 'g24-ob__sos', onclick: toHelp }, t('Emergency? Request help now'))
    ].filter(Boolean));
    const target = keep && root.querySelector('.' + keep);
    (target || root).focus({ preventScroll: true });
  }

  draw();
}
