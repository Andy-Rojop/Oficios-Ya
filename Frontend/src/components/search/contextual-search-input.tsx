'use client';

import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Briefcase, Compass, MapPin, Search, Sparkles, UserCheck, Wrench } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  fetchSearchSuggestions,
  type CatalogCategory,
  type CatalogZone,
  type SearchWorkerCard,
} from '@/lib/search';
import type { Availability } from '@/lib/workers';
import { cn } from '@/lib/utils';

export interface ContextualSuggestionItem {
  key: string;
  kind: 'category' | 'service' | 'worker' | 'zone' | 'query';
  label: string;
  subtitle?: string;
  badge: string;
  categoryId?: string;
  slug?: string;
  zoneId?: string;
  workerId?: string;
}

interface ContextualSearchInputProps {
  id: string;
  value: string;
  onChange: (next: string) => void;
  onSelectSuggestion: (item: ContextualSuggestionItem) => void;
  placeholder?: string;
  variant?: 'default' | 'hero';
  categories?: CatalogCategory[];
  zones?: CatalogZone[];
  workers?: SearchWorkerCard[];
  activeCategoryId?: string;
  activeZoneId?: string;
  activeAvailability?: Availability | '';
  hideCategorySuggestions?: boolean;
}

const TRADE_EXAMPLES_BY_SLUG: Record<string, string[]> = {
  carpinteria: [
    'Muebles a medida',
    'Puertas de madera',
    'Closets y roperos',
    'Reparación de muebles',
  ],
  plomeria: [
    'Reparación de fugas',
    'Destape de drenajes',
    'Instalación de lavamanos',
    'Tubería y grifos',
  ],
  electricidad: [
    'Instalaciones eléctricas',
    'Cambio de breakers',
    'Cableado y tomas',
    'Revisión de fallas',
  ],
  albanileria: [
    'Levantado de muro',
    'Repello y cernido',
    'Colocación de piso',
    'Remodelación',
  ],
  herreria: [
    'Portones y balcones',
    'Soldadura a domicilio',
    'Estructuras metálicas',
    'Rejas de seguridad',
  ],
  jardineria: [
    'Chapeo y limpieza',
    'Poda de árboles',
    'Mantenimiento de jardín',
    'Siembra de grama',
  ],
  pintura: [
    'Pintura de interiores',
    'Pintura de fachada',
    'Impermeabilización',
    'Resanado de paredes',
  ],
  mecanica: [
    'Auxilio mecánico',
    'Frenos y suspensión',
    'Diagnóstico eléctrico',
    'Mantenimiento preventivo',
  ],
};

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function ContextualSearchInput({
  id,
  value,
  onChange,
  onSelectSuggestion,
  placeholder,
  variant = 'default',
  categories = [],
  zones = [],
  workers = [],
  activeCategoryId,
  activeZoneId,
  activeAvailability,
  hideCategorySuggestions = false,
}: ContextualSearchInputProps) {
  const listboxId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const trimmed = value.trim();
  const needle = normalizeText(trimmed);

  const activeCategory = categories.find((cat) => cat.id === activeCategoryId) ?? null;
  const activeZone = zones.find((zone) => zone.id === activeZoneId) ?? null;

  const remoteQuery = useQuery({
    queryKey: ['search', 'suggestions', trimmed, activeCategoryId ?? '', activeZoneId ?? ''],
    queryFn: () =>
      fetchSearchSuggestions(trimmed, {
        categoryId: activeCategoryId || undefined,
        zoneId: activeZoneId || undefined,
      }),
    enabled: open && trimmed.length >= 2,
    staleTime: 30_000,
  });

  const computedPlaceholder =
    placeholder ??
    (activeCategory && activeZone
      ? `Buscar en ${activeCategory.name} (${activeZone.name})…`
      : activeCategory
        ? `Buscar en ${activeCategory.name} (ej. ${
            TRADE_EXAMPLES_BY_SLUG[normalizeText(activeCategory.slug)]?.[0]?.toLowerCase() ??
            'reparación, instalación…'
          })`
        : activeZone
          ? `¿Qué oficio busca en ${activeZone.name}?`
          : 'Ej. plomero, electricista, muebles, fugas…');

  const contextHeader = (() => {
    const parts: string[] = [];
    if (activeCategory) parts.push(activeCategory.name);
    if (activeZone) parts.push(activeZone.name);
    if (activeAvailability === 'AVAILABLE') parts.push('Disponibles ahora');
    if (parts.length > 0) {
      return `Sugerencias para ${parts.join(' · ')}`;
    }
    return trimmed.length >= 2 ? 'Sugerencias del sistema' : 'Sugerencias según lo disponible';
  })();

  const suggestions: ContextualSuggestionItem[] = (() => {
    const items: ContextualSuggestionItem[] = [];
    const seen = new Set<string>();

    const pushUnique = (item: ContextualSuggestionItem) => {
      if (items.length >= 8) return;
      const dedupeKey = `${item.kind}:${normalizeText(item.label)}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      items.push(item);
    };

    // 1. Si hay categoría activa, sugerir trabajos frecuentes de ese oficio que coincidan.
    if (activeCategory) {
      const slugKey = normalizeText(activeCategory.slug);
      const examples = TRADE_EXAMPLES_BY_SLUG[slugKey] ?? [];
      for (const example of examples) {
        if (needle && !normalizeText(example).includes(needle)) continue;
        pushUnique({
          key: `example-${slugKey}-${example}`,
          kind: 'query',
          label: example,
          subtitle: `Búsqueda frecuente en ${activeCategory.name}`,
          badge: activeCategory.name,
        });
      }
    }

    // 2. Categorías del catálogo (cuando no está fija la categoría).
    if (!hideCategorySuggestions && !activeCategoryId) {
      for (const category of categories) {
        const slugKey = normalizeText(category.slug);
        const examples = TRADE_EXAMPLES_BY_SLUG[slugKey] ?? [];
        const matchesCategory =
          !needle ||
          normalizeText(category.name).includes(needle) ||
          examples.some((ex) => normalizeText(ex).includes(needle));
        if (!matchesCategory) continue;
        pushUnique({
          key: `cat-${category.id}`,
          kind: 'category',
          label: category.name,
          badge: 'Oficio',
          categoryId: category.id,
          slug: category.slug,
        });
        if (!needle && items.length >= 4) break;
      }
    }

    // 3. Sugerencias en vivo del backend cuando el usuario escribe >= 2 caracteres.
    if (trimmed.length >= 2 && remoteQuery.data) {
      for (const remote of remoteQuery.data) {
        if (remote.type === 'category') {
          if (hideCategorySuggestions || activeCategoryId) continue;
          const matchedCat = categories.find((c) => c.slug === remote.slug);
          pushUnique({
            key: `remote-cat-${remote.slug ?? remote.label}`,
            kind: 'category',
            label: remote.label,
            badge: 'Oficio',
            categoryId: remote.categoryId ?? matchedCat?.id,
            slug: remote.slug,
          });
        } else if (remote.type === 'service') {
          pushUnique({
            key: `remote-srv-${remote.workerId ?? ''}-${remote.label}`,
            kind: 'service',
            label: remote.label,
            subtitle: remote.subtitle ?? 'Servicio ofrecido',
            badge: 'Servicio',
            workerId: remote.workerId,
          });
        } else {
          pushUnique({
            key: `remote-wrk-${remote.workerId ?? remote.label}`,
            kind: 'worker',
            label: remote.label,
            subtitle: remote.subtitle ?? 'Trabajador verificado',
            badge: 'Trabajador',
            workerId: remote.workerId,
          });
        }
      }
    }

    // 4. Trabajadores cargados en el contexto actual (prioriza disponibles y filtra por categoría/zona).
    const contextualWorkers = workers.filter((worker) => {
      if (activeCategoryId && worker.mainCategory?.id !== activeCategoryId) return false;
      if (activeZoneId && !worker.zones.some((z) => z.id === activeZoneId)) return false;
      if (activeAvailability && worker.availability !== activeAvailability) return false;
      if (!needle) return true;
      const haystack = normalizeText(
        `${worker.headline} ${worker.name} ${worker.description} ${worker.mainCategory?.name ?? ''}`,
      );
      return haystack.includes(needle);
    });

    const sortedWorkers = [...contextualWorkers].sort((a, b) => {
      if (a.availability === 'AVAILABLE' && b.availability !== 'AVAILABLE') return -1;
      if (b.availability === 'AVAILABLE' && a.availability !== 'AVAILABLE') return 1;
      return b.ratingAverage - a.ratingAverage;
    });

    for (const worker of sortedWorkers.slice(0, 4)) {
      const zoneNames = worker.zones
        .map((z) => z.name)
        .slice(0, 2)
        .join(', ');
      const meta = [
        worker.name,
        worker.availability === 'AVAILABLE' ? 'Disponible' : null,
        zoneNames || null,
      ]
        .filter(Boolean)
        .join(' · ');
      pushUnique({
        key: `wrk-${worker.id}`,
        kind: 'worker',
        label: worker.headline,
        subtitle: meta,
        badge: worker.mainCategory?.name ?? 'Perfil',
        workerId: worker.id,
      });
    }

    // 5. Zonas que coinciden cuando el usuario busca por lugar o aún no eligió zona.
    if (!activeZoneId && zones.length > 0) {
      for (const zone of zones) {
        if (needle && !normalizeText(zone.name).includes(needle)) continue;
        if (!needle && items.length >= 7) break;
        pushUnique({
          key: `zone-${zone.id}`,
          kind: 'zone',
          label: zone.name,
          subtitle: 'Filtrar trabajadores en esta zona',
          badge: 'Zona',
          zoneId: zone.id,
        });
      }
    }

    return items;
  })();

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (!open || suggestions.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (event.key === 'Enter' && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
      event.preventDefault();
      const chosen = suggestions[highlightedIndex];
      setOpen(false);
      setHighlightedIndex(-1);
      onSelectSuggestion(chosen);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setHighlightedIndex(-1);
    }
  }

  function iconForKind(kind: ContextualSuggestionItem['kind']) {
    switch (kind) {
      case 'category':
        return <Briefcase aria-hidden className="h-4 w-4 shrink-0 text-accent" />;
      case 'service':
        return <Wrench aria-hidden className="h-4 w-4 shrink-0 text-[#1f6b4a]" />;
      case 'worker':
        return <UserCheck aria-hidden className="h-4 w-4 shrink-0 text-[#1f6b4a]" />;
      case 'zone':
        return <MapPin aria-hidden className="h-4 w-4 shrink-0 text-accent" />;
      case 'query':
        return <Sparkles aria-hidden className="h-4 w-4 shrink-0 text-accent" />;
    }
  }

  const showDropdown = open && (suggestions.length > 0 || remoteQuery.isFetching);

  return (
    <div
      ref={containerRef}
      className={cn('min-w-0 flex-1', variant === 'hero' ? 'static' : 'relative')}
      onBlur={(event) => {
        if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
          setHighlightedIndex(-1);
        }
      }}
    >
      {variant === 'hero' ? (
        <div className="flex min-w-0 flex-1 items-center gap-1.5 pl-2">
          <Search aria-hidden className="h-4 w-4 shrink-0 text-muted" />
          <Input
            id={id}
            type="search"
            role="combobox"
            aria-expanded={showDropdown}
            aria-controls={listboxId}
            aria-autocomplete="list"
            value={value}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              onChange(event.target.value);
              setOpen(true);
              setHighlightedIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            placeholder={computedPlaceholder}
            maxLength={100}
            enterKeyHint="search"
            autoComplete="off"
            className="h-9 border-0 bg-transparent px-0 text-sm text-foreground shadow-none focus-visible:border-transparent focus-visible:ring-0"
          />
        </div>
      ) : (
        <Input
          id={id}
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          value={value}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setHighlightedIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={computedPlaceholder}
          maxLength={100}
          enterKeyHint="search"
          autoComplete="off"
        />
      )}

      {showDropdown ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={contextHeader}
          className={cn(
            'absolute z-50 overflow-hidden rounded-2xl border border-border bg-surface text-foreground shadow-[0_14px_34px_rgba(22,32,51,0.16)]',
            variant === 'hero'
              ? 'left-0 right-0 top-[calc(100%+0.45rem)]'
              : 'left-0 right-0 top-[calc(100%+0.4rem)]',
          )}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-brand-soft/45 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Compass aria-hidden className="h-3.5 w-3.5 shrink-0 text-accent" />
              {contextHeader}
            </span>
            {remoteQuery.isFetching ? (
              <span className="text-[11px] font-normal normal-case text-muted">Buscando…</span>
            ) : null}
          </div>

          <ul className="max-h-72 divide-y divide-border/50 overflow-y-auto py-1">
            {suggestions.map((item, index) => {
              const active = index === highlightedIndex;
              return (
                <li key={item.key} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      // Evita perder el foco antes de ejecutar la selección.
                      event.preventDefault();
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => {
                      setOpen(false);
                      setHighlightedIndex(-1);
                      onSelectSuggestion(item);
                    }}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left transition',
                      active ? 'bg-accent-soft/80' : 'hover:bg-brand-soft/50',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {iconForKind(item.kind)}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                        {item.subtitle ? (
                          <p className="truncate text-xs text-muted">{item.subtitle}</p>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
                      {item.badge}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
