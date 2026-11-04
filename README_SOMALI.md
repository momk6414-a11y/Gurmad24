# GURMAD 24 — Nidaam buuxa (Demo / Tijaabo ammaan ah)

GURMAD 24 waa madal isku xidha **bukaannada, isbitaallada, ambalaasyada, shaybaarrada, hawlgalayaasha iyo maamulka**, oo leh **Suuq Kaararka Caafimaadka** iyo nidaam dakhli (komishan, rukumo, khidmado). Goobta tijaabada: **Gaalkacyo**. Luqado: **Soomaali + Ingiriisi**.

> ⚠️ **Muhiim:** Nidaamku waa **TIJAABO**. Lacag-bixintu waa **sandbox** (lacag dhab ah ma dhaqaaqdo). Gurmadku waa **JILITAAN** (ma diro ambalaas, ma wacdo, ma isticmaalo GPS, ma baaro cudur). Ha geli xog bukaan dhab ah. Eeg `docs/STATUS.md`.

## Waxa ku jira (way shaqeeyaan — la tijaabiyey)
| Qaybta | Waxa ay qabato |
|---|---|
| **App-ka bukaanka (PWA Android)** | Isdiiwaangelin/gelitaan, tusaha isbitaallada, **Suuqa Kaararka Caafimaadka** (fiiri, is barbar dhig, faahfaahin, dalab, rasiid, taariikh), codsiga ballamaha, adeegyada, taageero/cabasho, xogtayda soo dejis/tirtir |
| **Shaashadda hawlgalka** | Maamulka kiisaska (jilitaan), qoondaynta bixiyaha, xaalad-kala-guur la xaqiijiyey, tirakoobyo |
| **Albaabka isbitaalka** | Diiwaangelin + xaqiijin, macluumaad, **abuurista kaararka** (qabyo → ansixin → daabac), adeegyo/qiimayaal, ballamaha, iibka & dakhliga (+CSV), rukumo, cabashooyin |
| **Albaabka ambalaas/shaybaar** | Diiwaangelin + xaqiijin, helitaan, liis adeegyo, codsiyada (jilitaan), dakhli |
| **Maamulka (Admin)** | Isticmaalayaal & doorar, xaqiijinta hay'adaha, kaararka, **komishan/khidmado la dejin karo**, qorshayaasha rukumada, macaamilo, **lacag-celin**, qaansheeg/rasiid, warbixin bille/sannad + **CSV**, liisaska la maalgeliyey, cabashooyin, **diiwaanka hubinta**, kaydad |

## Sida loo orod (kombiyuutar ama server)
1. Ku rakib **Node.js 18+** (waxaa lagu tijaabiyey Node 22). Ma jiraan xirmooyin dheeri ah — `npm install` looma baahna.
2. Fur galka mashruuca.
3. Koobiyee `.env.example` → `.env`, kana beddel `ADMIN_EMAIL` iyo `ADMIN_PASSWORD` (eray-sir adag).  
   Haddii `ADMIN_PASSWORD` madhan yahay, server-ku wuxuu sameeyaa mid random ah, wuxuuna ku daabacaa log-ka **mar keliya** (iyo `data/FIRST_ADMIN.txt`).
4. `npm start`
5. Browser: `http://localhost:8080`

**Akoonno tijaabo ah (ikhtiyaari):** `.env` ku dar `DEMO_PASSWORD=EraySirAdag123` → waxaa la sameynayaa `patient@`, `operator@`, `hospital@`, `ambulance@demo.gurmad24.test` oo isla eray-sirtaas leh. Production-ka ha isticmaalin.

## Sida loo isticmaalo (talaabo-talaabo)
1. **Maamule ahaan gal** → *Settings*: deji komishanka, khidmadaha iyo qorshayaasha (qiyamaadka caadiga ah waa **tusaale**, ma aha heshiis).
2. Isbitaal cusub: *Register a hospital* → maamuluhu *Organisations → Verify*.
3. Isbitaalka: *Cards → New card* → buuxi → *Publish* (waa inuu xaqiijiyaa ansixinta).
4. Bukaanka: *Cards* → dooro → *Order this card (demo)* → rasiid.
5. Lacag-celin: bukaanka *Request refund* → Maamulaha *Finance → Orders and refunds*.
6. Dakhliga: *Admin → Revenue* (bille/sannad) → *Export CSV*.

## Android
Eeg **`docs/DEPLOY_SOMALI.md`** (talaabooyin laga qaado taleefan keliya) — host HTTPS ah ka dibna Chrome → ⋮ → **Install app / Add to Home screen**. App Android oo Play Store ah (TWA) way suurtagal tahay laakiin waxay u baahan tahay akoon Google Play iyo domain HTTPS ah (qeexitaan `docs/STATUS.md`).

## Tijaabooyin
`npm test` → 33 tijaabo oo otomaatig ah (auth, doorar, onboarding, kaararka, dalabyada, komishan, rukumo, ballamo, lacag-celin, warbixino, amniga API). Tijaabada browser-ka: `node tests/ui-smoke.js` (u baahan Playwright). Natiijooyinka dhabta ah: `docs/TEST_RESULTS.md`.

## Dukumentiyada
`docs/STATUS.md` (waxa shaqeeya vs waxa u baahan oggolaansho) · `docs/DEPLOY_SOMALI.md` · `docs/API.md` · `docs/SECURITY.md` · `docs/ARCHITECTURE.md` · `docs/PAYMENTS.md` · `docs/BACKUP_RECOVERY.md` · `docs/TEST_PLAN_SOMALI.md` · `docs/TEST_RESULTS.md`
