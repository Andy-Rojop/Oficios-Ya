'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutGrid, MapPin, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  ContextualSearchInput,
  type ContextualSuggestionItem,
} from '@/components/search/contextual-search-input';
import { parseValidPrice, sanitizeMoneyInput } from '@/lib/numeric-input';
import {
  SEARCH_SORTS,
  SORT_LABELS,
  toSearchParams,
  type CatalogCategory,
  type CatalogZone,
  type SearchFilters,
  type SearchSort,
  type SearchWorkerCard,
} from '@/lib/search';
import type { Availability } from '@/lib/workers';
import { cn } from '@/lib/utils';

interface SearchFiltersFormProps {
  /** Ruta que se renderiza al aplicar: /buscar o /categorias/[slug]. */
  basePath: string;
  filters: SearchFilters;
  categories: CatalogCategory[];
  zones: CatalogZone[];
  workers?: SearchWorkerCard[];
  /** En /categorias/[slug] la categoría ya viene fija en la ruta. */
  hideCategory?: boolean;
  /** Controles compactos del prototipo de /buscar. */
  appearance?: 'default' | 'discovery';
  resultCount?: number;
  hasMore?: boolean;
}

const RATING_OPTIONS = [
  { value: '', label: 'Cualquiera' },
  { value: '3', label: '3 estrellas o más' },
  { value: '4', label: '4 estrellas o más' },
  { value: '4.5', label: '4.5 estrellas o más' },
];

/** Redondeo a ~1 km: la ubicación del visitante solo se usa para ordenar por cercanía. */
function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

export function SearchFiltersForm({
  basePath,
  filters,
  categories,
  zones,
  workers = [],
  hideCategory = false,
  appearance = 'default',
  resultCount = 0,
  hasMore = false,
}: SearchFiltersFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(filters.q ?? '');
  const [categoryId, setCategoryId] = useState(filters.categoryId ?? '');
  const [zoneId, setZoneId] = useState(filters.zoneId ?? '');
  const [minRating, setMinRating] = useState(
    filters.minRating !== undefined ? String(filters.minRating) : '',
  );
  const [availability, setAvailability] = useState(filters.availability ?? '');
  const [priceMin, setPriceMin] = useState(
    filters.priceMin !== undefined ? String(filters.priceMin) : '',
  );
  const [priceMax, setPriceMax] = useState(
    filters.priceMax !== undefined ? String(filters.priceMax) : '',
  );
  const [sort, setSort] = useState<SearchSort>(filters.sort ?? 'rating');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    filters.lat !== undefined && filters.lng !== undefined
      ? { lat: filters.lat, lng: filters.lng }
      : null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [browseBy, setBrowseBy] = useState<'category' | 'location'>('category');

  // El mapa escribe disponibilidad, orden y coordenadas en la URL. Se ajustan en el render
  // para que "Aplicar filtros" no borre el punto que acaba de elegir.
  const urlKey = `${filters.sort ?? ''}|${filters.lat ?? ''}|${filters.lng ?? ''}`;
  const [syncedKey, setSyncedKey] = useState(urlKey);
  if (syncedKey !== urlKey) {
    setSyncedKey(urlKey);
    setSort(filters.sort ?? 'rating');
    setCoords(
      filters.lat !== undefined && filters.lng !== undefined
        ? { lat: filters.lat, lng: filters.lng }
        : null,
    );
  }

  function apply(
    overrides: Partial<{
      q: string;
      categoryId: string;
      zoneId: string;
      sort: SearchSort;
      coords: { lat: number; lng: number } | null;
    }> = {},
  ) {
    const nextQ = overrides.q !== undefined ? overrides.q : q;
    const nextCategoryId = overrides.categoryId !== undefined ? overrides.categoryId : categoryId;
    const nextZoneId = overrides.zoneId !== undefined ? overrides.zoneId : zoneId;
    const nextSort = overrides.sort ?? sort;
    const nextCoords = overrides.coords === undefined ? coords : overrides.coords;
    const parsedMin = priceMin ? parseValidPrice(priceMin, { allowZero: true }) : null;
    const parsedMax = priceMax ? parseValidPrice(priceMax, { allowZero: true }) : null;
    const params = toSearchParams({
      q: nextQ.trim(),
      categoryId: hideCategory ? undefined : nextCategoryId,
      zoneId: nextZoneId,
      minRating: minRating ? Number(minRating) : undefined,
      availability: (availability || undefined) as Availability | undefined,
      priceMin: parsedMin ?? undefined,
      priceMax: parsedMax ?? undefined,
      sort: nextSort === 'rating' ? undefined : nextSort,
      lat: nextSort === 'near' ? nextCoords?.lat : undefined,
      lng: nextSort === 'near' ? nextCoords?.lng : undefined,
    });
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${basePath}?${query}` : basePath);
    });
  }

  function handleSelectSuggestion(item: ContextualSuggestionItem) {
    setMessage(null);
    if (item.kind === 'category' && item.categoryId && !hideCategory) {
      setCategoryId(item.categoryId);
      setQ('');
      apply({ q: '', categoryId: item.categoryId });
      return;
    }
    if (item.kind === 'zone' && item.zoneId) {
      setZoneId(item.zoneId);
      apply({ zoneId: item.zoneId });
      return;
    }
    setQ(item.label);
    apply({ q: item.label });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    if (priceMin && parseValidPrice(priceMin, { allowZero: true }) === null) {
      setMessage('Ingrese un precio mínimo válido (máximo 2 decimales).');
      return;
    }
    if (priceMax && parseValidPrice(priceMax, { allowZero: true }) === null) {
      setMessage('Ingrese un precio máximo válido (máximo 2 decimales).');
      return;
    }
    if (priceMin && priceMax && Number(priceMin) > Number(priceMax)) {
      setMessage('El precio mínimo no puede ser mayor al máximo.');
      return;
    }
    apply();
  }

  function onSortChange(next: SearchSort) {
    setMessage(null);
    setSort(next);
    if (next !== 'near' || coords) {
      apply({ sort: next });
      return;
    }
    if (!('geolocation' in navigator)) {
      setSort('rating');
      setMessage('Su navegador no permite obtener la ubicación.');
      return;
    }
    setMessage('Buscando su ubicación…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const found = {
          lat: roundCoord(position.coords.latitude),
          lng: roundCoord(position.coords.longitude),
        };
        setCoords(found);
        setMessage(null);
        apply({ sort: 'near', coords: found });
      },
      () => {
        setSort('rating');
        setMessage('No pudimos obtener su ubicación. Active el permiso para ordenar por cercanía.');
      },
      { timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  }

  function clearAll() {
    setQ('');
    setCategoryId('');
    setZoneId('');
    setMinRating('');
    setAvailability('');
    setPriceMin('');
    setPriceMax('');
    setSort('rating');
    setCoords(null);
    setMessage(null);
    startTransition(() => router.push(basePath));
  }

  if (appearance === 'discovery') {
    const chipClass = (active: boolean) =>
      cn(
        'shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition',
        active ? 'bg-accent text-white' : 'bg-white text-[#344054] shadow-sm ring-1 ring-[#e6e8ee]',
      );

    return (
      <form onSubmit={onSubmit} className="space-y-3.5 px-5 pb-4 pt-5" aria-busy={pending}>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1B2A4A]">Encuentra Talentos Cerca</h1>
          <p className="mt-0.5 text-sm text-[#667085]">Personas de tu comunidad, listas para ayudarte.</p>
        </div>

        <Label htmlFor="filter-q" className="sr-only">
          ¿Qué necesitas resolver?
        </Label>
        <ContextualSearchInput
          id="filter-q"
          value={q}
          onChange={setQ}
          onSelectSuggestion={handleSelectSuggestion}
          placeholder="¿Qué necesitas resolver?"
          categories={categories}
          zones={zones}
          workers={workers}
          activeCategoryId={categoryId || filters.categoryId}
          activeZoneId={zoneId || filters.zoneId}
          hideCategorySuggestions={hideCategory}
        />

        <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:items-center">
          <div className="min-w-0 flex-1">
            <Label htmlFor="filter-zone" className="sr-only">
              Zona
            </Label>
            <Select
              id="filter-zone"
              value={zoneId}
              className="h-11 rounded-full bg-white text-sm"
              onChange={(event) => {
                const next = event.target.value;
                setZoneId(next);
                apply({ zoneId: next });
              }}
            >
              <option value="">Retalhuleu, Guatemala</option>
              {zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </Select>
          </div>
          <button
            type="button"
            onClick={() => onSortChange('near')}
            disabled={pending}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-white px-4 text-sm font-semibold text-[#1B2A4A] shadow-sm ring-1 ring-[#e6e8ee]"
          >
            <MapPin className="h-4 w-4 text-accent" aria-hidden />
            Buscar en esta zona
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-full bg-[#eef1f4] p-1">
          <button
            type="button"
            onClick={() => setBrowseBy('category')}
            className={cn(
              'inline-flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-semibold',
              browseBy === 'category' ? 'bg-white text-[#1B2A4A] shadow-sm' : 'text-[#667085]',
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            Por categoría
          </button>
          <button
            type="button"
            onClick={() => setBrowseBy('location')}
            className={cn(
              'inline-flex h-10 items-center justify-center gap-1.5 rounded-full text-sm font-semibold',
              browseBy === 'location' ? 'bg-white text-[#1B2A4A] shadow-sm' : 'text-[#667085]',
            )}
          >
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            Por ubicación
          </button>
        </div>

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {browseBy === 'category' && !hideCategory ? (
            <>
              <button type="button" className={chipClass(!categoryId)} onClick={() => { setCategoryId(''); apply({ categoryId: '' }); }}>
                Todos
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={cn(chipClass(categoryId === category.id), 'shrink-0')}
                  onClick={() => {
                    setCategoryId(category.id);
                    apply({ categoryId: category.id });
                  }}
                >
                  {category.name}
                </button>
              ))}
            </>
          ) : (
            <>
              <button type="button" className={chipClass(!zoneId)} onClick={() => { setZoneId(''); apply({ zoneId: '' }); }}>
                Todas
              </button>
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  type="button"
                  className={cn(chipClass(zoneId === zone.id), 'shrink-0')}
                  onClick={() => {
                    setZoneId(zone.id);
                    apply({ zoneId: zone.id });
                  }}
                >
                  {zone.name}
                </button>
              ))}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-[#667085]">
            {resultCount}
            {hasMore ? '+' : ''} talento{resultCount === 1 ? '' : 's'} cerca de ti
          </p>
          <div className="w-36 shrink-0">
            <Select
              aria-label="Ordenar por"
              value={sort}
              className="h-8 rounded-full border-0 bg-transparent px-2 text-xs font-semibold shadow-none"
              onChange={(event) => onSortChange(event.target.value as SearchSort)}
            >
              <option value="rating">Recomendados</option>
              {SEARCH_SORTS.filter((value) => value !== 'rating').map((value) => (
                <option key={value} value={value}>
                  {SORT_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#667085]"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          {open ? 'Ocultar filtros' : 'Más filtros'}
        </button>

        {open ? (
          <div className="grid gap-2">
            <Select aria-label="Calificación" value={minRating} onChange={(event) => setMinRating(event.target.value)}>
              {RATING_OPTIONS.map((option) => (
                <option key={option.value || 'any'} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select aria-label="Disponibilidad" value={availability} onChange={(event) => setAvailability(event.target.value)}>
              <option value="">Todas</option>
              <option value="AVAILABLE">Disponibles</option>
              <option value="BUSY">Ocupados</option>
              <option value="UNAVAILABLE">No disponibles</option>
            </Select>
            <div className="flex gap-2">
              <Input
                aria-label="Precio mínimo en quetzales"
                inputMode="decimal"
                placeholder="Mín. Q"
                value={priceMin}
                onChange={(event) => setPriceMin(sanitizeMoneyInput(event.target.value))}
              />
              <Input
                aria-label="Precio máximo en quetzales"
                inputMode="decimal"
                placeholder="Máx. Q"
                value={priceMax}
                onChange={(event) => setPriceMax(sanitizeMoneyInput(event.target.value))}
              />
            </div>
            <Button type="submit" variant="accent" disabled={pending} className="h-10 rounded-xl">
              Aplicar filtros
            </Button>
          </div>
        ) : null}

        {message ? (
          <p role="status" className="text-sm text-muted">
            {message}
          </p>
        ) : null}
      </form>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:p-5"
      aria-busy={pending}
    >
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Label htmlFor="filter-q" className="sr-only">
            ¿Qué oficio necesita?
          </Label>
          <ContextualSearchInput
            id="filter-q"
            value={q}
            onChange={setQ}
            onSelectSuggestion={handleSelectSuggestion}
            categories={categories}
            zones={zones}
            workers={workers}
            activeCategoryId={categoryId || filters.categoryId}
            activeZoneId={zoneId || filters.zoneId}
            hideCategorySuggestions={hideCategory}
          />
        </div>
        <Button type="submit" variant="accent" disabled={pending}>
          Buscar
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 lg:hidden">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-expanded={open}
          aria-controls="filter-panel"
          onClick={() => setOpen((value) => !value)}
        >
          <SlidersHorizontal aria-hidden className="h-4 w-4" />
          {open ? 'Ocultar filtros' : 'Más filtros'}
        </Button>
      </div>

      <div
        id="filter-panel"
        className={`${open ? 'grid' : 'hidden'} gap-3 sm:grid-cols-2 lg:grid lg:grid-cols-4`}
      >
        {hideCategory ? null : (
          <div className="space-y-1">
            <Label htmlFor="filter-category">Categoría</Label>
            <Select
              id="filter-category"
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">Todas</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="filter-zone">Zona</Label>
          <Select
            id="filter-zone"
            value={zoneId}
            onChange={(event) => setZoneId(event.target.value)}
          >
            <option value="">Todas</option>
            {zones.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="filter-rating">Calificación</Label>
          <Select
            id="filter-rating"
            value={minRating}
            onChange={(event) => setMinRating(event.target.value)}
          >
            {RATING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="filter-availability">Disponibilidad</Label>
          <Select
            id="filter-availability"
            value={availability}
            onChange={(event) => setAvailability(event.target.value)}
          >
            <option value="">Todas</option>
            <option value="AVAILABLE">Disponibles</option>
            <option value="BUSY">Ocupados</option>
            <option value="UNAVAILABLE">No disponibles</option>
          </Select>
        </div>

        <fieldset className="space-y-1 sm:col-span-2">
          <legend className="text-sm font-medium">Precio de referencia (Q)</legend>
          <div className="flex items-center gap-2">
            <Input
              aria-label="Precio mínimo en quetzales"
              inputMode="decimal"
              type="text"
              maxLength={8}
              placeholder="Mín."
              value={priceMin}
              onChange={(event) => setPriceMin(sanitizeMoneyInput(event.target.value))}
            />
            <span aria-hidden className="text-muted">
              a
            </span>
            <Input
              aria-label="Precio máximo en quetzales"
              inputMode="decimal"
              type="text"
              maxLength={8}
              placeholder="Máx."
              value={priceMax}
              onChange={(event) => setPriceMax(sanitizeMoneyInput(event.target.value))}
            />
          </div>
          <p className="text-xs text-muted">
            Los servicios &quot;A convenir&quot; siempre se muestran.
          </p>
        </fieldset>

        <div className="space-y-1 sm:col-span-2">
          <Label htmlFor="filter-sort">Ordenar por</Label>
          <Select
            id="filter-sort"
            value={sort}
            onChange={(event) => onSortChange(event.target.value as SearchSort)}
          >
            {SEARCH_SORTS.map((value) => (
              <option key={value} value={value}>
                {SORT_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {message ? (
        <p role="status" className="text-sm text-muted">
          {message}
        </p>
      ) : null}

      <div
        className={cn(
          'flex flex-wrap gap-2',
          open &&
            'sticky bottom-[var(--bottom-nav-h)] z-10 -mx-4 border-t border-border bg-surface px-4 py-3 shadow-[0_-6px_16px_rgba(26,35,50,0.06)] md:bottom-3 lg:static lg:z-auto lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none',
        )}
      >
        <Button type="submit" variant="accent" disabled={pending} className="min-h-11 flex-1 sm:flex-none">
          Aplicar filtros
        </Button>
        <Button type="button" variant="ghost" onClick={clearAll} disabled={pending} className="min-h-11">
          Limpiar
        </Button>
      </div>
    </form>
  );
}
