'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NotificationBell } from '@/components/layout/notification-bell';
import { isStaffRole } from '@/lib/admin';
import { useMe, type ActiveMode } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface NavLink {
  href: string;
  label: string;
}

const GUEST_LINKS: NavLink[] = [
  { href: '/buscar', label: 'Buscar' },
  { href: '/roles', label: 'Ingresar' },
  { href: '/registro', label: 'Registrarse' },
];

/** Enlaces de cliente: descubrir oficios y gestionar pedidos. */
const CLIENT_LINKS: NavLink[] = [
  { href: '/buscar', label: 'Buscar' },
  { href: '/mensajes', label: 'Mensajes' },
  { href: '/solicitudes', label: 'Solicitudes' },
  { href: '/cuenta', label: 'Cuenta' },
];

/** Enlaces de trabajador: sin “Buscar” (eso es del modo cliente). */
const WORKER_LINKS: NavLink[] = [
  { href: '/panel', label: 'Panel' },
  { href: '/mensajes', label: 'Mensajes' },
  { href: '/solicitudes', label: 'Solicitudes' },
  { href: '/cuenta', label: 'Cuenta' },
];

function linksForMode(mode: ActiveMode | undefined): NavLink[] {
  return mode === 'WORKER' ? WORKER_LINKS : CLIENT_LINKS;
}

export function SiteHeader() {
  const pathname = usePathname();
  const { data: user, isLoading, isFetching } = useMe();

  // Si ya hay usuario en caché, no vaciar el menú mientras se revalida.
  const showGuest = !user && !isLoading && !isFetching;
  const links: NavLink[] = [
    ...(user ? linksForMode(user.activeMode) : showGuest ? GUEST_LINKS : []),
    ...(isStaffRole(user?.role) ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={user?.activeMode === 'WORKER' ? '/panel' : '/'}
            className="text-lg font-bold tracking-tight text-foreground"
            style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
          >
            OficiosYa
          </Link>
          {user ? (
            <span className="hidden rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white sm:inline-flex">
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
                  active
                    ? 'bg-foreground text-white'
                    : 'text-muted hover:bg-brand-soft hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
