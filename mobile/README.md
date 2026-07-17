# Cerbanimo Mobile (frozen)

This standalone client is retained as a historical reference and receives no new feature work. Resonera is the supported mobile/game overlay and consumes Cerbanimo's `/api/v1` contract. Do not add task authority, rewards, settlement, or new screens here.

Native iOS/Android rewrite of the Cerbanimo platform using Expo and React Native.

## Run locally

```bash
cd mobile
npm install
npm run ios
npm run android
```

Set the values in `.env` from `.env.example`. For local device testing, use your machine LAN IP for `EXPO_PUBLIC_BACKEND_URL` instead of `localhost`.

## Auth0 callback URLs

Add these callback/logout URLs to the Auth0 native application:

```text
cerbanimo://
exp://127.0.0.1:8081/--
```

The app also supports a development token fallback on the sign-in screen so backend routes can be tested before the native Auth0 client is configured.
