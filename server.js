'use strict';
// GURMAD 24 server entry point. Supabase is enabled only when both server-side secrets exist.
const { build, buildAsync } = require('./src/bootstrap');

async function start() {
  const useSupabase = !!(process.env.SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { app, config } = useSupabase ? await buildAsync() : build();
  await app.listen(config.port);
  console.log(`GURMAD 24 listening on port ${config.port}  [mode: 'PILOT'; payments: sandbox only; live dispatch: OFF]`);
  const stop = () => app.shutdown().then(() => process.exit(0)).catch(e => {
    console.error('[shutdown]', e.message);
    process.exit(1);
  });
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}

if (require.main === module) start().catch(error => {
  console.error('[startup] GURMAD 24 could not start:', error.message);
  process.exit(1);
});

module.exports = { build, buildAsync };
