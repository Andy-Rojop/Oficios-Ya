'use client';

import dynamic from 'next/dynamic';

/** Leaflet usa `window`: se carga solo en el navegador (ssr: false) y bajo demanda. */
export const WorkersMapLazy = dynamic(() => import('./workers-map'), {
  ssr: false,
  loading: () => (
    <div
      role="status"
      className="flex h-72 w-full items-center justify-center rounded-2xl border border-border bg-brand-soft/50 text-sm text-muted sm:h-96"
    >
      Cargando mapa…
    </div>
  ),
});
