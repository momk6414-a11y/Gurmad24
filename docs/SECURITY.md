# Security and privacy design

GURMAD 24 handles personal and health-visit information. This remains a **pilot foundation**; it is not certified as compliant with a healthcare privacy law. Do not use it for real patient records until an independent penetration test, privacy/legal review, backup restoration drill, and operational sign-off are complete.

## Implemented controls

| Area | Control |
|---|---|
| Passwords | scrypt with per-user salt; minimum length/complexity and common-password checks |
| Sessions | 256-bit random opaque ID, SHA-256 hash stored server-side, HttpOnly + SameSite=Lax cookie, 7-day expiry |
| HTTPS | Render terminates TLS; set `COOKIE_SECURE=true` to enable Secure cookies and HSTS |
| Proxy handling | `TRUST_PROXY=true` for Render's trusted proxy IP forwarding |
| Staff MFA | TOTP authenticator app; when `REQUIRE_STAFF_2FA=true`, every non-patient role is blocked from all data/API routes until enrolled |
| MFA enrolment | Password login opens only the account/MFA setup endpoints; staff can set up and confirm TOTP, then operational routes unlock |
| Demo accounts | `DISABLE_DEMO_ACCOUNTS=true` disables all `@demo.gurmad24.test` users, clears their password hashes, and revokes their sessions; audit/history rows remain |
| Brute force | Per-email lockout, per-IP and global request rate limits |
| Authorization | Role-based access and organisation scoping on hospital/provider endpoints |
| CSRF | Same-origin check on state-changing API requests, JSON-only bodies, SameSite cookies |
| Headers | CSP, frame denial, nosniff, COOP/CORP, no-referrer, HSTS when secure cookies are enabled |
| Audit | Sensitive authentication, administrative, financial and workflow events are recorded |
| Database | Supabase private schema; `anon` and `authenticated` have no schema USAGE or table grants; service role only has the backend persistence grants |
| Database RLS | RLS enabled on records/state/migrations with explicit service-role-only policies; RPCs use SECURITY INVOKER, empty search_path, and service-role-only execute grants |
| Visit persistence | The `visits` collection is allowed by both the incremental RPC and the backing records-table check constraint |
| Demo safety | Dispatch remains simulation/pilot only; payments remain sandbox only |

## Required Render environment

- `COOKIE_SECURE=true`
- `TRUST_PROXY=true`
- `REQUIRE_STAFF_2FA=true`
- `DISABLE_DEMO_ACCOUNTS=true`
- `DEMO_PASSWORD` should be empty so demo accounts are not re-created

Do not put secrets in source code, issues, pull requests, screenshots, or chat.

## Encrypted off-site backups

The workflow `.github/workflows/secure-database-backup.yml` runs daily at 02:17 UTC and can also be started manually. It creates a PostgreSQL custom-format dump, encrypts it with GPG symmetric AES-256 and integrity protection, checks that it can be decrypted and listed, then uploads an encrypted GitHub Actions artifact for 90 days.

The repository owner must add these two GitHub Actions repository secrets before the workflow can succeed:

1. `SUPABASE_DB_URL`: the PostgreSQL connection URI copied from the Supabase project dashboard (use an SSL-enabled connection string; prefer the session pooler if the direct database endpoint is not reachable from GitHub-hosted runners).
2. `BACKUP_ENCRYPTION_KEY`: a randomly generated secret with at least 32 characters. Keep a separate offline copy; it is required to decrypt backups.

The encryption key is not stored in the repository or in the workflow. GPG's integrity-protected symmetric format is used instead of unauthenticated CBC encryption. Never share either secret in chat. A successful workflow run and an actual restore drill are required before calling backups operational. Artifacts expire after 90 days, so copy critical backups to a separately controlled storage destination for longer retention.

### Restore outline

Download the encrypted artifact from GitHub Actions, then decrypt it in a trusted environment:

```sh
openssl enc -d -aes-256-cbc -pbkdf2 -iter 310000 \
  -pass env:BACKUP_ENCRYPTION_KEY \
  -in gurmad24-YYYYMMDDTHHMMSSZ.dump.enc \
  -out gurmad24.dump

pg_restore --list gurmad24.dump
# Restore only to a separate/new database after reviewing the target:
pg_restore --no-owner --no-acl --dbname "$RESTORE_DB_URL" gurmad24.dump
```

Do not test restore against production. The automated workflow validates archive readability, not a full database recovery.

## Remaining limitations

- Supabase Free does not provide independent point-in-time recovery. Encrypted external backups are still pending until the two repository secrets are configured and the scheduled workflow succeeds.
- Backup artifacts have a 90-day retention period and are not a substitute for a separately managed long-term backup vault.
- A restore drill and independent penetration test have not been completed.
- Rate-limit/lockout counters are in memory and reset on restart; this is a single-instance pilot design.
- TOTP is available for staff; account recovery and secure MFA reset still require an administrator-controlled process.
- Real patient data must not be entered until the above reviews and recovery controls are completed.
