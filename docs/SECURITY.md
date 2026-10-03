# Revisión de seguridad (Fase 7)

Checklist práctico sobre lo implementado. Sin inventar requisitos del SRS ausente.

## Cookies y sesión

- Access/refresh en cookies **httpOnly** (`access_token`, `refresh_token`).
- Refresh acotado a path `/api/v1/auth`.
- Front usa `credentials: 'include'`; no guarda JWT en `localStorage`.

## Secretos

- `SUPABASE_SERVICE_ROLE_KEY` y Firebase Admin **solo en Backend**.
- Front solo `NEXT_PUBLIC_*` (Firebase web config, API/WS URL). Grep: sin `service_role` en `Frontend/`.

## Datos sensibles

- DPI/NIT: privados; perfil público no los expone (`WorkersService` select explícito).
- Chat: privado entre participantes; admin solo ve conversación con **reporte abierto** + `AuditLog`.

## Superficie API

- Roles `ADMIN` / `MUNICIPAL` en rutas `/admin/*`.
- Rate limiting (Throttler) en auth sensible.
- Helmet + CORS origin = `FRONTEND_URL`.

## Pendientes operativos

- Rotar JWT secrets en producción.
- Restringir Swagger en prod.
- Monitoreo/Sentry (`SENTRY_DSN` opcional).
