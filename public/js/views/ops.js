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
const REALN = () => h('div', { class: 'note warn' }, icon('alert', 18), h('span', t('REAL MODE: requests here are real. Assign a responder and keep the person updated.')));
const respTag = r => h('span', { class: 'rtag u-' + r }, icon(r, 16), t(SERVICE_NAME[r] || r));
const badgeText = s => badge(s).textContent;

export async function dashboard({ query }) {
  const status = query.status || ''; const responder = query.responder || ''; const view = ['active', 'today'].includes(query.view) ? query.view : '';
  const cfg = await GET('/config');
  const qs = () => {
    const p = new URLSearchParams();
    if (view === 'active') p.set('active', '1');
    if (view === 'today') p.set('today', '1');
    if (status) p.set('status', status);
    if (responder) p.set('responder', responder);
    const x = p.toString(); return x ? '?' + x : '';
  };
  const add = () => { let m; m = modal(t('New simulated request'), form([
    { name: 'category', label: 'Request type', type: 'select', options: CASE_CATS, required: true },
    { name: 'areaId', label: 'Location (demo area)', type: 'select', options: [['', '-'], ...cfg.areas.map(a => [a.id, a.name])] },
    { name: 'area', label: 'Area (general)', max: 60 }, { name: 'note', label: 'Note (no names, no medical details)', max: 200 }],
  { submit: 'Create', cancel: () => m.close(), onSubmit: async v => { await POST('/ops/cases', v); m.close(); toast(t('Simulated request created.')); refresh(); } })); };

  const statsBox = h('div'); const casesBox = h('div');
  const map = liveMap([], { places: true });
  const mapPanel = panel('Live map (demo)', h('div', map, h('div', { class: 'legend' }, RESP.map(r => respTag(r)))));
  const load = async () => {
    const [st, cs, all] = await Promise.all([
      GET('/ops/stats'),
      GET('/ops/cases' + qs()),
      view || responder || status ? GET('/ops/cases') : null,
    ]);
    const everything = (all || cs).cases;
    const visibleCases = cs.cases;
    const active = everything.filter(c => !['closed', 'cancelled'].includes(c.status) && c.track && c.track.location);
    const entries = active.map(c => ({ type: c.responder, incident: c.track.location, unit: c.track.unit, station: c.track.station, done: c.status === 'handed_over' }));
    const by = r => everything.filter(c => c.responder === r && !['closed', 'cancelled', 'handed_over'].includes(c.status)).length;
    statsBox.replaceChildren(
      h('div', { class: 'grid g4 keep2' }, tile('Active cases', st.active, t('View active cases'), () => go('/ops?view=active')), tile('Today', st.today, t('View today’s requests'), () => go('/ops?view=today')), tile('Responders available', `${st.providersAvailable}/${st.providersTotal}`, t('Open responder directory'), () => go('/ops/directory')), tile('Avg. minutes to handover', st.avgMinutesToHandover === null ? '-' : st.avgMinutesToHandover, t('View active cases'), () => go('/ops?view=active'))),
      h('div', { class: 'grid g3 keep2' }, RESP.map(r => h('div', { class: 'rcount u-' + r }, icon(r, 26), h('div', h('b', by(r)), h('small', t(SERVICE_NAME[r])))))),
    );
    map.update(entries);
    casesBox.replaceChildren(
      panel('Cases', h('div', h('div', { class: 'chips' }, [['', 'All'], ...RESP.map(r => [r, SERVICE_NAME[r]])].map(([v, l]) => h('button', { class: 'chip', 'aria-pressed': responder === v, onclick: () => go('/ops' + (v ? '?responder=' + v : '') + (status ? (v ? '&' : '?') + 'status=' + status : '')) }, t(l)))),
        h('div', { class: 'chips' }, [['', 'All'], ...STATUSES.map(s => [s, s])].map(([v, l]) => h('button', { class: 'chip', 'aria-pressed': status === v, onclick: () => go('/ops' + (v ? '?status=' + v : '') + (responder ? (v ? '&' : '?') + 'responder=' + responder : '')) }, v ? badgeText(v) : t(l)))),
        table([{ label: 'Code', render: c => link('/ops/case/' + c.id, c.code) }, { label: 'Service', render: c => respTag(c.responder) }, { label: 'Type', render: c => catName(c.category) }, { label: 'Area', render: c => c.area || '-' }, { label: 'Status', render: c => badge(c.status) },
          { label: 'Provider', render: c => c.assignedOrgName || '-' }, { label: 'Created', render: c => fdt(c.createdAt) }], visibleCases, { empty: view === 'today' ? 'No requests recorded today.' : view === 'active' ? 'No active cases right now.' : 'No cases.' }))));
  };
  await load();
  S.poll = setInterval(() => load().catch(() => stopPoll()), 3000);
  const pageTitle = view === 'active' ? 'Active cases' : view === 'today' ? 'Today’s requests' : 'Coordination dashboard';
  const pageSub = view === 'active' ? 'Requests that are not closed, cancelled or handed over.' : view === 'today' ? 'Requests created today in Somalia local time (Africa/Mogadishu).' : cfg.realMode ? 'Ambulance, police and fire requests (real mode is ON).' : 'Ambulance, police and fire requests in simulation mode.';
  return h('div', head(pageTitle, pageSub, h('button', { class: 'btn', onclick: add }, icon('plus'), t('New simulated request'))), cfg.realMode ? REALN() : SIM(), statsBox, mapPanel, casesBox);
}

function voicePlayer(id) {
  const out = h('div'); const b = h('button', { class: 'btn sm ghost', onclick: async () => {
    b.disabled = true;
    try { const v = await GET('/ops/cases/' + id + '/voice'); const bin = atob(v.data); const u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const a = h('audio', { controls: true, src: URL.createObjectURL(new Blob([u8], { type: v.mime })) }); out.replaceChildren(a); a.play().catch(() => {}); } catch (e) { toast(errText(e), 'err'); b.disabled = false; }
  } }, icon('mic', 16), t('Listen to voice message'));
  out.append(b); return out;
}

export async function caseDetail({ id }) {
  const [{ case: c }, { providers }] = await Promise.all([GET('/ops/cases/' + id), GET('/ops/providers')]);
  const change = body => PATCH('/ops/cases/' + id, body).then(() => { toast(t('Updated.')); refresh(); }).catch(e => toast(errText(e), 'err'));
  const sorted = [...providers].sort((a, b) => (b.type === c.responder) - (a.type === c.responder));
  const sel = h('select', { 'aria-label': t('Provider') }, h('option', { value: '' }, t('Choose provider')), sorted.map(p => h('option', { value: p.id, selected: p.id === c.assignedOrgId }, t(SERVICE_NAME[p.type] || p.type) + ' - ' + p.name + (p.available ? '' : ' (' + t('Unavailable') + ')'))));
  const L = { assigned: 'Assigned', received: 'Back to queue', en_route: 'En route (sim)', arrived: 'Arrived (sim)', handed_over: 'Handed over', closed: 'Closed', cancelled: 'Cancel case' };
  const tr = c.track; const loc = c.location;
  return h('div', head(c.code, catName(c.category) + (c.area ? ' - ' + c.area : ''), badge(c.status)), c.mode === 'REAL' ? REALN() : SIM(),
    h('div', { class: 'grid g2' },
      panel('Case', h('div', h('dl', { class: 'kv' }, h('dt', t('Mode')), h('dd', t(c.mode === 'REAL' ? 'REAL' : 'SIMULATION')), h('dt', t('Service')), h('dd', respTag(c.responder)), h('dt', t('Source')), h('dd', c.source), h('dt', t('Created')), h('dd', fdt(c.createdAt)), h('dt', t('Note')), h('dd', c.note || '-'),
        h('dt', t('Location')), h('dd', loc ? h('a', { href: osmLink(loc), target: '_blank', rel: 'noopener noreferrer' }, icon('pin', 16), loc.lat + ', ' + loc.lng + (loc.source === 'gps' ? ' (GPS)' : '')) : '-'),
        h('dt', t('Provider')), h('dd', c.assignedOrgName || '-'), tr && tr.etaMinutes ? h('dt', t('ETA')) : null, tr && tr.etaMinutes ? h('dd', t('{m} min (simulated)', { m: tr.etaMinutes })) : null))),
      panel('Actions', h('div', c.autopilot ? h('p', { class: 'hint' }, t('Demo autopilot is moving this case. Any action you take stops it.')) : null,
        ['received', 'assigned'].includes(c.status) ? h('div', h('div', { class: 'field' }, h('label', t('Assign responder')), sel), h('button', { class: 'btn sm', onclick: () => sel.value ? change({ assignedOrgId: sel.value }) : toast(t('Choose a provider first.'), 'err') }, t('Assign'))) : null,
        h('div', { class: 'actions' }, c.next.filter(n => n !== 'assigned').map(n => h('button', { class: 'btn sm' + (['cancelled', 'received'].includes(n) ? ' ghost' : ''), onclick: () => change({ status: n }) }, t(L[n])))), c.next.length ? null : h('p', { style: 'color:var(--muted)' }, t('This case is finished.'))))),
    c.hasVoice ? panel('Voice message', voicePlayer(c.id), h('small', { class: 'hint' }, t('Heard only by operators. Removed after the retention period.'))) : null,
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


// Live picture for administrators: what is active right now and where (cases + stations + hospitals on one map).
export async function liveBoard() {
  const [facP, hosP] = await Promise.all([GET('/providers').catch(() => ({ providers: [] })), GET('/hospitals').catch(() => ({ hospitals: [] }))]);
  const markers = [
    ...hosP.hospitals.filter(x => typeof x.lat === 'number').map(x => ({ kind: 'hospital', type: 'hospital', lat: x.lat, lng: x.lng, label: x.name })),
    ...facP.providers.filter(x => typeof x.lat === 'number' && RESP.includes(x.type)).map(x => ({ kind: 'station', type: x.type, lat: x.lat, lng: x.lng, label: x.name })),
  ];
  const stats = h('div'); const list = h('div');
  const map = liveMap([], { places: true, markers, height: 'min(52vh, 420px)' });
  const load = async () => {
    const [st, cs] = await Promise.all([GET('/ops/stats'), GET('/ops/cases')]);
    const active = cs.cases.filter(c => !['closed', 'cancelled', 'handed_over'].includes(c.status));
    map.update(active.filter(c => c.track && c.track.location).map(c => ({ type: c.responder, incident: c.track.location, unit: c.track.unit, station: c.track.station, done: false })));
    stats.replaceChildren(h('div', { class: 'grid g4 keep2' }, tile('Active cases', String(st.active), t('Open active requests'), () => go('/ops?view=active')), tile('Today', String(st.today), t('View today’s requests'), () => go('/ops?view=today')), tile('Responders available', `${st.providersAvailable}/${st.providersTotal}`, t('Open responder directory'), () => go('/ops/directory')), tile('Hospitals on map', String(markers.filter(m => m.kind === 'hospital').length), t('Open hospital directory'), () => go('/ops/directory'))));
    list.replaceChildren(table([
      { label: 'Code', render: c => link('/ops/case/' + c.id, c.code) }, { label: 'Service', render: c => respTag(c.responder) },
      { label: 'Area', render: c => c.area || '-' }, { label: 'Status', render: c => badge(c.status) },
      { label: 'Location', render: c => c.track && c.track.location ? h('a', { href: osmLink(c.track.location), target: '_blank', rel: 'noopener noreferrer' }, icon('pin', 14), ' ' + c.track.location.lat + ', ' + c.track.location.lng) : '-' },
      { label: 'Mode', render: c => c.mode === 'REAL' ? badge('REAL') : t('Demo') }], active, { empty: 'No active requests right now.' }));
  };
  await load();
  S.poll = setInterval(() => load().catch(() => stopPoll()), 4000);
  return h('section', { class: 'live-board' },
    h('div', { class: 'live-dot' }, h('i'), t('Live now'), ' - ', t('updates every few seconds')),
    stats, panel('Live map (demo)', h('div', map, h('div', { class: 'legend' }, RESP.map(r => respTag(r)), h('span', { class: 'rtag u-hospital' }, icon('hospital', 16), t('Hospital'))))),
    panel('Active requests', list));
}
