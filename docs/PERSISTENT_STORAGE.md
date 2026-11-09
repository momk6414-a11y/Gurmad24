# Persistent data storage — current status

GURMAD 24 now includes a server-side Supabase PostgreSQL adapter on branch `feature/supabase-persistent-store`. It is deliberately **not activated in production yet**: Render must receive the two secret environment variables described in [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) after the code is reviewed and merged.

## Current production limitation

Until both Supabase variables are configured, Render Free continues to use `DATA_DIR/db.json`. Render Free's local filesystem is ephemeral, so writes may be lost on restart, redeploy, or spin-down.

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
