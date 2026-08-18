# Instalación — AllSender Mobile

## Requisitos

- Node.js 20.19 o superior recomendado para Expo SDK 54.
- npm o pnpm.
- Android Studio para Android local.
- Xcode en macOS para iOS local.
- Cuenta Expo/EAS para builds y push remoto.
- `client_id` real registrado para AllSender Mobile.

## 1. Clonar

```bash
git clone https://github.com/CodeMorf/AllSender-Mobile.git
cd AllSender-Mobile
```

## 2. Variables

```bash
cp .env.example .env
```

Edita:

```env
EXPO_PUBLIC_ALLSENDER_BASE_URL=https://auth.allsender.tech
EXPO_PUBLIC_ALLSENDER_CLIENT_ID=allsender-mobile
EXPO_PUBLIC_ALLSENDER_REDIRECT_URI=allsender://oauth/callback
EXPO_PUBLIC_EAS_PROJECT_ID=TU_EAS_PROJECT_ID
EXPO_PUBLIC_ALLSENDER_SYNC_INTERVAL_MS=2500
```

No uses `client_secret` en una aplicación nativa.

## 3. Dependencias

```bash
npm install
```

O con pnpm:

```bash
pnpm install
```

## 4. Desarrollo

```bash
npx expo start
```

Android:

```bash
npm run android
```

iOS en macOS:

```bash
npm run ios
```

## 5. Validaciones

```bash
npm run check
npm run lint
npm test
```

## 6. Development build

Para validar notificaciones push y comportamiento nativo completo, usa un development build/EAS y no dependas exclusivamente de Expo Go.

```bash
npx expo prebuild --clean
eas build --platform android --profile development
eas build --platform ios --profile development
```

## 7. Producción

```bash
npm run build:android
npm run build:ios
```

Antes de publicar en Google Play/App Store verifica el gate de `READMAP.md`.

## Flujo de login implementado

```text
Pantalla nativa
 -> POST /api/oauth/consent
 -> AllSender valida email/password
 -> servidor entrega cookie HttpOnly de sesión
 -> GET /api/user
 -> GET /api/team
 -> GET /api/chat-mobile/bootstrap
 -> Bandeja nativa
```

La app no guarda la contraseña. Las solicitudes posteriores reutilizan la sesión por `credentials: include`.
