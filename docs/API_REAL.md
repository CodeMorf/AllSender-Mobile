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
