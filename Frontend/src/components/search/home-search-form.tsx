'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface HomeSearchFormProps {
  /** Estilo grande tipo Uber para el hero. */
  variant?: 'default' | 'hero';
}

export function HomeSearchForm({ variant = 'default' }: HomeSearchFormProps) {
  const router = useRouter();
  const [q, setQ] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = q.trim();
    const href = trimmed ? `/buscar?q=${encodeURIComponent(trimmed)}` : '/buscar';
    router.push(href);
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
        <div className="flex min-w-0 flex-1 items-center gap-1.5 pl-2">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted" />
          <Input
            id="home-search-q"
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="¿Qué oficio necesita?"
            maxLength={100}
            enterKeyHint="search"
            autoComplete="off"
            className="h-9 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0"
          />
        </div>
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
        <Input
          id="home-search-q"
          type="search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Ej. plomería, electricidad, carpintería…"
          maxLength={100}
          enterKeyHint="search"
          autoComplete="off"
        />
      </div>
      <Button type="submit" className="sm:mb-0">
        Buscar
      </Button>
    </form>
  );
}
