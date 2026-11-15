'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { SessionIdleGuard } from '@/components/auth/session-idle-guard';
import { isChatThreadPath } from '@/components/layout/nav-links';
import { ModeTheme } from '@/components/layout/mode-theme';
import { SiteBottomNav } from '@/components/layout/site-bottom-nav';
import { SiteHeader } from '@/components/layout/site-header';
import { StaffPreviewBanner } from '@/components/layout/staff-preview-banner';
import { isStaffRole, useMe } from '@/lib/auth';
import { cn } from '@/lib/utils';

const AUTH_PATHS = ['/ingresar', '/registro', '/recuperar', '/roles'];

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * Shell móvil: header compacto + barra inferior + padding con safe-area.
 * En /admin solo ModeTheme (AdminShell trae su propia chrome).
 * En login/registro se oculta la chrome de sesión (evita el bucle “Entrando…” + tabs).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data: user } = useMe();
  const authScreen = isAuthPath(pathname);
  const adminArea = pathname.startsWith('/admin');
  const loggedIn = Boolean(user) && !authScreen && !adminArea;
  const staff = isStaffRole(user?.role);

  // Ingreso usa su propio lienzo a pantalla completa (prototipo), sin header.
  if (pathname === '/ingresar') {
    return (
      <>
        <ModeTheme />
        {children}
      </>
    );
  }

  // Panel admin: sin header/bottom de cliente-trabajador.
  if (adminArea) {
    return (
      <>
        <ModeTheme />
        <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-6 sm:py-6">
          {children}
        </main>
        <SessionIdleGuard />
      </>
    );
  }

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
          chatArea ? 'px-0 py-0 sm:px-6 sm:py-6' : 'px-3 py-4 sm:px-6 sm:py-6',
          showBottomPad &&
            // Portrait: hueco para la barra. Landscape: la barra se oculta (ver SiteBottomNav).
            'pb-[var(--bottom-nav-h)] landscape:pb-4 md:pb-6',
        )}
      >
        {staff && loggedIn ? <StaffPreviewBanner /> : null}
        {children}
      </main>
      {loggedIn ? <SiteBottomNav /> : null}
      <SessionIdleGuard />
    </>
  );
}
