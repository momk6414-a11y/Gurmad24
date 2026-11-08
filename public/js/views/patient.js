// Patient / public account screens.
import { S, t, h, icon, GET, POST, PATCH, form, modal, toast, money, badge, table, panel, list, demoNote, emptyState, errText, go, fdate, fdt, download, setLang, confirmBox, link } from '../core.js';
import { receiptNode, cardPass, payName } from './shared.js';
import { APPT_CATS } from './public.js';

const head = (title, sub, right) => h('div', { class: 'page-head' }, h('div', h('h2', t(title)), sub ? h('p', t(sub)) : null), right || null);
const catName = c => t((APPT_CATS.find(x => x[0] === c) || [0, c])[1]);

export async function orders() {
  const { orders: os } = await GET('/orders');
  return h('div', head('My cards', 'Your digital health cards. Show the code or QR at the hospital.'),
    os.length ? h('div', { class: 'wallet' }, os.map(o => h('div', { class: 'wallet-item' }, cardPass(o, { compact: true }),
      h('div', { class: 'actions' }, h('a', { class: 'btn sm', href: '#/me/orders/' + o.id }, t('Open card')), h('span', { class: 'muted' }, money(o.priceCents) + ' - ' + fdate(o.createdAt)))))) : null,
    os.length ? null : h('div', emptyState('You have no orders yet.'), h('div', { class: 'actions' }, h('a', { class: 'btn', href: '#/cards' }, t('Browse health cards')))));
}

export async function orderDetail({ id }) {
  const { order: o, receipt } = await GET('/orders/' + id); const box = h('div');
  const refundBtn = o.status === 'paid_sandbox' ? h('button', { class: 'btn ghost', onclick: refund }, t('Request refund')) : null;
  function refund() {
    let m; m = modal(t('Request refund'), h('div', demoNote('Refunds follow the hospital refund policy and are decided by an administrator.'), h('p', { style: 'color:var(--muted)' }, o.cardSnapshot.refundPolicy),
      form([{ name: 'reason', label: 'Reason', type: 'textarea', required: true, max: 300 }], { submit: 'Send refund request', cancel: () => m.close(), onSubmit: async v => { await POST(`/orders/${id}/refund-request`, v); m.close(); toast(t('Refund request sent.')); route(); } })));
  }
  const route = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
  return h('div', head(o.code, o.cardSnapshot.name + ' - ' + o.cardSnapshot.hospitalName, h('span', badge(o.status))),
    h('div', { class: 'cardpass-wrap' }, cardPass(o)),
    h('div', { class: 'grid g2' }, panel('Card details', h('div', h('dl', { class: 'kv' }, h('dt', t('Price')), h('dd', money(o.priceCents)), h('dt', t('Valid until')), h('dd', fdate(o.validUntil)), h('dt', t('Payment')), h('dd', (payName(o.paymentMethod) ? payName(o.paymentMethod) + ' ' + (o.payerPhone || '') + ' - ' : '') + t('Sandbox ({ref})', { ref: o.providerRef })),
      h('dt', t('Included services')), h('dd', list(o.cardSnapshot.included)), h('dt', t('Not included')), h('dd', list(o.cardSnapshot.excluded))),
      o.refund ? h('div', { class: 'note' }, icon('alert', 18), h('span', t('Refund: {s}', { s: o.refund.decision ? t(o.refund.decision === 'approve' ? 'approved' : 'denied') + (o.refund.note ? ' - ' + o.refund.note : '') : t('waiting for review') }))) : null,
      h('div', { class: 'actions' }, refundBtn, h('button', { class: 'btn ghost', onclick: () => window.print() }, icon('download'), t('Print / save PDF'))))),
      panel('Receipt', receiptNode(receipt))),
    panel('Terms and conditions (as purchased)', h('p', o.cardSnapshot.terms)), box);
}

export async function appointments() {
  const { appointments: as } = await GET('/appointments');
  return h('div', head('My appointments', 'Requests sent to hospitals and laboratories.', h('a', { class: 'btn', href: '#/hospitals' }, icon('plus'), t('New request'))),
    panel(null, table([{ label: 'Where', key: 'orgName' }, { label: 'Reason type', render: a => catName(a.category) }, { label: 'Preferred date', render: a => fdate(a.preferredDate) }, { label: 'Status', render: a => badge(a.status) }, { label: 'Hospital note', render: a => a.orgNote || '-' },
      { label: '', render: a => ['requested', 'confirmed'].includes(a.status) ? h('button', { class: 'btn sm ghost', onclick: async () => { if (await confirmBox(t('Cancel this appointment request?'))) { await POST(`/appointments/${a.id}/cancel`); toast(t('Cancelled.')); window.dispatchEvent(new HashChangeEvent('hashchange')); } } }, t('Cancel')) : null }], as,
    { empty: 'No appointment requests yet.' })));
}

export async function support() {
  const [{ complaints: cs }, hs] = await Promise.all([GET('/complaints'), GET('/hospitals')]);
  const fm = form([{ name: 'orgId', label: 'Related to (optional)', type: 'select', options: [['', 'General question for GURMAD 24'], ...hs.hospitals.map(x => [x.id, x.name])] }, { name: 'subject', label: 'Subject', required: true, max: 100 }, { name: 'message', label: 'Message', type: 'textarea', required: true, max: 1000, hint: 'Do not include medical details.' }],
    { submit: 'Send', onSubmit: async v => { if (!v.orgId) delete v.orgId; await POST('/complaints', v); toast(t('Message sent. We will reply here.')); window.dispatchEvent(new HashChangeEvent('hashchange')); } });
  return h('div', head('Customer support', 'Ask a question or file a complaint about an order, hospital or provider.'),
    h('div', { class: 'grid g2' }, panel('New message', fm),
      panel('My tickets', cs.length ? h('div', cs.map(c => h('div', { style: 'border-top:1px solid var(--line);padding:10px 0' }, h('div', { style: 'display:flex;justify-content:space-between;gap:8px' }, h('b', c.code + ' - ' + c.subject), badge(c.status)),
        c.responses.map(r => h('p', { style: 'margin:6px 0;font-size:14px' }, h('small', { style: 'color:var(--muted)' }, fdt(r.ts) + ' - ' + t(r.by === 'patient' ? 'You' : r.by === 'admin' ? 'GURMAD 24' : 'Hospital') + ': '), r.text)),
        h('button', { class: 'btn sm ghost', onclick: () => reply(c) }, t('Reply'))))) : emptyState('No tickets yet.'))));
}
function reply(c) {
  let m; m = modal(c.code, form([{ name: 'text', label: 'Your reply', type: 'textarea', required: true, max: 1000 }], { submit: 'Send', cancel: () => m.close(), onSubmit: async v => { await POST(`/complaints/${c.id}/reply`, v); m.close(); window.dispatchEvent(new HashChangeEvent('hashchange')); } }));
}

function securityPanels() {
  const box = h('div'); const u = S.user;
  const draw = async () => {
    const { sessions } = await GET('/auth/sessions');
    const twofa = h('div');
    const show2fa = () => twofa.replaceChildren(u.twoFactor
      ? h('div', h('p', h('b', t('Two-step login is ON.'))), h('button', { class: 'btn danger sm', onclick: () => { let m; m = modal(t('Turn off two-step login'), form([{ name: 'password', label: 'Password', type: 'password', required: true }, { name: 'code', label: 'Authenticator code', required: true, max: 12 }], { submit: 'Turn off', cancel: () => m.close(), onSubmit: async v => { await POST('/auth/2fa/disable', v); u.twoFactor = false; m.close(); toast(t('Saved.')); show2fa(); } })); } }, t('Turn off')))
      : h('div', h('p', t('Add a second step: a 6-digit code from an authenticator app (Google Authenticator, Microsoft Authenticator, Aegis). Recommended for staff and admins.')),
        h('button', { class: 'btn sm', onclick: () => startSetup(false) }, t('Set up two-step login'))));
    async function startSetup(reset) {
      const r = await POST('/auth/2fa/setup', { reset });
      const grouped = r.secret.match(/.{1,4}/g).join(' ');
      const copy = h('button', { class: 'btn sm ghost', type: 'button', onclick: async () => { try { await navigator.clipboard.writeText(r.secret); toast(t('Key copied.')); } catch (_) { toast(t('Select the key and copy it.'), 'err'); } } }, t('Copy key'));
      twofa.replaceChildren(h('div',
        h('p', h('b', t('Step 1.')), ' ', t('Add this key to your authenticator app.')),
        h('p', { class: 'note warn' }, t('If you already have a GURMAD 24 entry in the app from an earlier try, delete it first. Only the newest key works.')),
        h('p', { class: 'mono key' }, grouped),
        h('div', { class: 'actions tight' }, copy, h('a', { class: 'btn sm', href: r.uri }, t('Open in authenticator app'))),
        h('p', { class: 'hint' }, t('In the app choose "Enter a setup key", account "GURMAD 24", type "Time based". Phone time must be automatic. Server time (UTC): {t}', { t: r.serverTime.slice(11, 19) })),
        h('p', h('b', t('Step 2.')), ' ', t('Enter the 6-digit code it shows:')),
        form([{ name: 'code', label: 'Authenticator code', required: true, max: 12, inputmode: 'numeric', autocomplete: 'one-time-code' }], { submit: 'Confirm', onSubmit: async v => { await POST('/auth/2fa/enable', v); u.twoFactor = true; toast(t('Two-step login is ON.')); show2fa(); } }),
        h('button', { class: 'btn sm ghost', type: 'button', onclick: () => startSetup(true) }, t('Start again with a new key'))));
    }
    show2fa();
    box.replaceChildren(h('div', { class: 'grid g2' },
      panel('Two-step login', twofa),
      panel('Devices signed in', h('div', h('ul', { class: 'plain' }, sessions.map(x => h('li', fdt(x.createdAt), ' ', x.ip || '', x.current ? h('b', ' - ' + t('this device')) : null))),
        sessions.length > 1 ? h('button', { class: 'btn ghost sm', onclick: async () => { await POST('/auth/sessions/revoke-others'); toast(t('Other devices signed out.')); draw(); } }, t('Sign out other devices')) : null))));
  };
  draw().catch(() => {}); return box;
}

export function account() {
  const u = S.user;
  return h('div', head('My account'), securityPanels(),
    h('div', { class: 'grid g2' },
      panel('Profile', form([{ name: 'name', label: 'Full name', required: true, max: 80 }, { name: 'lang', label: 'Language', type: 'select', options: [['so', 'Somali'], ['en', 'English']] }], { initial: u, submit: 'Save',
        onSubmit: async v => { const r = await PATCH('/auth/profile', v); S.user = r.user; setLang(v.lang); toast(t('Saved.')); window.dispatchEvent(new CustomEvent('g24-auth')); } })),
      panel('Change password', form([{ name: 'current', label: 'Current password', type: 'password', required: true }, { name: 'next', label: 'New password', type: 'password', required: true, hint: 'At least 8 characters with letters and numbers.' }], { submit: 'Change password', onSubmit: async v => { await POST('/auth/change-password', v); toast(t('Password changed.')); } }))),
    panel('Privacy and data', h('div', h('p', t('You can download everything we hold about you, or delete your account. Deleting removes your name and contact details; anonymous financial records are kept.')),
      h('div', { class: 'actions' }, h('button', { class: 'btn ghost', onclick: async () => { const d = await GET('/auth/export'); download('gurmad24-my-data.json', JSON.stringify(d, null, 2)); } }, icon('download'), t('Download my data')),
        h('button', { class: 'btn danger', onclick: deleteAccount }, t('Delete my account'))), h('p', {}, link('/privacy', t('Privacy notice'))))));
}
function deleteAccount() {
  let m; m = modal(t('Delete my account'), h('div', h('p', t('This cannot be undone. Enter your password to confirm.')), form([{ name: 'password', label: 'Password', type: 'password', required: true }], { submit: 'Delete permanently', cancel: () => m.close(),
    onSubmit: async v => { await POST('/auth/delete-account', v); m.close(); S.user = null; window.dispatchEvent(new CustomEvent('g24-auth')); toast(t('Account deleted.')); go('/'); } })));
}
