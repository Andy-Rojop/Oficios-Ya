'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GUEST_LINKS, linksForMode } from '@/components/layout/nav-links';
import { NotificationBell } from '@/components/layout/notification-bell';
import { isStaffRole } from '@/lib/admin';
import { useLogout, useMe } from '@/lib/auth';
import { cn } from '@/lib/utils';

export function SiteHeader() {
  const pathname = usePathname();
  const { data: user, isLoading, isFetching } = useMe();
  const logout = useLogout();

  const showGuest = !user && !isLoading && !isFetching;
  const workerChrome = user?.activeMode === 'WORKER';
  const desktopLinks = [
    ...(user ? linksForMode(user.activeMode) : showGuest ? GUEST_LINKS : []),
    ...(isStaffRole(user?.role)
      ? [{ href: '/admin', label: 'Admin', shortLabel: 'Admin', icon: 'account' as const }]
      : []),
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)]',
        user?.activeMode === 'WORKER'
          ? 'border-[#1e3a5f]/30 bg-[#1e3a5f] text-white'
          : 'border-border bg-surface',
      )}
    >
      {/* flex-nowrap: Salir nunca baja de línea; queda siempre a la derecha. */}
      <div className="mx-auto flex h-12 w-full max-w-6xl flex-nowrap items-center gap-2 px-3 sm:h-14 sm:gap-3 sm:px-6">
        <Link
          href={user?.activeMode === 'WORKER' ? '/panel' : '/'}
          className={cn(
            'shrink-0 text-base font-bold tracking-tight sm:text-lg',
            user?.activeMode === 'WORKER' ? 'text-white' : 'text-foreground',
          )}
          style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
        >
          OficiosYa
        </Link>

        {user ? (
          <span
            className={cn(
              'hidden shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white lg:inline-flex',
              user.activeMode === 'WORKER' ? 'bg-[#2563eb]' : 'bg-accent',
            )}
          >
            {user.activeMode === 'WORKER' ? 'Trabajador' : 'Cliente'}
          </span>
        ) : null}

        <div className="ml-auto flex min-w-0 flex-nowrap items-center justify-end gap-0.5 sm:gap-1">
          {/* Enlaces solo desktop / invitados. En móvil con sesión: barra inferior. */}
          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {desktopLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'shrink-0 rounded-full px-3.5 py-2.5 text-sm font-medium transition',
                    workerChrome
                      ? active
                        ? 'bg-white text-[#1e3a5f]'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                      : active
                        ? 'bg-foreground text-white'
                        : 'text-muted hover:bg-brand-soft hover:text-foreground',
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Invitados en móvil: Entrar / Registrarse visibles arriba. */}
          {showGuest ? (
            <nav aria-label="Acceso" className="flex items-center gap-0.5 md:hidden">
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

          <NotificationBell enabled={Boolean(user)} workerChrome={workerChrome} />

          {user ? (
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
