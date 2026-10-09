import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
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
          style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
        >
          {category.name}
        </h1>
        <p className="max-w-2xl text-muted">
          Trabajadores con teléfono verificado en esta categoría. El mapa solo muestra zonas
          aproximadas.
        </p>
      </header>

      <SearchFiltersForm
        basePath={`/categorias/${category.slug}`}
        filters={filters}
        categories={categories}
        zones={zones}
        hideCategory
      />

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}

      {!error && items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface px-5 py-8 text-center">
          <p className="font-medium">Todavía no hay trabajadores públicos en {category.name}.</p>
          <Link
            href="/buscar"
            className="mt-3 inline-block text-sm font-semibold text-brand hover:underline"
          >
            Ver otras categorías
          </Link>
        </div>
      ) : null}

      {items.length > 0 ? (
        <>
          <div className="space-y-3">
            {items.map((worker) => (
              <SearchWorkerCardView key={worker.id} worker={worker} />
            ))}
            <SearchLoadMore filters={filters} initialCursor={nextCursor} />
          </div>
          <WorkersMapLazy workers={items} />
        </>
      ) : null}
    </section>
  );
}
