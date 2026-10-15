'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
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
  /** Ruta al marcar el mapa: /buscar o /categorias/[slug]. */
  basePath?: string;
}

/** Redondeo a ~1 km: la ubicación solo se usa para ordenar por cercanía. */
function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Sobrevive a la navegación de la misma página para bajar a la lista después del clic. */
let scrollToResults = false;

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

export function SearchMapPanel({
  filters,
  items,
  nextCursor,
  error,
  basePath = '/buscar',
}: SearchMapPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** Solo se marca cuando el usuario acepta geolocalización (no al tocar el mapa). */
  const [userCenter, setUserCenter] = useState<{ lat: number; lng: number } | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const selectedCenter =
    filters.lat !== undefined && filters.lng !== undefined
      ? { lat: filters.lat, lng: filters.lng }
      : null;

  function goNear(lat: number, lng: number, asUserLocation = false) {
    const coords = { lat: roundCoord(lat), lng: roundCoord(lng) };
    if (asUserLocation) setUserCenter(coords);
    setMessage(null);
    const alreadyThere =
      filters.sort === 'near' &&
      filters.availability === 'AVAILABLE' &&
      filters.lat === coords.lat &&
      filters.lng === coords.lng;
    if (alreadyThere) {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    scrollToResults = true;
    const params = toSearchParams({
      q: filters.q,
      categoryId: filters.categoryId,
      zoneId: filters.zoneId,
      minRating: filters.minRating,
      availability: 'AVAILABLE',
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      sort: 'near',
      lat: coords.lat,
      lng: coords.lng,
    });
    startTransition(() => {
      router.push(`${basePath}?${params.toString()}`);
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

  useEffect(() => {
    if (!scrollToResults || !nearActive) return;
    scrollToResults = false;
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [nearActive, filters.lat, filters.lng, items.length]);

  return (
    <div className="space-y-4">
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e7f6ee] px-3 py-1.5 text-xs font-semibold text-[#1f6b4a]">
            <MapPin aria-hidden className="h-3.5 w-3.5" />
            Disponibles, del más cercano al más lejano
          </span>
        ) : (
          <p className="text-xs text-muted sm:text-sm">
            Toque el mapa y la página baja a quienes están disponibles.
          </p>
        )}
      </div>

      {message ? (
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      ) : null}

      <div className="relative">
        <WorkersMapLazy
          workers={items}
          interactive
          selectedCenter={selectedCenter}
          userCenter={userCenter}
          onSelectPoint={(lat, lng) => goNear(lat, lng)}
        />
        {!nearActive ? (
          <p className="pointer-events-none absolute left-1/2 top-3 z-[400] -translate-x-1/2 rounded-full bg-white/95 px-3 py-1.5 text-center text-xs font-semibold text-foreground shadow-md">
            Toque un punto del mapa
          </p>
        ) : null}
      </div>

      <div id="resultados-mapa" ref={resultsRef} className="scroll-mt-28 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2
              className="text-lg font-semibold text-foreground sm:text-xl"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              {nearActive ? 'Personas disponibles' : 'Resultados'}
            </h2>
            <p className="text-sm text-muted">
              {nearActive
                ? 'De la más cercana a la más lejana. La distancia es al centro de la zona, nunca a una casa.'
                : 'Marque el mapa para ver solo disponibles, ordenados por cercanía.'}
            </p>
          </div>
          {items.length > 0 ? (
            <p className="text-sm text-muted">
              {items.length}
              {nextCursor ? '+' : ''} resultado{items.length === 1 ? '' : 's'}
              {filters.q ? ` para “${filters.q}”` : ''}
              {pending ? ' · Actualizando…' : ''}
            </p>
          ) : null}
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </p>
        ) : null}

        {!error && items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-8 text-center">
            <p className="font-medium text-foreground">
              {nearActive
                ? 'No hay trabajadores disponibles cerca de este punto.'
                : 'No encontramos resultados con esos filtros.'}
            </p>
            <p className="mt-1 text-sm text-muted">
              Toque otra parte del mapa, pruebe otra categoría o borre el rango de precio.
            </p>
            <Link
              href={basePath}
              className="mt-4 inline-block text-sm font-semibold text-brand hover:underline"
            >
              Ver todos
            </Link>
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {items.map((worker) => (
              <SearchWorkerCardView key={worker.id} worker={worker} />
            ))}
            <div className="md:col-span-2">
              <SearchLoadMore key={key} filters={filters} initialCursor={nextCursor} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
