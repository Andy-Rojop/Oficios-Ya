import { BadRequestException } from '@nestjs/common';
import { AccountStatus, PriceMode } from '../generated/prisma/enums';
import type { Prisma } from '../generated/prisma/client';
import type { DecimalLike } from '../workers/dto/worker-profile-response.dto';
import { decimalToNumber } from '../workers/dto/worker-profile-response.dto';
import type { SearchSort, SearchWorkersQueryDto } from './dto/search-workers-query.dto';

/** Máximo de palabras que se usan de `q` (cada una debe aparecer en algún campo). */
const MAX_TERMS = 5;
/** Sentinela para "sin precio" / "sin coordenadas": van al final en orden ascendente. */
export const SORT_LAST = 1e12;
const EARTH_RADIUS_KM = 6371;

// --- WHERE ----------------------------------------------------------------------------------

/** Condición base de visibilidad: teléfono verificado y cuenta activa (RF-017 / RF-029). */
export const VERIFIED_ACTIVE_USER = {
  phoneVerifiedAt: { not: null },
  status: AccountStatus.ACTIVE,
} satisfies Prisma.UserWhereInput;

export function splitTerms(q: string | undefined): string[] {
  if (!q) return [];
  return q
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0)
    .slice(0, MAX_TERMS);
}

/**
 * Construye el `where` de Prisma. Siempre incluye el filtro de teléfono verificado + cuenta activa;
 * el resto de filtros se combinan con AND.
 *
 * Precio: un trabajador coincide si tiene un servicio activo FIXED/FROM dentro del rango o un servicio
 * activo "A convenir" (que se muestra siempre, identificado como tal en la tarjeta).
 */
export function buildSearchWhere(query: SearchWorkersQueryDto): Prisma.WorkerProfileWhereInput {
  const and: Prisma.WorkerProfileWhereInput[] = [];

  if (query.categoryId) {
    and.push({
      OR: [
        { mainCategoryId: query.categoryId },
        { services: { some: { active: true, categoryId: query.categoryId } } },
      ],
    });
  }

  if (query.zoneId) {
    and.push({ zones: { some: { zoneId: query.zoneId } } });
  }

  if (query.minRating !== undefined && query.minRating > 0) {
    and.push({ ratingAverage: { gte: query.minRating } });
  }

  if (query.availability) {
    and.push({ availability: query.availability });
  }

  if (query.priceMin !== undefined || query.priceMax !== undefined) {
    const amount: Prisma.DecimalFilter = {};
    if (query.priceMin !== undefined) amount.gte = query.priceMin;
    if (query.priceMax !== undefined) amount.lte = query.priceMax;
    and.push({
      services: {
        some: {
          active: true,
          OR: [
            { priceMode: PriceMode.NEGOTIABLE },
            { priceMode: { in: [PriceMode.FIXED, PriceMode.FROM] }, priceAmount: amount },
          ],
        },
      },
    });
  }

  for (const term of splitTerms(query.q)) {
    const contains = { contains: term, mode: 'insensitive' as const };
    and.push({
      OR: [
        { headline: contains },
        { description: contains },
        { mainCategory: { name: contains } },
        { services: { some: { active: true, name: contains } } },
      ],
    });
  }

  return { user: VERIFIED_ACTIVE_USER, AND: and };
}

// --- Orden en memoria + cursor --------------------------------------------------------------

export interface CandidateRow {
  id: string;
  ratingAverage: DecimalLike;
  ratingCount: number;
  createdAt: Date;
  zones: { zone: { latitude: DecimalLike | null; longitude: DecimalLike | null } }[];
  services: { priceMode: PriceMode; priceAmount: DecimalLike | null }[];
}

export interface SortedCandidate {
  id: string;
  sortValue: number;
  distanceKm: number | null;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** "near" sin coordenadas no tiene sentido: se usa calificación. */
export function resolveSort(
  query: Pick<SearchWorkersQueryDto, 'sort' | 'lat' | 'lng'>,
): SearchSort {
  const sort = query.sort ?? 'rating';
  if (sort === 'near' && (query.lat === undefined || query.lng === undefined)) return 'rating';
  return sort;
}

/** Dirección de cada orden: true = descendente. */
export function isDescending(sort: SearchSort): boolean {
  return sort === 'rating' || sort === 'recent';
}

export function minReferencePrice(services: CandidateRow['services']): number | null {
  let min: number | null = null;
  for (const service of services) {
    if (service.priceMode === PriceMode.NEGOTIABLE || service.priceAmount === null) continue;
    const amount = decimalToNumber(service.priceAmount);
    if (!(amount > 0)) continue;
    if (min === null || amount < min) min = amount;
  }
  return min;
}

export function nearestDistanceKm(
  zones: CandidateRow['zones'],
  lat: number,
  lng: number,
): number | null {
  let best: number | null = null;
  for (const { zone } of zones) {
    if (zone.latitude === null || zone.longitude === null) continue;
    const distance = haversineKm(
      lat,
      lng,
      decimalToNumber(zone.latitude),
      decimalToNumber(zone.longitude),
    );
    if (best === null || distance < best) best = distance;
  }
  return best;
}

export function computeSortValue(
  row: CandidateRow,
  sort: SearchSort,
  coords: { lat: number; lng: number } | null,
): { sortValue: number; distanceKm: number | null } {
  switch (sort) {
    case 'rating': {
      // Promedio (2 decimales) y, a igualdad, más reseñas primero.
      const average = Math.round(decimalToNumber(row.ratingAverage) * 100);
      return {
        sortValue: average * 1_000_000 + Math.min(row.ratingCount, 999_999),
        distanceKm: null,
      };
    }
    case 'recent':
      return { sortValue: row.createdAt.getTime(), distanceKm: null };
    case 'price':
      return { sortValue: minReferencePrice(row.services) ?? SORT_LAST, distanceKm: null };
    case 'near': {
      const distance = coords ? nearestDistanceKm(row.zones, coords.lat, coords.lng) : null;
      return { sortValue: distance === null ? SORT_LAST : distance, distanceKm: distance };
    }
  }
}

/** Orden total: valor de orden y, a igualdad, id ascendente (estable entre páginas). */
export function compareSorted(
  a: Pick<SortedCandidate, 'id' | 'sortValue'>,
  b: Pick<SortedCandidate, 'id' | 'sortValue'>,
  descending: boolean,
): number {
  if (a.sortValue !== b.sortValue) {
    return descending ? b.sortValue - a.sortValue : a.sortValue - b.sortValue;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function sortCandidates(
  rows: CandidateRow[],
  sort: SearchSort,
  coords: { lat: number; lng: number } | null,
): SortedCandidate[] {
  const descending = isDescending(sort);
  return rows
    .map((row) => ({ id: row.id, ...computeSortValue(row, sort, coords) }))
    .sort((a, b) => compareSorted(a, b, descending));
}

// --- Cursor opaco ---------------------------------------------------------------------------

export interface SearchCursor {
  /** Orden con el que se generó (si cambia, el cursor deja de ser válido). */
  s: SearchSort;
  /** Valor de orden del último elemento de la página. */
  v: number;
  /** Id del último elemento de la página. */
  id: string;
}

export function encodeCursor(cursor: SearchCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string, expectedSort: SearchSort): SearchCursor {
  const invalid = () => new BadRequestException('El cursor de paginación no es válido');
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null) throw invalid();
    const { s, v, id } = parsed as Record<string, unknown>;
    if (
      typeof id !== 'string' ||
      typeof v !== 'number' ||
      !Number.isFinite(v) ||
      s !== expectedSort
    ) {
      throw invalid();
    }
    return { s: expectedSort, v, id };
  } catch (error) {
    throw error instanceof BadRequestException ? error : invalid();
  }
}

/** Elementos que vienen estrictamente después del cursor en el orden total. */
export function applyCursor(
  sorted: SortedCandidate[],
  cursor: SearchCursor | null,
  sort: SearchSort,
): SortedCandidate[] {
  if (!cursor) return sorted;
  const descending = isDescending(sort);
  return sorted.filter(
    (item) => compareSorted(item, { id: cursor.id, sortValue: cursor.v }, descending) > 0,
  );
}
