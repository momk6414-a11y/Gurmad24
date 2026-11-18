# GURMAD 24 — Nidaam buuxa (Demo / Tijaabo ammaan ah)

GURMAD 24 waa madal isku xidha **bukaannada, isbitaallada, ambalaasyada, shaybaarrada, hawlgalayaasha iyo maamulka**, oo leh **Suuq Kaararka Caafimaadka** iyo nidaam dakhli (komishan, rukumo, khidmado). Goobta tijaabada: **Gaalkacyo**. Luqado: **Soomaali + Ingiriisi**.

> ⚠️ **Muhiim:** Nidaamku waa **TIJAABO**. Lacag-bixintu waa **sandbox** (lacag dhab ah ma dhaqaaqdo). Gurmadku waa **JILITAAN** (ma diro ambalaas, booliis ama dab-damis dhab ah, ma wacdo, ma baaro cudur; goobta (GPS) waa ikhtiyaari, waxay u baahan tahay ogolaansho, waxaana loo isticmaalaa khariidadda tijaabada kaliya). Ha geli xog bukaan dhab ah. Eeg `docs/STATUS.md`.

## Waxa ku jira

| Qaybta | Waxa ay qabato |
|---|---|
| **Web App / PWA** | Isdiiwaangelin/gelitaan, tusaha isbitaallada, **Suuqa Kaararka Caafimaadka** (fiiri, is barbar dhig, faahfaahin, dalab, rasiid, taariikh), codsiga ballamaha, adeegyada, taageero/cabasho, xogtayda soo dejis/tirtir |
| **Mobile App (React Native + Expo)** | App Android oo gaar ah; wuxuu isticmaalaa isla backend-ka. Qaybaha directory-ga iyo hoyga way jiraan. Gelitaanka iyo hawlaha la ilaaliyo hadda waxaa laga isticmaalaa Web App-ka gudaha app-ka; native authentication/role screens weli ma dhammaystirna. Eeg `mobile-native/README.md`. |
| **Shaashadda hawlgalka** | Maamulka kiisaska (jilitaan), qoondaynta bixiyaha, xaalad-kala-guur la xaqiijiyey, tirakoobyo |
| **Albaabka isbitaalka** | Diiwaangelin + xaqiijin, macluumaad, **abuurista kaararka** (qabyo → ansixin → daabac), adeegyo/qiimayaal, ballamaha, iibka & dakhliga (+CSV), rukumo, cabashooyin |
| **Albaabka ambalaas/shaybaar** | Diiwaangelin + xaqiijin, helitaan, liis adeegyo, codsiyada (jilitaan), dakhli |
| **Maamulka (Admin)** | Isticmaalayaal & doorar, xaqiijinta hay'adaha, kaararka, **komishan/khidmo la dejin karo**, qorshayaasha rukumada, macaamilo, **lacag-celin**, qaansheeg/rasiid, warbixin bille/sannad + **CSV**, liisaska la maalgeliyey, cabashooyin, **diiwaanka hubinta**, kaydad |

## Sida loo orod (kombiyuutar ama server)

1. Ku rakib **Node.js 18+** (waxaa lagu tijaabiyey Node 22). Ma jiraan xirmooyin dheeri ah — `npm install` looma baahna.
2. Fur galka mashruuca.
3. Koobiyee `.env.example` → `.env`, kana beddel `ADMIN_EMAIL` iyo `ADMIN_PASSWORD` (eray-sir adag).
   Haddii `ADMIN_PASSWORD` madhan yahay, server-ku wuxuu sameeyaa mid random ah, wuxuuna ku daabacaa log-ka **mar keliya** (iyo `data/FIRST_ADMIN.txt`).
4. `npm start`
5. Browser: `http://localhost:8080`

**Akoonno tijaabo ah (ikhtiyaari):** `.env` ku dar `DEMO_PASSWORD=EraySirAdag123` → waxaa la sameynayaa `patient@`, `operator@`, `hospital@`, `ambulance@demo.gurmad24.test` oo isla eray-sirtaas leh. Production-ka ha isticmaalin.

## Sida loo isticmaalo (talaabo-tallaabo)

1. **Maamule ahaan gal** → *Settings*: deji komishanka, khidmadaha iyo qorshayaasha (qiyamaadka caadiga ah waa **tusaale**, ma aha heshiis).
2. Isbitaal cusub: *Register a hospital* → maamuluhu *Organisations → Verify*.
3. Isbitaalka: *Cards → New card* → buuxi → *Publish* (waa inuu xaqiijiyaa ansixinta).
4. Bukaanka: *Cards* → dooro → *Order this card (demo)* → rasiid.
5. Lacag-celin: bukaanka *Request refund* → Maamulaha *Finance → Orders and refunds*.
6. Dakhliga: *Admin → Revenue* (bille/sannad) → *Export CSV*.

## Android

- **PWA:** marka website-ka HTTPS ku jiro, Chrome → ⋮ → **Install app / Add to Home screen**.
- **React Native APK tijaabo:** GitHub → Actions → **Build GURMAD 24 Android APK**. Marka workflow-gu si guul leh u dhammaado, ka soo dejiso artifact-ka `gurmad24-android-test-apk`. APK-gani waa tijaabo toos ah, ma aha Play Store release.
- **Play Store:** daabacaad rasmi ah weli lama xaqiijin; waxay u baahan tahay Google Play developer account, hubin app, privacy disclosures iyo build release la saxiixay. Eeg `docs/STATUS.md`.

## Tijaabooyin

- `npm test` → wuxuu socodsiiyaa suite-ka hadda jira ee Node.js. Tirada tijaabooyinka way is beddeli kartaa; natiijada ugu dambaysa ka eeg GitHub Actions iyo `docs/TEST_RESULTS.md`.
- Tijaabada browser-ka: `node tests/ui-smoke.js` (waxay u baahan tahay Playwright).
- Mobile: `cd mobile-native && npm install && npm run typecheck`. APK build-ka waxaa sameeya GitHub Actions.

## Dukumentiyada

`docs/STATUS.md` (waxa shaqeeya vs waxa u baahan oggolaansho) · `docs/ARCHITECTURE.md` · `docs/DEPLOY_SOMALI.md` · `docs/API.md` · `docs/SECURITY.md` · `docs/PAYMENTS.md` · `docs/BACKUP_RECOVERY.md` · `docs/TEST_PLAN_SOMALI.md` · `docs/TEST_RESULTS.md` · `mobile-native/README.md`
