# Push notifications (Android app)

Status: **client + server code are in place; sending stays OFF until Firebase credentials are added.** iOS is not wired yet (see bottom).

## How it works
1. The Android app (Capacitor shell) loads the web app. After login, `public/js/native.js` asks for notification permission, registers with Firebase Cloud Messaging (FCM) and sends the device token to `POST /api/me/devices`.
2. The token is stored on the user record (`user.deviceTokens`, max 5, never returned by any API). A token belongs to one user: if someone else logs in on the same phone, it moves to them. Logging out or deleting the account removes it.
3. The server sends with `src/push.js` (`sendToUser`) through FCM HTTP v1. Without credentials it does nothing.

**Privacy rule:** never put medical or case details in a notification (lock screens are visible). Use generic text such as "Waxaa jira cusboonaysiin cusub".

## Turn it on (one-time, ~15 minutes)
1. Create a project at https://console.firebase.google.com (free) and add an **Android app** with package name `so.gurmad24.app`.
2. Download **google-services.json**. Encode it: `base64 -w0 google-services.json` (Mac: `base64 -i google-services.json`).
3. GitHub repo -> Settings -> Secrets and variables -> Actions -> New secret: `GOOGLE_SERVICES_JSON_BASE64` = that text. Rebuild the app (Actions -> Mobile - Android build).
4. Firebase -> Project settings -> Service accounts -> **Generate new private key** (a JSON file). In the Render dashboard add an environment variable `FIREBASE_SERVICE_ACCOUNT_JSON` with the **whole JSON text**. Never commit it to GitHub or paste it in chat.
5. Install the rebuilt app, log in as admin, allow notifications. Then call `POST /api/admin/push/test` (admin only). It sends a test notification to your own registered phones and returns `{configured, devices, sent}`.

## Using it from code
```js
const r = await app.ctx.push.sendToUser(store, user, { title: 'GURMAD 24', body: 'Ballantaada waa la xaqiijiyey.' });
```
Hook it into appointment/order status changes when you decide which events should notify (kept out of the domain flows on purpose).

## iOS (not done yet)
Capacitor on iOS returns an **APNs** token, not an FCM token. To support it you need an Apple Developer account, an APNs key uploaded to Firebase, and the Firebase iOS SDK added to the native project (or a direct APNs sender on the server). Until then the app skips push registration on iPhone.
