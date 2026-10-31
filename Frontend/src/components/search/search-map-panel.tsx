'use client';

import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
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
  /** En /buscar: lista a la izquierda y mapa a la derecha. */
  layout?: 'stack' | 'discovery';
  header?: ReactNode;
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
  layout = 'stack',
  header,
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
      filters.sort === 'near' && filters.lat === coords.lat && filters.lng === coords.lng;
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

  const results = (
    <div id="resultados-mapa" ref={resultsRef} className="scroll-mt-28 space-y-3">
      {layout === 'stack' ? (
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2
              className="text-lg font-semibold text-foreground sm:text-xl"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              {nearActive ? 'Personas cerca de este punto' : 'Resultados'}
            </h2>
            <p className="text-sm text-muted">
              {nearActive
                ? 'Primero quienes están disponibles, luego ocupados y al final no disponibles. Dentro de cada grupo, de la más cercana a la más lejana.'
                : 'Toque un punto del mapa para ordenar por cercanía. Siempre se muestran primero los disponibles.'}
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
      ) : null}

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
        <div className={layout === 'discovery' ? 'space-y-3' : 'grid gap-3 md:grid-cols-2'}>
          {items.map((worker) => (
            <SearchWorkerCardView key={worker.id} worker={worker} />
          ))}
          <div className={layout === 'discovery' ? undefined : 'md:col-span-2'}>
            <SearchLoadMore key={key} filters={filters} initialCursor={nextCursor} />
          </div>
        </div>
      ) : null}
    </div>
  );

  const map = (
    <WorkersMapLazy
      workers={items}
      interactive
      className={
        layout === 'discovery'
            ? 'lg:h-[calc(100svh-var(--header-h)-7.5rem)] lg:min-h-[460px]'
          : undefined
      }
      selectedCenter={selectedCenter}
      userCenter={userCenter}
      onSelectPoint={(lat, lng) => goNear(lat, lng)}
    />
  );

  if (layout === 'discovery') {
    return (
      <div className="flex h-full min-h-0 flex-col lg:flex-row">
        <div className="relative z-10 flex min-h-0 w-full flex-col bg-[#f4f6f8] shadow-[8px_0_28px_rgba(16,24,40,0.14)] lg:w-[400px] lg:shrink-0">
          {header}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{results}</div>
        </div>
        <div className="relative min-h-[320px] flex-1 p-3 lg:p-4">
          {map}
          <button
            type="button"
            onClick={useMyLocation}
            disabled={locating || pending}
            aria-label="Buscar en esta zona"
            className="absolute right-3 top-3 z-[400] flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-white text-[#1B2A4A] shadow-md"
          >
            <LocateFixed className="h-4 w-4" />
          </button>
          <p className="pointer-events-none absolute bottom-3 left-3 right-16 z-[400] flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-[11px] text-[#667085] shadow-sm">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
            Los pines muestran zonas aproximadas, no direcciones exactas.
          </p>
          {message ? (
            <p role="status" className="absolute left-3 top-3 z-[400] rounded-full bg-white px-3 py-1.5 text-xs shadow">
              {message}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

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
        {map}
        {!nearActive ? (
          <p className="pointer-events-none absolute left-1/2 top-3 z-[400] -translate-x-1/2 rounded-full bg-white/95 px-3 py-1.5 text-center text-xs font-semibold text-foreground shadow-md">
            Toque un punto del mapa
          </p>
        ) : null}
      </div>

      {results}
    </div>
  );
}
