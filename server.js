'use strict';
// GURMAD 24 server entry point. Supabase is enabled only when both server-side secrets exist.
const { build, buildAsync } = require('./src/bootstrap');

function resolveStorageMode(env = process.env) {
  const onRender = /^(1|true|yes|on)$/i.test(String(env.RENDER || ''));
  const supabaseUrl = String(env.SUPABASE_URL || '').trim();
  const serviceRoleKey = String(env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const hasAnySupabaseConfig = Boolean(supabaseUrl || serviceRoleKey);

  // Never start a Render deployment on its ephemeral /tmp JSON fallback.
  if (onRender && (!supabaseUrl || !serviceRoleKey)) {
    throw new Error('Render requires both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY; refusing temporary JSON storage.');
  }

  // Preserve local JSON development and let buildAsync reject partial Supabase setup.
  return hasAnySupabaseConfig ? 'supabase' : 'json';
}

async function start() {
  const useSupabase = resolveStorageMode(process.env) === 'supabase';
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

module.exports = { build, buildAsync, resolveStorageMode };
