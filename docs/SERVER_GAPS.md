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

## 2. Realtime Pusher

La app móvil ya puede leer `/api/mobile/realtime/config` y suscribirse al canal
de eventos del equipo. El servidor publica actualmente el canal existente
`team-{teamId}` y el cliente conserva polling como fallback.

El canal sigue siendo público en Pusher; para endurecerlo completamente se debe
migrar la publicación del servidor a `private-team-{teamId}` y añadir firma de
canal privado. No se debe presentar esa migración como completada hasta probar
eventos con aislamiento entre dos equipos.

## 3. OAuth token público sin secret

`/api/oauth/token` actualmente exige `client_secret` según la colección auditada. Una app móvil no debe incluirlo. Por eso este cliente usa el flujo de sesión HttpOnly existente para Chat Mobile y nunca compila un secret.

Cuando el backend soporte OAuth public/native + PKCE, se podrá migrar el transporte sin cambiar las pantallas.

## 4. Revocación OAuth

No hay `/api/oauth/revoke` publicado en el contrato actual. El logout implementado usa el cierre de sesión real `/es/sign-out`.
