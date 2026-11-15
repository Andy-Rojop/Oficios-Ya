'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isStaffRole, useMe } from '@/lib/auth';

/** Aviso fijo cuando un admin navega la app de clientes o trabajadores. */
export function StaffPreviewBanner() {
  const pathname = usePathname();
  const { data: user } = useMe();

  if (!user || !isStaffRole(user.role) || pathname.startsWith('/admin')) {
    return null;
  }

  const viewingWorker = pathname.startsWith('/panel');
  const label = viewingWorker
    ? 'Vista del panel de trabajadores (solo consulta)'
    : 'Vista de la app de clientes (solo consulta)';

  return (
    <div className="mb-4 rounded-2xl border border-brand/25 bg-brand/[0.06] px-4 py-3 text-sm text-foreground">
      <p className="font-semibold text-brand">{label}</p>
      <p className="mt-0.5 text-muted">
        Su cuenta de administración no es cliente ni trabajador.{' '}
        <Link href="/admin" className="font-semibold text-brand underline-offset-2 hover:underline">
          Volver al panel admin
        </Link>
      </p>
    </div>
  );
}
