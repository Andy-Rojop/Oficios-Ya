import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ConversationAccessService } from '../chat/conversation-access.service';
import type { PrismaService } from '../prisma/prisma.service';
import { RequestsService } from './requests.service';

// Nota: Jest corre en modo ESM (NestJS 12 es ESM), por eso no se usa el global `jest`.

const CLIENT = '11111111-1111-4111-8111-111111111111';
const WORKER = '22222222-2222-4222-8222-222222222222';
const STRANGER = '33333333-3333-4333-8333-333333333333';
const REQUEST = '99999999-9999-4999-8999-999999999999';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function buildRow(overrides: Row = {}): Row {
  return {
    id: REQUEST,
    clientId: CLIENT,
    workerId: WORKER,
    description: 'Necesito arreglar una tubería',
    desiredDate: null,
    urgent: false,
    status: 'SENT',
    clientConfirmedAt: null,
    createdAt: new Date(1000),
    updatedAt: new Date(1000),
    client: { id: CLIENT, name: 'Ana Cliente' },
    worker: { id: WORKER, name: 'Juan Maestro', workerProfile: { id: 'p1', headline: 'Plomero' } },
    service: null,
    conversation: { id: 'c1' },
    review: null,
    quotes: [
      {
        id: 'q1',
        requestId: REQUEST,
        conversationId: 'c1',
        amount: 150,
        scope: 'Mano de obra',
        status: 'SENT',
        createdAt: new Date(2000),
      },
    ],
    ...overrides,
  };
}

function buildService(initial: Row = buildRow()) {
  const state = { request: initial, statsUpdates: [] as Row[] };

  const isParticipant = (userId: string) =>
    state.request.clientId === userId || state.request.workerId === userId;

  const prisma = {
    serviceRequest: {
      findFirst: async ({ where }: { where: Row }) =>
        where.id === state.request.id && isParticipant(where.OR[0].clientId)
          ? { ...state.request }
          : null,
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const r = state.request;
        const ok =
          r.id === where.id &&
          (where.status === undefined || r.status === where.status) &&
          (where.clientConfirmedAt !== null || r.clientConfirmedAt === null);
        if (!ok) return { count: 0 };
        Object.assign(r, data);
        return { count: 1 };
      },
      count: async () =>
        state.request.status === 'COMPLETED' && state.request.clientConfirmedAt ? 1 : 0,
    },
    workerProfile: {
      updateMany: async ({ data }: { data: Row }) => {
        state.statsUpdates.push(data);
        return { count: 1 };
      },
    },
    conversation: { findFirst: async () => ({ id: 'c1', requestId: null }) },
    $transaction: async (fn: (tx: unknown) => unknown) => fn(prisma),
  };

  const service = new RequestsService(
    prisma as unknown as PrismaService,
    {} as unknown as ConversationAccessService,
    { notify: async () => undefined } as never,
  );
  return { service, state };
}

describe('RequestsService', () => {
  describe('permisos de acceso (solo participantes)', () => {
    it('un tercero no puede ver el detalle de la solicitud (404)', async () => {
      const { service } = buildService();
      await expect(service.getOne(STRANGER, REQUEST)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('un tercero no puede cambiar el estado (404)', async () => {
      const { service, state } = buildService();
      await expect(
        service.changeStatus(STRANGER, REQUEST, { status: 'ACCEPTED' as never }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(state.request.status).toBe('SENT');
    });

    it('cliente y trabajador sí ven el detalle, con su rol y acciones', async () => {
      const { service } = buildService();
      const asClient = await service.getOne(CLIENT, REQUEST);
      expect(asClient.myRole).toBe('CLIENT');
      expect(asClient.actions.statuses).toEqual(['CANCELLED']);
      expect(asClient.quotes).toHaveLength(1);

      const asWorker = await service.getOne(WORKER, REQUEST);
      expect(asWorker.myRole).toBe('WORKER');
      expect(asWorker.actions.statuses.sort()).toEqual(['ACCEPTED', 'REJECTED']);
      expect(asWorker.actions.canQuote).toBe(true);
    });
  });

  describe('transiciones de estado', () => {
    it('rechaza una transición inválida (SENT -> COMPLETED) con 409', async () => {
      const { service, state } = buildService();
      await expect(
        service.changeStatus(WORKER, REQUEST, { status: 'COMPLETED' as never }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(state.request.status).toBe('SENT');
    });

    it('rechaza con 403 si el rol no corresponde (el cliente no puede aceptar)', async () => {
      const { service, state } = buildService();
      await expect(
        service.changeStatus(CLIENT, REQUEST, { status: 'ACCEPTED' as never }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(state.request.status).toBe('SENT');
    });

    it('flujo completo: aceptar, iniciar, finalizar (trabajador) y confirmar (cliente)', async () => {
      const { service, state } = buildService();
      await service.changeStatus(WORKER, REQUEST, { status: 'ACCEPTED' as never });
      await service.changeStatus(WORKER, REQUEST, { status: 'IN_PROGRESS' as never });

      const done = await service.changeStatus(WORKER, REQUEST, { status: 'COMPLETED' as never });
      expect(done.status).toBe('COMPLETED');
      expect(done.clientConfirmedAt).toBeNull();
      expect(state.statsUpdates).toHaveLength(0);

      // El trabajador no puede confirmar por el cliente.
      await expect(service.confirmCompletion(WORKER, REQUEST)).rejects.toBeInstanceOf(
        ForbiddenException,
      );

      const confirmed = await service.confirmCompletion(CLIENT, REQUEST);
      expect(confirmed.clientConfirmedAt).not.toBeNull();
      expect(confirmed.actions.canReview).toBe(true);
      expect(state.statsUpdates).toEqual([{ completedJobs: 1 }]);

      await expect(service.confirmCompletion(CLIENT, REQUEST)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('si el cliente finaliza desde IN_PROGRESS, queda confirmado en el mismo paso', async () => {
      const { service, state } = buildService(buildRow({ status: 'IN_PROGRESS' }));
      const result = await service.changeStatus(CLIENT, REQUEST, { status: 'COMPLETED' as never });
      expect(result.status).toBe('COMPLETED');
      expect(result.clientConfirmedAt).not.toBeNull();
      expect(state.statsUpdates).toEqual([{ completedJobs: 1 }]);
    });

    it('no se puede confirmar si el trabajo no está finalizado', async () => {
      const { service } = buildService(buildRow({ status: 'IN_PROGRESS' }));
      await expect(service.confirmCompletion(CLIENT, REQUEST)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('permite cancelar en estados tempranos y bloquea cancelar un trabajo en curso', async () => {
      const early = buildService(buildRow({ status: 'ACCEPTED' }));
      const cancelled = await early.service.changeStatus(WORKER, REQUEST, {
        status: 'CANCELLED' as never,
      });
      expect(cancelled.status).toBe('CANCELLED');

      const running = buildService(buildRow({ status: 'IN_PROGRESS' }));
      await expect(
        running.service.changeStatus(CLIENT, REQUEST, { status: 'CANCELLED' as never }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
