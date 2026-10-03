# Despliegue — OficiosYa

Stack: **Vercel = Frontend** · **Railway = Backend** · **Supabase = PostgreSQL + Storage**.

El repo tiene solo dos carpetas de app: `Frontend/` y `Backend/` (proyectos independientes).

## Prerrequisitos

1. Código en **GitHub**.
2. Cuentas Supabase, Railway, Vercel.
3. Firebase (OTP) — service account **solo** en Railway.

**Cookies cross-origin** (`*.vercel.app` + `*.up.railway.app`):

- `COOKIE_SAMESITE=none`
- `COOKIE_DOMAIN` vacío
- `NODE_ENV=production`

---

## 1. Supabase

| Variable | Notas |
|---|---|
| `DATABASE_URL` | Pooler IPv4 `:6543` + `?pgbouncer=true` |
| `DIRECT_URL` | Direct `:5432` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Solo backend |
| Buckets | `public-media`, `chat-media` |

---

## 2. Backend → Railway

1. New project → Deploy from GitHub.
2. **Root Directory: `Backend`**
3. Config-as-code: `railway.toml` (con Root Directory = `Backend`) o comandos:

| Setting | Valor |
|---|---|
| Build | `pnpm install --frozen-lockfile && pnpm run build` |
| Pre-deploy | `pnpm exec prisma migrate deploy` |
| Start | `pnpm start` |
| Healthcheck | `/api/v1/health` |

4. Variables: ver `Backend/.env.example` + `COOKIE_SAMESITE=none`, `COOKIE_DOMAIN` vacío, `FRONTEND_URL` = URL de Vercel.
5. Generate Domain → `https://….up.railway.app`

---

## 3. Frontend → Vercel

1. Import mismo repo.
2. **Root Directory: `Frontend`**
3. Env:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://….up.railway.app/api/v1` |
| `NEXT_PUBLIC_WS_URL` | `https://….up.railway.app` |
| `NEXT_PUBLIC_FIREBASE_*` | consola Firebase |

4. Deploy → actualizar `FRONTEND_URL` en Railway → Redeploy.
5. Firebase Authorized domains → host de Vercel.

---

## Checklist

- [ ] Health API
- [ ] Login (cookies)
- [ ] Búsqueda / chat / solicitud
- [ ] Admin / avisos
