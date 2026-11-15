# GURMAD 24 - App-ka mobile-ka (Android + iPhone)

App-kan waa "qolof" Capacitor ah oo ku xiran web app-ka online ah (`https://gurmad24.onrender.com`).
Isbeddel kasta oo web-ka lagu sameeyo wuxuu ka muuqdaa app-ka isla markiiba.

## 1. Tijaabi Android (bilaash, GitHub ayaa dhisaya)
GitHub -> **Actions** -> **Mobile - Android build** -> **Run workflow**.
Marka uu dhammaado, ka dhaaf **gurmad24-debug-apk** hoose, ku rakib taleefan Android ah.

## 2. Tijaabi iPhone (compile check)
GitHub -> Actions -> **Mobile - iOS build check** -> Run workflow.
Taasi waxay hubisaa inuu code-ku dhisanayo. Si loo geliyo App Store waxaa loo baahan yahay Apple Developer ($99/sannad), certificates iyo signing (Xcode ama Codemagic).

## 3. Ka hor store-ka (waajib)
- **Server joogto ah:** Render Free wuu tirtiraa xogta mar kasta oo uu dib u bilaabmo (`render.yaml`). Isticmaal plan lacag leh + disk, ama Supabase (`docs/SUPABASE_SETUP.md`).
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
