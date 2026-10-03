import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { shortName } from './dto/review.dto';
import { ReviewsService } from './reviews.service';

// Nota: Jest corre en modo ESM (NestJS 12 es ESM), por eso no se usa el global `jest`.

const CLIENT = '11111111-1111-4111-8111-111111111111';
const WORKER = '22222222-2222-4222-8222-222222222222';
const STRANGER = '33333333-3333-4333-8333-333333333333';
const REQUEST = '99999999-9999-4999-8999-999999999999';
const PROFILE = '44444444-4444-4444-8444-444444444444';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function buildService(options: { status?: string; confirmed?: boolean; reviews?: Row[] } = {}) {
  const state = {
    request: {
      id: REQUEST,
      clientId: CLIENT,
      workerId: WORKER,
      status: options.status ?? 'COMPLETED',
      clientConfirmedAt: options.confirmed === false ? null : new Date(1000),
    },
    reviews: options.reviews ?? ([] as Row[]),
    profile: {
      userId: WORKER,
      ratingAverage: 0,
      ratingCount: 0,
      completedJobs: 0,
      user: { status: 'ACTIVE' },
    },
    reports: [] as Row[],
  };

  const prisma = {
    serviceRequest: {
      findFirst: async ({ where }: { where: Row }) => {
        const userId = where.OR[0].clientId as string;
        const participant = userId === CLIENT || userId === WORKER;
        if (where.id !== REQUEST || !participant) return null;
        return {
          ...state.request,
          review: state.reviews[0] ? { id: state.reviews[0].id } : null,
          client: { name: 'Ana García López' },
          worker: { workerProfile: { id: PROFILE } },
        };
      },
      count: async () =>
        state.request.status === 'COMPLETED' && state.request.clientConfirmedAt ? 1 : 0,
    },
    review: {
      create: async ({ data }: { data: Row }) => {
        const review = {
          id: `r${state.reviews.length + 1}`,
          workerReply: null,
          repliedAt: null,
          createdAt: new Date(),
          client: { name: 'Ana García López' },
          ...data,
        };
        state.reviews.push(review);
        return review;
      },
      aggregate: async () => ({
        _avg: {
          rating: state.reviews.length
            ? state.reviews.reduce((s, r) => s + r.rating, 0) / state.reviews.length
            : null,
        },
        _count: { _all: state.reviews.length },
      }),
      findUnique: async ({ where }: { where: Row }) => {
        const review = state.reviews.find((r) => r.id === where.id);
        if (!review) return null;
        return {
          client: { name: 'Ana García López' },
          worker: { name: 'Juan Maestro', workerProfile: { id: PROFILE } },
          clientId: CLIENT,
          workerId: WORKER,
          requestId: REQUEST,
          ...review,
        };
      },
      findMany: async ({ take, skip, cursor }: { take: number; skip?: number; cursor?: Row }) => {
        const ordered = [...state.reviews].sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
        const start = cursor ? ordered.findIndex((r) => r.id === cursor.id) + (skip ?? 0) : 0;
        return ordered
          .slice(start, start + take)
          .map((r) => ({ client: { name: 'Ana García López' }, ...r }));
      },
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const review = state.reviews.find(
          (r) => r.id === where.id && r.workerReply === where.workerReply,
        );
        if (!review) return { count: 0 };
        Object.assign(review, data);
        return { count: 1 };
      },
    },
    workerProfile: {
      updateMany: async ({ data }: { data: Row }) => {
        Object.assign(state.profile, data);
        return { count: 1 };
      },
      findUnique: async () => ({ ...state.profile }),
    },
    report: {
      findFirst: async () => state.reports[0] ?? null,
      create: async ({ data }: { data: Row }) => {
        const report = { id: `rep${state.reports.length + 1}`, status: 'OPEN', ...data };
        state.reports.push(report);
        return { id: report.id, status: report.status };
      },
    },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(prisma),
  };

  return {
    service: new ReviewsService(
      prisma as unknown as PrismaService,
      {
        notify: async () => undefined,
      } as never,
    ),
    state,
  };
}

describe('ReviewsService', () => {
  describe('crear reseña', () => {
    it('no se puede calificar una solicitud que no está COMPLETED', async () => {
      for (const status of ['SENT', 'ACCEPTED', 'IN_PROGRESS', 'CANCELLED', 'REJECTED']) {
        const { service, state } = buildService({ status, confirmed: false });
        await expect(
          service.create(CLIENT, { requestId: REQUEST, rating: 5 }),
        ).rejects.toBeInstanceOf(BadRequestException);
        expect(state.reviews).toHaveLength(0);
      }
    });

    it('no se puede calificar si el cliente aún no confirmó (clientConfirmedAt nulo)', async () => {
      const { service, state } = buildService({ status: 'COMPLETED', confirmed: false });
      await expect(
        service.create(CLIENT, { requestId: REQUEST, rating: 4 }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(state.reviews).toHaveLength(0);
    });

    it('el trabajador no puede reseñarse a sí mismo (403) y un tercero no ve la solicitud (404)', async () => {
      const { service } = buildService();
      await expect(
        service.create(WORKER, { requestId: REQUEST, rating: 5 }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.create(STRANGER, { requestId: REQUEST, rating: 5 }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('crea la reseña y actualiza ratingAverage, ratingCount y completedJobs', async () => {
      const { service, state } = buildService();
      const review = await service.create(CLIENT, {
        requestId: REQUEST,
        rating: 4,
        comment: 'Muy buen trabajo',
      });
      expect(review).toMatchObject({
        rating: 4,
        comment: 'Muy buen trabajo',
        authorName: 'Ana G.',
      });
      expect(review).not.toHaveProperty('clientId');
      expect(state.profile).toMatchObject({ ratingAverage: 4, ratingCount: 1, completedJobs: 1 });
    });

    it('permite reseña sin comentario', async () => {
      const { service } = buildService();
      const review = await service.create(CLIENT, { requestId: REQUEST, rating: 5 });
      expect(review.comment).toBeNull();
    });

    it('solo una reseña por solicitud (409)', async () => {
      const { service, state } = buildService();
      await service.create(CLIENT, { requestId: REQUEST, rating: 5 });
      await expect(
        service.create(CLIENT, { requestId: REQUEST, rating: 1 }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(state.reviews).toHaveLength(1);
      expect(state.profile.ratingCount).toBe(1);
    });
  });

  describe('responder reseña', () => {
    it('el trabajador responde una vez; la segunda vez es 409', async () => {
      const { service } = buildService();
      const created = await service.create(CLIENT, { requestId: REQUEST, rating: 3 });
      const replied = await service.reply(WORKER, created.id, 'Gracias por tu comentario');
      expect(replied.workerReply).toBe('Gracias por tu comentario');
      await expect(service.reply(WORKER, created.id, 'Otra vez')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('solo el trabajador reseñado puede responder (403)', async () => {
      const { service } = buildService();
      const created = await service.create(CLIENT, { requestId: REQUEST, rating: 3 });
      await expect(service.reply(CLIENT, created.id, 'Me respondo solo')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(service.reply(STRANGER, created.id, 'Intruso')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('lista pública', () => {
    it('no expone ids ni datos privados del cliente', async () => {
      const { service } = buildService();
      await service.create(CLIENT, { requestId: REQUEST, rating: 5, comment: 'Excelente' });
      const page = await service.listForWorker(PROFILE, {});
      expect(page.ratingCount).toBe(1);
      expect(page.items).toHaveLength(1);
      expect(Object.keys(page.items[0] ?? {}).sort()).toEqual(
        ['authorName', 'comment', 'createdAt', 'id', 'rating', 'repliedAt', 'workerReply'].sort(),
      );
      expect(page.nextCursor).toBeNull();
    });

    it('pagina con cursor', async () => {
      const reviews = [1, 2, 3].map((n) => ({
        id: `r${n}`,
        rating: 5,
        comment: null,
        workerReply: null,
        repliedAt: null,
        createdAt: new Date(n * 1000),
      }));
      const { service } = buildService({ reviews });
      const first = await service.listForWorker(PROFILE, { limit: 2 });
      expect(first.items.map((r) => r.id)).toEqual(['r3', 'r2']);
      expect(first.nextCursor).toBe('r2');
      const second = await service.listForWorker(PROFILE, {
        limit: 2,
        cursor: first.nextCursor ?? undefined,
      });
      expect(second.items.map((r) => r.id)).toEqual(['r1']);
      expect(second.nextCursor).toBeNull();
    });
  });

  describe('reportar', () => {
    it('crea un reporte abierto y no duplica el mismo reporte', async () => {
      const { service, state } = buildService();
      const created = await service.create(CLIENT, { requestId: REQUEST, rating: 1 });
      const first = await service.report(
        WORKER,
        created.id,
        'Reseña falsa, nunca trabajé para esta persona',
      );
      const again = await service.report(
        WORKER,
        created.id,
        'Reseña falsa, nunca trabajé para esta persona',
      );
      expect(first.id).toBe(again.id);
      expect(state.reports).toHaveLength(1);
    });

    it('reseña inexistente -> 404', async () => {
      const { service } = buildService();
      await expect(
        service.report(WORKER, 'nope', 'Motivo suficientemente largo'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('shortName', () => {
    it('abrevia el nombre', () => {
      expect(shortName('Ana García López')).toBe('Ana G.');
      expect(shortName('  María ')).toBe('María');
      expect(shortName('')).toBe('Cliente');
    });
  });
});
