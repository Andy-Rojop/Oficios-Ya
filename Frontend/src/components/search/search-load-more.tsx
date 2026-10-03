'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import { fetchSearchWorkers, type SearchFilters, type SearchWorkerCard } from '@/lib/search';
import { SearchWorkerCardView } from './search-worker-card';

interface SearchLoadMoreProps {
  filters: SearchFilters;
  initialCursor: string | null;
}

export function SearchLoadMore({ filters, initialCursor }: SearchLoadMoreProps) {
  const [extra, setExtra] = useState<SearchWorkerCard[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!cursor && extra.length === 0) {
    return null;
  }

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const page = await fetchSearchWorkers({ ...filters, cursor });
      setExtra((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar más resultados.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {extra.map((worker) => (
        <SearchWorkerCardView key={worker.id} worker={worker} />
      ))}
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {cursor ? (
        <div className="flex justify-center pt-2">
          <Button type="button" variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? 'Cargando…' : 'Ver más'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
