# Capacidades pendientes del backend

La app ya consume el contrato **real publicado**. Estas capacidades no pueden implementarse únicamente desde React Native porque el servidor todavía no las expone en la colección auditada.

## 1. Multi-equipo seleccionable

El backend actual devuelve el equipo asociado por su flujo existente; no hay endpoint publicado para listar todas las memberships del usuario y cambiar el team activo.

Para completarlo en backend se necesita una selección explícita de team o un endpoint equivalente a:

```text
GET  /api/mobile/teams
POST /api/mobile/team/switch
```

sin confiar en un `team_id` arbitrario del cliente.

## 2. Realtime Pusher privado

La colección auditada indica que no existe `/api/pusher/auth` publicado. Por eso el release actual usa sincronización foreground contra la API real y push en background.

Para WebSocket/Pusher verdadero debe existir un endpoint de autenticación de canal privado que valide usuario/equipo y devuelva la firma de Pusher.

## 3. OAuth token público sin secret

`/api/oauth/token` actualmente exige `client_secret` según la colección auditada. Una app móvil no debe incluirlo. Por eso este cliente usa el flujo de sesión HttpOnly existente para Chat Mobile y nunca compila un secret.

Cuando el backend soporte OAuth public/native + PKCE, se podrá migrar el transporte sin cambiar las pantallas.

## 4. Revocación OAuth

No hay `/api/oauth/revoke` publicado en el contrato actual. El logout implementado usa el cierre de sesión real `/es/sign-out`.
