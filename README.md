# Dynavox Inventory – mobile app

React Native (Expo SDK 58, Expo Router) app for Android and iPhone. It talks
to the same backend as the web app (`https://dynservice.dynavox.ch/api`,
set in `app.json` → `expo.extra.apiUrl`) with the same logins.

Everything from the web app is here: dashboard, equipment (+ production from
templates, report), orders (+ receiving deliveries, moving items, parts
report), parts, stock movements, templates, component stock, "To produce"
notes with chat, repairs (+ photos from the camera, devices, parts,
assignees), customers, dealers, devices, users (admins), vacation calendar
(+ statistics, holidays) and settings. On top of that: barcode/QR scanner
(📷 in the header) and push notifications.

## Run it locally

```sh
npm install
npx expo start            # scan the QR code with Expo Go (no push / camera barcode on Android Expo Go)
npx expo start --web      # quick check in the browser
```

Against a local backend: `EXPO_PUBLIC_API_URL=http://<pc-ip>:3001/api npx expo start`.

## Build & install (EAS, no Mac needed)

One-time setup:

```sh
npx eas-cli@latest login          # Expo account (free)
npx eas-cli@latest init           # links the project, writes extra.eas.projectId into app.json
```

* **Android APK** (install directly on phones):
  `npx eas-cli@latest build --platform android --profile preview`
  → EAS prints a link/QR code to download the `.apk`.
* **iPhone** (needs an Apple Developer account, $99/year):
  `npx eas-cli@latest build --platform ios --profile production`
  then `npx eas-cli@latest submit --platform ios` → install via **TestFlight**.
* Later JS-only changes can be shipped without a new build:
  `npx eas-cli@latest update` (after `npx expo install expo-updates`).

## Push notifications

The app registers each phone's Expo push token with the backend
(`POST /api/push-tokens`). The backend pushes on:

* a new "To produce" note → its recipients
* a new chat message on a note → the other side of the thread
* being assigned to a repair ticket → that person

Needed once for real devices:

* **Android:** a Firebase project + FCM V1 service account key uploaded to
  EAS (`npx eas-cli@latest credentials` → Android → Push Notifications).
  See https://docs.expo.dev/push-notifications/fcm-credentials/
* **iOS:** EAS creates the push key automatically during the first iOS build
  (answer "yes" when it asks about push notifications).
