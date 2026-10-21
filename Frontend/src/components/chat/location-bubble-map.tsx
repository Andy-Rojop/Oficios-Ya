'use client';

import dynamic from 'next/dynamic';

function BubbleMapPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-[#e5edf5] text-xs text-muted">
      Cargando mapa…
    </div>
  );
}

export const LocationBubbleMap = dynamic(
  () => import('./location-bubble-map-inner'),
  {
    ssr: false,
    loading: () => <BubbleMapPlaceholder />,
  },
);
