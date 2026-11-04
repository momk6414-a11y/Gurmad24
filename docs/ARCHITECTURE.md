# Architecture and technology choice

**Stack:** Node.js 18+ (no runtime dependencies), vanilla ES-module PWA frontend, JSON document store with atomic writes.
**Why:** the project owner works mainly from an Android phone; zero dependencies means nothing to install, no build step, nothing that breaks on update, and any cheap host can run it. The module boundaries are kept so each part can be swapped later.

```
server.js              entry point
src/bootstrap.js       wiring: config → store → migrations → routes → seed → backup timer
src/app.js             router, security middleware, sessions, static files
src/store.js           persistent store (atomic write, backups, migrations)   ← replace with PostgreSQL for scale
src/migrations/        versioned data migrations (never edit old ones)
src/domain.js          rates, views (what each audience may see), ledger, documents
src/payments.js        payment abstraction (sandbox only; real providers = not connected)
src/routes/*.js        auth · public · patient · org (hospital+provider) · ops · admin
public/                PWA: index.html, css, js (core, i18n, views/*), sw.js, manifest, icons
tests/                 node:test suites + browser smoke test
scripts/               backup, restore, API-doc generator
```

## Data model (collections)
users · sessions · orgs(type hospital/ambulance/lab, status, contract overrides) · cards · orders(with immutable card snapshot) · appointments · cases(simulation) · services · plans · subscriptions · transactions(ledger: gross + platform revenue) · invoices(receipts, invoices, statements, credit notes) · complaints · sponsored · audit · settings.

## Key business rules
- Card lifecycle: draft → (hospital attests + org verified) published → archived; edits unpublish; admin can suspend/restore.
- Commission = round(price × bps / 10000); precedence: per-org contract → platform default. Stored on each order.
- Refund: request → admin approve (ledger reversal + credit note) or deny.
- Subscriptions: plan price from admin; renewal continues after current term; `analytics` feature gates premium reports.
- Case state machine: received → assigned → en_route → arrived → handed_over → closed (cancel allowed before handover).

## Scaling path
1. Move `Store` to PostgreSQL (same collections → tables; migrations → SQL files).
2. Move sessions and rate limits to Redis/DB.
3. Add object storage for documents, a job runner for retention/backup, and structured logging/monitoring.
4. Add real payment adapters in `src/payments.js` after provider verification.
