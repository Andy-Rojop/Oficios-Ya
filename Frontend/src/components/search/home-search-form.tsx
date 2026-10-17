'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  ContextualSearchInput,
  type ContextualSuggestionItem,
} from '@/components/search/contextual-search-input';
import type { CatalogCategory, SearchWorkerCard } from '@/lib/search';
import { cn } from '@/lib/utils';

interface HomeSearchFormProps {
  /** Estilo grande tipo Uber para el hero. */
  variant?: 'default' | 'hero';
  categories?: CatalogCategory[];
  workers?: SearchWorkerCard[];
}

export function HomeSearchForm({
  variant = 'default',
  categories = [],
  workers = [],
}: HomeSearchFormProps) {
  const router = useRouter();
  const [q, setQ] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = q.trim();
    const href = trimmed ? `/buscar?q=${encodeURIComponent(trimmed)}` : '/buscar';
    router.push(href);
  }

  function handleSelectSuggestion(item: ContextualSuggestionItem) {
    if (item.kind === 'category' && item.categoryId) {
      router.push(`/buscar?categoryId=${encodeURIComponent(item.categoryId)}`);
      return;
    }
    if (item.kind === 'category' && item.slug) {
      router.push(`/categorias/${encodeURIComponent(item.slug)}`);
      return;
    }
    if (item.kind === 'worker' && item.workerId) {
      router.push(`/trabajador/${encodeURIComponent(item.workerId)}`);
      return;
    }
    setQ(item.label);
    router.push(`/buscar?q=${encodeURIComponent(item.label)}`);
  }

  if (variant === 'hero') {
    return (
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-sm items-center gap-1.5 rounded-xl bg-surface p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.22)]"
        role="search"
      >
        <Label htmlFor="home-search-q" className="sr-only">
          ¿Qué oficio necesita?
        </Label>
        <ContextualSearchInput
          id="home-search-q"
          variant="hero"
          value={q}
          onChange={setQ}
          onSelectSuggestion={handleSelectSuggestion}
          placeholder="¿Qué oficio necesita?"
          categories={categories}
          workers={workers}
        />
        <Button type="submit" size="sm" className="shrink-0 rounded-lg px-3.5">
          Buscar
        </Button>
      </form>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={cn('flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-end')}
      role="search"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <Label htmlFor="home-search-q">¿Qué oficio necesita?</Label>
        <ContextualSearchInput
          id="home-search-q"
          value={q}
          onChange={setQ}
          onSelectSuggestion={handleSelectSuggestion}
          placeholder="Ej. plomería, electricidad, carpintería…"
          categories={categories}
          workers={workers}
        />
      </div>
      <Button type="submit" className="sm:mb-0">
        Buscar
      </Button>
    </form>
  );
}
