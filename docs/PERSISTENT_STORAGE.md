# Persistent data storage plan (zero-cost pilot)

## Current limitation

The current `src/store.js` writes the entire application database to `DATA_DIR/db.json`.
Render Free web services have an ephemeral filesystem: local writes are lost on restart,
redeploy, and spin-down. A persistent disk is not available on the Free web-service plan.

## Proposed zero-cost database

Use a dedicated Supabase Free PostgreSQL project as the durable system of record.

- The Free plan currently includes 500 MB database storage per project.
- Free projects may be paused after a period of low activity; a paused project retains its
  data and can be restored. This is availability downtime, not a substitute for backups.
- Keep all credentials server-side. Never put a service-role key in browser JavaScript,
  GitHub, logs, or client-visible configuration.
- Set connection secrets only in the Render service environment after the owner creates
  and controls the Supabase project.

## Required migration before connecting production

The existing Store interface is synchronous and used across route handlers, domain logic,
seed routines, migrations, and tests. A PostgreSQL migration is therefore not a safe
one-line environment-variable change. It requires a deliberate async repository refactor,
SQL schema/migrations, transaction boundaries, uniqueness constraints, and test coverage.

Migration sequence:

1. Build an asynchronous repository interface and retain the JSON adapter for local tests.
2. Add a PostgreSQL adapter with parameterized SQL and explicit transactions.
3. Import existing JSON data with counts/checksums and a rollback export.
4. Verify users, organizations, appointments, orders, cases, audit history, settings, and
   sessions before switching the production read/write path.
5. Add scheduled encrypted exports/backups to a separate owner-controlled destination.
6. Only then enable PostgreSQL in production using Render environment variables.

## Safety gates

- Do not create a temporary Render Free Postgres database as the permanent solution:
  Render documents a 30-day expiry and no backups for Free Postgres.
- Do not store patient information or authentication secrets in a public Git repository.
- Do not enable a new database backend until migration and restore tests pass.
- This document does not claim the production data has already been migrated.
