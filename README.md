# OficiosYa

Plataforma web de oficios para el municipio de **El Asintal, Retalhuleu, Guatemala**.

Fuente de verdad deseada: `docs/SRS_OficiosYa.md` (puede faltar en el repo; no inventar requisitos oficiales).  
Docs operativos: [`docs/DEPLOY.md`](docs/DEPLOY.md), [`docs/SECURITY.md`](docs/SECURITY.md).

## Requisitos

- Node.js 20.19+ o 22.12+
- pnpm 11+
- Proyecto en **Supabase** (PostgreSQL y Storage en la nube)

## Arranque rápido

```bash
# 1. Dependencias
pnpm install

# 2. Variables de entorno
cp Backend/.env.example Backend/.env
cp Frontend/.env.example Frontend/.env.local
```

En `Backend/.env` configurá las URLs de Supabase:

- `DATABASE_URL` — Transaction pooler IPv4 (puerto `6543`, `?pgbouncer=true`; password URL-encoded)
- `DIRECT_URL` — Direct (puerto `5432`) para migraciones
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` — solo backend

```bash
# 3. Prisma (contra Supabase)
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# 4. Desarrollo
pnpm dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000/api/v1
- Swagger (dev): http://localhost:4000/api/docs

Si la API no arranca por `dist/main` faltante: borrar `Backend/dist` y `Backend/*.tsbuildinfo`, luego `pnpm --filter @oficiosya/backend run build` y `pnpm --filter @oficiosya/backend start`.

### Cuentas demo (seed — contraseña `Demo1234!`)

| Rol | Teléfono |
|---|---|
| Cliente | +50255550001 |
| Trabajador plomería | +50255550002 |
| Electricista | +50255550003 |
| Carpintero | +50255550004 |
| Admin | +50255550099 |

## Estructura

```
Frontend/         Next.js (App Router) + PWA manifest
Backend/          NestJS + Prisma 7
packages/shared/  Enums y utilidades compartidas
e2e/              Playwright (flujos críticos)
docs/             Deploy, seguridad; SRS pendiente
```

## Scripts útiles

| Script | Descripción |
|---|---|
| `pnpm dev` | Frontend + Backend |
| `pnpm lint` / `typecheck` / `test` | Calidad |
| `pnpm test:e2e` | Playwright (requiere `pnpm dev` + seed) |
| `pnpm test:e2e:ui` | Playwright UI mode |
| `pnpm build` | shared → backend → frontend |
| `pnpm db:generate` / `db:migrate` / `db:seed` | Prisma → Supabase |

Primera vez con E2E: `pnpm exec playwright install chromium`.

## CI y deploy

- CI: GitHub Actions (`.github/workflows/ci.yml`) — lint → typecheck → test → build.
- Deploy: **Vercel (Frontend) + Railway (Backend) + Supabase** — ver [`docs/DEPLOY.md`](docs/DEPLOY.md).
  - `Frontend/vercel.json` · `Backend/railway.toml`

## Definition of Done (implementado)

Sin SRS físico, se considera listo para estabilización cuando:

- [x] Auth teléfono + contraseña (cookies httpOnly); OTP Firebase en registro/recuperar/cambio de teléfono
- [x] Catálogo, trabajadores, portafolio, búsqueda SSR + mapa
- [x] Chat Socket.IO `/chat` privado
- [x] Solicitudes, cotizaciones, reseñas
- [x] Admin + notificaciones (Fase 6) y campana en header
- [x] Storage vía backend (sin service role en el front)
- [x] DPI/NIT privados; chat admin solo con reporte + bitácora
- [x] PWA: manifest + íconos 192/512/maskable
- [x] E2E Playwright de flujos críticos (login demo, búsqueda, chat, solicitud, reseña)
- [x] Docs de deploy y checklist de seguridad
- [x] CI lint / typecheck / test / build
- [ ] `docs/SRS_OficiosYa.md` colocado y zonas municipales oficiales (TODO seed)
- [ ] Despliegue productivo Vercel + API siempre activa + Supabase

## Notas

- La BD **siempre** es PostgreSQL en Supabase (sin docker-compose local).
- El sistema **no procesa pagos**.
- Identificador de cuenta: teléfono E.164 (`+502` + 8 dígitos).
- Nunca subas archivos `.env` al repositorio.
