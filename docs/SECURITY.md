# Security and privacy design

Healthcare data is treated as sensitive. This is a **demo/pilot foundation**: no legal or regulatory compliance is claimed. An independent security review and legal/privacy review are required before real use.

## Implemented (covered by automated tests unless noted)
| Area | Control |
|---|---|
| Passwords | scrypt (N=16384) with per-user random salt; min 8 chars with letters+digits; never logged or returned |
| Sessions | 256-bit random id in `httpOnly; SameSite=Lax` cookie (`Secure` when `COOKIE_SECURE=true`); only SHA-256 hash stored server-side; 7-day expiry; destroyed on logout, password change (other sessions), enable, store|
| Brute force | per-email lockout (5 failures / 15 min), per-IP auth rate limit, global rate limit |
| Authorization | role-based (`patient`, `hospital_admin`, `provider_admin`, `operator`, `admin`), least privilege, every org endpoint scoped to caller's organisation; tested matrix |
| CSRF | same-origin check on state-changing calls + JSON-only bodies + SameSite cookie |
| Input | schema validation, unknown fields dropped (no mass assignment), 64 KB body limit, length limits |
| Output | UI built with DOM APIs (no `innerHTML`), strict CSP (`script-src 'self'`), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer`, HSTS when secure |
| CSV export | formula-injection neutralised (`= + - @` prefixed) |
| Audit | who/what/when/IP for logins, status changes, money, settings, cases (admin viewer) |
| Data minimisation | no medical data fields; appointment reason is a category + 140-char note; hospitals see only name + phone given; patients not identified in hospital sales reports |
| Privacy rights | consent at registration; export all my data; delete account (anonymises; financial records kept without personal data) |
| Retention | closed emergency cases anonymised after `RETENTION_DAYS`; expired sessions purged |
| Secrets | environment variables / `.env` (git-ignored); auto-generated session secret saved `0600`; no credentials in code or frontend |
| Money safety | integer cents; sandbox provider only; real providers refuse to run (HTTP 501) |
| Safety | emergency dispatch is simulation only; platform never diagnoses; cards labelled "not insurance" |

## Known limits / to do before real use
- **Encryption at rest:** `data/db.json` is a plain file with `0600` permissions. Use an encrypted disk/volume from your host, or move to a managed PostgreSQL with encryption at rest. (Not implemented in code.)
- **Encryption in transit:** provided by the HTTPS host/proxy; the app itself speaks HTTP.
- Rate-limit and lockout counters are in memory (reset on restart; single instance).
- No email/SMS verification or password-reset-by-email (admin resets passwords instead). No 2FA.
- No external penetration test has been done.
- Single-instance JSON store: not for multi-server deployments.
