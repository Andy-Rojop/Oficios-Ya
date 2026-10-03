import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { ConversationAccessService } from './conversation-access.service';

// Nota: Jest corre en modo ESM (NestJS 12 es ESM), por eso no se usa el global `jest`.

const CLIENT = 'user-client';
const WORKER = 'user-worker';
const STRANGER = 'user-stranger';
const CONVERSATION = { id: 'conv-1', clientId: CLIENT, workerId: WORKER };

interface FakeBlock {
  blockerId: string;
  blockedId: string;
}

function buildService(blocks: FakeBlock[] = [], conversationExists = true) {
  const prisma = {
    conversation: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        conversationExists && where.id === CONVERSATION.id ? { ...CONVERSATION } : null,
    },
    block: {
      findFirst: async ({ where }: { where: { OR: FakeBlock[] } }) => {
        const found = blocks.find((block) =>
          where.OR.some((c) => c.blockerId === block.blockerId && c.blockedId === block.blockedId),
        );
        return found ? { id: 'block-1' } : null;
      },
    },
  } as unknown as PrismaService;
  return new ConversationAccessService(prisma);
}

describe('ConversationAccessService', () => {
  describe('getForParticipant', () => {
    it('permite al cliente y al trabajador de la conversación', async () => {
      const service = buildService();
      await expect(service.getForParticipant('conv-1', CLIENT)).resolves.toMatchObject({
        id: 'conv-1',
      });
      await expect(service.getForParticipant('conv-1', WORKER)).resolves.toMatchObject({
        id: 'conv-1',
      });
    });

    it('rechaza (404) a quien no participa, sin revelar que la conversación existe', async () => {
      const service = buildService();
      await expect(service.getForParticipant('conv-1', STRANGER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('responde igual (404) si la conversación no existe', async () => {
      const service = buildService([], false);
      await expect(service.getForParticipant('conv-1', CLIENT)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('bloqueos', () => {
    it('sin bloqueo: se puede enviar', async () => {
      const service = buildService();
      await expect(service.getForSending('conv-1', CLIENT)).resolves.toMatchObject({
        id: 'conv-1',
      });
    });

    it('el cliente bloqueó al trabajador: ninguno puede enviar', async () => {
      const service = buildService([{ blockerId: CLIENT, blockedId: WORKER }]);
      await expect(service.getForSending('conv-1', CLIENT)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(service.getForSending('conv-1', WORKER)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('el trabajador bloqueó al cliente: ninguno puede enviar', async () => {
      const service = buildService([{ blockerId: WORKER, blockedId: CLIENT }]);
      await expect(service.getForSending('conv-1', CLIENT)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      await expect(service.getForSending('conv-1', WORKER)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('un bloqueo ajeno a la pareja no afecta', async () => {
      const service = buildService([{ blockerId: STRANGER, blockedId: WORKER }]);
      await expect(service.getForSending('conv-1', CLIENT)).resolves.toMatchObject({
        id: 'conv-1',
      });
    });

    it('un no participante no puede enviar aunque no haya bloqueo (404)', async () => {
      const service = buildService();
      await expect(service.getForSending('conv-1', STRANGER)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  it('otherParticipantId devuelve a la otra persona', () => {
    const service = buildService();
    expect(service.otherParticipantId(CONVERSATION, CLIENT)).toBe(WORKER);
    expect(service.otherParticipantId(CONVERSATION, WORKER)).toBe(CLIENT);
  });
});
