'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandLogo } from '@/components/layout/brand-logo';
import { GUEST_LINKS, linksForMode } from '@/components/layout/nav-links';
import { NotificationBell } from '@/components/layout/notification-bell';
import { isStaffRole } from '@/lib/admin';
import { useLogout, useMe } from '@/lib/auth';
import { cn } from '@/lib/utils';

const AUTH_PATHS = ['/ingresar', '/registro', '/recuperar', '/roles'];

function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function SiteHeader() {
  const pathname = usePathname();
  const { data: user, isLoading, isFetching } = useMe();
  const logout = useLogout();
  const authScreen = isAuthPath(pathname);
  // En login/registro no mostrar chrome de sesión (evita Avisos/Salir sobre “Entrando…”).
  const sessionUser = authScreen ? undefined : user;

  const showGuest = (!sessionUser && !isLoading && !isFetching) || authScreen;
  const workerChrome = sessionUser?.activeMode === 'WORKER';
  const desktopLinks = [
    ...(sessionUser
      ? linksForMode(sessionUser.activeMode)
      : showGuest
        ? GUEST_LINKS
        : []),
    ...(isStaffRole(sessionUser?.role)
      ? [{ href: '/admin', label: 'Admin', shortLabel: 'Admin', icon: 'account' as const }]
      : []),
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)]',
        sessionUser?.activeMode === 'WORKER'
          ? 'border-[#1e3a5f]/30 bg-[#1e3a5f] text-white'
          : 'border-border bg-surface',
      )}
    >
      {/* flex-nowrap: Salir nunca baja de línea; queda siempre a la derecha. */}
      <div className="mx-auto flex h-12 w-full max-w-6xl flex-nowrap items-center gap-2 px-3 sm:h-14 sm:gap-3 sm:px-6">
        <BrandLogo
          href={sessionUser?.activeMode === 'WORKER' ? '/panel' : '/'}
          inverted={sessionUser?.activeMode === 'WORKER'}
        />

        {sessionUser ? (
          <span
            className={cn(
              'hidden shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white lg:inline-flex',
              sessionUser.activeMode === 'WORKER' ? 'bg-[#2563eb]' : 'bg-accent',
            )}
          >
            {sessionUser.activeMode === 'WORKER' ? 'Trabajador' : 'Cliente'}
          </span>
        ) : null}

        <div className="ml-auto flex min-w-0 flex-nowrap items-center justify-end gap-0.5 sm:gap-1">
          {/* Desktop + landscape (la barra inferior se oculta en horizontal). */}
          <nav
            aria-label="Principal"
            className="hidden max-w-[55vw] items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] landscape:flex md:flex md:max-w-none md:gap-1 [&::-webkit-scrollbar]:hidden"
          >
            {desktopLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-2 text-sm font-medium transition sm:px-3.5 sm:py-2.5',
                    workerChrome
                      ? active
                        ? 'bg-white text-[#1e3a5f]'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                      : active
                        ? 'bg-foreground text-white'
                        : 'text-muted hover:bg-brand-soft hover:text-foreground',
                  )}
                >
                  <span className="md:hidden">{link.shortLabel ?? link.label}</span>
                  <span className="hidden md:inline">{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Invitados en móvil: Entrar / Registrarse visibles arriba. */}
          {showGuest ? (
            <nav aria-label="Acceso" className="flex items-center gap-0.5 landscape:hidden md:hidden">
              {GUEST_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="shrink-0 rounded-full px-3 py-2.5 text-sm font-medium text-muted hover:bg-brand-soft hover:text-foreground"
                >
                  {link.shortLabel ?? link.label}
                </Link>
              ))}
            </nav>
          ) : null}

          <NotificationBell enabled={Boolean(sessionUser)} workerChrome={workerChrome} />

          {sessionUser ? (
            <button
              type="button"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
              title="Cerrar sesión"
              className={cn(
                'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-60 sm:w-auto sm:gap-1.5 sm:px-3.5',
                workerChrome
                  ? 'border-white/25 text-white hover:bg-white/10'
                  : 'border-border text-muted hover:bg-brand-soft hover:text-foreground',
              )}
            >
              <LogOut aria-hidden className="h-4 w-4" />
              <span className="hidden sm:inline">
                {logout.isPending ? 'Cerrando…' : 'Cerrar sesión'}
              </span>
              <span className="sr-only">Cerrar sesión</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
