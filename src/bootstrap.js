'use strict';
const config0 = require('./config');
const { Store } = require('./store');
const { App } = require('./app');
const migrations = require('./migrations');
const seed = require('./seed');
const catalog = require('./catalog');

function build(overrides = {}) {
  const config = config0.load(overrides);
  const store = new Store(config.dataDir).load();
  store.migrate(migrations);
  const app = new App({ store, config });
  const log = overrides.quiet ? () => {} : console.log;
  for (const r of ['auth', 'public', 'patient', 'org', 'ops', 'admin']) require('./routes/' + r)(app);
  seed.ensureAdmin(app, config, log);
  if (config.seedDemoData) seed.seedDemoData(app);
  seed.ensureResponderDemo(app);
  catalog.applyToAll(store); // starter services + cards for hospitals that have none (idempotent)
  seed.seedDemoUsers(app, config, log);
  seed.runRetention(store, config.retentionDays);
  const timers = [];
  if (config.autoBackup) {
    if (!store.listBackups().length) store.backup();
    timers.push(setInterval(() => { try { store.backup(); seed.runRetention(store, config.retentionDays); } catch (e) { console.error('[backup]', e.message); } }, 24 * 3600 * 1000));
  }
  timers.forEach(t => t.unref());
  app.shutdown = async () => { await app.close(); store.flush(); };
  return { app, store, config };
}
module.exports = { build };
