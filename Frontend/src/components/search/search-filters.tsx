'use client';

import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  SEARCH_SORTS,
  SORT_LABELS,
  toSearchParams,
  type CatalogCategory,
  type CatalogZone,
  type SearchFilters,
  type SearchSort,
} from '@/lib/search';
import { AVAILABILITY_LABELS, type Availability } from '@/lib/workers';

interface SearchFiltersFormProps {
  /** Ruta que se renderiza al aplicar: /buscar o /categorias/[slug]. */
  basePath: string;
  filters: SearchFilters;
  categories: CatalogCategory[];
  zones: CatalogZone[];
  /** En /categorias/[slug] la categoría ya viene fija en la ruta. */
  hideCategory?: boolean;
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
  hideCategory = false,
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
  const [availability, setAvailability] = useState<Availability | ''>(filters.availability ?? '');
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

  function apply(
    overrides: Partial<{ sort: SearchSort; coords: { lat: number; lng: number } | null }> = {},
  ) {
    const nextSort = overrides.sort ?? sort;
    const nextCoords = overrides.coords === undefined ? coords : overrides.coords;
    const params = toSearchParams({
      q: q.trim(),
      categoryId: hideCategory ? undefined : categoryId,
      zoneId,
      minRating: minRating ? Number(minRating) : undefined,
      availability: availability || undefined,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      sort: nextSort === 'rating' ? undefined : nextSort,
      lat: nextSort === 'near' ? nextCoords?.lat : undefined,
      lng: nextSort === 'near' ? nextCoords?.lng : undefined,
    });
    const query = params.toString();
    startTransition(() => {
      router.push(query ? `${basePath}?${query}` : basePath);
    });
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
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
      setMessage('Tu navegador no permite obtener la ubicación.');
      return;
    }
    setMessage('Buscando tu ubicación…');
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
        setMessage('No pudimos obtener tu ubicación. Activá el permiso para ordenar por cercanía.');
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

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5"
      aria-busy={pending}
    >
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Label htmlFor="filter-q" className="sr-only">
            ¿Qué oficio necesitás?
          </Label>
          <Input
            id="filter-q"
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Ej. plomero, electricista, jardinería…"
            maxLength={100}
            enterKeyHint="search"
          />
        </div>
        <Button type="submit" disabled={pending}>
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
            onChange={(event) => setAvailability(event.target.value as Availability | '')}
          >
            <option value="">Cualquiera</option>
            {(Object.keys(AVAILABILITY_LABELS) as Availability[]).map((value) => (
              <option key={value} value={value}>
                {AVAILABILITY_LABELS[value]}
              </option>
            ))}
          </Select>
        </div>

        <fieldset className="space-y-1 sm:col-span-2">
          <legend className="text-sm font-medium">Precio de referencia (Q)</legend>
          <div className="flex items-center gap-2">
            <Input
              aria-label="Precio mínimo en quetzales"
              inputMode="decimal"
              type="number"
              min={0}
              step="any"
              placeholder="Mín."
              value={priceMin}
              onChange={(event) => setPriceMin(event.target.value)}
            />
            <span aria-hidden className="text-muted">
              a
            </span>
            <Input
              aria-label="Precio máximo en quetzales"
              inputMode="decimal"
              type="number"
              min={0}
              step="any"
              placeholder="Máx."
              value={priceMax}
              onChange={(event) => setPriceMax(event.target.value)}
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

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="default" size="sm" disabled={pending}>
          Aplicar filtros
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={clearAll} disabled={pending}>
          Limpiar
        </Button>
      </div>
    </form>
  );
}
