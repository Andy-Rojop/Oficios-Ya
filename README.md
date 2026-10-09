# OficiosYa

Plataforma de oficios para **El Asintal, Retalhuleu, Guatemala**.

Dos proyectos independientes:

| Carpeta | Stack | Deploy |
|---|---|---|
| [`Backend/`](Backend/) | NestJS + Prisma | Railway |
| [`Frontend/`](Frontend/) | Next.js | Vercel |

Guía de despliegue: [`Frontend/docs/DEPLOY.md`](Frontend/docs/DEPLOY.md).

## Desarrollo local

```bash
# Terminal 1 — API
cd Backend
cp .env.example .env   # completar Supabase / JWT / Firebase
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed       # opcional
pnpm dev               # http://localhost:4000

# Terminal 2 — Web
cd Frontend
cp .env.example .env.local
pnpm install
pnpm dev               # http://localhost:3000
```

Constantes/enums compartidos viven duplicados (a propósito, para deploys independientes):

- `Backend/src/shared/`
- `Frontend/src/lib/shared/`

Mantenerlos alineados si cambiás un límite o enum.

## Guía de estilo de textos

Toda la interfaz (web y mensajes de API visibles al usuario) usa **ustedeo**:

- Preferir: «Ingrese», «Seleccione», «Verifique», «Toque el mapa», «Elija su rol».
- Evitar voseo («querés», «podés», «Filtrá», «Tocá») y tuteo informal («tu/tus» + «puedes/tienes» en imperativos).
- Textos repetidos (botones, errores comunes): `Frontend/src/lib/ui-copy.ts`.
