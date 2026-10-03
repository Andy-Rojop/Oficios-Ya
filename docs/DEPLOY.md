# Despliegue — OficiosYa

Stack elegido: **Vercel = Frontend** · **Railway = Backend** · **Supabase = PostgreSQL + Storage**.

> Sin `SRS_OficiosYa.md` en el repo: no inventar requisitos oficiales.

## Prerrequisitos

1. Código en **GitHub** (Railway y Vercel se conectan al repo).
2. Cuentas: [Supabase](https://supabase.com), [Railway](https://railway.app), [Vercel](https://vercel.com).
3. Firebase (OTP) — service account **solo** en Railway.

**Cookies cross-origin:** con `*.vercel.app` + `*.up.railway.app` usá:

- `COOKIE_SAMESITE=none`
- `COOKIE_DOMAIN` vacío
- `NODE_ENV=production` (HTTPS + `trust proxy` ya en el backend)

---

## 1. Supabase

| Variable | Dónde |
|---|---|
| `DATABASE_URL` | Pooler IPv4 `:6543` + `?pgbouncer=true` (password URL-encoded) |
| `DIRECT_URL` | Direct `:5432` (migraciones Prisma) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → **solo Railway** |
| Buckets | `public-media` (público), `chat-media` (privado) |

---

## 2. Backend en Railway

1. [railway.app/new](https://railway.app/new) → **Deploy from GitHub repo** → este monorepo.
2. Si detecta varios packages, quedate solo con el servicio **`@oficiosya/backend`** (o creá un servicio vacío apuntando al repo).
3. **Settings del servicio:**

| Setting | Valor |
|---|---|
| Root Directory | *(vacío / repo root)* — hace falta el workspace pnpm |
| Config path (opcional) | `/Backend/railway.toml` |
| Build Command | `pnpm --filter @oficiosya/shared build && pnpm --filter @oficiosya/backend run build` |
| Pre-deploy | `pnpm --filter @oficiosya/backend exec prisma migrate deploy` |
| Start Command | `pnpm --filter @oficiosya/backend start` |
| Watch Paths | `/Backend/**`, `/packages/shared/**` |
| Healthcheck Path | `/api/v1/health` |

4. **Variables** (Variables tab):

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `4000` (o el que Railway inyecte; el app lee `PORT`) |
| `DATABASE_URL` | pooler Supabase |
| `DIRECT_URL` | direct Supabase |
| `FRONTEND_URL` | `https://<proyecto>.vercel.app` *(actualizar tras Vercel)* |
| `COOKIE_SAMESITE` | `none` |
| `COOKIE_DOMAIN` | *(vacío)* |
| `JWT_ACCESS_SECRET` | ≥32 chars (Generate) |
| `JWT_REFRESH_SECRET` | ≥32 chars distinto |
| `FIREBASE_PROJECT_ID` | … |
| `FIREBASE_CLIENT_EMAIL` | … |
| `FIREBASE_PRIVATE_KEY` | pegar con `\n` reales / multilínea |
| `SUPABASE_URL` | `https://….supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role |
| `SUPABASE_PUBLIC_BUCKET` | `public-media` |
| `SUPABASE_PRIVATE_BUCKET` | `chat-media` |

5. **Settings → Networking → Generate Domain** → anotá  
   `https://<servicio>.up.railway.app`
6. Probar: `GET https://<servicio>.up.railway.app/api/v1/health`

> Railway no duerme el servicio como el free tier de Render: adecuado para Socket.IO `/chat`.

---

## 3. Frontend en Vercel

1. [vercel.com/new](https://vercel.com/new) → Importar el **mismo** repo GitHub.
2. **Root Directory:** `Frontend`  
   (usa `Frontend/vercel.json`: install/build desde el monorepo).
3. Framework preset: **Next.js**.
4. **Environment Variables:**

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<servicio>.up.railway.app/api/v1` |
| `NEXT_PUBLIC_WS_URL` | `https://<servicio>.up.railway.app` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | consola Firebase |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `….firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | … |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | … |
| `NEXT_PUBLIC_SUPABASE_URL` | opcional (next/image) |

5. Deploy → URL `https://….vercel.app`.
6. En **Railway**, actualizá `FRONTEND_URL` a esa URL → **Redeploy** (CORS + cookies).
7. En **Firebase → Authentication → Settings → Authorized domains**, agregá el host de Vercel.

### Orden recomendado

1. Railway (API) con `FRONTEND_URL` provisional  
2. Vercel (web) con URL de Railway  
3. Corregir `FRONTEND_URL` en Railway → redeploy  
4. Seed opcional desde tu PC: `pnpm db:seed` (contra Supabase)

---

## 4. Checklist post-deploy

- [ ] Health API ok
- [ ] Login (cookies httpOnly cross-site)
- [ ] Búsqueda + perfil público (sin DPI/NIT)
- [ ] Chat Socket.IO
- [ ] Subida de imagen
- [ ] `/admin` con cuenta admin
- [ ] Campana de avisos

---

## 5. Dominio propio (opcional)

`app.tudominio.com` + `api.tudominio.com`:

- `COOKIE_DOMAIN=.tudominio.com`
- `COOKIE_SAMESITE=lax` (suele bastar)
- Actualizar `FRONTEND_URL`, Vercel domain, Railway domain, Firebase authorized domains

---

## Referencia de archivos

| Archivo | Uso |
|---|---|
| `Backend/railway.toml` | Build / pre-deploy / start / health |
| `Frontend/vercel.json` | Install + build monorepo |
| `render.yaml` | Alternativa Render (no usada en este stack) |
