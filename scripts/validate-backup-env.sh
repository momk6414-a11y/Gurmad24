#!/usr/bin/env bash
# Pre-flight check for the encrypted database backup workflow.
# Reads SUPABASE_DB_URL and BACKUP_ENCRYPTION_KEY from the environment and explains, in plain
# words, what is wrong. It never prints the secrets themselves.
set -uo pipefail

fail() { echo "::error::$1"; exit 1; }
url="${SUPABASE_DB_URL:-}"
key="${BACKUP_ENCRYPTION_KEY:-}"

[[ -n "$url" ]] || fail "Repository secret SUPABASE_DB_URL is empty or missing. Add it under Settings > Secrets and variables > Actions."

if [[ "$url" == http://* || "$url" == https://* ]]; then
  fail "SUPABASE_DB_URL contains the project API URL (https://...). Backups need the DATABASE connection string (postgresql://...) from Supabase > Connect > Session pooler."
fi
[[ "$url" == postgres://* || "$url" == postgresql://* ]] || fail "SUPABASE_DB_URL must start with postgresql:// (Supabase > Connect > Session pooler)."
[[ "$url" != *"[YOUR-PASSWORD]"* && "$url" != *"YOUR-PASSWORD"* ]] || fail "SUPABASE_DB_URL still contains the placeholder [YOUR-PASSWORD]. Replace it with the real database password (URL-encoded)."
[[ "$url" != *" "* && "$url" != *$'\n'* ]] || fail "SUPABASE_DB_URL contains spaces or a line break. Paste the URI on one line with no extra characters."

rest="${url#*://}"
authority="${rest%%/*}"
if [[ "$authority" != *"@"* ]]; then
  fail "SUPABASE_DB_URL has no username/password part. Expected postgresql://USER:PASSWORD@HOST:5432/postgres."
fi
userinfo="${authority%@*}"
hostport="${authority##*@}"
if [[ "$userinfo" == *"@"* ]]; then
  fail "The database password contains an unencoded '@'. URL-encode special characters in the password (@ becomes %40) or reset it to letters and numbers only."
fi
host="${hostport%%:*}"
port=""
[[ "$hostport" == *:* ]] && port="${hostport##*:}"

if [[ "$host" =~ ^db\.[a-z0-9]+\.supabase\.co$ ]]; then
  fail "SUPABASE_DB_URL uses the direct connection host (db.<project>.supabase.co), which is IPv6-only and cannot be reached from GitHub Actions. Use the Session pooler string (host aws-...pooler.supabase.com, user postgres.<project-ref>, port 5432)."
fi
if [[ "$port" == "6543" ]]; then
  fail "SUPABASE_DB_URL uses port 6543 (transaction pooler), which pg_dump cannot use. Use the Session pooler on port 5432."
fi
if [[ "$host" == *.pooler.supabase.com && "$userinfo" != postgres.* ]]; then
  fail "With the Supabase pooler the username must be postgres.<project-ref> (not just 'postgres')."
fi

if [[ ${#key} -lt 32 ]]; then
  fail "BACKUP_ENCRYPTION_KEY must contain at least 32 characters (generate one with: openssl rand -base64 48). Store a copy in your password manager: without it the backups cannot be decrypted."
fi

echo "Backup secrets look valid (host: ${host:-unknown}, port: ${port:-default})."
