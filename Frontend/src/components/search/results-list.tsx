'use client';

import { useState } from 'react';
import { Map as MapIcon, List } from 'lucide-react';
import { WorkersMapLazy } from '@/components/map/workers-map-lazy';
import { Button } from '@/components/ui/button';
import {
  fetchSearchWorkers,
  type SearchFilters,
  type SearchWorkerCard,
  type SearchWorkersResponse,
} from '@/lib/search';
import { WorkerResultCard } from './worker-card';

interface ResultsListProps {
  initial: SearchWorkersResponse;
  filters: SearchFilters;
  emptyHint?: string;
}

/** Resultados con "Ver más" (cursor) y mapa de zonas aproximadas bajo demanda. */
export function ResultsList({ initial, filters, emptyHint }: ResultsListProps) {
  const [items, setItems] = useState<SearchWorkerCard[]>(initial.items);
  const [cursor, setCursor] = useState<string | null>(initial.nextCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);

  async function loadMore() {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchSearchWorkers({ ...filters, cursor });
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...next.items.filter((item) => !seen.has(item.id))];
      });
      setCursor(next.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No pudimos cargar más resultados');
    } finally {
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/70 p-8 text-center">
        <p className="text-lg font-semibold">No encontramos trabajadores con esos filtros</p>
        <p className="mt-1 text-sm text-muted">
          {emptyHint ?? 'Pruebe con otra palabra, quite algún filtro o amplíe el rango de precio.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {items.length} {items.length === 1 ? 'resultado' : 'resultados'}
          {cursor ? ' (hay más)' : ''}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMap((value) => !value)}
          aria-pressed={showMap}
        >
          {showMap ? (
            <List aria-hidden className="h-4 w-4" />
          ) : (
            <MapIcon aria-hidden className="h-4 w-4" />
          )}
          {showMap ? 'Ocultar mapa' : 'Ver mapa'}
        </Button>
      </div>

      {showMap ? <WorkersMapLazy workers={items} /> : null}

      <ul className="space-y-3">
        {items.map((worker) => (
          <WorkerResultCard key={worker.id} worker={worker} />
        ))}
      </ul>

      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {cursor ? (
        <div className="flex justify-center">
          <Button type="button" variant="outline" onClick={loadMore} disabled={loading}>
            {loading ? 'Cargando…' : 'Ver más resultados'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
