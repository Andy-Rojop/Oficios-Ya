import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Migraciones usan DIRECT_URL (conexión directa a Supabase, puerto 5432).
 * El PrismaClient en runtime usa DATABASE_URL (pooler Supabase) vía @prisma/adapter-pg.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DIRECT_URL'),
  },
});
