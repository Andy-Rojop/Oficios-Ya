'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { isChatThreadPath } from '@/components/layout/nav-links';
import { ModeTheme } from '@/components/layout/mode-theme';
import { SiteBottomNav } from '@/components/layout/site-bottom-nav';
import { SiteHeader } from '@/components/layout/site-header';
import { useMe } from '@/lib/auth';
import { cn } from '@/lib/utils';

const AUTH_PATHS = ['/ingresar', '/registro', '/recuperar', '/roles'];

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Shell móvil: header compacto + barra inferior + padding con safe-area.
 * En chat/mensajes el contenido va a borde en pantallas chicas.
 * En login/registro se oculta la chrome de sesión (evita el bucle “Entrando…” + tabs).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: user } = useMe();
  const authScreen = isAuthPath(pathname);
  const loggedIn = Boolean(user) && !authScreen;
  const chatArea = pathname === '/mensajes' || isChatThreadPath(pathname);
  const inThread = isChatThreadPath(pathname);
  const showBottomPad = loggedIn && !inThread;

  return (
    <>
      <ModeTheme />
      <SiteHeader />
      <main
        className={cn(
          'mx-auto w-full max-w-6xl flex-1',
          chatArea
            ? 'px-0 py-0 sm:px-6 sm:py-6'
            : 'px-3 py-4 sm:px-6 sm:py-6',
          showBottomPad &&
            // Portrait: hueco para la barra. Landscape: la barra se oculta (ver SiteBottomNav).
            'pb-[calc(4.5rem+env(safe-area-inset-bottom))] landscape:pb-4 md:pb-6',
        )}
      >
        {children}
      </main>
      {loggedIn ? <SiteBottomNav /> : null}
    </>
  );
}
