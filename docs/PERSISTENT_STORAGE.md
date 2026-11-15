# Persistent data storage — current status

GURMAD 24 includes a server-side Supabase PostgreSQL adapter (`src/supabase-store.js`). **Status (2026-11-15):** the live service `gurmad24.onrender.com` reports `storage: supabase-postgres` and `storagePersistent: true` on `/api/health`, i.e. it is active in production.

## If Supabase is not configured

Without both `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (see [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)), the app falls back to `DATA_DIR/db.json`. On Render Free that filesystem is ephemeral, so writes may be lost on restart, redeploy, or spin-down. `render.yaml` declares both variables (`sync: false`) so a Blueprint sync keeps them set.

## Always-on (no cold start)

Data persistence and availability are separate: Render Free still sleeps after ~15 minutes idle, and the first request afterwards takes 30-60 seconds (the mobile app shows its offline page if that load fails). Fix by moving to a paid plan (`plan: starter`) or by pinging `/api/health` every 10 minutes from an uptime monitor.

## Implemented integration

- Existing synchronous application Store interface is retained for domain logic and local tests.
- `src/supabase-store.js` loads the whitelisted collections and app metadata from the private `gurmad24` schema.
- Each API request flushes pending writes before returning its response.
- Changed rows are upserted and deleted in one transaction through restricted PostgREST RPC functions; the app does not rewrite every collection on each request.
- The RPC functions are SECURITY INVOKER, fully qualify the private schema, and are executable only by `service_role`.
- Public/anon/authenticated roles have no access to the private schema or RPC functions.
- Health reports `supabase-postgres` only when that backend is actually active.

## Rollout gates

1. Review and merge the storage adapter PR.
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Render's service environment. Never put the server key in browser code or GitHub.
3. Verify `/api/health` reports `storage: supabase-postgres` and `storagePersistent: true`.
4. Verify the admin login and synthetic pilot data, then create a test record, restart the service, and confirm the record remains.
5. Complete a data export/import if any records from an earlier local JSON database must be retained.
6. Configure encrypted off-site backups and test a restore before any real patient data is stored.

Supabase Free storage is persistent while the project remains active, but does not provide independent point-in-time backups. This integration does not enable live emergency dispatch or real payments; those remain OFF / sandbox-only.
