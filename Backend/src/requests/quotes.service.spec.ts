import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { QuotesService } from './quotes.service';

// Nota: Jest corre en modo ESM (NestJS 12 es ESM), por eso no se usa el global `jest`.

const CLIENT = '11111111-1111-4111-8111-111111111111';
const WORKER = '22222222-2222-4222-8222-222222222222';
const STRANGER = '33333333-3333-4333-8333-333333333333';
const REQUEST = '99999999-9999-4999-8999-999999999999';
const CONV = '88888888-8888-4888-8888-888888888888';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function buildService(options: { requestStatus?: string; quotes?: Row[] } = {}) {
  const request = {
    id: REQUEST,
    clientId: CLIENT,
    workerId: WORKER,
    status: options.requestStatus ?? 'SENT',
  };
  const state = {
    quotes: options.quotes ?? [
      {
        id: 'q1',
        requestId: REQUEST,
        conversationId: CONV,
        amount: 250,
        scope: 'Cambio de tubería',
        status: 'SENT',
        createdAt: new Date(1000),
      },
    ],
  };

  const prisma = {
    serviceRequest: {
      findFirst: async ({ where }: { where: Row }) => {
        const userId = where.OR[0].clientId as string;
        const participant = userId === CLIENT || userId === WORKER;
        return where.id === REQUEST && participant ? { ...request } : null;
      },
    },
    conversation: {
      findFirst: async () => ({ id: CONV, requestId: REQUEST }),
    },
    quote: {
      findFirst: async ({ where }: { where: Row }) =>
        state.quotes.find((q) => q.requestId === where.requestId && q.status === where.status) ??
        null,
      findMany: async ({ where }: { where: Row }) =>
        state.quotes.filter((q) => q.requestId === where.requestId),
      findUnique: async ({ where }: { where: Row }) => {
        const quote = state.quotes.find((q) => q.id === where.id);
        return quote
          ? {
              ...quote,
              request: { ...request },
              conversation: { clientId: CLIENT, workerId: WORKER },
            }
          : null;
      },
      create: async ({ data }: { data: Row }) => {
        const quote = {
          id: `q${state.quotes.length + 1}`,
          status: 'SENT',
          createdAt: new Date(),
          ...data,
        };
        state.quotes.push(quote);
        return quote;
      },
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const quote = state.quotes.find((q) => q.id === where.id && q.status === where.status);
        if (!quote) return { count: 0 };
        Object.assign(quote, data);
        return { count: 1 };
      },
    },
  };

  return { service: new QuotesService(prisma as unknown as PrismaService), state };
}

describe('QuotesService', () => {
  describe('privacidad: las cotizaciones son privadas', () => {
    it('un tercero no puede listar las cotizaciones de la solicitud (404)', async () => {
      const { service } = buildService();
      await expect(service.listForRequest(STRANGER, REQUEST)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('un tercero no puede enviar una cotización (404)', async () => {
      const { service, state } = buildService({ quotes: [] });
      await expect(
        service.createForRequest(STRANGER, REQUEST, { amount: 100, scope: 'Cotización ajena' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(state.quotes).toHaveLength(0);
    });

    it('un tercero no puede aceptar ni rechazar una cotización (404, sin revelar que existe)', async () => {
      const { service, state } = buildService();
      await expect(service.respond(STRANGER, 'q1', { status: 'ACCEPTED' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(state.quotes[0]?.status).toBe('SENT');
    });

    it('el cliente y el trabajador sí ven las cotizaciones', async () => {
      const { service } = buildService();
      const asClient = await service.listForRequest(CLIENT, REQUEST);
      const asWorker = await service.listForRequest(WORKER, REQUEST);
      expect(asClient).toHaveLength(1);
      expect(asWorker).toHaveLength(1);
      expect(asClient[0]).toMatchObject({
        amount: 250,
        scope: 'Cambio de tubería',
        status: 'SENT',
      });
    });
  });

  describe('envío (trabajador)', () => {
    it('el trabajador envía una cotización ligada a la solicitud y a su conversación', async () => {
      const { service, state } = buildService({ quotes: [] });
      const quote = await service.createForRequest(WORKER, REQUEST, {
        amount: 300.5,
        scope: 'Mano de obra y materiales',
      });
      expect(quote).toMatchObject({
        requestId: REQUEST,
        conversationId: CONV,
        amount: 300.5,
        status: 'SENT',
      });
      expect(state.quotes).toHaveLength(1);
    });

    it('el cliente no puede cotizarse a sí mismo (403)', async () => {
      const { service } = buildService({ quotes: [] });
      await expect(
        service.createForRequest(CLIENT, REQUEST, { amount: 100, scope: 'Cotización del cliente' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('no permite una segunda cotización mientras haya una pendiente (409)', async () => {
      const { service } = buildService();
      await expect(
        service.createForRequest(WORKER, REQUEST, { amount: 100, scope: 'Otra cotización' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('no permite cotizar una solicitud cerrada (409)', async () => {
      const { service } = buildService({ requestStatus: 'COMPLETED', quotes: [] });
      await expect(
        service.createForRequest(WORKER, REQUEST, { amount: 100, scope: 'Fuera de tiempo' }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('respuesta (cliente)', () => {
    it('el cliente acepta la cotización', async () => {
      const { service, state } = buildService();
      const result = await service.respond(CLIENT, 'q1', { status: 'ACCEPTED' });
      expect(result.status).toBe('ACCEPTED');
      expect(state.quotes[0]?.status).toBe('ACCEPTED');
    });

    it('el trabajador no puede responder su propia cotización (403)', async () => {
      const { service, state } = buildService();
      await expect(service.respond(WORKER, 'q1', { status: 'ACCEPTED' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(state.quotes[0]?.status).toBe('SENT');
    });

    it('una cotización respondida no se puede volver a responder (409)', async () => {
      const { service } = buildService();
      await service.respond(CLIENT, 'q1', { status: 'REJECTED' });
      await expect(service.respond(CLIENT, 'q1', { status: 'ACCEPTED' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('no se responde una cotización de una solicitud ya cerrada (409)', async () => {
      const { service } = buildService({ requestStatus: 'CANCELLED' });
      await expect(service.respond(CLIENT, 'q1', { status: 'ACCEPTED' })).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });
});
