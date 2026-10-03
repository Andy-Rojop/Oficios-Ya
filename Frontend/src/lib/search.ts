import {
  PriceMode as SharedPriceMode,
  PriceUnit as SharedPriceUnit,
  formatReferencePrice,
} from '@/lib/shared';
import { apiFetch } from './api-client';
import type { Availability, PriceMode, PriceUnit } from './workers';

/**
 * Búsqueda pública (RF-029 a RF-036). Sin directiva 'use client': las funciones sirven tanto en
 * componentes de servidor (SSR) como en el navegador.
 */

export const SEARCH_SORTS = ['rating', 'near', 'price', 'recent'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export const SORT_LABELS: Record<SearchSort, string> = {
  rating: 'Mejor calificados',
  near: 'Más cercanos',
  price: 'Menor precio',
  recent: 'Más recientes',
};

export const SEARCH_PAGE_SIZE = 20;

export interface SearchZone {
  id: string;
  name: string;
  /** Centro aproximado de la zona (nunca una dirección exacta). */
  lat: number | null;
  lng: number | null;
}

export interface SearchWorkerCard {
  id: string;
  name: string;
  headline: string;
  description: string;
  ratingAverage: number;
  ratingCount: number;
  availability: Availability;
  mainCategory: { id: string; name: string; slug: string } | null;
  zones: SearchZone[];
  /** Servicio activo FIXED/FROM más barato; null si solo hay servicios a convenir. */
  price: { mode: Exclude<PriceMode, 'NEGOTIABLE'>; amount: number; unit: PriceUnit } | null;
  negotiable: boolean;
  photoUrl: string | null;
  distanceKm: number | null;
}

export interface SearchWorkersResponse {
  items: SearchWorkerCard[];
  nextCursor: string | null;
}

export interface SearchSuggestion {
  type: 'category' | 'worker';
  label: string;
  slug?: string;
  workerId?: string;
}

/** Filtros de búsqueda tal como viajan en la URL de /buscar y en la API. */
export interface SearchFilters {
  q?: string;
  categoryId?: string;
  zoneId?: string;
  minRating?: number;
  availability?: Availability;
  priceMin?: number;
  priceMax?: number;
  sort?: SearchSort;
  lat?: number;
  lng?: number;
}

export interface SearchParamsInput extends SearchFilters {
  cursor?: string;
  limit?: number;
}

type RawSearchParams = Record<string, string | string[] | undefined>;

const AVAILABILITIES: readonly Availability[] = ['AVAILABLE', 'BUSY', 'UNAVAILABLE'];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function first(value: string | string[] | undefined): string | undefined {
  const single = Array.isArray(value) ? value[0] : value;
  const trimmed = single?.trim();
  return trimmed ? trimmed : undefined;
}

function toNumber(value: string | undefined, min: number, max: number): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) return undefined;
  return parsed;
}

/** Lee los searchParams de la URL de forma tolerante: valores inválidos se ignoran. */
export function parseSearchFilters(raw: RawSearchParams): SearchFilters {
  const categoryId = first(raw.categoryId);
  const zoneId = first(raw.zoneId);
  const availability = first(raw.availability) as Availability | undefined;
  const sort = first(raw.sort) as SearchSort | undefined;
  const filters: SearchFilters = {
    q: first(raw.q)?.slice(0, 100),
    categoryId: categoryId && UUID_REGEX.test(categoryId) ? categoryId : undefined,
    zoneId: zoneId && UUID_REGEX.test(zoneId) ? zoneId : undefined,
    minRating: toNumber(first(raw.minRating), 0, 5),
    availability: availability && AVAILABILITIES.includes(availability) ? availability : undefined,
    priceMin: toNumber(first(raw.priceMin), 0, 1_000_000),
    priceMax: toNumber(first(raw.priceMax), 0, 1_000_000),
    sort: sort && (SEARCH_SORTS as readonly string[]).includes(sort) ? sort : undefined,
    lat: toNumber(first(raw.lat), -90, 90),
    lng: toNumber(first(raw.lng), -180, 180),
  };
  if (filters.lat === undefined || filters.lng === undefined) {
    delete filters.lat;
    delete filters.lng;
  }
  return filters;
}

/** Convierte filtros a URLSearchParams omitiendo vacíos (la API rechaza claves desconocidas). */
export function toSearchParams(input: SearchParamsInput): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  return params;
}

export function fetchSearchWorkers(
  input: SearchParamsInput,
  init?: RequestInit,
): Promise<SearchWorkersResponse> {
  const query = toSearchParams({ limit: SEARCH_PAGE_SIZE, ...input }).toString();
  return apiFetch<SearchWorkersResponse>(`/search/workers?${query}`, init);
}

export function fetchSearchSuggestions(q: string, init?: RequestInit): Promise<SearchSuggestion[]> {
  return apiFetch<SearchSuggestion[]>(
    `/search/suggestions?${toSearchParams({ q }).toString()}`,
    init,
  );
}

/** Catálogo público sin React Query: usable desde componentes de servidor. */
export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
}
export interface CatalogZone {
  id: string;
  name: string;
  type: string;
}

export function fetchCatalogCategories(init?: RequestInit): Promise<CatalogCategory[]> {
  return apiFetch<CatalogCategory[]>('/catalog/categories', init);
}

export function fetchCatalogZones(init?: RequestInit): Promise<CatalogZone[]> {
  return apiFetch<CatalogZone[]>('/catalog/zones', init);
}

/** "Desde Q150 por visita", "Q90 por trabajo" o "A convenir". */
export function formatCardPrice(card: Pick<SearchWorkerCard, 'price' | 'negotiable'>): string {
  if (card.price) {
    return formatReferencePrice(
      SharedPriceMode[card.price.mode],
      card.price.amount,
      SharedPriceUnit[card.price.unit],
    );
  }
  return formatReferencePrice(SharedPriceMode.NEGOTIABLE, null);
}
