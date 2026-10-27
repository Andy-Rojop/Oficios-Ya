import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProtectedDiscovery } from '@/components/auth/require-login';
import { SearchFiltersForm } from '@/components/search/search-filters';
import { SearchMapPanel } from '@/components/search/search-map-panel';
import { ApiError } from '@/lib/api-client';
import {
  fetchCatalogCategories,
  fetchCatalogZones,
  fetchSearchWorkers,
  parseSearchFilters,
} from '@/lib/search';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const categories = await fetchCatalogCategories({ cache: 'force-cache' }).catch(() => []);
  const category = categories.find((item) => item.slug === slug);
  if (!category) {
    return { title: 'Categoría' };
  }
  return {
    title: category.name,
    description: `Trabajadores de ${category.name} en El Asintal, Retalhuleu.`,
  };
}

export default async function CategoriaPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const raw = await searchParams;

  const [categories, zones] = await Promise.all([
    fetchCatalogCategories({ cache: 'force-cache' }).catch(() => []),
    fetchCatalogZones({ cache: 'force-cache' }).catch(() => []),
  ]);

  const category = categories.find((item) => item.slug === slug);
  if (!category) {
    notFound();
  }

  const filters = {
    ...parseSearchFilters(raw),
    categoryId: category.id,
  };

  let items: Awaited<ReturnType<typeof fetchSearchWorkers>>['items'] = [];
  let nextCursor: string | null = null;
  let error: string | null = null;

  try {
    const data = await fetchSearchWorkers(filters, { cache: 'no-store' });
    items = data.items;
    nextCursor = data.nextCursor;
  } catch (err) {
    error =
      err instanceof ApiError
        ? err.message
        : 'No se pudo cargar la categoría. Revise que la API esté en marcha.';
  }

  return (
    <ProtectedDiscovery>
      <section className="space-y-6">
        <header className="space-y-2">
          <p className="text-sm text-muted">
            <Link href="/buscar" className="text-brand hover:underline">
              Buscar
            </Link>
            {' / '}
            {category.name}
          </p>
          <h1
            className="text-2xl font-semibold sm:text-3xl"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            {category.name}
          </h1>
          <p className="max-w-2xl text-muted">
            Toque el mapa para ver a quienes están disponibles en {category.name}, del más cercano
            al más lejano. Los pines son centros de zona, nunca una dirección exacta.
          </p>
        </header>

        <SearchFiltersForm
          basePath={`/categorias/${category.slug}`}
          filters={filters}
          categories={categories}
          zones={zones}
          workers={items}
          hideCategory
        />

        <SearchMapPanel
          basePath={`/categorias/${category.slug}`}
          filters={filters}
          items={items}
          nextCursor={nextCursor}
          error={error}
        />
      </section>
    </ProtectedDiscovery>
  );
}
