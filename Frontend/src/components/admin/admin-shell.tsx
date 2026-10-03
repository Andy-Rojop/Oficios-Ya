'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { isStaffRole } from '@/lib/admin';
import { getErrorMessage, isUnauthorized, useMe } from '@/lib/auth';

const ADMIN_NAV = [
  { href: '/admin', label: 'Resumen' },
  { href: '/admin/verificaciones', label: 'Verificaciones' },
  { href: '/admin/reportes', label: 'Reportes' },
  { href: '/admin/catalogos', label: 'Catálogos' },
  { href: '/admin/usuarios', label: 'Usuarios' },
  { href: '/admin/bitacora', label: 'Bitácora', adminOnly: true },
] as const;

/** Redirige si el rol no es ADMIN/MUNICIPAL; muestra navegación del panel. */
export function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const me = useMe();

  useEffect(() => {
    if (isUnauthorized(me.error)) {
      router.replace('/ingresar?next=/admin');
      return;
    }
    if (me.data && !isStaffRole(me.data.role)) {
      router.replace('/cuenta');
    }
  }, [me.data, me.error, router]);

  if (me.isLoading) {
    return <p className="text-muted">Cargando panel…</p>;
  }

  if (me.isError && !isUnauthorized(me.error)) {
    return (
      <Card>
        <p role="alert" className="text-sm text-red-700">
          {getErrorMessage(me.error)}
        </p>
      </Card>
    );
  }

  if (!me.data || !isStaffRole(me.data.role)) {
    return <p className="text-muted">Comprobando permisos…</p>;
  }

  const links = ADMIN_NAV.filter(
    (item) => !('adminOnly' in item && item.adminOnly) || me.data.role === 'ADMIN',
  );

  return (
    <div className="space-y-6">
      <nav aria-label="Administración" className="flex flex-wrap gap-1 border-b border-border pb-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:bg-brand-soft hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
