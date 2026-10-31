'use client';

import { useEffect } from 'react';
import { useMe } from '@/lib/auth';

/** Marca el documento según el modo activo para distinguir cliente y trabajador. */
export function ModeTheme() {
  const { data: user } = useMe();
  const mode = user?.activeMode === 'WORKER' ? 'worker' : 'client';

  useEffect(() => {
    // No borrar en cleanup: al remount (Strict Mode / navegación) Safari parpadeaba
    // al quitar y volver a poner data-mode (repinta todo el body).
    document.documentElement.dataset.mode = mode;
  }, [mode]);

  return null;
}
