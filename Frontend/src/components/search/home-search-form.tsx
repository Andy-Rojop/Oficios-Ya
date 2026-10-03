'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function HomeSearchForm() {
  const router = useRouter();
  const [q, setQ] = useState('');

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = q.trim();
    const href = trimmed ? `/buscar?q=${encodeURIComponent(trimmed)}` : '/buscar';
    router.push(href);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full max-w-xl flex-col gap-2 sm:flex-row sm:items-end"
      role="search"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <Label htmlFor="home-search-q">¿Qué oficio necesitás?</Label>
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
