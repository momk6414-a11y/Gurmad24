# GURMAD 24 — React Native app

This is the new native mobile client, built with React Native + Expo SDK 58.
It is intentionally separate from the existing Node.js backend and browser app.

## Requirements

- Node.js 22.13 or newer (Expo SDK 58 requirement)
- Android Studio for local Android builds
- Expo Go or a development build for device testing

## Run

```bash
cd mobile-native
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` to the HTTPS backend URL when testing against another environment.
The default points to the existing GURMAD 24 hosted API.

## Migration approach

1. Keep the existing Node.js backend and its tests intact.
2. Build native screens in this directory and connect them to existing API routes.
3. Port authentication/session handling and role-based navigation before protected workflows.
4. Port patient, hospital/provider, operator, and admin experiences incrementally.
5. Add push notifications, location, and maps only after permissions and backend contracts are verified.

## Safety boundary

Emergency dispatch remains simulation-only. Do not enable live dispatch, automatic responder assignment,
or real emergency notifications until institutional approval, trained operators, and verified integrations exist.
