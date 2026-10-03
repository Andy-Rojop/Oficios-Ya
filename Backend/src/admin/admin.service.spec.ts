import { ForbiddenException } from '@nestjs/common';
import type { NotificationsService } from '../notifications/notifications.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { StorageService } from '../storage/storage.service';
import { AdminService } from './admin.service';
import { AuditService } from './audit.service';

// Nota: Jest corre en modo ESM (NestJS 12 es ESM), por eso no se usa el global `jest`.

const ADMIN = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const WORKER_USER = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PROFILE = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const REPORT = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const CONV = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const USER = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

function buildAdminService(
  options: {
    reports?: Row[];
    profiles?: Row[];
    conversations?: Row[];
    messages?: Row[];
    users?: Row[];
  } = {},
) {
  const state = {
    reports: options.reports ?? [],
    profiles: options.profiles ?? [
      {
        id: PROFILE,
        userId: WORKER_USER,
        identityStatus: 'PENDING',
        headline: 'Plomero',
        dpi: '1234567890101',
        nit: null,
        updatedAt: new Date(),
        user: { id: WORKER_USER, name: 'Juan', phone: '+50255551234', status: 'ACTIVE' },
      },
    ],
    conversations: options.conversations ?? [
      {
        id: CONV,
        clientId: USER,
        workerId: WORKER_USER,
        createdAt: new Date(),
        client: { id: USER, name: 'Ana' },
        worker: { id: WORKER_USER, name: 'Juan' },
      },
    ],
    messages: options.messages ?? [
      {
        id: 'm1',
        conversationId: CONV,
        senderId: USER,
        type: 'TEXT',
        content: 'Hola',
        imagePath: null,
        latitude: null,
        longitude: null,
        createdAt: new Date(1000),
      },
    ],
    users: options.users ?? [
      {
        id: USER,
        name: 'Ana',
        phone: '+50211111111',
        email: null,
        role: 'USER',
        status: 'ACTIVE',
        activeMode: 'CLIENT',
        createdAt: new Date(),
        workerProfile: null,
      },
    ],
    audit: [] as Row[],
    notifications: [] as Row[],
  };

  const prisma = {
    user: {
      count: async () => state.users.filter((u) => u.status !== 'DELETED').length,
      findMany: async () => state.users,
      findUnique: async ({ where }: { where: Row }) =>
        state.users.find((u) => u.id === where.id) ?? null,
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const user = state.users.find((u) => u.id === where.id);
        if (!user) throw new Error('missing');
        Object.assign(user, data);
        return user;
      },
    },
    workerProfile: {
      count: async ({ where }: { where?: Row } = {}) =>
        state.profiles.filter(
          (p) => !where?.identityStatus || p.identityStatus === where.identityStatus,
        ).length,
      findMany: async () => state.profiles,
      findUnique: async ({ where }: { where: Row }) =>
        state.profiles.find((p) => p.id === where.id) ?? null,
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const profile = state.profiles.find((p) => p.id === where.id);
        if (!profile) throw new Error('missing');
        Object.assign(profile, data);
        return {
          id: profile.id,
          identityStatus: profile.identityStatus,
          user: { id: profile.userId, name: profile.user?.name ?? 'Juan' },
        };
      },
    },
    report: {
      count: async () => state.reports.length,
      findMany: async () => state.reports,
      findUnique: async ({ where }: { where: Row }) =>
        state.reports.find((r) => r.id === where.id) ?? null,
      update: async ({ where, data }: { where: Row; data: Row }) => {
        const report = state.reports.find((r) => r.id === where.id);
        if (!report) throw new Error('missing');
        Object.assign(report, data);
        return report;
      },
    },
    conversation: {
      findUnique: async ({ where }: { where: Row }) =>
        state.conversations.find((c) => c.id === where.id) ?? null,
    },
    message: {
      findMany: async ({ where }: { where: Row }) =>
        state.messages.filter((m) => m.conversationId === where.conversationId),
    },
    serviceRequest: {
      groupBy: async () => [],
    },
    category: {
      findMany: async () => [],
      create: async () => ({}),
      update: async () => ({}),
      findUnique: async () => null,
    },
    zone: {
      findMany: async () => [],
      create: async () => ({}),
      update: async () => ({}),
      findUnique: async () => null,
    },
    auditLog: {
      create: async ({ data }: { data: Row }) => {
        const entry = { id: `a${state.audit.length + 1}`, ...data, createdAt: new Date() };
        state.audit.push(entry);
        return entry;
      },
      findMany: async () => state.audit,
      count: async () => state.audit.length,
    },
    notification: {
      create: async ({ data }: { data: Row }) => {
        const n = { id: `n${state.notifications.length + 1}`, ...data };
        state.notifications.push(n);
        return n;
      },
    },
  };

  const audit = new AuditService(prisma as unknown as PrismaService);
  const notifications = {
    notify: async (userId: string, input: Row) => {
      state.notifications.push({ userId, ...input });
    },
  } as unknown as NotificationsService;
  const storage = {
    getSignedUrl: async () => 'https://signed.example/img.webp',
  } as unknown as StorageService;

  const service = new AdminService(
    prisma as unknown as PrismaService,
    audit,
    notifications,
    storage,
  );
  return { service, state };
}

describe('AdminService', () => {
  describe('roles / acceso a conversación reportada', () => {
    it('deniega conversación sin reporte abierto y escribe AuditLog', async () => {
      const { service, state } = buildAdminService({ reports: [] });
      await expect(service.getReportConversation(ADMIN, REPORT)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(state.audit).toHaveLength(1);
      expect(state.audit[0]?.action).toBe('REPORT_CONVERSATION_ACCESS_DENIED');
    });

    it('deniega si el reporte no es de tipo CONVERSATION', async () => {
      const { service, state } = buildAdminService({
        reports: [
          {
            id: REPORT,
            status: 'OPEN',
            targetType: 'REVIEW',
            targetId: 'r1',
            reason: 'Insultos',
            createdAt: new Date(),
          },
        ],
      });
      await expect(service.getReportConversation(ADMIN, REPORT)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(state.audit[0]?.action).toBe('REPORT_CONVERSATION_ACCESS_DENIED');
    });

    it('permite ver mensajes si hay reporte OPEN de CONVERSATION y audita el acceso', async () => {
      const { service, state } = buildAdminService({
        reports: [
          {
            id: REPORT,
            status: 'OPEN',
            targetType: 'CONVERSATION',
            targetId: CONV,
            reason: 'Acoso en el chat',
            reporterId: USER,
            createdAt: new Date(),
          },
        ],
      });
      const result = await service.getReportConversation(ADMIN, REPORT);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]?.content).toBe('Hola');
      expect(state.audit.some((a) => a.action === 'REPORT_CONVERSATION_ACCESS')).toBe(true);
      expect(state.reports[0]?.status).toBe('IN_REVIEW');
    });
  });

  describe('verificaciones', () => {
    it('aprueba identidad y escribe AuditLog IDENTITY_APPROVE', async () => {
      const { service, state } = buildAdminService();
      const result = await service.decideVerification(ADMIN, PROFILE, {
        decision: 'VERIFIED' as never,
      });
      expect(result.identityStatus).toBe('VERIFIED');
      expect(state.audit).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ action: 'IDENTITY_APPROVE', resource: 'WorkerProfile' }),
        ]),
      );
      expect(state.notifications).toHaveLength(1);
      expect(state.notifications[0]?.userId).toBe(WORKER_USER);
    });

    it('rechaza identidad y escribe AuditLog IDENTITY_REJECT', async () => {
      const { service, state } = buildAdminService();
      await service.decideVerification(ADMIN, PROFILE, {
        decision: 'REJECTED' as never,
        note: 'DPI ilegible',
      });
      expect(state.profiles[0]?.identityStatus).toBe('REJECTED');
      expect(state.audit[0]?.action).toBe('IDENTITY_REJECT');
    });
  });
});
