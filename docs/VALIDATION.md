# Validación de esta entrega

Fecha de preparación: 2026-08-17.

## Validado en el paquete fuente

- JSON válido: `package.json`, `eas.json` y colección Postman.
- 36 archivos TypeScript/TSX transpilan sin errores de sintaxis con TypeScript 5.9.x.
- Imports locales resuelven a archivos existentes.
- No quedan referencias de runtime a `/api/mobile/v1` inventados.
- No quedan WebView/PWA ni servidor Node/Drizzle/TRPC dentro del paquete móvil.
- No existe `client_secret` de runtime en la aplicación.
- Las rutas de chat usadas por el cliente corresponden al Postman entregado.
- Nota de voz nativa conectada a `/api/chat-mobile/sendAudio`.

## Gate que necesita un equipo real

No se marca como prueba física completada porque este entorno no dispone de `node_modules`, credenciales EAS ni dispositivos Android/iOS conectados.

Antes de App Store / Play Store ejecutar:

```bash
npm install
npm run check
npm run lint
npm test
npx expo prebuild --clean
```

y validar en Android/iOS:

- login con `client_id` real;
- persistencia de cookie HttpOnly;
- bandeja y conversación real;
- enviar texto y nota de voz en una conversación QA;
- asignar/tomar chat;
- push background;
- deep link desde push;
- logout;
- reconexión después de pérdida de red.

## Bloqueos externos actuales

- El cliente first-party `allsender-mobile` debe estar habilitado en el backend antes de probar el login real.
- Falta `EXPO_PUBLIC_EAS_PROJECT_ID` para push/builds reales.
- Multi-equipo requiere backend.
- Pusher privado/realtime requiere backend.
- OAuth public/native sin secret y revoke dedicado requieren backend si se desea migrar del flujo de cookie actual.
