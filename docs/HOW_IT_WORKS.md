# Cómo funciona AllSender Mobile

## Flujo real actual

```text
App nativa React Native / Expo
        |
        | POST /api/oauth/consent
        | email + password + client_id registrado
        v
auth.allsender.tech
        |
        | Set-Cookie: session (HttpOnly + Secure)
        v
App nativa conserva la sesión HTTP del dominio
        |
        +--> GET /api/user
        +--> GET /api/team
        +--> GET /api/chat-mobile/bootstrap
        +--> GET /api/chat-mobile/chats
        +--> GET /api/chat-mobile/messages
        +--> POST /api/chat-mobile/send
        +--> POST /api/chat-mobile/sendAudio
        +--> POST /api/chat-mobile/take-chat
        +--> POST /api/chats/mark-read
```

La contraseña se usa únicamente durante el login y no se guarda en SecureStore, AsyncStorage ni variables persistentes.

## Bandeja

1. La app valida la sesión con `/api/user`.
2. Obtiene el equipo actual con `/api/team`.
3. Consulta `/api/chat-mobile/chats`.
4. El backend conserva la autoridad sobre `team_id`, rol, agente asignado y visibilidad por sucursal.
5. Mientras la app está abierta se realiza sincronización automática cada pocos segundos y también pull-to-refresh.

## Conversación

1. Se abre el chat seleccionado con `jid + instanceId` reales.
2. La app consulta `/api/chat-mobile/messages`.
3. Los mensajes nuevos se sincronizan automáticamente.
4. El texto se envía por `/api/chat-mobile/send`.
5. Las notas de voz se graban de forma nativa con `expo-audio`, se convierten a Base64 en el dispositivo y se envían por `/api/chat-mobile/sendAudio`.
6. El chat puede tomarse/asignarse con `/api/chat-mobile/take-chat`.
7. Se marca leído usando `/api/chats/mark-read`.

## Media

La app renderiza los tipos que ya devuelve el backend: imagen, audio, video, documento y ubicación. El cliente API también contiene funciones para `sendMedia`, `sendAudio` y `send-location`.

En esta entrega la interfaz nativa expone texto y nota de voz. La selección de galería/documento y la ubicación actual requieren incorporar los pickers nativos correspondientes y pasar QA de permisos en Android/iOS antes de declararlos cerrados.

## Notificaciones

1. La app solicita permiso nativo.
2. Obtiene Expo Push Token cuando existe `EXPO_PUBLIC_EAS_PROJECT_ID`.
3. Registra el dispositivo en `/api/mobile/register-device`.
4. En foreground reproduce alerta local según preferencias.
5. Una notificación con `chatId/jid` puede abrir directamente la conversación.

## Tiempo real

El contrato entregado no publica un endpoint de autenticación Pusher privado. Por eso la app NO afirma tener WebSocket/Pusher productivo todavía. El comportamiento actual es:

- app abierta: sincronización automática de foreground;
- background/cerrada: push cuando el backend lo emite;
- pull-to-refresh disponible como recuperación manual.

Cuando el backend publique autenticación privada de realtime, puede sustituirse la sincronización periódica sin rehacer las pantallas.

## Multi-equipo

`/api/team` devuelve el equipo de la sesión actual. El contrato entregado no incluye una operación publicada para listar y seleccionar múltiples memberships. El selector multi-equipo queda bloqueado por backend y está registrado en `SERVER_GAPS.md`.
