# GURMAD 24 — React Native Android app

The native client is built with React Native + Expo. It uses the existing GURMAD 24 backend; it does not create a second database.

## Shared services

- Public hospital directory data is requested from the existing `/api/hospitals` endpoint.
- The **Web App** tab opens `https://gurmad24.onrender.com` inside the app, so the existing website workflows continue to use the same backend.
- `EXPO_PUBLIC_API_URL` can override the API origin for a different environment.
- The native directory includes 16 provisional Gaalkacyo hospital listings from [Isbitaal.com](https://isbitaal.com/isbitaal/gaalkacyo/), plus project-supplied Digfeer/Modern details. These are explicitly marked as public/unverified leads; they are not written to the backend and must be confirmed by each hospital before being treated as official.
- The directory merges verified records returned by `/api/hospitals` with unmatched provisional entries. It does not silently copy provisional phone numbers into verified backend records.
- Digfeer phone requires reconciliation: the project-provided number is `0907658461`, while the public directory lists `0907658641`.

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
