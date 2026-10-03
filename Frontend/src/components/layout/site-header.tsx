'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NotificationBell } from '@/components/layout/notification-bell';
import { isStaffRole } from '@/lib/admin';
import { useMe } from '@/lib/auth';
import { cn } from '@/lib/utils';

interface NavLink {
  href: string;
  label: string;
}

const PUBLIC_LINKS: NavLink[] = [{ href: '/buscar', label: 'Buscar' }];

const GUEST_LINKS: NavLink[] = [
  { href: '/roles', label: 'Ingresar' },
  { href: '/registro', label: 'Registrarse' },
];

const USER_LINKS: NavLink[] = [
  { href: '/mensajes', label: 'Mensajes' },
  { href: '/solicitudes', label: 'Solicitudes' },
  { href: '/panel', label: 'Panel' },
  { href: '/cuenta', label: 'Cuenta' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { data: user, isLoading } = useMe();

  const links: NavLink[] = [
    ...PUBLIC_LINKS,
    // Mientras se consulta la sesión no se muestra ninguno para evitar parpadeos.
    ...(isLoading ? [] : user ? USER_LINKS : GUEST_LINKS),
    ...(isStaffRole(user?.role) ? [{ href: '/admin', label: 'Admin' }] : []),
  ];

  return (
    <header className="border-b border-border/80 bg-surface/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight text-brand">
          OficiosYa
        </Link>
        <nav aria-label="Principal" className="flex flex-wrap items-center gap-0.5 sm:gap-2">
          <NotificationBell enabled={Boolean(user)} />
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-md px-2.5 py-2 text-sm font-medium transition hover:bg-brand-soft hover:text-foreground sm:px-3',
                  active ? 'bg-brand-soft text-brand-dark' : 'text-muted',
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
