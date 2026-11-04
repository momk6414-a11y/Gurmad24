// Emergency coordination dashboard - SIMULATION MODE ONLY.
import { S, t, h, icon, GET, POST, PATCH, form, modal, toast, badge, table, panel, tile, demoNote, emptyState, errText, go, fdt, link } from '../core.js';
import { CASE_CATS } from './public.js';

const head = (title, sub, right) => h('div', { class: 'page-head' }, h('div', h('h2', t(title)), sub ? h('p', t(sub)) : null), right || null);
const refresh = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
const catName = c => t((CASE_CATS.find(x => x[0] === c) || [0, c])[1]);
const STATUSES = ['received', 'assigned', 'en_route', 'arrived', 'handed_over', 'closed', 'cancelled'];
const SIM = () => demoNote('SIMULATION MODE: no dispatch, no calls, no GPS. The platform never diagnoses or advises treatment. Live use requires medical oversight, regulatory approval, trained operators and verified providers.');

export async function dashboard({ query }) {
  const status = query.status || '';
  const [st, cs] = await Promise.all([GET('/ops/stats'), GET('/ops/cases' + (status ? '?status=' + status : ''))]);
  const add = () => { let m; m = modal(t('New simulated request'), form([{ name: 'category', label: 'Request type', type: 'select', options: CASE_CATS, required: true }, { name: 'area', label: 'Area (general)', max: 60 }, { name: 'note', label: 'Note (no names, no medical details)', max: 200 }],
    { submit: 'Create', cancel: () => m.close(), onSubmit: async v => { await POST('/ops/cases', v); m.close(); toast(t('Simulated request created.')); refresh(); } })); };
  return h('div', head('Coordination dashboard', 'Case management in simulation mode.', h('button', { class: 'btn', onclick: add }, icon('plus'), t('New simulated request'))), SIM(),
    h('div', { class: 'grid g4 keep2' }, tile('Total cases', st.total), tile('Today', st.today), tile('Providers available', `${st.providersAvailable}/${st.providersTotal}`), tile('Avg. minutes to handover', st.avgMinutesToHandover === null ? '-' : st.avgMinutesToHandover)),
    panel('Cases', h('div', h('div', { class: 'chips' }, [['', 'All'], ...STATUSES.map(s => [s, s])].map(([v, l]) => h('button', { class: 'chip', 'aria-pressed': status === v, onclick: () => go('/ops' + (v ? '?status=' + v : '')) }, v ? badgeText(v) : t(l)))),
      table([{ label: 'Code', render: c => link('/ops/case/' + c.id, c.code) }, { label: 'Mode', render: c => h('span', { class: 'badge demo' }, t('SIMULATION')) }, { label: 'Type', render: c => catName(c.category) }, { label: 'Area', render: c => c.area || '-' }, { label: 'Status', render: c => badge(c.status) },
        { label: 'Provider', render: c => c.assignedOrgName || '-' }, { label: 'Created', render: c => fdt(c.createdAt) }], cs.cases, { empty: 'No cases.' }))));
}
const badgeText = s => { const b = badge(s); return b.textContent; };

export async function caseDetail({ id }) {
  const [{ case: c }, { providers }] = await Promise.all([GET('/ops/cases/' + id), GET('/ops/providers')]);
  const change = body => PATCH('/ops/cases/' + id, body).then(() => { toast(t('Updated.')); refresh(); }).catch(e => toast(errText(e), 'err'));
  const sel = h('select', { 'aria-label': t('Provider') }, h('option', { value: '' }, t('Choose provider')), providers.map(p => h('option', { value: p.id, selected: p.id === c.assignedOrgId }, p.name + (p.available ? '' : ' (' + t('Unavailable') + ')'))));
  const L = { assigned: 'Assigned', received: 'Back to queue', en_route: 'En route (sim)', arrived: 'Arrived (sim)', handed_over: 'Handed over', closed: 'Closed', cancelled: 'Cancel case' };
  return h('div', head(c.code, catName(c.category) + (c.area ? ' - ' + c.area : ''), badge(c.status)), SIM(),
    h('div', { class: 'grid g2' },
      panel('Case', h('div', h('dl', { class: 'kv' }, h('dt', t('Mode')), h('dd', t('SIMULATION')), h('dt', t('Source')), h('dd', c.source), h('dt', t('Created')), h('dd', fdt(c.createdAt)), h('dt', t('Note')), h('dd', c.note || '-'), h('dt', t('Provider')), h('dd', c.assignedOrgName || '-')))),
      panel('Actions', h('div', ['received', 'assigned'].includes(c.status) ? h('div', h('div', { class: 'field' }, h('label', t('Assign ambulance provider')), sel), h('button', { class: 'btn sm', onclick: () => sel.value ? change({ assignedOrgId: sel.value }) : toast(t('Choose a provider first.'), 'err') }, t('Assign'))) : null,
        h('div', { class: 'actions' }, c.next.filter(n => n !== 'assigned').map(n => h('button', { class: 'btn sm' + (['cancelled', 'received'].includes(n) ? ' ghost' : ''), onclick: () => change({ status: n }) }, t(L[n])))), c.next.length ? null : h('p', { style: 'color:var(--muted)' }, t('This case is finished.'))))),
    panel('History', h('ul', { class: 'timeline' }, c.history.map(x => h('li', h('b', badgeText(x.status)), ' ', h('small', fdt(x.ts) + (x.note ? ' - ' + x.note : '')))))), h('p', link('/ops', t('Back to cases'))));
}

export async function directory() {
  const [hs, ps] = await Promise.all([GET('/ops/directory'), GET('/ops/providers')]);
  return h('div', head('Directory', 'Verified hospitals and ambulance providers.'),
    panel('Hospitals', table([{ label: 'Name', key: 'name' }, { label: 'Area', key: 'area' }, { label: 'Phone', render: o => o.phone || '-' }, { label: 'Hours', render: o => o.hours || '-' }], hs.hospitals, { empty: 'None.' })),
    panel('Ambulance providers', table([{ label: 'Name', key: 'name' }, { label: 'Area', key: 'area' }, { label: 'Phone', render: o => o.phone || '-' }, { label: 'Availability', render: o => h('span', { class: o.available ? 'badge ok' : 'badge mute' }, o.available ? t('Available') : t('Unavailable')) }], ps.providers, { empty: 'None.' })));
}
