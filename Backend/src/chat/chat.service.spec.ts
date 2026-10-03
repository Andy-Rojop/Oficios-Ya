import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import type { StorageService } from '../storage/storage.service';
import { ChatRealtimeService } from './chat-realtime.service';
import { ChatService, chatImagePrefix } from './chat.service';
import { ConversationAccessService } from './conversation-access.service';

// Nota: Jest corre en modo ESM (NestJS 12 es ESM), por eso no se usa el global `jest`.

const CLIENT = '11111111-1111-4111-8111-111111111111';
const WORKER = '22222222-2222-4222-8222-222222222222';
const STRANGER = '33333333-3333-4333-8333-333333333333';
const CONV = '99999999-9999-4999-8999-999999999999';
const PROFILE = '44444444-4444-4444-8444-444444444444';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Evaluador mínimo de `where` de Prisma (igualdad, not, in, OR) para el fake en memoria. */
function matches(row: Row, where: Row | undefined): boolean {
  if (!where) return true;
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'OR') return (cond as Row[]).some((c) => matches(row, c));
    const value = row[key];
    if (cond !== null && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('not' in cond) {
        return cond.not === null ? value !== null && value !== undefined : value !== cond.not;
      }
      if ('in' in cond) return (cond.in as unknown[]).includes(value);
    }
    if (cond === null) return value === null || value === undefined;
    return value === cond;
  });
}

interface Fixture {
  blocks?: Row[];
  messages?: Row[];
  reports?: Row[];
  conversations?: Row[];
}

function buildFixture(fixture: Fixture = {}) {
  const state = {
    conversations: fixture.conversations ?? [
      {
        id: CONV,
        clientId: CLIENT,
        workerId: WORKER,
        lastMessageAt: null,
        createdAt: new Date(1000),
      },
    ],
    messages: fixture.messages ?? [],
    blocks: fixture.blocks ?? [],
    reports: fixture.reports ?? [],
    seq: 0,
  };
  const calls = { messageFindMany: 0, messageCreate: 0, uploads: 0, signs: 0 };
  const users: Record<string, Row> = {
    [CLIENT]: { id: CLIENT, name: 'Ana Cliente' },
    [WORKER]: {
      id: WORKER,
      name: 'Juan Maestro',
      workerProfile: { id: PROFILE, headline: 'Carpintero' },
    },
  };

  const hydrate = (c: Row) => ({
    ...c,
    client: users[c.clientId] ?? { id: c.clientId, name: 'X' },
    worker: users[c.workerId] ?? { id: c.workerId, name: 'Y', workerProfile: null },
    messages: state.messages
      .filter((m) => m.conversationId === c.id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 1),
  });

  const prisma = {
    workerProfile: {
      findFirst: async ({ where }: { where: Row }) => {
        if (where.id === PROFILE || where.userId === WORKER) {
          return { userId: WORKER, user: { status: 'ACTIVE' } };
        }
        return null;
      },
    },
    conversation: {
      findUnique: async ({ where }: { where: Row }) =>
        state.conversations.find((c) => c.id === where.id) ?? null,
      findFirst: async ({ where, select }: { where: Row; select?: Row }) => {
        const found = state.conversations.find((c) => matches(c, where));
        if (!found) return null;
        return select?.client ? hydrate(found) : { id: found.id };
      },
      findMany: async ({ where }: { where: Row }) =>
        state.conversations.filter((c) => matches(c, where)).map(hydrate),
      create: async ({ data }: { data: Row }) => {
        const created = {
          id: `conv-${++state.seq}`,
          lastMessageAt: null,
          createdAt: new Date(),
          ...data,
        };
        state.conversations.push(created);
        return { id: created.id };
      },
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const found = state.conversations.find((c) => c.id === where.id) as Row;
        Object.assign(found, data);
        return { id: found.id };
      },
    },
    message: {
      create: async ({ data }: { data: Row }) => {
        calls.messageCreate++;
        const created = {
          id: `00000000-0000-4000-8000-${String(++state.seq).padStart(12, '0')}`,
          readAt: null,
          imagePath: null,
          latitude: null,
          longitude: null,
          ...data,
        };
        state.messages.push(created);
        return created;
      },
      findFirst: async ({ where }: { where: Row }) =>
        state.messages.find((m) => matches(m, where)) ?? null,
      findMany: async ({
        where,
        take,
        cursor,
        skip,
      }: {
        where: Row;
        take: number;
        cursor?: Row;
        skip?: number;
      }) => {
        calls.messageFindMany++;
        const sorted = state.messages
          .filter((m) => matches(m, where))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1));
        const start = cursor ? sorted.findIndex((m) => m.id === cursor.id) + (skip ?? 0) : 0;
        return sorted.slice(start, start + take);
      },
      updateMany: async ({ where, data }: { where: Row; data: Row }) => {
        const targets = state.messages.filter((m) => matches(m, where));
        targets.forEach((m) => Object.assign(m, data));
        return { count: targets.length };
      },
      groupBy: async ({ where }: { where: Row }) => {
        const counts = new Map<string, number>();
        state.messages
          .filter((m) => matches(m, where))
          .forEach((m) => counts.set(m.conversationId, (counts.get(m.conversationId) ?? 0) + 1));
        return [...counts].map(([conversationId, n]) => ({ conversationId, _count: { _all: n } }));
      },
    },
    block: {
      findFirst: async ({ where }: { where: Row }) => {
        const found = state.blocks.find((b) => matches(b, where));
        return found ? { id: 'block' } : null;
      },
      findMany: async ({ where }: { where: Row }) => state.blocks.filter((b) => matches(b, where)),
      upsert: async ({ create }: { create: Row }) => {
        if (
          !state.blocks.some(
            (b) => b.blockerId === create.blockerId && b.blockedId === create.blockedId,
          )
        ) {
          state.blocks.push({ ...create });
        }
        return create;
      },
      deleteMany: async ({ where }: { where: Row }) => {
        state.blocks = state.blocks.filter((b) => !matches(b, where));
        return { count: 0 };
      },
    },
    report: {
      findFirst: async ({ where }: { where: Row }) =>
        state.reports.find((r) => matches(r, where)) ?? null,
      create: async ({ data }: { data: Row }) => {
        const created = { id: `report-${++state.seq}`, status: 'OPEN', ...data };
        state.reports.push(created);
        return created;
      },
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  } as unknown as PrismaService;

  const storage = {
    uploadPrivate: async (_buffer: Buffer, path: string) => {
      calls.uploads++;
      return path;
    },
    getSignedUrl: async (path: string) => {
      calls.signs++;
      return `https://signed.test/${path}?token=abc`;
    },
    deleteObjectSilently: async () => undefined,
  } as unknown as StorageService;

  const emitted: { userId: string; event: string; payload: any }[] = []; // eslint-disable-line @typescript-eslint/no-explicit-any
  const realtime = {
    emitToUser: (userId: string, event: string, payload: unknown) =>
      emitted.push({ userId, event, payload }),
  } as unknown as ChatRealtimeService;

  const service = new ChatService(prisma, new ConversationAccessService(prisma), storage, realtime);
  return { service, state, calls, emitted };
}

const textMessage = (conversationId = CONV, content = 'Hola, ¿puede venir el lunes?') => ({
  conversationId,
  type: 'TEXT' as const,
  content,
});

describe('ChatService — acceso', () => {
  it('un no participante NO puede leer los mensajes', async () => {
    const { service, calls } = buildFixture({
      messages: [
        {
          id: 'm1',
          conversationId: CONV,
          senderId: CLIENT,
          type: 'TEXT',
          content: 'secreto',
          createdAt: new Date(1),
        },
      ],
    });
    await expect(service.getMessages(STRANGER, CONV, {})).rejects.toBeInstanceOf(NotFoundException);
    expect(calls.messageFindMany).toBe(0);
  });

  it('un no participante NO puede enviar, marcar leído, bloquear ni reportar', async () => {
    const { service, calls, emitted } = buildFixture();
    await expect(service.sendMessage(STRANGER, textMessage())).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.markRead(STRANGER, CONV)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.block(STRANGER, CONV)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.report(STRANGER, CONV, 'Motivo suficiente')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.assertCanJoin(STRANGER, CONV)).rejects.toBeInstanceOf(NotFoundException);
    expect(calls.messageCreate).toBe(0);
    expect(emitted).toHaveLength(0);
  });

  it('un no participante NO puede subir imágenes', async () => {
    const { service, calls } = buildFixture();
    const file = {
      buffer: Buffer.from('x'),
      mimetype: 'image/png',
      size: 1,
      originalname: 'a.png',
    };
    await expect(service.uploadImage(STRANGER, CONV, file)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(calls.uploads).toBe(0);
  });

  it('un no participante no ve la conversación en su bandeja', async () => {
    const { service } = buildFixture();
    await expect(service.listConversations(STRANGER)).resolves.toEqual([]);
  });
});

describe('ChatService — bloqueo', () => {
  it.each([
    ['el cliente bloqueó al trabajador', { blockerId: CLIENT, blockedId: WORKER }],
    ['el trabajador bloqueó al cliente', { blockerId: WORKER, blockedId: CLIENT }],
  ])('un usuario bloqueado no puede enviar (%s)', async (_label, block) => {
    const { service, calls, emitted } = buildFixture({ blocks: [block] });
    await expect(service.sendMessage(CLIENT, textMessage())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(service.sendMessage(WORKER, textMessage())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(calls.messageCreate).toBe(0);
    expect(emitted).toHaveLength(0);
  });

  it('un usuario bloqueado tampoco puede subir imágenes', async () => {
    const { service, calls } = buildFixture({ blocks: [{ blockerId: WORKER, blockedId: CLIENT }] });
    const file = {
      buffer: Buffer.from('x'),
      mimetype: 'image/png',
      size: 1,
      originalname: 'a.png',
    };
    await expect(service.uploadImage(CLIENT, CONV, file)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(calls.uploads).toBe(0);
  });

  it('block() impide enviar a ambos, indica blockedByMe sin revelar quién bloqueó al otro, y unblock() lo revierte', async () => {
    const { service } = buildFixture();
    const blocked = await service.block(CLIENT, CONV);
    expect(blocked.blockedByMe).toBe(true);
    expect(blocked.canSend).toBe(false);

    const asWorker = await service.getConversation(WORKER, CONV);
    expect(asWorker.blockedByMe).toBe(false);
    expect(asWorker.canSend).toBe(false);
    await expect(service.sendMessage(WORKER, textMessage())).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    const unblocked = await service.unblock(CLIENT, CONV);
    expect(unblocked.canSend).toBe(true);
    await expect(service.sendMessage(WORKER, textMessage())).resolves.toMatchObject({
      senderId: WORKER,
    });
  });

  it('un bloqueado aún puede leer el historial (solo se impide enviar)', async () => {
    const { service } = buildFixture({ blocks: [{ blockerId: WORKER, blockedId: CLIENT }] });
    await expect(service.getMessages(CLIENT, CONV, {})).resolves.toMatchObject({ items: [] });
  });
});

describe('ChatService — envío de mensajes', () => {
  it('guarda el mensaje y emite message:new + conversation:updated a ambos participantes', async () => {
    const { service, emitted, state } = buildFixture();
    const message = await service.sendMessage(CLIENT, textMessage());

    expect(message).toMatchObject({ conversationId: CONV, senderId: CLIENT, type: 'TEXT' });
    expect(state.conversations[0]?.lastMessageAt).toBeInstanceOf(Date);

    const newEvents = emitted.filter((e) => e.event === 'message:new').map((e) => e.userId);
    expect(newEvents.sort()).toEqual([CLIENT, WORKER].sort());

    const updated = emitted.filter((e) => e.event === 'conversation:updated');
    expect(updated.map((e) => e.userId).sort()).toEqual([CLIENT, WORKER].sort());
    const forWorker = updated.find((e) => e.userId === WORKER)?.payload;
    const forClient = updated.find((e) => e.userId === CLIENT)?.payload;
    expect(forWorker.unreadCount).toBe(1);
    expect(forClient.unreadCount).toBe(0);
    expect(forWorker.peer).toMatchObject({ name: 'Ana Cliente', headline: null });
    expect(forClient.peer).toMatchObject({
      name: 'Juan Maestro',
      headline: 'Carpintero',
      workerProfileId: PROFILE,
    });
  });

  it('valida el contenido según el tipo', async () => {
    const { service, calls } = buildFixture();
    await expect(
      service.sendMessage(CLIENT, { conversationId: CONV, type: 'TEXT', content: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.sendMessage(CLIENT, { conversationId: CONV, type: 'ADDRESS' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.sendMessage(CLIENT, {
        conversationId: CONV,
        type: 'ADDRESS',
        content: 'Casa azul',
        latitude: 14.6,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.sendMessage(CLIENT, { conversationId: CONV, type: 'IMAGE' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(calls.messageCreate).toBe(0);
  });

  it('ADDRESS acepta dirección con coordenadas opcionales', async () => {
    const { service } = buildFixture();
    const withCoords = await service.sendMessage(CLIENT, {
      conversationId: CONV,
      type: 'ADDRESS',
      content: '2a calle 3-45, El Asintal, casa azul',
      latitude: 14.5361,
      longitude: -91.7127,
    });
    expect(withCoords).toMatchObject({ type: 'ADDRESS', latitude: 14.5361, longitude: -91.7127 });

    const textOnly = await service.sendMessage(CLIENT, {
      conversationId: CONV,
      type: 'ADDRESS',
      content: 'Frente al parque central',
    });
    expect(textOnly).toMatchObject({ latitude: null, longitude: null });
  });

  it('IMAGE solo acepta rutas subidas por el mismo usuario a la misma conversación', async () => {
    const { service } = buildFixture();
    const ownPath = `${chatImagePrefix(CONV, CLIENT)}abc.webp`;
    const otherUserPath = `${chatImagePrefix(CONV, WORKER)}abc.webp`;
    const otherConvPath = `${chatImagePrefix('otra', CLIENT)}abc.webp`;

    await expect(
      service.sendMessage(CLIENT, {
        conversationId: CONV,
        type: 'IMAGE',
        imagePath: otherUserPath,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.sendMessage(CLIENT, {
        conversationId: CONV,
        type: 'IMAGE',
        imagePath: otherConvPath,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.sendMessage(CLIENT, {
        conversationId: CONV,
        type: 'IMAGE',
        imagePath: `${chatImagePrefix(CONV, CLIENT)}../x.webp`,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const ok = await service.sendMessage(CLIENT, {
      conversationId: CONV,
      type: 'IMAGE',
      imagePath: ownPath,
    });
    expect(ok.type).toBe('IMAGE');
  });

  it('las imágenes se entregan con URL firmada y NUNCA con la ruta del bucket', async () => {
    const { service, emitted } = buildFixture();
    const imagePath = `${chatImagePrefix(CONV, CLIENT)}abc.webp`;
    const message = await service.sendMessage(CLIENT, {
      conversationId: CONV,
      type: 'IMAGE',
      imagePath,
    });

    expect(message.imageUrl).toContain('https://signed.test/');
    expect(message).not.toHaveProperty('imagePath');
    for (const event of emitted.filter((e) => e.event === 'message:new')) {
      expect(JSON.stringify(event.payload)).not.toContain('"imagePath"');
    }
  });
});

describe('ChatService — historial y lectura', () => {
  const history = () =>
    Array.from({ length: 5 }, (_, i) => ({
      id: `00000000-0000-4000-8000-00000000000${i + 1}`,
      conversationId: CONV,
      senderId: i % 2 === 0 ? CLIENT : WORKER,
      type: 'TEXT',
      content: `m${i + 1}`,
      imagePath: null,
      latitude: null,
      longitude: null,
      readAt: null,
      createdAt: new Date(1000 + i),
    }));

  it('pagina por cursor del más nuevo al más antiguo', async () => {
    const { service } = buildFixture({ messages: history() });

    const first = await service.getMessages(CLIENT, CONV, { limit: 2 });
    expect(first.items.map((m) => m.content)).toEqual(['m5', 'm4']);
    expect(first.nextCursor).toBe(first.items[1]?.id);

    const second = await service.getMessages(CLIENT, CONV, {
      limit: 2,
      cursor: first.nextCursor as string,
    });
    expect(second.items.map((m) => m.content)).toEqual(['m3', 'm2']);

    const third = await service.getMessages(CLIENT, CONV, {
      limit: 2,
      cursor: second.nextCursor as string,
    });
    expect(third.items.map((m) => m.content)).toEqual(['m1']);
    expect(third.nextCursor).toBeNull();
  });

  it('rechaza un cursor que no pertenece a la conversación', async () => {
    const { service } = buildFixture({ messages: history() });
    await expect(
      service.getMessages(CLIENT, CONV, { cursor: '00000000-0000-4000-8000-0000000000ff' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('markRead marca solo los mensajes recibidos y avisa al otro participante', async () => {
    const { service, state, emitted } = buildFixture({ messages: history() });
    const result = await service.markRead(WORKER, CONV);

    // WORKER recibió los mensajes enviados por CLIENT (m1, m3, m5).
    expect(result.updated).toBe(3);
    expect(state.messages.filter((m) => m.senderId === CLIENT).every((m) => m.readAt)).toBe(true);
    expect(state.messages.filter((m) => m.senderId === WORKER).every((m) => !m.readAt)).toBe(true);
    expect(
      emitted
        .filter((e) => e.event === 'message:read')
        .map((e) => e.userId)
        .sort(),
    ).toEqual([CLIENT, WORKER].sort());

    const again = await service.markRead(WORKER, CONV);
    expect(again.updated).toBe(0);
  });
});

describe('ChatService — conversaciones', () => {
  it('crea la conversación con el usuario actual como cliente y resuelve el trabajador por perfil', async () => {
    const { service, state } = buildFixture({ conversations: [] });
    const summary = await service.createOrGetConversation(CLIENT, { workerProfileId: PROFILE });
    expect(state.conversations).toHaveLength(1);
    expect(state.conversations[0]).toMatchObject({ clientId: CLIENT, workerId: WORKER });
    expect(summary.peer).toMatchObject({
      id: WORKER,
      name: 'Juan Maestro',
      headline: 'Carpintero',
    });
  });

  it('devuelve la existente en vez de duplicar', async () => {
    const { service, state } = buildFixture();
    const summary = await service.createOrGetConversation(CLIENT, { workerUserId: WORKER });
    expect(summary.id).toBe(CONV);
    expect(state.conversations).toHaveLength(1);
  });

  it('reutiliza la conversación aunque los roles estén invertidos', async () => {
    const { service, state } = buildFixture({
      conversations: [
        {
          id: CONV,
          clientId: WORKER,
          workerId: STRANGER,
          lastMessageAt: null,
          createdAt: new Date(1),
        },
      ],
    });
    // STRANGER (cliente actual) contacta a WORKER, que ya tiene una conversación con él como cliente.
    const summary = await service.createOrGetConversation(STRANGER, { workerProfileId: PROFILE });
    expect(summary.id).toBe(CONV);
    expect(state.conversations).toHaveLength(1);
  });

  it('no permite contactarse a uno mismo, ni sin identificador, ni con bloqueo', async () => {
    const { service } = buildFixture({ blocks: [{ blockerId: WORKER, blockedId: STRANGER }] });
    await expect(
      service.createOrGetConversation(WORKER, { workerProfileId: PROFILE }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.createOrGetConversation(CLIENT, {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      service.createOrGetConversation(CLIENT, { workerProfileId: PROFILE, workerUserId: WORKER }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createOrGetConversation(STRANGER, { workerProfileId: PROFILE }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('el trabajador no ve en su bandeja una conversación vacía; el cliente sí', async () => {
    const { service } = buildFixture();
    await expect(service.listConversations(WORKER)).resolves.toEqual([]);
    await expect(service.listConversations(CLIENT)).resolves.toHaveLength(1);

    await service.sendMessage(CLIENT, textMessage());
    const inbox = await service.listConversations(WORKER);
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({
      unreadCount: 1,
      canSend: true,
      peer: { name: 'Ana Cliente', headline: null },
      lastMessage: { preview: 'Hola, ¿puede venir el lunes?' },
    });
  });

  it('la bandeja nunca expone teléfono ni correo de la otra persona', async () => {
    const { service } = buildFixture();
    await service.sendMessage(CLIENT, textMessage());
    const json = JSON.stringify(await service.listConversations(WORKER));
    expect(json).not.toMatch(/phone|email|passwordHash|dpi|nit/i);
  });
});

describe('ChatService — imágenes y reportes', () => {
  it('sube al bucket privado bajo conversations/{conv}/{user}/ y devuelve ruta + URL firmada', async () => {
    const { service, calls } = buildFixture();
    const file = {
      buffer: Buffer.from('x'),
      mimetype: 'image/png',
      size: 1,
      originalname: 'a.png',
    };
    const result = await service.uploadImage(CLIENT, CONV, file);

    expect(result.imagePath.startsWith(chatImagePrefix(CONV, CLIENT))).toBe(true);
    expect(result.imagePath.endsWith('.webp')).toBe(true);
    expect(result.signedUrl).toContain('https://signed.test/');
    expect(calls.uploads).toBe(1);
    await expect(service.uploadImage(CLIENT, CONV, undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('el reporte crea un Report abierto y es idempotente mientras siga abierto', async () => {
    const { service, state } = buildFixture();
    const first = await service.report(CLIENT, CONV, 'Me insultó varias veces');
    const second = await service.report(CLIENT, CONV, 'Me insultó varias veces');
    expect(first.status).toBe('OPEN');
    expect(second.id).toBe(first.id);
    expect(state.reports).toHaveLength(1);
    expect(state.reports[0]).toMatchObject({
      targetType: 'CONVERSATION',
      targetId: CONV,
      reporterId: CLIENT,
    });
  });
});
