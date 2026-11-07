
// GURMAD 24 - Core application helpers
// SVG icons, API, Somali/English, forms, tables, modals and dashboard tiles.
import { so } from './i18n.js';

// ---------- Storage and application state
const LS = {
  get(k) {
    try { return localStorage.getItem(k); }
    catch (_) { return null; }
  },
  set(k, v) {
    try { localStorage.setItem(k, v); }
    catch (_) { /* Storage unavailable */ }
  },
};

export const S = {
  user: null,
  org: null,
  config: { currency: 'USD', mode: 'DEMO_SANDBOX' },
  lang: LS.get('g24-lang') || 'so',
  cmp: [],
};

export function setLang(l) {
  S.lang = l;
  LS.set('g24-lang', l);
  document.documentElement.lang = l;
}

// ---------- Translation
export function t(s, vars) {
  let out = (S.lang === 'so' && so[s]) || s;
  if (vars) {
    out = out.replace(/\{(\w+)\}/g, (_, k) =>
      vars[k] === undefined ? '' : vars[k]
    );
  }
  return out;
}

// ---------- Safe DOM builder
const SVGNS = 'http://www.w3.org/2000/svg';

export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);

  if (attrs && (
    typeof attrs !== 'object' ||
    attrs.nodeType ||
    Array.isArray(attrs)
  )) {
    kids.unshift(attrs);
    attrs = null;
  }

  for (const [k, v] of Object.entries(attrs || {})) {
    if (k.startsWith('aria-') && typeof v === 'boolean') {
      el.setAttribute(k, String(v));
      continue;
    }

    if (v === false || v === null || v === undefined) continue;

    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2), v);
    }
    else if (
      k === 'style' ||
      k === 'value' ||
      k === 'checked' ||
      k === 'disabled' ||
      k === 'selected'
    ) {
      try { el[k] = v; }
      catch (_) { el.setAttribute(k, v); }
    }
    else {
      el.setAttribute(k, v === true ? '' : v);
    }
  }

  append(el, kids);
  return el;
}

function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k === null || k === undefined || k === false) continue;
    el.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
}

export const frag = (...kids) => {
  const f = document.createDocumentFragment();
  append(f, kids);
  return f;
};

// ---------- SVG icon library
const ICONS = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10M9 20v-6h6v6',
  card: 'M3 6h18v12H3zM3 10h18M7 15h4',
  hospital: 'M4 21V5l8-3 8 3v16M2 21h20M12 8v6M9 11h6',
  ambulance: 'M2 17V7h12v10M14 10h4l4 4v3h-2M2 17h2M8 17h6M6 20a2 2 0 100-4 2 2 0 000 4zM17 20a2 2 0 100-4 2 2 0 000 4zM8 9v4M6 11h4',
  alert: 'M12 3l10 18H2zM12 10v5M12 18v.5',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 4-6 8-6s8 2 8 6',
  bag: 'M5 8h14l-1 13H6zM9 8a3 3 0 016 0',
  calendar: 'M4 5h16v16H4zM4 10h16M8 3v4M16 3v4',
  chat: 'M4 4h16v12H9l-5 4z',
  settings: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4',
  chart: 'M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  users: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20c0-3 3-5 6-5s6 2 6 5M17 11a3 3 0 100-6M21 20c0-2-1.5-4-4-4.5',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  receipt: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  logout: 'M9 4H4v16h5M16 8l4 4-4 4M20 12H9',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6L6 18',
  download: 'M12 4v12M7 11l5 5 5-5M5 20h14',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  flask: 'M9 3h6M10 3v6l-5 10a1 1 0 001 1h12a1 1 0 001-1l-5-10V3',
  money: 'M12 3v18M16 7c0-2-2-3-4-3s-4 1-4 3 2 3 4 4 4 2 4 4-2 3-4 3-4-1-4-3',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM21 21l-5-5',
  dash: 'M3 3h8v10H3zM13 3h8v6h-8zM13 11h8v10h-8zM3 15h8v6H3z',
  audit: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6',
  lock: 'M5 10h14v11H5zM8 10V7a4 4 0 018 0v3',
  heart: 'M20 8c0 5-8 11-8 11S4 13 4 8a4 4 0 017-3l1 1 1-1a4 4 0 017 3z',
  location: 'M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1116 0zM12 10a2 2 0 100-4 2 2 0 000 4',
  mail: 'M3 5h18v14H3zM3 6l9 7 9-7',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l4 2',
};

export function icon(name, size = 20) {
  const s = document.createElementNS(SVGNS, 'svg');

  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('width', size);
  s.setAttribute('height', size);
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '1.8');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('stroke-linejoin', 'round');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');

  const p = document.createElementNS(SVGNS, 'path');
  p.setAttribute('d', ICONS[name] || ICONS.more);
  s.append(p);

  return s;
}

// ---------- API client
export class ApiError extends Error {
  constructor(status, code, fields) {
    super(code);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export async function api(method, path, body) {
  let res;

  try {
    res = await fetch('/api' + path, {
      method,
      headers: body !== undefined
        ? { 'Content-Type': 'application/json' }
        : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
    });
  }
  catch (_) {
    throw new ApiError(0, 'offline');
  }

  let data = null;
  try { data = await res.json(); }
  catch (_) { /* Non-JSON response */ }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      (data && data.error) || 'server_error',
      data && data.fields
    );
  }

  return data;
}

export const GET = p => api('GET', p);
export const POST = (p, b = {}) => api('POST', p, b);
export const PATCH = (p, b = {}) => api('PATCH', p, b);
export const PUT = (p, b = {}) => api('PUT', p, b);
export const DEL = p => api('DELETE', p);

// ---------- Error messages
const ERR = {
  offline: 'No connection to the server. Check your internet and try again.',
  auth_required: 'Please log in first.',
  forbidden: 'You do not have permission for this.',
  not_found: 'Not found.',
  invalid_credentials: 'Wrong email or password.',
  too_many_attempts: 'Too many failed attempts. Try again in 15 minutes.',
  rate_limited: 'Too many requests. Please wait a moment.',
  email_taken: 'This email is already registered.',
  validation_failed: 'Please check the highlighted fields.',
  org_not_verified: 'Your organisation must be verified by an administrator first.',
  card_unavailable: 'This card is no longer available.',
  not_refundable: 'This order cannot be refunded.',
  invalid_transition: 'That status change is not allowed.',
  subscription_required: 'This feature needs an active premium plan.',
  card_suspended: 'This card is suspended by an administrator.',
  last_admin: 'You cannot remove the last administrator.',
  cannot_change_self: 'You cannot change your own role or status.',
  provider_required: 'Assign an ambulance provider first.',
  cannot_cancel: 'This cannot be cancelled any more.',
  plan_unavailable: 'This plan is not available for your organisation.',
  need_two_cards: 'Pick at least two cards.',
  server_error: 'Something went wrong on the server. Please try again.',
  org_unavailable: 'This organisation is not available.',
  payload_too_large: 'Too much data.',
  provider_not_connected: 'This payment provider is not connected.',
};

const FIELD = {
  too_short: 'Too short',
  too_long: 'Too long',
  required: 'Required',
  invalid_email: 'Invalid email',
  invalid_number: 'Invalid number',
  too_small: 'Too small',
  too_large: 'Too large',
  invalid_choice: 'Invalid choice',
  invalid_date: 'Invalid date',
  password_too_short: 'At least 8 characters',
  password_weak: 'Use letters and numbers',
  in_past: 'Date is in the past',
  invalid: 'Invalid value',
};

export const errText = e => t(ERR[e.code] || ERR.server_error);
export const fieldText = c => t(FIELD[c] || c);

// ---------- Formatting
export const money = c =>
  (c < 0 ? '-' : '') + '$' + (Math.abs(c || 0) / 100).toFixed(2);

export const fdate = iso => (iso ? String(iso).slice(0, 10) : '');
export const fdt = iso => (iso ? String(iso).replace('T', ' ').slice(0, 16) : '');
export const pct = bps =>
  (bps / 100).toFixed(2).replace(/\.?0+$/, '') + '%';

// ---------- Status badges
const BADGE = {
  paid_sandbox: 'ok',
  published: 'ok',
  verified: 'ok',
  confirmed: 'ok',
  completed: 'ok',
  resolved: 'ok',
  active: 'ok',
  succeeded: 'ok',
  handed_over: 'ok',
  closed: 'mute',
  draft: 'warn',
  pending: 'warn',
  requested: 'warn',
  received: 'warn',
  open: 'warn',
  refund_requested: 'warn',
  in_review: 'warn',
  assigned: 'info',
  en_route: 'info',
  arrived: 'info',
  declined: 'bad',
  rejected: 'bad',
  suspended: 'bad',
  refunded: 'mute',
  cancelled: 'mute',
  archived: 'mute',
  expired: 'mute',
};

const STATUS_TXT = {
  paid_sandbox: 'Paid (demo)',
  published: 'Published',
  verified: 'Verified',
  confirmed: 'Confirmed',
  completed: 'Completed',
  resolved: 'Resolved',
  active: 'Active',
  handed_over: 'Handed over',
  closed: 'Closed',
  draft: 'Draft',
  pending: 'Pending',
  requested: 'Requested',
  received: 'Received',
  open: 'Open',
  refund_requested: 'Refund requested',
  in_review: 'In review',
  assigned: 'Assigned',
  en_route: 'En route (sim)',
  arrived: 'Arrived (sim)',
  declined: 'Declined',
  rejected: 'Rejected',
  suspended: 'Suspended',
  refunded: 'Refunded',
  cancelled: 'Cancelled',
  archived: 'Archived',
  expired: 'Expired',
};

export const badge = s =>
  h('span', { class: 'badge ' + (BADGE[s] || 'mute') }, t(STATUS_TXT[s] || s));

// ---------- Toast notifications
let toastTimer;

export function toast(msg, kind = 'ok') {
  const el = document.getElementById('toast');
  if (!el) return;

  el.textContent = msg;
  el.className = 'toast show ' + kind;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.className = 'toast';
  }, 3200);
}

// ---------- Modal windows
export function modal(title, body, { wide = false } = {}) {
  const prev = document.activeElement;

  const close = () => {
    back.remove();
    document.body.classList.remove('noscroll');
    if (prev && prev.focus) prev.focus();
  };

  const box = h(
    'div',
    {
      class: 'modal' + (wide ? ' wide' : ''),
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': title,
    },
    h(
      'div',
      { class: 'modal-head' },
      h('h3', title),
      h(
        'button',
        {
          class: 'icon-btn',
          'aria-label': t('Close'),
          onclick: close,
        },
        icon('x')
      )
    ),
    h('div', { class: 'modal-body' }, body)
  );

  const back = h(
    'div',
    {
      class: 'backdrop',
      onclick: e => {
        if (e.target === back) close();
      },
    },
    box
  );

  document.body.append(back);
  document.body.classList.add('noscroll');

  const first = box.querySelector('input,select,textarea,button.btn');
  if (first) first.focus();

  return { close, box };
}

export const confirmBox = (msg, okText) =>
  new Promise(res => {
    let m;

    const done = v => {
      m.close();
      res(v);
    };

    m = modal(
      t('Please confirm'),
      h(
        'div',
        h('p', msg),
        h(
          'div',
          { class: 'actions end' },
          h(
            'button',
            { class: 'btn ghost', onclick: () => done(false) },
            t('Cancel')
          ),
          h(
            'button',
            { class: 'btn', onclick: () => done(true) },
            okText || t('Confirm')
          )
        )
      )
    );
  });

// ---------- Forms
export function form(
  fields,
  { submit = 'Save', onSubmit, initial = {}, cancel } = {}
) {
  const inputs = {};
  const errs = {};

  const banner = h('div', {
    class: 'form-error',
    role: 'alert',
  });

  const rows = fields.map(f => {
    const val =
      initial[f.name] !== undefined && initial[f.name] !== null
        ? initial[f.name]
        : f.default;

    let el;

    const base = {
      id: 'f_' + f.name,
      name: f.name,
      required: f.required,
      placeholder: f.placeholder ? t(f.placeholder) : undefined,
      maxlength: f.max,
    };

    if (f.type === 'textarea' || f.type === 'lines') {
      el = h('textarea', { ...base, rows: f.rows || 3 });
      el.value = f.type === 'lines'
        ? (val || []).join('\n')
        : (val || '');
    }
    else if (f.type === 'select') {
      el = h(
        'select',
        base,
        (f.options || []).map(([v, l]) =>
          h(
            'option',
            {
              value: v,
              selected: String(v) === String(val),
            },
            t(l)
          )
        )
      );
    }
    else if (f.type === 'checkbox') {
      el = h('input', {
        ...base,
        type: 'checkbox',
        checked: !!val,
      });
    }
    else if (f.type === 'money') {
      el = h('input', {
        ...base,
        type: 'number',
        step: '0.01',
        min: '0',
        inputmode: 'decimal',
        value: val === undefined || val === ''
          ? ''
          : (val / 100).toFixed(2),
      });
    }
    else if (f.type === 'percent') {
      el = h('input', {
        ...base,
        type: 'number',
        step: '0.01',
        min: '0',
        max: '50',
        inputmode: 'decimal',
        value: val === undefined || val === null || val === ''
          ? ''
          : (val / 100).toFixed(2),
      });
    }
    else {
      el = h('input', {
        ...base,
        type: f.type || 'text',
        min: f.min,
        value: val === undefined ? '' : val,
        autocomplete: f.autocomplete,
        inputmode: f.inputmode,
      });
    }

    inputs[f.name] = el;

    const er = h('div', { class: 'field-error' });
    errs[f.name] = er;

    const label = h(
      'label',
      { for: 'f_' + f.name },
      t(f.label),
      f.required
        ? h('span', {
            class: 'req',
            'aria-hidden': 'true',
          }, ' *')
        : null
    );

    return f.type === 'checkbox'
      ? h(
          'div',
          { class: 'field check' },
          el,
          label,
          f.hint ? h('small', t(f.hint)) : null,
          er
        )
      : h(
          'div',
          { class: 'field' },
          label,
          el,
          f.hint ? h('small', { class: 'hint' }, t(f.hint)) : null,
          er
        );
  });

  const btn = h(
    'button',
    { class: 'btn', type: 'submit' },
    t(submit)
  );

  const f = h(
    'form',
    {
      novalidate: true,
      onsubmit: async e => {
        e.preventDefault();

        banner.textContent = '';
        Object.values(errs).forEach(x => {
          x.textContent = '';
        });

        const v = {};

        for (const fd of fields) {
          const el = inputs[fd.name];
          let x;

          if (fd.type === 'checkbox') x = el.checked;
          else if (fd.type === 'lines') {
            x = el.value
              .split('\n')
              .map(s => s.trim())
              .filter(Boolean);
          }
          else if (fd.type === 'money' || fd.type === 'percent') {
            x = el.value === ''
              ? undefined
              : Math.round(Number(el.value) * 100);
          }
          else if (fd.type === 'number') {
            x = el.value === '' ? undefined : Number(el.value);
          }
          else {
            x = el.value;
          }

          if (x !== undefined) v[fd.name] = x;
        }

        btn.disabled = true;
        btn.classList.add('busy');

        try {
          await onSubmit(v);
        }
        catch (err) {
          if (err instanceof ApiError) {
            banner.textContent = errText(err);

            for (const [k, c] of Object.entries(err.fields || {})) {
              const key = k.replace(/\[\d+\]$/, '');
              if (errs[key]) errs[key].textContent = fieldText(c);
            }
          }
          else {
            banner.textContent = t(ERR.server_error);
            console.error(err);
          }
        }
        finally {
          btn.disabled = false;
          btn.classList.remove('busy');
        }
      },
    },
    rows,
    banner,
    h(
      'div',
      { class: 'actions' },
      btn,
      cancel
        ? h(
            'button',
            {
              class: 'btn ghost',
              type: 'button',
              onclick: cancel,
            },
            t('Cancel')
          )
        : null
    )
  );

  f.inputs = inputs;
  return f;
}

// ---------- Responsive tables
export function table(cols, rows, { empty = 'Nothing here yet.' } = {}) {
  if (!rows.length) return emptyState(empty);

  return h(
    'div',
    { class: 'table-wrap' },
    h(
      'table',
      { class: 'rt' },
      h(
        'thead',
        h(
          'tr',
          cols.map(c => h('th', t(c.label)))
        )
      ),
      h(
        'tbody',
        rows.map(r =>
          h(
            'tr',
            cols.map(c =>
              h(
                'td',
                {
                  'data-l': t(c.label),
                  class: c.class,
                },
                c.render ? c.render(r) : r[c.key]
              )
            )
          )
        )
      )
    )
  );
}

// ---------- Empty states and loading
export const emptyState = (msg, action) =>
  h(
    'div',
    { class: 'empty' },
    icon('list', 28),
    h('p', t(msg)),
    action || null
  );

export const loading = () =>
  h(
    'div',
    {
      class: 'loading',
      role: 'status',
      'aria-live': 'polite',
    },
    h('div', { class: 'skel' }),
    h('div', { class: 'skel short' }),
    h('div', { class: 'skel' })
  );

// ---------- Panels and dashboard tiles
export const panel = (title, body, right) =>
  h(
    'section',
    { class: 'panel' },
    title || right
      ? h(
          'div',
          { class: 'panel-head' },
          h('h3', title ? t(title) : ''),
          right || null
        )
      : null,
    body
  );

function tileIcon(label) {
  const text = String(label || '').toLowerCase();

  if (/hospital|clinic|isbitaal/.test(text)) return 'hospital';
  if (/ambulance|emergency|gurmad/.test(text)) return 'ambulance';
  if (/verification|verified|provider|organization/.test(text)) return 'shield';
  if (/user|patient|account|qof/.test(text)) return 'users';
  if (/card|kaar/.test(text)) return 'card';
  if (/order|booking|appointment|ballan|refund/.test(text)) return 'calendar';
  if (/revenue|sales|subscription|finance|money|lacag/.test(text)) return 'money';
  if (/complaint|support|help|taageero/.test(text)) return 'chat';
  if (/setting|dejinta/.test(text)) return 'settings';
  if (/case|request|pending|codsi/.test(text)) return 'alert';
  if (/published/.test(text)) return 'list';

  return 'chart';
}

export const tile = (label, value, sub, onclick) =>
  h(
    onclick ? 'button' : 'div',
    {
      class: 'tile' + (onclick ? ' click' : ''),
      onclick,
      type: onclick ? 'button' : undefined,
    },
    h(
      'span',
      { class: 'tile-title' },
      icon(tileIcon(label), 18),
      t(label)
    ),
    h('b', value),
    sub ? h('small', sub) : null
  );

// ---------- Lists and notices
export const list = items =>
  h(
    'ul',
    { class: 'bul' },
    items.map(i => h('li', i))
  );

export const demoNote = text =>
  h(
    'div',
    { class: 'note' },
    icon('alert', 18),
    h('span', t(text))
  );

// ---------- File downloads
export function download(name, text, type = 'application/json') {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);

  const a = h('a', {
    href: url,
    download: name,
  });

  document.body.appen