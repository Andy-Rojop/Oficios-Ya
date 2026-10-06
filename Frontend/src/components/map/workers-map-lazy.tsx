'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { cn } from '@/lib/utils';
import type { WorkersMapProps } from './workers-map';

function MapLoading({ interactive = false, fill = false }: { interactive?: boolean; fill?: boolean }) {
  return (
    <div
      role="status"
      className={cn(
        'flex w-full items-center justify-center bg-brand-soft/50 text-sm text-muted',
        fill
          ? 'h-full min-h-[min(62vh,560px)] rounded-none border-0'
          : 'rounded-2xl border border-border',
        !fill &&
          (interactive ? 'h-[55vh] min-h-[280px] lg:min-h-[420px]' : 'h-72 sm:h-96'),
      )}
    >
      Cargando mapa…
    </div>
  );
}

const WorkersMapSimple = dynamic(() => import('./workers-map'), {
  ssr: false,
  loading: () => <MapLoading />,
}) as ComponentType<WorkersMapProps>;

const WorkersMapInteractive = dynamic(() => import('./workers-map'), {
  ssr: false,
  loading: () => <MapLoading interactive />,
}) as ComponentType<WorkersMapProps>;

const WorkersMapFill = dynamic(() => import('./workers-map'), {
  ssr: false,
  loading: () => <MapLoading fill />,
}) as ComponentType<WorkersMapProps>;

/** Leaflet usa `window`: se carga solo en el navegador (ssr: false) y bajo demanda. */
export function WorkersMapLazy(props: WorkersMapProps) {
  if (props.fill) return <WorkersMapFill {...props} />;
  const Map = props.interactive ? WorkersMapInteractive : WorkersMapSimple;
  return <Map {...props} />;
}
