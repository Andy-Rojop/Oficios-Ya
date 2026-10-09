'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LocateFixed, MapPin } from 'lucide-react';
import { WorkersMapLazy } from '@/components/map/workers-map-lazy';
import { Button } from '@/components/ui/button';
import { SearchLoadMore } from '@/components/search/search-load-more';
import { SearchWorkerCardView } from '@/components/search/search-worker-card';
import { toSearchParams, type SearchFilters, type SearchWorkerCard } from '@/lib/search';

interface SearchMapPanelProps {
  filters: SearchFilters;
  items: SearchWorkerCard[];
  nextCursor: string | null;
  error?: string | null;
}

/** Redondeo a ~1 km: la ubicación solo se usa para ordenar por cercanía. */
function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

function filtersKey(filters: SearchFilters): string {
  return [
    filters.q ?? '',
    filters.categoryId ?? '',
    filters.zoneId ?? '',
    filters.minRating ?? '',
    filters.availability ?? '',
    filters.priceMin ?? '',
    filters.priceMax ?? '',
    filters.sort ?? '',
    filters.lat ?? '',
    filters.lng ?? '',
  ].join('|');
}

export function SearchMapPanel({ filters, items, nextCursor, error }: SearchMapPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** Solo se marca cuando el usuario acepta geolocalización (no al tocar el mapa). */
  const [userCenter, setUserCenter] = useState<{ lat: number; lng: number } | null>(null);

  const selectedCenter =
    filters.lat !== undefined && filters.lng !== undefined
      ? { lat: filters.lat, lng: filters.lng }
      : null;

  function goNear(lat: number, lng: number, asUserLocation = false) {
    const coords = { lat: roundCoord(lat), lng: roundCoord(lng) };
    if (asUserLocation) setUserCenter(coords);
    setMessage(null);
    const params = toSearchParams({
      q: filters.q,
      categoryId: filters.categoryId,
      zoneId: filters.zoneId,
      minRating: filters.minRating,
      availability: filters.availability,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      sort: 'near',
      lat: coords.lat,
      lng: coords.lng,
    });
    startTransition(() => {
      router.push(`/buscar?${params.toString()}`);
    });
  }

  function useMyLocation() {
    setMessage(null);
    if (!('geolocation' in navigator)) {
      setMessage('Su navegador no permite obtener la ubicación.');
      return;
    }
    setLocating(true);
    setMessage('Buscando su ubicación…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        goNear(position.coords.latitude, position.coords.longitude, true);
      },
      () => {
        setLocating(false);
        setMessage('No pudimos obtener su ubicación. Active el permiso o toque el mapa.');
      },
      { timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }

  const key = filtersKey(filters);
  const nearActive = filters.sort === 'near' && selectedCenter !== null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={useMyLocation}
          disabled={locating || pending}
        >
          <LocateFixed aria-hidden className="h-4 w-4" />
          {locating ? 'Obteniendo…' : 'Usar mi ubicación'}
        </Button>
        {nearActive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent-dark">
            <MapPin aria-hidden className="h-3.5 w-3.5" />
            Ordenado por cercanía al área elegida
          </span>
        ) : (
          <p className="text-xs text-muted sm:text-sm">
            Toque el mapa para ver oficios cerca de esa área.
          </p>
        )}
      </div>

      {message ? (
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
        <div className="min-h-0 lg:sticky lg:top-4 lg:self-start">
          <WorkersMapLazy
            workers={items}
            interactive
            selectedCenter={selectedCenter}
            userCenter={userCenter}
            onSelectPoint={(lat, lng) => goNear(lat, lng)}
            hideCaption={false}
          />
        </div>

        <div className="flex min-h-0 flex-col gap-3 rounded-2xl border border-border bg-surface p-3 shadow-sm sm:p-4 lg:max-h-[min(70vh,640px)] lg:overflow-y-auto">
          {error ? (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              {error}
            </p>
          ) : null}

          {!error && items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
              <p className="font-medium text-foreground">
                No encontramos resultados con esos filtros.
              </p>
              <p className="mt-1 text-sm text-muted">
                Toque otra parte del mapa, pruebe otra categoría o borre el rango de precio.
              </p>
              <Link
                href="/buscar"
                className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
              >
                Ver todos
              </Link>
            </div>
          ) : null}

          {items.length > 0 ? (
            <>
              <p className="text-sm text-muted">
                {items.length}
                {nextCursor ? '+' : ''} resultado{items.length === 1 ? '' : 's'}
                {filters.q ? ` para “${filters.q}”` : ''}
                {pending ? ' · Actualizando…' : ''}
              </p>
              <div className="space-y-3">
                {items.map((worker) => (
                  <SearchWorkerCardView key={worker.id} worker={worker} />
                ))}
                <SearchLoadMore key={key} filters={filters} initialCursor={nextCursor} />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
