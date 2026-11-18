# Kaydka (backup) encrypted-ka ah ee Supabase - sida loo dejiyo

App-ku wuxuu xogta ku kaydiyaa Supabase isagoo adeegsanaya `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (Render). **Kaydka (backup) wuxuu u baahan yahay xog kale**: *database connection string*. Ha isku dhex yaaminin labadan.

| Meesha | Magaca | Qiimaha |
|---|---|---|
| Render | `SUPABASE_URL` | `https://xxxx.supabase.co` (API URL) |
| Render | `SUPABASE_SERVICE_ROLE_KEY` | service-role key |
| **GitHub Actions secret** | `SUPABASE_DB_URL` | `postgresql://postgres.<project-ref>:<PASSWORD>@aws-0-<region>.pooler.supabase.com:5432/postgres` |
| **GitHub Actions secret** | `BACKUP_ENCRYPTION_KEY` | ugu yaraan 32 xaraf (`openssl rand -base64 48`) |

## Tallaabooyinka

1. **Supabase** -> mashruucaaga -> badhanka **Connect** -> **Session pooler** -> koobi *URI*-ga. (Ha isticmaalin *Direct connection* (`db.xxxx.supabase.co`): waa IPv6 kaliya, GitHub Actions kuma gaari karo. Ha isticmaalin *Transaction pooler* (port 6543): `pg_dump` kuma shaqeeyo.)
2. Beddel `[YOUR-PASSWORD]` password-ka database-ka. Haddii aadan hayn: **Project Settings -> Database -> Reset database password** (isticmaal xarfo iyo tirooyin keliya si aan loo baahnayn URL-encoding).
3. **GitHub** -> repo-ga -> **Settings -> Secrets and variables -> Actions -> New repository secret**:
   - `SUPABASE_DB_URL` = URI-ga tallaabada 1-2 (hal sadar, meel bannaan la'aan).
   - `BACKUP_ENCRYPTION_KEY` = furaha cusub. **Koobi ku dhig password manager**: haddii lumo, kaydadka lama furi karo.
4. **Actions -> Encrypted GURMAD24 database backup -> Run workflow**.
5. Haddii uu cagaar noqdo, hoos ka soo deji artifact-ka `gurmad24-encrypted-db-backup` (waxaa la haynayaa 90 maalmood). Waxa uu mar kasta ku shaqeeyaa 02:17 UTC.

Haddii uu fashilmo, farriinta **error** ee run-ka ayaa si cad kuu sheegaysa waxa khaldan (placeholder, host-ka IPv6, port 6543, password aan sax ahayn, iwm.). Password-ka lama daabaco.

## Tijaabi dib-u-soo-celinta (muhiim)

Kayd aan la tijaabin kayd ma aha. Bishii mar:

```bash
gpg --batch --pinentry-mode loopback --passphrase "$BACKUP_ENCRYPTION_KEY" \
    --decrypt --output restore.dump gurmad24-XXXX.dump.gpg
pg_restore --list restore.dump | head        # waa inaad aragto "TABLE DATA gurmad24 records"
# Dib u celin mashruuc TIJAABO ah (ma aha mashruuca live):
pg_restore --no-owner --no-acl --dbname "<URI-ga mashruuca tijaabada>" restore.dump
```

## Waxa kaydku ka koobanyahay

Kaliya schema-ga `gurmad24` (dhammaan xogta GURMAD 24). Schemas-ka gudaha ee Supabase waxaa maamusha Supabase laftiisa.
