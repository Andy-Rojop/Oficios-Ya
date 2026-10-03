import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  FRONTEND_URL: z.string().url(),
  /**
   * Vacío = cookie host-only (recomendado si web y API están en dominios distintos,
   * p. ej. Vercel + Render, con COOKIE_SAMESITE=none).
   */
  COOKIE_DOMAIN: z.string().default(''),
  /** `lax` en localhost; `none` + HTTPS cuando el front y la API están en orígenes distintos. */
  COOKIE_SAMESITE: z.enum(['lax', 'none']).default('lax'),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  FIREBASE_PROJECT_ID: z.string().optional().default(''),
  FIREBASE_CLIENT_EMAIL: z.string().optional().default(''),
  FIREBASE_PRIVATE_KEY: z.string().optional().default(''),
  SUPABASE_URL: z.string().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
  SUPABASE_PUBLIC_BUCKET: z.string().default('public-media'),
  SUPABASE_PRIVATE_BUCKET: z.string().default('chat-media'),
  UPLOAD_MAX_MB: z.coerce.number().positive().default(5),
  SENTRY_DSN: z.string().optional().default(''),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new Error(`Variables de entorno inválidas: ${details}`);
  }

  return parsed.data;
}
