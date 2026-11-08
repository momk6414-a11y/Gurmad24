// Administration portal: verification, users/roles, finance, revenue, settings, complaints, audit.
import { S, t, h, icon, GET, POST, PATCH, PUT, form, modal, toast, money, badge, table, panel, tile, list, demoNote, emptyState, errText, go, fdate, fdt, confirmBox, downloadApi, link, pct } from '../core.js';
import { receiptNode } from './shared.js';

const head = (title, sub, right) => h('div', { class: 'page-head' }, h('div', h('h2', t(title)), sub ? h('p', t(sub)) : null), right || null);
const refresh = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
const typeName = x => t({ hospital: 'Hospital', ambulance: 'Ambulance', lab: 'Laboratory' }[x] || x);
const roleName = x => t({ patient: 'Patient', hospital_admin: 'Hospital admin', provider_admin: 'Provider admin', operator: 'Operator', admin: 'Administrator' }[x] || x);
const tabs = (items, cur, base) => h('div', { class: 'chips' }, items.map(([k, l]) => h('button', { class: 'chip', 'aria-pressed': cur === k, onclick: () => go(`${base}?tab=${k}`) }, t(l))));

export async function overview() {
  const d = await GET('/admin/dashboard');
  return h('div', head('Administration', 'Platform overview (demo / sandbox values).'),
    h('div', { class: 'grid g4 keep2' }, tile('Pending verifications', d.orgsPending, null, () => go('/admin/orgs?status=pending')), tile('Pending refunds', d.refundsPending, null, () => go('/admin/finance?tab=orders')), tile('Open complaints', d.complaintsOpen, null, () => go('/admin/complaints')), tile('Users', d.users, null, () => go('/admin/users'))),
    h('div', { class: 'grid g4 keep2' }, tile('Verified hospitals', d.hospitalsVerified), tile('Verified providers', d.providersVerified), tile('Published cards', d.cardsPublished, null, () => go('/admin/cards')), tile('Card orders', d.orders)),
    h('div', { class: 'grid g2' }, tile('Platform revenue this month', money(d.platformRevenueThisMonthCents)), tile('Platform revenue total', money(d.platformRevenueTotalCents), null, () => go('/admin/revenue'))),
    demoNote('All revenue figures come from sandbox transactions. No real money has moved.'));
}

export async function orgs({ query }) {
  const st = query.status || '';
  const { orgs: os } = await GET('/admin/orgs' + (st ? '?status=' + st : ''));
  const decide = (o, status) => { let m; m = modal(t('Set status: {s}', { s: t(status) }) + ' - ' + o.name, form([{ name: 'statusNote', label: 'Note (shown to the organisation)', max: 300 }], { submit: 'Confirm', cancel: () => m.close(), onSubmit: async v => { await PATCH('/admin/orgs/' + o.id, { status, ...v }); m.close(); toast(t('Updated.')); refresh(); } })); };
  const contract = o => { let m; m = modal(t('Contract terms') + ' - ' + o.name, h('div', h('p', { style: 'color:var(--muted)' }, t('Leave empty to use the platform default. Rates are percentages of the sale.')),
    form([{ name: 'cardCommissionBps', label: 'Health card commission (%)', type: 'percent', hint: 'Default: ' + 'see Settings' }, { name: 'labCommissionBps', label: 'Lab partnership commission (%)', type: 'percent' }, { name: 'appointmentFeeCents', label: 'Appointment fee per completed booking (USD)', type: 'money' }],
      { initial: o.contract, cancel: () => m.close(), onSubmit: async v => { const body = {}; for (const k of ['cardCommissionBps', 'labCommissionBps', 'appointmentFeeCents']) body[k] = v[k] === undefined ? null : v[k]; await PATCH('/admin/orgs/' + o.id, body); m.close(); toast(t('Saved.')); refresh(); } }))); };
  return h('div', head('Organisations', 'Verify hospitals, ambulance providers and laboratories.'),
    h('div', { class: 'chips' }, [['', 'All'], ['pending', 'Pending'], ['verified', 'Verified'], ['rejected', 'Rejected'], ['suspended', 'Suspended']].map(([v, l]) => h('button', { class: 'chip', 'aria-pressed': st === v, onclick: () => go('/admin/orgs' + (v ? '?status=' + v : '')) }, t(l)))),
    panel(null, table([{ label: 'Name', key: 'name' }, { label: 'Type', render: o => typeName(o.type) }, { label: 'Area', key: 'area' }, { label: 'Status', render: o => badge(o.status) }, { label: 'Contract', render: o => ['cardCommissionBps', 'labCommissionBps'].map(k => o.contract[k] === null ? null : pct(o.contract[k])).filter(Boolean).join(' / ') || t('default') },
      { label: '', render: o => h('div', { class: 'actions' }, o.status !== 'verified' ? h('button', { class: 'btn sm', onclick: () => decide(o, 'verified') }, t('Verify')) : null, o.status === 'pending' ? h('button', { class: 'btn sm ghost', onclick: () => decide(o, 'rejected') }, t('Reject')) : null,
        o.status === 'verified' ? h('button', { class: 'btn sm ghost', onclick: () => decide(o, 'suspended') }, t('Suspend')) : null, h('button', { class: 'btn sm ghost', onclick: () => contract(o) }, t('Contract'))) }], os, { empty: 'No organisations.' })));
}

export async function users() {
  const [{ users: us }, { orgs: os }] = await Promise.all([GET('/admin/users'), GET('/admin/orgs')]);
  const ROLES = ['patient', 'hospital_admin', 'provider_admin', 'operator', 'admin'];
  const add = () => { let m; m = modal(t('New user'), form([{ name: 'name', label: 'Full name', required: true }, { name: 'email', label: 'Email', type: 'email', required: true }, { name: 'role', label: 'Role', type: 'select', options: ROLES.map(r => [r, roleName(r)]), required: true },
    { name: 'orgId', label: 'Organisation (for hospital/provider roles)', type: 'select', options: [['', '-'], ...os.map(o => [o.id, o.name + ' (' + typeName(o.type) + ')'])] }, { name: 'password', label: 'Password (leave empty to generate one)', type: 'text' }],
    { submit: 'Create user', cancel: () => m.close(), onSubmit: async v => { if (!v.orgId) delete v.orgId; if (!v.password) delete v.password; const r = await POST('/admin/users', v); m.close(); if (r.temporaryPassword) tempPw(r.user.email, r.temporaryPassword); refresh(); } })); };
  const tempPw = (email, pw) => modal(t('Temporary password'), h('div', h('p', t('Give this to {e}. It is shown only once.', { e: email })), h('pre', { style: 'background:var(--bg);padding:12px;border-radius:10px;font-size:18px;user-select:all' }, pw)));
  return h('div', head('Users and roles', null, h('button', { class: 'btn', onclick: add }, icon('plus'), t('New user'))), panel(null, table([{ label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Role', render: u => roleName(u.role) }, { label: 'Organisation', render: u => u.orgName || '-' }, { label: 'Active', render: u => u.active ? t('Yes') : t('No') },
    { label: '', render: u => u.deletedAt ? null : h('div', { class: 'actions' }, u.id !== S.user.id ? h('button', { class: 'btn sm ghost', onclick: async () => { try { await PATCH('/admin/users/' + u.id, { active: !u.active }); refresh(); } catch (e) { toast(errText(e), 'err'); } } }, u.active ? t('Disable') : t('Enable')) : null,
      h('button', { class: 'btn sm ghost', onclick: async () => { if (await confirmBox(t('Generate a new temporary password for {e}?', { e: u.email }))) { const r = await POST(`/admin/users/${u.id}/reset-password`); tempPw(u.email, r.temporaryPassword); } } }, t('Reset password')),
      u.id !== S.user.id ? h('select', { 'aria-label': t('Role'), onchange: async e => { try { await PATCH('/admin/users/' + u.id, { role: e.target.value }); toast(t('Updated.')); refresh(); } catch (er) { toast(errText(er), 'err'); refresh(); } } }, ROLES.map(r => h('option', { value: r, selected: r === u.role }, roleName(r)))) : null) }], us, { empty: 'No users.' })));
}

export async function cards() {
  const { cards: cs } = await GET('/admin/cards');
  return h('div', head('Health cards', 'Moderate cards. Hospitals write and approve their own text and prices.'), panel(null, table([{ label: 'Card', key: 'name' }, { label: 'Hospital', render: c => c.hospital ? c.hospital.name : '' }, { label: 'Price', render: c => money(c.priceCents) }, { label: 'Status', render: c => badge(c.status) },
    { label: '', render: c => c.status === 'suspended' ? h('button', { class: 'btn sm', onclick: async () => { await POST(`/admin/cards/${c.id}/restore`); refresh(); } }, t('Restore')) : h('button', { class: 'btn sm ghost', onclick: async () => { if (await confirmBox(t('Suspend this card? It will disappear from the marketplace.'))) { await POST(`/admin/cards/${c.id}/suspend`); refresh(); } } }, t('Suspend')) }], cs, { empty: 'No cards.' })));
}

export async function finance({ query }) {
  const tab = query.tab || 'transactions'; let body;
  if (tab === 'transactions') {
    const { transactions: tx } = await GET('/admin/transactions');
    body = panel(null, table([{ label: 'Date', render: x => fdt(x.ts) }, { label: 'Type', render: x => x.type }, { label: 'Organisation', render: x => x.orgName || '-' }, { label: 'Gross', render: x => money(x.grossCents) }, { label: 'Platform revenue', render: x => money(x.platformCents) }, { label: 'Provider', render: x => h('span', { class: 'badge demo' }, x.provider) }, { label: 'Reference', render: x => x.note || x.providerRef || '' }], tx, { empty: 'No transactions yet.' }));
  } else if (tab === 'orders') {
    const { orders } = await GET('/admin/orders');
    const decide = (o, decision) => { let m; m = modal(t(decision === 'approve' ? 'Approve refund' : 'Deny refund'), h('div', o.refund && o.refund.reason ? h('p', t('Patient reason: {r}', { r: o.refund.reason })) : null, h('p', { style: 'color:var(--muted)' }, t('Hospital policy: {p}', { p: o.cardSnapshot.refundPolicy })),
      form([{ name: 'note', label: 'Note', max: 300 }], { submit: 'Confirm', cancel: () => m.close(), onSubmit: async v => { await POST(`/admin/orders/${o.id}/refund`, { decision, ...v }); m.close(); toast(t('Updated.')); refresh(); } }))); };
    body = panel(null, table([{ label: 'Order', key: 'code' }, { label: 'Patient', key: 'patientName' }, { label: 'Card', render: o => o.cardSnapshot.name + ' - ' + o.cardSnapshot.hospitalName }, { label: 'Price', render: o => money(o.priceCents) }, { label: 'Status', render: o => badge(o.status) },
      { label: '', render: o => h('div', { class: 'actions' }, o.status === 'refund_requested' ? [h('button', { class: 'btn sm', onclick: () => decide(o, 'approve') }, t('Approve refund')), h('button', { class: 'btn sm ghost', onclick: () => decide(o, 'deny') }, t('Deny'))] : o.status === 'paid_sandbox' ? h('button', { class: 'btn sm ghost', onclick: () => decide(o, 'approve') }, t('Refund')) : null) }], orders, { empty: 'No orders yet.' }));
  } else if (tab === 'invoices') {
    const { invoices } = await GET('/admin/invoices');
    body = panel(null, table([{ label: 'Number', key: 'number' }, { label: 'Type', render: d => t(d.kind) }, { label: 'Date', render: d => fdate(d.ts) }, { label: 'Total', render: d => money(d.totalCents) }, { label: '', render: d => h('button', { class: 'btn sm ghost', onclick: () => modal(d.number, receiptNode(d)) }, t('View')) }], invoices, { empty: 'No documents yet.' }));
  } else {
    const { orgs } = await GET('/admin/orgs?status=verified'); let out = h('div');
    body = panel('Monthly settlement statement', h('div', h('p', { style: 'color:var(--muted)' }, t('Shows gross sales, refunds and platform commission for a month. Net payable is a sandbox figure; no real transfer is made.')), form([{ name: 'orgId', label: 'Organisation', type: 'select', options: orgs.map(o => [o.id, o.name]), required: true }, { name: 'month', label: 'Month (YYYY-MM)', required: true, default: new Date().toISOString().slice(0, 7), max: 7 }],
      { submit: 'Generate statement', onSubmit: async v => { const r = await POST('/admin/statements', v); out.replaceChildren(receiptNode(r.statement)); } }), out));
  }
  return h('div', head('Finance', 'Transactions, refunds, invoices and statements.', h('div', { class: 'actions tight' }, h('button', { class: 'btn ghost', onclick: () => downloadApi('/admin/export/transactions.csv', 'transactions.csv') }, icon('download'), t('Transactions CSV')), h('button', { class: 'btn ghost', onclick: () => downloadApi('/admin/export/orders.csv', 'orders.csv') }, icon('download'), t('Orders CSV')), h('button', { class: 'btn ghost', onclick: () => downloadApi('/admin/export/invoices.csv', 'invoices.csv') }, icon('download'), t('Invoices CSV')))),
    tabs([['transactions', 'Transactions'], ['orders', 'Orders and refunds'], ['invoices', 'Invoices'], ['statements', 'Statements']], tab, '/admin/finance'), body);
}

const STREAM = [['cardCommission', 'Card commissions', '#48e0b2'], ['subscriptions', 'Subscriptions', '#7cc4ff'], ['appointmentFees', 'Appointment fees', '#ffc66e'], ['labCommission', 'Lab commissions', '#c9a8ff'], ['sponsored', 'Sponsored listings', '#ff9bb5']];
export async function revenue({ query }) {
  const period = query.period === 'year' ? 'year' : 'month';
  const r = await GET('/admin/reports/revenue?period=' + period);
  const max = Math.max(...r.rows.map(x => x.totalPlatformCents), 1);
  const chart = h('div', { class: 'bars', role: 'img', 'aria-label': t('Revenue chart') }, r.rows.map(x => h('div', { class: 'bar' }, STREAM.slice().reverse().map(([k, , c]) => x[k] > 0 ? h('i', { style: `height:${Math.round(x[k] / max * 130)}px;background:${c}`, title: money(x[k]) }) : null), h('small', x.period.slice(period === 'year' ? 0 : 2)))));
  return h('div', head('Revenue', 'Platform revenue by stream (sandbox transactions).', h('div', { class: 'actions tight' }, h('button', { class: 'btn ghost', onclick: () => downloadApi('/admin/export/revenue.csv?period=' + period, 'revenue.csv') }, icon('download'), t('Export CSV')))),
    h('div', { class: 'chips' }, [['month', 'Monthly'], ['year', 'Annual']].map(([k, l]) => h('button', { class: 'chip', 'aria-pressed': period === k, onclick: () => go('/admin/revenue?period=' + k) }, t(l)))),
    h('div', { class: 'grid g3 keep2' }, tile('Total platform revenue', money(r.totals.totalPlatformCents || 0)), tile('Card sales (gross)', money(r.totals.cardGrossCents || 0)), tile('Subscriptions', money(r.totals.subscriptions || 0))),
    panel('Trend', r.rows.length ? h('div', chart, h('div', { class: 'legend' }, STREAM.map(([, l, c]) => h('span', h('i', { style: 'background:' + c }), t(l))))) : emptyState('No revenue yet.')),
    panel('Table', table([{ label: 'Period', key: 'period' }, { label: 'Card sales (gross)', render: x => money(x.cardGrossCents) }, ...STREAM.map(([k, l]) => ({ label: l, render: x => money(x[k]) })), { label: 'Total', render: x => h('b', money(x.totalPlatformCents)) }], r.rows, { empty: 'No revenue yet.' })), demoNote('Sandbox figures only. Refunds reduce card commission in the month they happen.'));
}

export async function settings() {
  const [{ settings: s, paymentProviders }, { plans }, { listings }, { backups }, { orgs }] = await Promise.all([GET('/admin/settings'), GET('/admin/plans'), GET('/admin/sponsored'), GET('/admin/backups'), GET('/admin/orgs?status=verified')]);
  const planForm = p => { let m; m = modal(p ? t('Edit plan') : t('New plan'), form([{ name: 'name', label: 'Plan name', required: true, max: 60 }, { name: 'audience', label: 'For', type: 'select', options: [['hospital', 'Hospital'], ['ambulance', 'Ambulance'], ['lab', 'Laboratory'], ['any', 'Any']], required: true }, { name: 'monthlyCents', label: 'Monthly price (USD)', type: 'money', required: true }, { name: 'annualCents', label: 'Annual price (USD)', type: 'money', required: true },
    { name: 'features', label: 'Premium features (one per line: analytics, premium_dashboard, priority_listing)', type: 'lines' }, { name: 'active', label: 'Available to organisations', type: 'checkbox', default: true }], { initial: p || {}, cancel: () => m.close(), onSubmit: async v => { if (p) await PATCH('/admin/plans/' + p.id, v); else await POST('/admin/plans', v); m.close(); toast(t('Saved.')); refresh(); } })); };
  const spon = () => { let m; m = modal(t('New sponsored listing'), h('div', demoNote('Sponsored listings are always labelled as advertising and never influence medical advice.'), form([{ name: 'orgId', label: 'Organisation', type: 'select', options: orgs.map(o => [o.id, o.name]), required: true }, { name: 'headline', label: 'Headline', required: true, max: 80 }, { name: 'text', label: 'Text', max: 200 }, { name: 'feeCents', label: 'Fee (USD)', type: 'money', required: true }, { name: 'months', label: 'Months', type: 'number', required: true, default: 1, min: 1 }],
    { submit: 'Create and bill (sandbox)', cancel: () => m.close(), onSubmit: async v => { await POST('/admin/sponsored', v); m.close(); toast(t('Created.')); refresh(); } }))); };
  return h('div', head('Settings', 'Commission rates, plans, sponsored listings, payments and backups.'),
    s.placeholderValues ? demoNote('These default rates and prices are PLACEHOLDERS, not commercial agreements. Set your real, contractually agreed values here.') : null,
    panel('Commission and fees', form([{ name: 'cardCommissionBps', label: 'Health card commission (%)', type: 'percent', required: true }, { name: 'labCommissionBps', label: 'Lab / diagnostic partnership commission (%)', type: 'percent', required: true }, { name: 'appointmentFeeCents', label: 'Appointment booking fee per completed booking (USD)', type: 'money', required: true, hint: 'Charge only where contractually permitted.' }, { name: 'retentionDays', label: 'Anonymise closed emergency records after (days)', type: 'number', min: 30 }],
      { initial: s, submit: 'Save settings', onSubmit: async v => { await PUT('/admin/settings', v); toast(t('Settings saved.')); refresh(); } })),
    panel('Subscription plans', table([{ label: 'Plan', key: 'name' }, { label: 'For', key: 'audience' }, { label: 'Monthly', render: p => money(p.monthlyCents) }, { label: 'Annual', render: p => money(p.annualCents) }, { label: 'Features', render: p => (p.features || []).join(', ') || '-' }, { label: 'Active', render: p => p.active ? t('Yes') : t('No') }, { label: '', render: p => h('button', { class: 'btn sm ghost', onclick: () => planForm(p) }, t('Edit')) }], plans),
      h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => planForm(null) }, icon('plus'), t('New plan')))),
    panel('Sponsored listings', h('div', table([{ label: 'Organisation', key: 'orgName' }, { label: 'Headline', key: 'headline' }, { label: 'Fee', render: l => money(l.feeCents) }, { label: 'Ends', render: l => fdate(l.endsAt) }, { label: 'Active', render: l => l.active ? t('Yes') : t('No') },
      { label: '', render: l => h('button', { class: 'btn sm ghost', onclick: async () => { await PATCH('/admin/sponsored/' + l.id, { active: !l.active }); refresh(); } }, l.active ? t('Deactivate') : t('Activate')) }], listings, { empty: 'No sponsored listings.' }), h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: spon }, icon('plus'), t('New sponsored listing'))))),
    panel('Payment providers', h('div', demoNote('Only the sandbox provider is connected. Real mobile-money or card providers must be verified and integrated before any real payment.'), table([{ label: 'Provider', key: 'label' }, { label: 'Status', render: p => h('span', { class: p.connected ? 'badge ok' : 'badge mute' }, p.connected ? t('Connected (sandbox)') : t('Not connected')) }, { label: 'Requirements', render: p => p.requires || '-' }], paymentProviders))),
    panel('Backups', h('div', h('p', { style: 'color:var(--muted)' }, t('The database is backed up automatically every day (14 kept). You can also create one now.')), list(backups.slice(0, 5)), h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: async () => { const r = await POST('/admin/backups'); toast(t('Backup created: {n}', { n: r.backup })); refresh(); } }, t('Create backup now'))))));
}

export async function complaints() {
  const { complaints: cs } = await GET('/admin/complaints');
  const act = c => { let m; m = modal(c.code, form([{ name: 'status', label: 'Status', type: 'select', options: [['open', 'Open'], ['in_review', 'In review'], ['resolved', 'Resolved'], ['rejected', 'Rejected']], default: c.status }, { name: 'text', label: 'Response to the patient (optional)', type: 'textarea', max: 1000 }], { submit: 'Save', cancel: () => m.close(), onSubmit: async v => { await PATCH('/admin/complaints/' + c.id, v); m.close(); refresh(); } })); };
  return h('div', head('Complaints and disputes'), panel(null, table([{ label: 'Ticket', key: 'code' }, { label: 'Subject', key: 'subject' }, { label: 'Patient', key: 'patientName' }, { label: 'About', render: c => c.orgName || t('General') }, { label: 'Status', render: c => badge(c.status) }, { label: 'Updated', render: c => fdate(c.updatedAt) },
    { label: '', render: c => h('button', { class: 'btn sm', onclick: () => modal(c.code + ' - ' + c.subject, h('div', c.responses.map(r => h('p', h('small', { style: 'color:var(--muted)' }, fdt(r.ts) + ' - ' + r.by + ': '), r.text)), h('div', { class: 'actions' }, h('button', { class: 'btn', onclick: () => act(c) }, t('Respond / change status'))))) }, t('Open')) }], cs, { empty: 'No complaints.' })));
}

export async function audit({ query }) {
  const a = query.action || '';
  const { audit: log } = await GET('/admin/audit?limit=300' + (a ? '&action=' + encodeURIComponent(a) : ''));
  const input = h('input', { type: 'search', placeholder: t('Filter by action, e.g. order, auth, settings'), value: a, 'aria-label': t('Filter') }); input.onchange = () => go('/admin/audit' + (input.value ? '?action=' + encodeURIComponent(input.value) : ''));
  return h('div', head('Audit log', 'Who did what, and when. Newest first.'), h('div', { class: 'field' }, input), panel(null, table([{ label: 'Time', render: x => fdt(x.ts) }, { label: 'User', render: x => x.actorName || (x.actorId ? x.actorId : '-') }, { label: 'Role', render: x => x.actorRole || '-' }, { label: 'Action', key: 'action' }, { label: 'Entity', render: x => (x.entity || '') + ' ' + (x.entityId || '') }, { label: 'IP', render: x => x.ip }], log, { empty: 'No entries.' })));
}


export async function security() {
  const d = await GET('/admin/security'); const L = d.last24h;
  const realBox = () => {
    const state = h('b', d.realMode ? t('ON: requests are REAL') : t('OFF: all requests are simulations'));
    const btn = h('button', { class: d.realMode ? 'btn danger' : 'btn', onclick: () => {
      let m; m = modal(d.realMode ? t('Turn real mode OFF') : t('Turn real mode ON'), h('div',
        d.realMode ? h('p', t('New requests will be simulations again.')) : h('p', t('Real requests are NOT simulated. Only enable this when operators are on duty and real responders are connected. Type SHIDO to confirm.')),
        form(d.realMode ? [] : [{ name: 'confirm', label: 'Type SHIDO', required: true, max: 20 }], { submit: d.realMode ? 'Turn off' : 'Turn on', cancel: () => m.close(),
          onSubmit: async v => { await PUT('/admin/real-mode', { enabled: !d.realMode, confirm: v.confirm || '' }); m.close(); toast(t('Saved.')); go('/admin/security'); location.reload(); } })));
    } }, d.realMode ? t('Turn real mode OFF') : t('Turn real mode ON'));
    return panel('Real mode', h('div', h('p', state), h('p', { class: 'hint' }, t('Admin only. Every change is written to the audit log.')), btn));
  };
  return h('div', head('Security', 'Protection status, recent security events and real-mode control.'),
    h('div', { class: 'grid g4 keep2' }, tile(t('Security score'), d.score + '%'), tile(t('Failed logins (24h)'), String(L.loginFailed)), tile(t('Locked accounts (24h)'), String(L.locked)), tile(t('Blocked requests (24h)'), String(L.rateLimited + L.badOrigin + L.forbidden + L.ipBlocked))),
    h('div', { class: 'grid g2', style: 'margin-top:14px' },
      panel('Protection checks', h('div', d.checks.map(c => h('div', { class: 'chk' + (c.ok ? '' : ' bad') }, h('i', c.ok ? '✓' : '!'), h('div', t(c.text), !c.ok && c.action ? h('small', t(c.action)) : null))))),
      realBox()),
    panel('Recent security events', d.events.length ? table([{ label: 'Time', render: e => fdt(e.ts) }, { label: 'Event', render: e => t(e.type) }, { label: 'IP (masked)', render: e => e.ip || '-' }], d.events) : emptyState('No security events yet.')));
}
