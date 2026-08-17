# READMAP — AllSender Mobile

Leyenda: `✅ terminado` · `🟡 depende de configuración/QA` · `🔵 depende de backend`

## R0 — Base nativa
- ✅ React Native + Expo Router.
- ✅ Android/iOS solamente como objetivo de producto.
- ✅ Eliminados servidor/Drizzle/TRPC/Manus del paquete móvil.
- ✅ Deep links nativos.

## R1 — Login y cuenta
- ✅ Pantalla nativa login.
- ✅ Pantalla nativa registro.
- ✅ `/api/oauth/consent` real.
- ✅ Cookie HttpOnly reutilizada por requests nativos.
- ✅ `/api/user`.
- ✅ `/api/team`.
- ✅ Logout real `/es/sign-out`.
- ✅ Sin `client_secret` en app.
- 🟡 Configurar `EXPO_PUBLIC_ALLSENDER_CLIENT_ID` real.

## R2 — Bandeja
- ✅ `/api/chat-mobile/chats`.
- ✅ búsqueda.
- ✅ filtro no leídas.
- ✅ canal/sucursal/agente.
- ✅ pull-to-refresh.
- ✅ foreground sync automático.

## R3 — Conversación
- ✅ `/api/chat-mobile/messages`.
- ✅ enviar texto por `/api/chat-mobile/send`.
- ✅ tomar chat.
- ✅ mark-read.
- ✅ render imagen/audio/video/documento/ubicación recibida.
- ✅ helpers reales para sendMedia/sendAudio/send-location.
- ✅ grabación y envío de nota de voz desde la UI nativa.
- 🟡 selector visual de galería/video/documento y ubicación actual pendiente de dependencias/permisos + QA físico.

## R4 — Notificaciones
- ✅ preferencias notificación/sonido/vibración.
- ✅ Expo Push Token.
- ✅ `/api/mobile/register-device`.
- ✅ alerta local foreground.
- ✅ deduplicación por `messageId`.
- ✅ deep link al chat.
- 🟡 configurar `EXPO_PUBLIC_EAS_PROJECT_ID`.
- 🟡 QA development/release build en Android físico.
- 🟡 QA development/release build en iOS físico.

## R5 — Seguridad
- ✅ no guardar contraseña.
- ✅ no guardar secretos de proveedores.
- ✅ no enviar team/user como autoridad para chat.
- ✅ sesión revalidada por `/api/user` al hidratar.
- ✅ permisos reales siguen en backend.

## R6 — Backend pendiente
- 🔵 selector de múltiples teams.
- 🔵 Pusher/private realtime auth.
- 🔵 OAuth public/native token endpoint sin `client_secret`.
- 🔵 OAuth revoke dedicado.

## R7 — Gate de publicación
- 🟡 `npm install` en entorno con acceso a npm.
- 🟡 `npm run check`.
- 🟡 `npm run lint`.
- 🟡 `npm test`.
- 🟡 login real con client_id registrado.
- 🟡 recibir y enviar chat QA.
- 🟡 push background QA.
- 🟡 build Android producción.
- 🟡 build iOS producción.

## Estado

**CLIENTE NATIVO INTEGRADO CONTRA LA API REAL.**

No marcar como “realtime Pusher” ni “multi-team” hasta que esas capacidades existan realmente en `auth.allsender.tech`.
