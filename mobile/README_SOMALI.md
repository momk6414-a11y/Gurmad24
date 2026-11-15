# GURMAD 24 - App-ka mobile-ka (Android + iPhone)

App-kan waa "qolof" Capacitor ah oo ku xiran web app-ka online ah (`https://gurmad24.onrender.com`).
Isbeddel kasta oo web-ka lagu sameeyo wuxuu ka muuqdaa app-ka isla markiiba.

## 1. Tijaabi Android (bilaash, GitHub ayaa dhisaya)
GitHub -> **Actions** -> **Mobile - Android build** -> **Run workflow**.
Marka uu dhammaado, ka dhaaf **gurmad24-debug-apk** hoose, ku rakib taleefan Android ah.

## 2. Tijaabi iPhone (compile check)
GitHub -> Actions -> **Mobile - iOS build check** -> Run workflow.
Taasi waxay hubisaa inuu code-ku dhisanayo. Si loo geliyo App Store waxaa loo baahan yahay Apple Developer ($99/sannad), certificates iyo signing (Xcode ama Codemagic).

## 3. Icon iyo splash screen
Sawirrada ilaha ah waa `mobile/assets/` (icon-only, icon-foreground, icon-background, splash). Build kasta wuxuu si toos ah uga sameeyaa dhammaan cabbirrada Android iyo iOS. Si aad u beddesho, bedel PNG-yadaas (icon 1024x1024, splash 2732x2732).

## 4. Release AAB oo la saxiixay (Google Play)
**Mar keliya** samee upload keystore (kombiyuutar ku leh Java, ama Android Studio):
```bash
keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
base64 -w0 upload.jks     # Mac: base64 -i upload.jks
```
Keydi `upload.jks` iyo password-yada meel ammaan ah (password manager + nuqul kale). Haddii aad lumiso, Google Play way adkaan doontaa dib-u-dejin. **Ha gelin repo-ga ama chat-ka.**

GitHub -> Settings -> Secrets and variables -> Actions -> New repository secret:
- `ANDROID_KEYSTORE_BASE64` = qoraalka base64
- `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (`upload`), `ANDROID_KEY_PASSWORD`

Kadib: Actions -> **Mobile - Android release** -> Run workflow (geli version, tusaale 1.0.0). Ka soo dhaaf **gurmad24-release-aab** (14 maalmood ayuu sugnaan doonaa), oo ku shub Google Play Console -> Production/Internal testing. `versionCode` wuxuu si toos ah u kordhaa run kasta. Google Play ku dar **Play App Signing** marka aad horey u dhigto.

## 5. Notifications
Eeg `docs/PUSH_NOTIFICATIONS.md` (Firebase setup; Android keliya hadda).

## 6. Ka hor store-ka (waajib)
- **Server:** xogtu waa joogtaa (Supabase, `/api/health` wuxuu muujiyaa `storagePersistent: true`). Laakiin Render Free wuu seexdaa ~15 daqiiqo ka dib, tijaabada ugu horreysana waa 30-60 ilbiriqsi. Si uu u soo jeedo, u beddel `plan: starter` (lacag) ama ping `/api/health` 10 daqiiqo kasta. Eeg `docs/PERSISTENT_STORAGE.md`.
- **Privacy policy URL** (bog dadweynaha ka furan).
- **Icons iyo screenshots** (1024x1024 icon; sawirro taleefan).
- **Android:** akoon Google Play ($25 hal mar), kadibna release AAB oo la saxiixay (keystore). Keystore-ka ha ku kaydin repo-ga.
- **iOS:** Apple dhinaceeda waxay diidaan app-yada web-site keliya ah. Ku dar astaamo native ah (notifications, offline, splash) ka hor.
- Mashruuca hadda waa jilitaan/demo (`docs/STATUS.md`). Ha lagu sheegin store-ka inuu dhab ahaan u dirayo ambalaas ama gurmad.

## Amarro gacanta ah (haddii aad Mac/Android Studio leedahay)
```bash
cd mobile
npm install
npx cap add android   # iyo/ama: npx cap add ios
npx cap sync
npx cap open android  # ama ios
```
