# GURMAD 24 — React Native Android app

The native client is built with React Native + Expo. It uses the existing GURMAD 24 backend; it does not create a second database.

## Shared services

- Public hospital directory data is requested from the existing `/api/hospitals` endpoint.
- The **Web App** tab opens `https://gurmad24.onrender.com` inside the app, so the existing website workflows continue to use the same backend.
- `EXPO_PUBLIC_API_URL` can override the API origin for a different environment.
- Digfeer Hospital and Modern Hospital project-supplied details are shown as provisional fallback data until they are entered and approved in the shared backend.

## Run locally

```bash
cd mobile-native
npm install
npm run typecheck
npx expo start
```

## Android test APK

GitHub Actions builds a debug APK from this folder and uploads it as the `gurmad24-android-test-apk` artifact. This is for direct testing only, not a Google Play release.

## Data and safety boundaries

- Synthetic hospital fixtures are created only for automated tests. The old sample hospitals A/B/C are not seeded in production and are removed from existing stores at bootstrap.
- Emergency dispatch remains simulation-only. Payments remain sandbox-only.
- Do not enable live dispatch, automatic responder assignment, or real emergency notifications until institutional approval, trained operators, and verified integrations exist.
- Native authentication and role-based screens are not yet implemented; use the embedded Web App for the existing sign-in and protected workflows.
