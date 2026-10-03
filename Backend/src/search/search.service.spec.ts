import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { StorageService } from '../storage/storage.service';
import { SearchService } from './search.service';

// Nota: Jest corre en modo ESM (NestJS 12 es ESM), por eso no se usa el global `jest`.

type FindManyArgs = {
  where: Record<string, unknown>;
  select: Record<string, unknown>;
  take?: number;
};

const toNum = (value: number) => ({ toNumber: () => value });

interface FakeProfile {
  id: string;
  rating: number;
  count: number;
  createdAt: Date;
  minPrice: number | null;
}

function candidate(profile: FakeProfile) {
  return {
    id: profile.id,
    ratingAverage: toNum(profile.rating),
    ratingCount: profile.count,
    createdAt: profile.createdAt,
    zones: [],
    services:
      profile.minPrice === null
        ? [{ priceMode: 'NEGOTIABLE', priceAmount: null }]
        : [{ priceMode: 'FIXED', priceAmount: toNum(profile.minPrice) }],
  };
}

function card(profile: FakeProfile) {
  return {
    id: profile.id,
    headline: `Oficio ${profile.id}`,
    description: 'Descripción',
    availability: 'AVAILABLE',
    ratingAverage: toNum(profile.rating),
    ratingCount: profile.count,
    user: { name: 'Nombre' },
    mainCategory: null,
    zones: [],
    services: [],
    portfolioItems: [],
    // Una fila "sucia", como si la base devolviera de más: no debe filtrarse a la respuesta.
    dpi: '1234567890101',
    nit: '1234567-8',
  };
}

function setup(profiles: FakeProfile[]) {
  const calls: FindManyArgs[] = [];
  const prisma = {
    workerProfile: {
      findMany: (args: FindManyArgs) => {
        calls.push(args);
        // 1ª llamada = candidatos (tienen "take"); 2ª = tarjetas de la página.
        if (args.take !== undefined) return Promise.resolve(profiles.map(candidate));
        const ids = (args.where.id as { in: string[] }).in;
        return Promise.resolve(profiles.filter((p) => ids.includes(p.id)).map(card));
      },
    },
    category: { findMany: () => Promise.resolve([{ name: 'Carpintería', slug: 'carpinteria' }]) },
  } as unknown as PrismaService;
  const storage = {
    getPublicUrl: (path: string) => `https://cdn.test/${path}`,
  } as unknown as StorageService;
  return { service: new SearchService(prisma, storage), calls };
}

const PROFILES: FakeProfile[] = [
  { id: 'a', rating: 4, count: 3, createdAt: new Date('2026-01-01'), minPrice: 200 },
  { id: 'b', rating: 5, count: 1, createdAt: new Date('2026-03-01'), minPrice: null },
  { id: 'c', rating: 5, count: 9, createdAt: new Date('2026-02-01'), minPrice: 100 },
];

describe('SearchService.searchWorkers', () => {
  it('excluye teléfonos no verificados y cuentas inactivas en ambas consultas', async () => {
    const { service, calls } = setup(PROFILES);
    await service.searchWorkers({});

    expect(calls.length).toBeGreaterThanOrEqual(2);
    for (const call of calls) {
      expect(call.where.user).toEqual({ phoneVerifiedAt: { not: null }, status: 'ACTIVE' });
    }
  });

  it('ordena por calificación (promedio y luego cantidad de reseñas) por defecto', async () => {
    const { service } = setup(PROFILES);
    const result = await service.searchWorkers({});
    expect(result.items.map((item) => item.id)).toEqual(['c', 'b', 'a']);
    expect(result.nextCursor).toBeNull();
  });

  it('ordena por precio ascendente y deja a convenir al final', async () => {
    const { service } = setup(PROFILES);
    const result = await service.searchWorkers({ sort: 'price' });
    expect(result.items.map((item) => item.id)).toEqual(['c', 'a', 'b']);
  });

  it('ordena por más recientes', async () => {
    const { service } = setup(PROFILES);
    const result = await service.searchWorkers({ sort: 'recent' });
    expect(result.items.map((item) => item.id)).toEqual(['b', 'c', 'a']);
  });

  it('pagina con cursor sin repetir ni saltar elementos', async () => {
    const { service } = setup(PROFILES);
    const first = await service.searchWorkers({ limit: 2 });
    expect(first.items.map((item) => item.id)).toEqual(['c', 'b']);
    expect(first.nextCursor).toEqual(expect.any(String));

    const second = await service.searchWorkers({ limit: 2, cursor: first.nextCursor ?? undefined });
    expect(second.items.map((item) => item.id)).toEqual(['a']);
    expect(second.nextCursor).toBeNull();
  });

  it('rechaza un cursor inválido o de otro orden', async () => {
    const { service } = setup(PROFILES);
    await expect(service.searchWorkers({ cursor: 'no-es-un-cursor' })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    const first = await service.searchWorkers({ limit: 1, sort: 'recent' });
    await expect(
      service.searchWorkers({ limit: 1, sort: 'price', cursor: first.nextCursor ?? undefined }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza priceMin mayor que priceMax', async () => {
    const { service } = setup(PROFILES);
    await expect(service.searchWorkers({ priceMin: 500, priceMax: 100 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('la respuesta nunca incluye dpi, nit ni teléfono', async () => {
    const { service } = setup(PROFILES);
    const result = await service.searchWorkers({});
    const json = JSON.stringify(result);
    expect(json).not.toContain('dpi');
    expect(json).not.toContain('nit"');
    expect(json).not.toContain('1234567890101');
  });
});

describe('SearchService.suggestions', () => {
  it('devuelve vacío con menos de 2 caracteres', async () => {
    const { service } = setup([]);
    await expect(service.suggestions('a')).resolves.toEqual([]);
    await expect(service.suggestions(undefined)).resolves.toEqual([]);
  });
});
