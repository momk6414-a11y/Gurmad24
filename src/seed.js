'use strict';
// First-start bootstrap: administrator, synthetic demo data, optional demo logins, retention job.
const fs = require('fs');
const path = require('path');
const S = require('./security');

function ensureAdmin(app, config, log) {
  const { store } = app.ctx;
  if (store.find('users', u => u.role === 'admin')) return;
  let pw = config.adminPassword; let generated = false;
  if (!pw) { pw = S.randomPassword(); generated = true; }
  app.createUser({ name: 'Administrator', email: config.adminEmail, password: pw, role: 'admin', lang: 'en' });
  if (generated) {
    fs.writeFileSync(path.join(config.dataDir, 'FIRST_ADMIN.txt'), `email: ${config.adminEmail}\npassword: ${pw}\n(Change it after first login, then delete this file.)\n`, { mode: 0o600 });
    log('First admin created; credentials saved to data/FIRST_ADMIN.txt.');
  } else log('First admin created.');
}

function seedDemoData(app) {
  const { store } = app.ctx;
  if (store.data.meta.seeded) return;
  const now = new Date().toISOString();
  const contract = () => ({ cardCommissionBps: null, labCommissionBps: null, appointmentFeeCents: null });
  const org = (type, name, area, extra = {}) => store.insert('orgs', { id: store.id('o_'), type, name, area, address: '', phone: '', publicEmail: '', description: '', hours: '', serviceAreas: [], available: false, status: 'verified', statusNote: 'Synthetic demo organisation', contract: contract(), createdAt: now, isDemoSeed: true, ...extra });

  const hA = org('hospital', 'Isbitaal Tusaale A (Demo)', 'Gaalkacyo', { description: 'Synthetic demo hospital for testing. Not a real facility.', hours: '24/7 (demo)', phone: '+000 000 0001' });
  const hB = org('hospital', 'Isbitaal Tusaale B (Demo)', 'Gaalkacyo', { description: 'Synthetic demo hospital for testing. Not a real facility.', hours: '08:00-20:00 (demo)', phone: '+000 000 0002' });
  const hC = org('hospital', 'Isbitaal Tusaale C (Demo)', 'Gaalkacyo', { description: 'Synthetic demo hospital for testing. Not a real facility.', hours: '08:00-16:00 (demo)', phone: '+000 000 0003' });
  const a1 = org('ambulance', 'Ambalaas Tusaale 1 (Demo)', 'Gaalkacyo', { available: true, serviceAreas: ['Aagga A', 'Aagga B'], phone: '+000 000 0011', description: 'Synthetic demo provider.' });
  const a2 = org('ambulance', 'Ambalaas Tusaale 2 (Demo)', 'Gaalkacyo', { available: false, serviceAreas: ['Aagga C'], phone: '+000 000 0012', description: 'Synthetic demo provider.' });
  const lab = org('lab', 'Laboratory Tusaale (Demo)', 'Gaalkacyo', { phone: '+000 000 0021', description: 'Synthetic demo laboratory.', hours: '07:00-15:00 (demo)' });

  const svc = (o, name, priceCents, note = '') => store.insert('services', { id: store.id('sv_'), orgId: o.id, name, priceCents, note, active: true, createdAt: now });
  svc(hA, 'General consultation (demo price)', 500); svc(hA, 'Check-up package (demo price)', 1500);
  svc(hB, 'General consultation (demo price)', 400); svc(hC, 'Follow-up visit (demo price)', 300);
  svc(a1, 'Patient transport - city (demo price)', 2000, 'Within Gaalkacyo'); svc(a2, 'Patient transport - inter-district (demo price)', 6000);
  svc(lab, 'Basic blood panel (demo price)', 800); svc(lab, 'Urine analysis (demo price)', 300);

  const card = (h, name, priceCents, validityDays, included, excluded, eligibility, terms, refundPolicy) => store.insert('cards', {
    id: store.id('cd_'), hospitalId: h.id, name, priceCents, included, excluded, validityDays, eligibility, terms, refundPolicy,
    status: 'published', hospitalApprovedAt: now, approvedBy: 'seed', createdAt: now, updatedAt: now, isDemoSeed: true,
  });
  const T = 'DEMO TEXT: Terms are written and approved by the hospital. This card is a hospital service product, not insurance, and does not guarantee treatment or coverage.';
  const R = 'DEMO TEXT: Refund conditions are set by the hospital; requests are reviewed by GURMAD 24 administrators.';
  card(hA, 'Kaarka Booqashada', 300, 90, ['One general consultation (demo)'], ['Emergency treatment', 'Medication', 'Surgery'], 'Open to all adults (demo)', T, R);
  card(hA, 'Kaarka Caafimaadka Qoyska', 1800, 180, ['Up to 4 consultations (demo)', 'One check-up (demo)'], ['Emergency treatment', 'Inpatient care'], 'Family of up to 4 (demo)', T, R);
  card(hB, 'Kaarka Adeegga Guud', 500, 120, ['Two general consultations (demo)', 'Basic vitals check (demo)'], ['Surgery', 'Specialist referrals'], 'Open to all (demo)', T, R);
  card(hC, 'Kaarka Xubinimada', 1000, 365, ['Priority booking (demo)', 'Four follow-up visits (demo)'], ['Emergency treatment', 'Dental'], 'Registered members (demo)', T, R);

  const planP = (audience, name, m, a, features) => store.insert('plans', { id: store.id('pl_'), audience, name, monthlyCents: m, annualCents: a, features, active: true, isPlaceholder: true });
  planP('hospital', 'Hospital Standard (placeholder price)', 2500, 25000, []);
  planP('hospital', 'Hospital Premium + Analytics (placeholder price)', 6000, 60000, ['analytics', 'premium_dashboard']);
  planP('ambulance', 'Ambulance Provider (placeholder price)', 1500, 15000, []);
  planP('lab', 'Laboratory Partner (placeholder price)', 1500, 15000, ['analytics']);

  // Synthetic simulated cases (no real people)
  const mk = (category, area, status) => { const c = require('./routes/public').createCase(store, { category, area, note: 'Synthetic demo case', source: 'operator' }); if (status !== 'received') { c.status = status; c.history.push({ ts: now, status, by: 'seed', note: '' }); if (status === 'assigned') c.assignedOrgId = a1.id; } return c; };
  mk('general', 'Aagga A', 'received'); mk('transport', 'Aagga B', 'assigned'); mk('other', 'Aagga C', 'received');

  store.data.meta.seeded = true; store.flush();
  return { hA, a1 };
}

function seedDemoUsers(app, config, log) {
  const { store } = app.ctx;
  if (!config.demoPassword || config.demoPassword.length < 10) return;
  const hosp = store.find('orgs', o => o.isDemoSeed && o.type === 'hospital'); const amb = store.find('orgs', o => o.isDemoSeed && o.type === 'ambulance');
  const mk = (name, email, role, orgId) => { if (!store.find('users', u => u.email === email)) app.createUser({ name, email, password: config.demoPassword, role, orgId, lang: 'so' }); };
  mk('Demo Patient', 'patient@demo.gurmad24.test', 'patient');
  mk('Demo Operator', 'operator@demo.gurmad24.test', 'operator');
  if (hosp) mk('Demo Hospital Admin', 'hospital@demo.gurmad24.test', 'hospital_admin', hosp.id);
  if (amb) mk('Demo Ambulance Admin', 'ambulance@demo.gurmad24.test', 'provider_admin', amb.id);
  log('Demo accounts ready: patient@ / operator@ / hospital@ / ambulance@demo.gurmad24.test (password = DEMO_PASSWORD)');
}

// Data retention: anonymise old closed cases, drop expired sessions.
function runRetention(store, days) {
  const cutoff = Date.now() - days * 86400000; let n = 0;
  for (const c of store.col('cases')) if (['closed', 'cancelled', 'handed_over'].includes(c.status) && !c.anonymizedAt && new Date(c.updatedAt).getTime() < cutoff) { c.area = ''; c.note = ''; c.anonymizedAt = new Date().toISOString(); n++; }
  for (const s of store.filter('sessions', x => new Date(x.expiresAt).getTime() < Date.now())) store.remove('sessions', s.id);
  if (n) store.save(); return n;
}

module.exports = { ensureAdmin, seedDemoData, seedDemoUsers, runRetention };
