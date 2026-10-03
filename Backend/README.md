# OficiosYa — Backend

NestJS 12 + Prisma 7 + PostgreSQL (Supabase) + Socket.IO `/chat`.

## Scripts

| Comando | Descripción |
|---|---|
| `pnpm dev` | Nest en watch |
| `pnpm build` / `pnpm start` | Producción |
| `pnpm prisma:migrate` | Migraciones (usa `DIRECT_URL`) |
| `pnpm prisma:seed` | Catálogo + cuentas demo |
| `pnpm lint` / `typecheck` / `test` | Calidad |

API: `http://localhost:4000/api/v1` · Health: `/api/v1/health`

Deploy: Railway — ver `railway.toml` y `Frontend/docs/DEPLOY.md`.
