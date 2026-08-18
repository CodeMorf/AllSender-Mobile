# API real consumida por AllSender Mobile

Fuente de contrato: `postman/AllSender-Mobile-API.postman_collection.json`.

## Autenticación/sesión

### POST `/api/oauth/consent`

Login nativo:

```json
{
  "action": "login",
  "email": "usuario@empresa.com",
  "password": "********",
  "client_id": "CLIENT_ID",
  "redirect_uri": "allsender://oauth/callback",
  "scope": "openid profile email team offline_access",
  "state": "mobile-state"
}
```

El backend crea la sesión HttpOnly que utilizan las rutas actuales de Chat Mobile.

### GET `/api/user`
Usuario de la sesión.

### GET `/api/team`
Equipo, rol, plan y miembros visibles según permisos del SaaS.

### GET `/api/chat-mobile/bootstrap`
Datos de usuario/equipo y configuración móvil/Firebase publicada por el backend.

## Conversaciones

### GET `/api/chat-mobile/chats`
Bandeja autorizada.

### GET `/api/chat-mobile/messages?jid=...&instanceId=...`
Mensajes de una conversación autorizada.

### POST `/api/chat-mobile/take-chat`

```json
{
  "chatId": 123,
  "jid": "18095551234@s.whatsapp.net",
  "instanceId": 8,
  "source": "mobile"
}
```

### POST `/api/chats/mark-read`

```json
{ "chatId": 123 }
```

## Envío

### POST `/api/chat-mobile/send`

```json
{
  "recipientJid": "18095551234@s.whatsapp.net",
  "text": "Hola",
  "instanceId": 8
}
```

### POST `/api/chat-mobile/sendMedia`
Imagen, video o documento en Base64.

### POST `/api/chat-mobile/sendAudio`
Audio en Base64.

### POST `/api/chat-mobile/send-location`
Latitud, longitud, nombre y dirección.

## IA del chat

### POST `/api/chat-mobile/ai/toggle`
Activa/pausa el estado IA de la conversación cuando el usuario tenga permiso.

## Gestión móvil por módulos

Estas rutas usan la misma sesión HttpOnly del móvil y derivan `team_id` y rol
del servidor. No aceptan API keys de Developers ni un equipo arbitrario enviado
por el cliente.

### Ventas IA y órdenes

- GET `/api/mobile/orders`
- GET `/api/mobile/orders/{id}`
- PATCH `/api/mobile/orders/{id}`
- POST `/api/mobile/orders/{id}/confirm`
- POST `/api/mobile/orders/{id}/cancel`
- POST `/api/mobile/orders/{id}/tracking`
- POST `/api/mobile/orders/{id}/payment-verify`
- POST `/api/mobile/orders/{id}/payment-reject`

Lectura: miembros autorizados por el equipo. Cambios: owner/admin y módulo
Órdenes o Ventas IA activo.

### Reservas y calendario

- GET `/api/mobile/reservations`
- POST `/api/mobile/reservations`
- PATCH `/api/mobile/reservations`

La implementación reutiliza el motor real de `reservation_bookings`, conflictos,
recordatorios y sincronización de calendario.

### RestApp

- GET `/api/mobile/restapp/orders`
- GET `/api/mobile/restapp/reservations`
- GET `/api/mobile/restapp/dashboard`
- GET `/api/mobile/restapp/menu`
- POST `/api/mobile/restapp/orders`
- POST `/api/mobile/restapp/reservations`
- PATCH `/api/mobile/restapp/orders` (id + status)

### Capacidades y tiempo real

- GET `/api/mobile/app-shell?locale=es` devuelve módulos, permisos, canales y contadores.
- GET `/api/mobile/realtime/config` devuelve únicamente la configuración pública
  de Pusher y el canal autorizado del equipo.
- Pusher publica `new-message`, `chat-list-update` y estados; el móvil mantiene
  polling como fallback si Pusher no está configurado.

## Push

### GET `/api/chat-mobile/firebase/config`
Configuración pública Firebase.

### POST `/api/chat-mobile/firebase/register-token`
Registro FCM del flujo legacy.

### POST `/api/mobile/register-device`
Registro de dispositivo/Expo Push utilizado por la app.

### POST `/api/mobile/test-push`
Solo para pruebas controladas.

## Seguridad

Todas las rutas de conversación deben ejecutarse con la cookie de sesión generada por AllSender. La app no decide `team_id` como autoridad y no contiene credenciales de Evolution, Meta, Zernio ni otros proveedores.
