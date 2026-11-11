'use strict';
const config0 = require('./config');
const { Store } = require('./store');
const { SupabaseStore } = require('./supabase-store');
const { App } = require('./app');
const migrations = require('./migrations');
const seed = require('./seed');
const catalog = require('./catalog');
const D = require('./domain');

function wire(config, store, overrides = {}) {
  store.migrate(migrations);
  // Enforce the institutional-pilot safety lock even if a previous database stored realMode=true.
  D.settings(store).realMode = false;
  store.save();
  const app = new App({ store, config });
  const log = overrides.quiet ? () => {} : console.log;
  for (const r of ['auth', 'public', 'patient', 'org', 'ops', 'admin']) require('./routes/' + r)(app);
  if (store.backend === 'supabase-postgres') {
    log('GURMAD 24 storage: Supabase PostgreSQL (server-side key; private schema).');
  } else if (!config.persistentStorage) {
    log('WARNING: storage is NOT persistent - all data are lost on restart/deploy. Supabase is not connected.');
  }
  seed.ensureAdmin(app, config, log);
  if (config.seedDemoData) seed.seedDemoData(app);
  seed.ensureResponderDemo(app);
  catalog.applyToAll(store);
  seed.seedDemoUsers(app, config, log);
  seed.runRetention(store, config.retentionDays);

  const timers = [];
  if (config.autoBackup && store.backend !== 'supabase-postgres') {
    if (!store.listBackups().length) store.backup();
    timers.push(setInterval(() => {
      try { store.backup(); seed.runRetention(store, config.retentionDays); }
      catch (e) { console.error('[backup]', e.message); }
    }, 24 * 3600 * 1000));
  } else if (store.backend === 'supabase-postgres') {
    log('NOTE: Supabase Free does not provide independent point-in-time backups; configure encrypted off-site exports before real patient data.');
  }
  timers.forEach(t => t.unref());
  app.shutdown = async () => {
    await app.close();
    await store.flush();
    if (typeof store.close === 'function') await store.close();
  };
  return { app, store, config };
}

function build(overrides = {}) {
  const config = config0.load(overrides);
  const store = new Store(config.dataDir).load();
  return wire(config, store, overrides);
}

async function buildAsync(overrides = {}) {
  const config = config0.load(overrides);
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error('Supabase storage is partially configured. Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on Render.');
  }
  const store = await new SupabaseStore(config.dataDir, {
    url: config.supabaseUrl,
    serviceRoleKey: config.supabaseServiceRoleKey,
  }).connect();
  const result = wire(config, store, overrides);
  await store.flush();
  return result;
}

module.exports = { build, buildAsync };
