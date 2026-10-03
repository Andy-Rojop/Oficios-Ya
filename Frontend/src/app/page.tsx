import { ClientHome } from '@/components/client/client-home';
import { fetchCatalogCategories, fetchSearchWorkers } from '@/lib/search';

export default async function HomePage() {
  const [categories, search] = await Promise.all([
    fetchCatalogCategories({ cache: 'force-cache' }).catch(() => []),
    fetchSearchWorkers({ sort: 'rating', limit: 8 }, { cache: 'no-store' }).catch(() => ({
      items: [],
      nextCursor: null,
    })),
  ]);

  return <ClientHome categories={categories} workers={search.items} />;
}
