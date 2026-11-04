# Sida loo geliyo internet-ka (laga bilaabo taleefan Android)

Ujeeddo: app-ku inuu helo **URL HTTPS ah** si Chrome Android uu ugu daro **Home screen** (PWA).

## Waxa aad u baahan tahay
- Akoon **GitHub** (bilaash) — koodhka ku rar.
- Akoon host: **Render.com**, ama Railway / Fly.io / VPS. **Muhiim:** database-ku waa fayl (`data/db.json`), sidaas darteed host-ku waa inuu lahaado **disk joogto ah**. Haddii kale xogtu way baaba'aysaa marka server-ku dib u bilaabmo.

## Render.com (soo jeedin)
1. Ku rar galka mashruuca GitHub (repository cusub). **Ha rarin `.env` ama `data/`** (`.gitignore` ayaa ka ilaaliya).
2. Render → **New → Blueprint** → dooro repository-ga (wuxuu akhrisanayaa `render.yaml`).
3. Geli `ADMIN_EMAIL` iyo `ADMIN_PASSWORD` (eray-sir adag; **ha la wadaagin**).
4. Disk 1GB wuxuu ku xiran yahay `/var/data` (u baahan qorshe lacag ah — Render disk ma bilaash aha).
5. Sug build-ka → fur URL-ka `https://magacaaga.onrender.com`.
6. Hubi: `/api/health` wuxuu soo celinayaa `{"ok":true,"mode":"DEMO_SANDBOX",...}`.
7. Gal maamule ahaan → **Settings** → deji qiyamaadka.

Haddii aad rabto Docker: `Dockerfile` ayaa diyaar ah (`docker build -t gurmad24 .` ; `docker run -p 8080:8080 -v g24data:/data -e ADMIN_PASSWORD=... gurmad24`).

## Rakib app-ka Android
1. Chrome ka fur URL-ka HTTPS.
2. ⋮ menu → **Install app** (ama **Add to Home screen**).
3. App-ku wuxuu u furmaa shaashad buuxda; qaybaha jira way shaqeeyaan offline-ka oo keliya (shell), xogta waxay u baahan tahay internet.

## Xaaladaha caadiga ah
| Dhibaato | Xal |
|---|---|
| Ma arko FIRST_ADMIN | Eeg log-ka host-ka, ama dejin `ADMIN_PASSWORD` kahor bilowga ugu horreeya |
| Gelitaan: "too many attempts" | Sug 15 daqiiqo |
| Xogtii way baaba'day | Disk joogto ah ma xirna `DATA_DIR`; eeg `docs/BACKUP_RECOVERY.md` |
| Cookie ma shaqeyso | Hubi `COOKIE_SECURE=true` iyo `TRUST_PROXY=true` host HTTPS ah dhexdiisa |

## App Android Play Store (marxalad dambe)
Waxay u baahan tahay: domain HTTPS ah, akoon Google Play Console, iyo Trusted Web Activity (Bubblewrap) ama Capacitor. Code-kan PWA-ga wuu diyaar u yahay (manifest + icons 192/512/maskable + service worker). Dhismaha APK/AAB dhabta ah halkan lama sameyn (ma jiro Android SDK/signing key), sidaas darteed ma sheegayo inuu diyaar yahay.
