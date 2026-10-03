import type { Metadata } from 'next';
import Link from 'next/link';
import { WorkersMapLazy } from '@/components/map/workers-map-lazy';
import { SearchFiltersForm } from '@/components/search/search-filters';
import { SearchLoadMore } from '@/components/search/search-load-more';
import { SearchWorkerCardView } from '@/components/search/search-worker-card';
import { ApiError } from '@/lib/api-client';
import {
  fetchCatalogCategories,
  fetchCatalogZones,
  fetchSearchWorkers,
  parseSearchFilters,
  type SearchFilters,
  type SearchWorkersResponse,
} from '@/lib/search';

export const metadata: Metadata = {
  title: 'Buscar trabajadores',
  description:
    'Encontrá oficios de confianza en El Asintal: filtrá por categoría, zona, precio y calificación.',
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function loadResults(filters: SearchFilters): Promise<{
  data: SearchWorkersResponse | null;
  error: string | null;
}> {
  try {
    const data = await fetchSearchWorkers(filters, { cache: 'no-store' });
    return { data, error: null };
  } catch (error) {
    const message =
      error instanceof ApiError
        ? error.message
        : 'No se pudo cargar la búsqueda. Revisá que la API esté en marcha.';
    return { data: null, error: message };
  }
}

export default async function BuscarPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const filters = parseSearchFilters(raw);

  const [categories, zones, result] = await Promise.all([
    fetchCatalogCategories({ cache: 'force-cache' }).catch(() => []),
    fetchCatalogZones({ cache: 'force-cache' }).catch(() => []),
    loadResults(filters),
  ]);

  const items = result.data?.items ?? [];
  const nextCursor = result.data?.nextCursor ?? null;

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1
          className="text-2xl font-semibold sm:text-3xl"
          style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
        >
          Buscar trabajadores
        </h1>
        <p className="max-w-2xl text-muted">
          Filtrá por oficio, zona y precio de referencia. Las ubicaciones del mapa son zonas
          aproximadas, nunca una dirección exacta.
        </p>
      </header>

      <SearchFiltersForm
        basePath="/buscar"
        filters={filters}
        categories={categories}
        zones={zones}
      />

      {result.error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {result.error}
        </p>
      ) : null}

      {!result.error && items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-5 py-8 text-center">
          <p className="font-medium text-foreground">No encontramos resultados con esos filtros.</p>
          <p className="mt-1 text-sm text-muted">
            Probá otra categoría, zona o borrá el rango de precio.
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
          </p>

          <div className="space-y-3">
            {items.map((worker) => (
              <SearchWorkerCardView key={worker.id} worker={worker} />
            ))}
            <SearchLoadMore filters={filters} initialCursor={nextCursor} />
          </div>

          <div className="space-y-2 pt-2">
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              Zonas en el mapa
            </h2>
            <WorkersMapLazy workers={items} />
          </div>
        </>
      ) : null}
    </section>
  );
}
