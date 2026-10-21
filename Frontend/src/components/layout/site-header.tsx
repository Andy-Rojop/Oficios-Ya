'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NotificationBell } from '@/components/layout/notification-bell';
import { isStaffRole } from '@/lib/admin';
import { useLogout, useMe, type ActiveMode } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface NavLink {
  href: string;
  label: string;
}

const GUEST_LINKS: NavLink[] = [
  { href: '/ingresar', label: 'Iniciar sesión' },
  { href: '/registro', label: 'Registrarse' },
];

/** Enlaces de cliente: descubrir oficios y gestionar pedidos. */
const CLIENT_LINKS: NavLink[] = [
  { href: '/buscar', label: 'Buscar' },
  { href: '/mensajes', label: 'Mensajes' },
  { href: '/solicitudes', label: 'Mis solicitudes' },
  { href: '/cuenta', label: 'Cuenta' },
];

/** El trabajador también busca oficios cercanos en el mapa. */
const WORKER_LINKS: NavLink[] = [
  { href: '/panel', label: 'Panel' },
  { href: '/buscar', label: 'Buscar' },
  { href: '/mensajes', label: 'Mensajes' },
  { href: '/solicitudes', label: 'Mis solicitudes' },
  { href: '/cuenta', label: 'Cuenta' },
];

function linksForMode(mode: ActiveMode | undefined): NavLink[] {
  return mode === 'WORKER' ? WORKER_LINKS : CLIENT_LINKS;
}

export function SiteHeader() {
  const pathname = usePathname();
  const { data: user, isLoading, isFetching } = useMe();
  const logout = useLogout();

  // Si ya hay usuario en caché, no vaciar el menú mientras se revalida.
  const showGuest = !user && !isLoading && !isFetching;
  const workerChrome = user?.activeMode === 'WORKER';
  const links: NavLink[] = [
    ...(user ? linksForMode(user.activeMode) : showGuest ? GUEST_LINKS : []),
    ...(isStaffRole(user?.role) ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b backdrop-blur-md',
        user?.activeMode === 'WORKER'
          ? 'border-[#1e3a5f]/30 bg-[#1e3a5f]/95 text-white'
          : 'border-border bg-surface/95',
      )}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className={cn(
              'text-lg font-bold tracking-tight',
              user?.activeMode === 'WORKER' ? 'text-white' : 'text-foreground',
            )}
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            OficiosYa
          </Link>
          {user ? (
            <span
              className={cn(
                'hidden rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white sm:inline-flex',
                user.activeMode === 'WORKER' ? 'bg-[#2563eb]' : 'bg-accent',
              )}
            >
              {user.activeMode === 'WORKER' ? 'Trabajador' : 'Cliente'}
            </span>
          ) : null}
        </div>
        <nav aria-label="Principal" className="flex flex-wrap items-center gap-0.5 sm:gap-1">
          <NotificationBell enabled={Boolean(user)} />
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-full px-3 py-2 text-sm font-medium transition sm:px-3.5',
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
          {user ? (
            <button
              type="button"
              disabled={logout.isPending}
              onClick={() => logout.mutate()}
              className={cn(
                'ml-0.5 inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition disabled:opacity-60 sm:px-3.5',
                workerChrome
                  ? 'border-white/25 text-white hover:bg-white/10'
                  : 'border-border text-muted hover:bg-brand-soft hover:text-foreground',
              )}
            >
              <LogOut aria-hidden className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {logout.isPending ? 'Cerrando…' : 'Cerrar sesión'}
              </span>
              <span className="sm:hidden">{logout.isPending ? '…' : 'Salir'}</span>
            </button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
