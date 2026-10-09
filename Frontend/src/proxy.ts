import { NextResponse } from 'next/server';

/**
 * Next.js 16: `proxy` corre antes de renderizar la ruta.
 *
 * NO bloqueamos aquí por cookie `access_token`: en producción el front (Vercel) y la
 * API (Railway) son orígenes distintos. La cookie httpOnly la emite la API y el
 * navegador la manda solo a ese host (credentials: include). Vercel nunca la ve en
 * `request.cookies`, así que un redirect aquí provoca bucle:
 *   /panel → /ingresar → (fetchMe OK) → /panel → /ingresar …
 *
 * La protección real está en el cliente (`useMe` + redirect) y en la API (JWT).
 */
export function proxy() {
  return NextResponse.next();
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
