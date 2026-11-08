// Emergency coordination dashboard (ambulance, police, fire) - SIMULATION MODE ONLY.
import { S, t, h, icon, GET, POST, PATCH, form, modal, toast, badge, table, panel, tile, demoNote, emptyState, errText, go, fdt, link } from '../core.js';
import { CASE_CATS, SERVICE_NAME, stopPoll } from './public.js';
import { liveMap, osmLink } from '../map.js';

const head = (title, sub, right) => h('div', { class: 'page-head' }, h('div', h('h2', t(title)), sub ? h('p', t(sub)) : null), right || null);
const refresh = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
const catName = c => t((CASE_CATS.find(x => x[0] === c) || [0, c])[1]);
const STATUSES = ['received', 'assigned', 'en_route', 'arrived', 'handed_over', 'closed', 'cancelled'];
const RESP = ['ambulance', 'police', 'fire'];
const SIM = () => demoNote('SIMULATION MODE: no real dispatch and no calls to real services. Locations are demo data used only for the map. The platform never diagnoses or advises treatment. Live use requires medical oversight, regulatory approval, trained operators and verified providers.');
const respTag = r => h('span', { class: 'rtag u-' + r }, icon(r, 16), t(SERVICE_NAME[r] || r));
const badgeText = s => badge(s).textContent;

export async function dashboard({ query }) {
  const status = query.status || ''; const responder = query.responder || '';
  const cfg = await GET('/config');
  const qs = () => { const p = new URLSearchParams(); if (status) p.set('status', status); if (responder) p.set('responder', responder); const x = p.toString(); return x ? '?' + x : ''; };
  const add = () => { let m; m = modal(t('New simulated request'), form([
    { name: 'category', label: 'Request type', type: 'select', options: CASE_CATS, required: true },
    { name: 'areaId', label: 'Location (demo area)', type: 'select', options: [['', '-'], ...cfg.areas.map(a => [a.id, a.name])] },
    { name: 'area', label: 'Area (general)', max: 60 }, { name: 'note', label: 'Note (no names, no medical details)', max: 200 }],
  { submit: 'Create', cancel: () => m.close(), onSubmit: async v => { await POST('/ops/cases', v); m.close(); toast(t('Simulated request created.')); refresh(); } })); };

  const statsBox = h('div'); const casesBox = h('div');
  const map = liveMap([], { places: true });
  const mapPanel = panel('Live map (demo)', h('div', map, h('div', { class: 'legend' }, RESP.map(r => respTag(r)))));
  const load = async () => {
    const [st, cs, all] = await Promise.all([GET('/ops/stats'), GET('/ops/cases' + qs()), responder || status ? GET('/ops/cases') : null]);
    const everything = (all || cs).cases;
    const active = everything.filter(c => !['closed', 'cancelled'].includes(c.status) && c.track && c.track.location);
    const entries = active.map(c => ({ type: c.responder, incident: c.track.location, unit: c.track.unit, station: c.track.station, done: c.status === 'handed_over' }));
    const by = r => everything.filter(c => c.responder === r && !['closed', 'cancelled', 'handed_over'].includes(c.status)).length;
    statsBox.replaceChildren(
      h('div', { class: 'grid g4 keep2' }, tile('Active cases', st.active), tile('Today', st.today), tile('Responders available', `${st.providersAvailable}/${st.providersTotal}`), tile('Avg. minutes to handover', st.avgMinutesToHandover === null ? '-' : st.avgMinutesToHandover)),
      h('div', { class: 'grid g3 keep2' }, RESP.map(r => h('div', { class: 'rcount u-' + r }, icon(r, 26), h('div', h('b', by(r)), h('small', t(SERVICE_NAME[r])))))),
    );
    map.update(entries);
    casesBox.replaceChildren(
      panel('Cases', h('div', h('div', { class: 'chips' }, [['', 'All'], ...RESP.map(r => [r, SERVICE_NAME[r]])].map(([v, l]) => h('button', { class: 'chip', 'aria-pressed': responder === v, onclick: () => go('/ops' + (v ? '?responder=' + v : '') + (status ? (v ? '&' : '?') + 'status=' + status : '')) }, t(l)))),
        h('div', { class: 'chips' }, [['', 'All'], ...STATUSES.map(s => [s, s])].map(([v, l]) => h('button', { class: 'chip', 'aria-pressed': status === v, onclick: () => go('/ops' + (v ? '?status=' + v : '') + (responder ? (v ? '&' : '?') + 'responder=' + responder : '')) }, v ? badgeText(v) : t(l)))),
        table([{ label: 'Code', render: c => link('/ops/case/' + c.id, c.code) }, { label: 'Service', render: c => respTag(c.responder) }, { label: 'Type', render: c => catName(c.category) }, { label: 'Area', render: c => c.area || '-' }, { label: 'Status', render: c => badge(c.status) },
          { label: 'Provider', render: c => c.assignedOrgName || '-' }, { label: 'Created', render: c => fdt(c.createdAt) }], cs.cases, { empty: 'No cases.' }))));
  };
  await load();
  S.poll = setInterval(() => load().catch(() => stopPoll()), 3000);
  return h('div', head('Coordination dashboard', 'Ambulance, police and fire requests in simulation mode.', h('button', { class: 'btn', onclick: add }, icon('plus'), t('New simulated request'))), SIM(), statsBox, mapPanel, casesBox);
}

export async function caseDetail({ id }) {
  const [{ case: c }, { providers }] = await Promise.all([GET('/ops/cases/' + id), GET('/ops/providers')]);
  const change = body => PATCH('/ops/cases/' + id, body).then(() => { toast(t('Updated.')); refresh(); }).catch(e => toast(errText(e), 'err'));
  const sorted = [...providers].sort((a, b) => (b.type === c.responder) - (a.type === c.responder));
  const sel = h('select', { 'aria-label': t('Provider') }, h('option', { value: '' }, t('Choose provider')), sorted.map(p => h('option', { value: p.id, selected: p.id === c.assignedOrgId }, t(SERVICE_NAME[p.type] || p.type) + ' - ' + p.name + (p.available ? '' : ' (' + t('Unavailable') + ')'))));
  const L = { assigned: 'Assigned', received: 'Back to queue', en_route: 'En route (sim)', arrived: 'Arrived (sim)', handed_over: 'Handed over', closed: 'Closed', cancelled: 'Cancel case' };
  const tr = c.track; const loc = c.location;
  return h('div', head(c.code, catName(c.category) + (c.area ? ' - ' + c.area : ''), badge(c.status)), SIM(),
    h('div', { class: 'grid g2' },
      panel('Case', h('div', h('dl', { class: 'kv' }, h('dt', t('Mode')), h('dd', t('SIMULATION')), h('dt', t('Service')), h('dd', respTag(c.responder)), h('dt', t('Source')), h('dd', c.source), h('dt', t('Created')), h('dd', fdt(c.createdAt)), h('dt', t('Note')), h('dd', c.note || '-'),
        h('dt', t('Location')), h('dd', loc ? h('a', { href: osmLink(loc), target: '_blank', rel: 'noopener noreferrer' }, icon('pin', 16), loc.lat + ', ' + loc.lng + (loc.source === 'gps' ? ' (GPS)' : '')) : '-'),
        h('dt', t('Provider')), h('dd', c.assignedOrgName || '-'), tr && tr.etaMinutes ? h('dt', t('ETA')) : null, tr && tr.etaMinutes ? h('dd', t('{m} min (simulated)', { m: tr.etaMinutes })) : null))),
      panel('Actions', h('div', c.autopilot ? h('p', { class: 'hint' }, t('Demo autopilot is moving this case. Any action you take stops it.')) : null,
        ['received', 'assigned'].includes(c.status) ? h('div', h('div', { class: 'field' }, h('label', t('Assign responder')), sel), h('button', { class: 'btn sm', onclick: () => sel.value ? change({ assignedOrgId: sel.value }) : toast(t('Choose a provider first.'), 'err') }, t('Assign'))) : null,
        h('div', { class: 'actions' }, c.next.filter(n => n !== 'assigned').map(n => h('button', { class: 'btn sm' + (['cancelled', 'received'].includes(n) ? ' ghost' : ''), onclick: () => change({ status: n }) }, t(L[n])))), c.next.length ? null : h('p', { style: 'color:var(--muted)' }, t('This case is finished.'))))),
    tr && tr.location ? panel('Live map (demo)', liveMap([{ type: c.responder, incident: tr.location, unit: tr.unit, station: tr.station, done: ['handed_over', 'closed'].includes(c.status) }]), h('button', { class: 'btn sm ghost', onclick: refresh }, icon('search', 16), t('Refresh'))) : null,
    panel('History', h('ul', { class: 'timeline' }, c.history.map(x => h('li', h('b', badgeText(x.status)), ' ', h('small', fdt(x.ts) + (x.note ? ' - ' + x.note : '')))))), h('p', link('/ops', t('Back to cases'))));
}

export async function directory() {
  const [hs, ps] = await Promise.all([GET('/ops/directory'), GET('/ops/providers')]);
  const avail = o => h('span', { class: o.available ? 'badge ok' : 'badge mute' }, o.available ? t('Available') : t('Unavailable'));
  return h('div', head('Directory', 'Verified hospitals, ambulance, police and fire providers.'),
    panel('Hospitals', table([{ label: 'Name', key: 'name' }, { label: 'Area', key: 'area' }, { label: 'Phone', render: o => o.phone || '-' }, { label: 'Hours', render: o => o.hours || '-' }], hs.hospitals, { empty: 'None.' })),
    RESP.map(r => panel(SERVICE_NAME[r] === 'Fire brigade' ? 'Fire stations' : SERVICE_NAME[r] === 'Police' ? 'Police stations' : 'Ambulance providers',
      table([{ label: 'Name', key: 'name' }, { label: 'Area', key: 'area' }, { label: 'Phone', render: o => o.phone || '-' }, { label: 'Availability', render: avail }], ps.providers.filter(p => p.type === r), { empty: 'None.' }))));
}
