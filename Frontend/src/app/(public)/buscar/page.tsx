import type { Metadata } from 'next';
import { ProtectedDiscovery } from '@/components/auth/require-login';
import { SearchFiltersForm } from '@/components/search/search-filters';
import { SearchMapPanel } from '@/components/search/search-map-panel';
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
    'Encuentre oficios de confianza en El Asintal: filtre por categoría, zona, precio y calificación.',
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
        : 'No se pudo cargar la búsqueda. Revise que la API esté en marcha.';
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
    <ProtectedDiscovery>
      <section className="space-y-6">
        <header className="space-y-2">
          <h1
            className="text-2xl font-semibold sm:text-3xl"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            Buscar trabajadores
          </h1>
          <p className="max-w-2xl text-muted">
            Toque el mapa para ver a las personas disponibles, de la más cercana a la más lejana.
            Los pines son centros de zona, nunca una dirección exacta.
          </p>
        </header>

        <SearchFiltersForm
          basePath="/buscar"
          filters={filters}
          categories={categories}
          zones={zones}
          workers={items}
        />

        <SearchMapPanel
          filters={filters}
          items={items}
          nextCursor={nextCursor}
          error={result.error}
        />
      </section>
    </ProtectedDiscovery>
  );
}
