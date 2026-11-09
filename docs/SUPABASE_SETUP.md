# GURMAD 24 — Supabase storage rollout

## Current architecture

The app preserves its existing synchronous in-memory Store interface for domain logic and local tests. In production, `src/supabase-store.js` loads the collections from the private `gurmad24` schema and commits only changed records from each API request through restricted PostgREST RPC functions. The server key is used only in Node.js; it is never sent to browser code.

The RPC functions run as invoker (not SECURITY DEFINER), use fully qualified table names, and are executable only by `service_role`. The underlying tables have RLS enabled and no public table grants. The app writes all whitelisted collections and the metadata/settings row atomically in one database transaction.

## Required Render environment variables

Set these on the existing `gurmad24` Render web service. Do not paste the secret into GitHub, source code, a public issue, or this chat.

- `SUPABASE_URL`: project API URL from Supabase → Project Settings / API.
- `SUPABASE_SERVICE_ROLE_KEY`: the server-side secret/service-role key from Supabase → Project Settings / API Keys. Never use a publishable/anon key here.

After both variables are saved, Render restarts the service. The app fails closed if only one variable is set or if the RPC/database connection fails; it does not silently fall back to local JSON when Supabase configuration is partial.

## First connection and existing data

The Supabase `gurmad24.records` table was empty at the time this adapter was prepared. The state row contained only version 0 and empty settings. The first successful startup will run the existing idempotent application migrations and seed routines against Supabase. It will not import an old Render filesystem snapshot automatically.

Render Free's filesystem is ephemeral. Any records created only in the old local JSON file cannot be assumed to survive a deploy/restart. Before using real patient data, verify the administrator account and any records that matter, and complete an explicit export/import if an earlier dataset must be preserved.

## Backups and production readiness

Supabase Free database storage is durable while the project remains active, but it does not provide independent point-in-time backups. This adapter disables misleading local JSON backups when Supabase is active. Before real patient information is stored, configure encrypted off-site backups and test a restore. Keep GURMAD 24 in PILOT mode: live dispatch remains OFF and payments remain sandbox-only.

## Verification

- `GET /api/health` should report `storage: supabase-postgres` and `storagePersistent: true`.
- Create a synthetic test record through a normal app workflow, confirm it appears in `gurmad24.records`, restart the Render service, and confirm it remains.
- Confirm unauthenticated/public clients cannot execute either RPC or read the private schema.
