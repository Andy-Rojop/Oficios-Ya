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
      <SearchMapPanel
        layout="discovery"
        filters={filters}
        items={items}
        nextCursor={nextCursor}
        error={result.error}
        header={
          <SearchFiltersForm
            appearance="discovery"
            basePath="/buscar"
            filters={filters}
            categories={categories}
            zones={zones}
            workers={items}
            resultCount={items.length}
            hasMore={Boolean(nextCursor)}
          />
        }
      />
    </ProtectedDiscovery>
  );
}
