'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { isStaffRole, useMe } from '@/lib/auth';

/** Marca el documento según el modo activo (o la vista que consulta el staff). */
export function ModeTheme() {
  const pathname = usePathname();
  const { data: user } = useMe();
  const staff = isStaffRole(user?.role);

  let mode: 'worker' | 'client' = 'client';
  if (staff) {
    mode = pathname.startsWith('/panel') ? 'worker' : 'client';
  } else if (user?.activeMode === 'WORKER') {
    mode = 'worker';
  }

  useEffect(() => {
    // No borrar en cleanup: al remount (Strict Mode / navegación) Safari parpadeaba
    // al quitar y volver a poner data-mode (repinta todo el body).
    document.documentElement.dataset.mode = mode;
  }, [mode]);

  return null;
}
