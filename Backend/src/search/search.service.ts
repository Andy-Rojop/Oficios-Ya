import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { SEARCH_DEFAULT_LIMIT } from './dto/search-workers-query.dto';
import type { SearchWorkersQueryDto } from './dto/search-workers-query.dto';
import {
  SearchWorkerCardDto,
  type SearchSuggestionDto,
  type SearchWorkersResponseDto,
} from './dto/search-response.dto';
import {
  VERIFIED_ACTIVE_USER,
  applyCursor,
  buildSearchWhere,
  decodeCursor,
  encodeCursor,
  resolveSort,
  sortCandidates,
} from './search-query.util';

/**
 * Tope de candidatos que se ordenan en memoria. Es una búsqueda local (una comunidad), así que
 * el volumen es bajo; el tope protege la base de datos si crece.
 */
const MAX_CANDIDATES = 1000;
const MAX_SUGGESTIONS = 8;
const MAX_CATEGORY_SUGGESTIONS = 4;
const MIN_SUGGESTION_LENGTH = 2;

/** Solo lo necesario para ordenar: sin descripción, sin datos privados. */
const CANDIDATE_SELECT = {
  id: true,
  ratingAverage: true,
  ratingCount: true,
  createdAt: true,
  zones: { select: { zone: { select: { latitude: true, longitude: true } } } },
  services: { where: { active: true }, select: { priceMode: true, priceAmount: true } },
} satisfies Prisma.WorkerProfileSelect;

/** Select explícito de la tarjeta pública: dpi, nit, passwordHash y teléfono NO se leen. */
const CARD_SELECT = {
  id: true,
  headline: true,
  description: true,
  availability: true,
  ratingAverage: true,
  ratingCount: true,
  user: { select: { name: true } },
  mainCategory: { select: { id: true, name: true, slug: true } },
  zones: {
    select: { zone: { select: { id: true, name: true, latitude: true, longitude: true } } },
    orderBy: { zone: { name: 'asc' } },
  },
  services: {
    where: { active: true },
    select: { priceMode: true, priceAmount: true, priceUnit: true, photos: true },
    orderBy: { createdAt: 'desc' },
  },
  portfolioItems: {
    select: { imagePath: true },
    orderBy: { createdAt: 'desc' },
    take: 1,
  },
} satisfies Prisma.WorkerProfileSelect;

@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** RF-029 a RF-035: búsqueda combinada de trabajadores con paginación por cursor. */
  async searchWorkers(query: SearchWorkersQueryDto): Promise<SearchWorkersResponseDto> {
    if (
      query.priceMin !== undefined &&
      query.priceMax !== undefined &&
      query.priceMin > query.priceMax
    ) {
      throw new BadRequestException('El precio mínimo no puede ser mayor al precio máximo');
    }

    const limit = query.limit ?? SEARCH_DEFAULT_LIMIT;
    const sort = resolveSort(query);
    const coords =
      query.lat !== undefined && query.lng !== undefined
        ? { lat: query.lat, lng: query.lng }
        : null;
    const cursor = query.cursor ? decodeCursor(query.cursor, sort) : null;

    const candidates = await this.prisma.workerProfile.findMany({
      where: buildSearchWhere(query),
      select: CANDIDATE_SELECT,
      orderBy: [{ ratingAverage: 'desc' }, { ratingCount: 'desc' }, { id: 'asc' }],
      take: MAX_CANDIDATES,
    });

    const remaining = applyCursor(sortCandidates(candidates, sort, coords), cursor, sort);
    const hasMore = remaining.length > limit;
    const page = remaining.slice(0, limit);

    let items: SearchWorkerCardDto[] = [];
    if (page.length > 0) {
      const rows = await this.prisma.workerProfile.findMany({
        where: { id: { in: page.map((entry) => entry.id) }, user: VERIFIED_ACTIVE_USER },
        select: CARD_SELECT,
      });
      const byId = new Map(rows.map((row) => [row.id, row]));
      items = page.flatMap((entry) => {
        const row = byId.get(entry.id);
        if (!row) return [];
        return [
          SearchWorkerCardDto.fromEntity(
            row,
            (path) => this.storage.getPublicUrl(path),
            entry.distanceKm === null ? null : Math.round(entry.distanceKm * 10) / 10,
          ),
        ];
      });
    }

    const last = page[page.length - 1];
    return {
      items,
      nextCursor:
        hasMore && last ? encodeCursor({ s: sort, v: last.sortValue, id: last.id }) : null,
    };
  }

  /** Hasta 8 sugerencias: categorías activas y titulares de trabajadores verificados. */
  async suggestions(rawQuery: string | undefined): Promise<SearchSuggestionDto[]> {
    const q = rawQuery?.trim() ?? '';
    if (q.length < MIN_SUGGESTION_LENGTH) return [];
    const contains = { contains: q, mode: 'insensitive' as const };

    const [categories, profiles] = await Promise.all([
      this.prisma.category.findMany({
        where: { active: true, name: contains },
        select: { name: true, slug: true },
        orderBy: { name: 'asc' },
        take: MAX_CATEGORY_SUGGESTIONS,
      }),
      this.prisma.workerProfile.findMany({
        where: { user: VERIFIED_ACTIVE_USER, headline: contains },
        select: { id: true, headline: true },
        orderBy: [{ ratingAverage: 'desc' }, { ratingCount: 'desc' }, { id: 'asc' }],
        take: MAX_SUGGESTIONS * 2,
      }),
    ]);

    const result: SearchSuggestionDto[] = categories.map((category) => ({
      type: 'category',
      label: category.name,
      slug: category.slug,
    }));
    const seen = new Set(result.map((item) => item.label.toLowerCase()));
    for (const profile of profiles) {
      if (result.length >= MAX_SUGGESTIONS) break;
      const key = profile.headline.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ type: 'worker', label: profile.headline, workerId: profile.id });
    }
    return result;
  }
}
