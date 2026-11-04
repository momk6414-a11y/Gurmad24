# Xaaladda mashruuca — waxa dhab ahaan shaqeeya iyo waxa weli u baahan

## ✅ Dhammaystiran oo la tijaabiyey (code + tijaabo la socodsiiyey)
- Isdiiwaangelin/gelitaan (scrypt, session cookie httpOnly, xanibaad 5 isku-day, rate limit), doorar 5 ah, RBAC, diiwaanka hubinta.
- Isbitaal/bixiye: diiwaangelin → **xaqiijin maamule** → daabacaad. Isbitaalku wuxuu ansixiyaa qoraalka/qiimaha/muddada/shuruudaha kaarkiisa; wax-ka-beddel wuxuu soo celiyaa qabyo.
- **Suuqa Kaararka**: fiiri, raadi/shaandhee, is barbar dhig (2–3), faahfaahin, dalab, rasiid, taariikh. Dalabku wuxuu kaydiyaa nuqul (snapshot) ee shuruudaha.
- **Dakhli**: komishan kaar (caadi + heshiis hay'ad kasta), rukumo bille/sannad (qorshayaal la beddeli karo), khidmad ballan, komishan shaybaar, liisaska la maalgeliyey (la calaamadeeyey), qaansheeg/rasiid/qoraal celin, warbixin xisaab-xidhka, warbixin bille/sannad, **CSV**.
- Lacag-celin: codsi → maamule ansixiyo/diido → hubka dakhliga oo la rogo.
- Ballamaha (isbitaal/shaybaar), cabashooyin/taageero, falanqayn gaar ah (u baahan rukumo).
- Shaashadda gurmadka: kiisas **JILITAAN**, state-machine, qoondayn, tirakoob.
- Asturnaan: ogolaansho, soo dejis xogta, tirtirid akoon (magac-ka-qaad), kaydin xadidan, magac-ka-qaadka kiisaska hore.
- Database joogto ah (JSON atomic + **migrations** + kayd maalinle + soo celin), PWA oo la rakibi karo, Soomaali/Ingiriis.

## 🔶 Waa tijaabo / waxaa la dayacay si ammaan ah
- **Lacag-bixin:** kaliya `sandbox`. Mobile-money/kaar **MA XIRNA** (ma jiro API credentials). Eeg `docs/PAYMENTS.md`.
- **Gurmadka:** jilitaan keliya. Ma jiro dirista, wicitaan, SMS, GPS, isbitaal-xiriir.
- **Qiimayaasha/komishanka caadiga ah** waa tusaale — maamuluhu ha dejiyo kuwa dhabta ah.
- Kaararka iyo isbitaallada tijaabada ah waa **xog khayaali ah**.

## ⛔ Waxa loo baahan yahay ka hor isticmaal dhab ah (ma ahan koodh)
1. Kormeer iyo ansixin xirfadlayaal caafimaad (habraacyo, mas'uuliyad) — gaar ahaan gurmadka.
2. Oggolaansho sharci/hay'adeed (Puntland/Soomaaliya), diiwaangelin ganacsi, canshuur, **sharciga caymiska** (kaararku waa inaanay isu muujin caymis).
3. Heshiisyo qoran: isbitaallo, ambalaasyo, shaybaarro; shuruudaha lacag-celinta.
4. Bixiye lacag-bixin la xaqiijiyey (shuruudo: akoon ganacsi, API, dib-u-eegis sharci).
5. Dib-u-eegis amni/asturnaan oo madaxbanaan (penetration test), siyaasad asturnaan sharci ahaan la hubiyey.
6. Hosting HTTPS + disk joogto ah + kormeer; haddii isticmaalayaal aad u badan: u wareeji PostgreSQL (eeg `docs/ARCHITECTURE.md`).
7. App Android Play Store (TWA/Capacitor) — PWA hadda waa la rakibi karaa; Play Store waxay u baahan tahay akoon developer ($25 hal mar) iyo domain HTTPS ah.
8. Hawlgalayaal tababaran iyo tijaabooyin la kormeero.
