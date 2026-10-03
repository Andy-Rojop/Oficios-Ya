import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js 16 renombró `middleware` a `proxy` (misma función: corre antes de renderizar la ruta).
 *
 * Protege las rutas privadas: si no hay cookie `access_token` redirige a /ingresar?next=...
 * Solo comprueba que la cookie exista; la validez real la verifica la API en cada petición.
 * Si el access token expiró pero aún hay refresh token, la pantalla /ingresar intenta
 * renovar la sesión automáticamente antes de pedir la contraseña.
 *
 * Las cookies las emite la API en localhost:4000 sin atributo Domain (host-only). Los
 * navegadores no separan cookies por puerto, así que también llegan a localhost:3000.
 * En producción define COOKIE_DOMAIN en el backend para compartirlas con el frontend.
 */
const ACCESS_TOKEN_COOKIE = 'access_token';

export function proxy(request: NextRequest) {
  if (request.cookies.has(ACCESS_TOKEN_COOKIE)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/ingresar', request.url);
  loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    '/panel/:path*',
    '/mensajes/:path*',
    '/solicitudes/:path*',
    '/cuenta/:path*',
    '/admin/:path*',
  ],
};
