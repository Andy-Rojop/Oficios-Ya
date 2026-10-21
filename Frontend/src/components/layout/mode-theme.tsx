'use client';

import { useEffect } from 'react';
import { useMe } from '@/lib/auth';

/** Marca el documento según el modo activo para distinguir cliente y trabajador. */
export function ModeTheme() {
  const { data: user } = useMe();
  const mode = user?.activeMode === 'WORKER' ? 'worker' : 'client';

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
    return () => {
      delete document.documentElement.dataset.mode;
    };
  }, [mode]);

  return null;
}
