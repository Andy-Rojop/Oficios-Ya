import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountStatus,
  IdentityStatus,
  ReportStatus,
  ReportTarget,
  RequestStatus,
  Role,
} from '../generated/prisma/enums';
import { NotificationType } from '../notifications/notifications.constants';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CHAT_IMAGE_URL_TTL_SECONDS } from '../chat/chat.constants';
import { MessageType } from '../generated/prisma/enums';
import { AuditService } from './audit.service';
import {
  ADMIN_PAGE_DEFAULT,
  ADMIN_PAGE_SIZE_DEFAULT,
  type AdminPaginationQueryDto,
  type DecideVerificationDto,
  type ListAdminReportsQueryDto,
  type ListAdminUsersQueryDto,
  type ResolveReportDto,
  type UpdateUserStatusDto,
  type UpsertCategoryDto,
  type UpsertZoneDto,
} from './dto/admin.dto';

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function pageParams(query: AdminPaginationQueryDto): {
  page: number;
  pageSize: number;
  skip: number;
} {
  const page = query.page ?? ADMIN_PAGE_DEFAULT;
  const pageSize = query.pageSize ?? ADMIN_PAGE_SIZE_DEFAULT;
  return { page, pageSize, skip: (page - 1) * pageSize };
}

/** Moderación y catálogo (RF-055 a RF-064). Todas las mutaciones escriben AuditLog. */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
  ) {}

  // --- Stats -----------------------------------------------------------------------------

  async stats() {
    const [users, workers, openReports, requestsByStatus] = await Promise.all([
      this.prisma.user.count({ where: { status: { not: AccountStatus.DELETED } } }),
      this.prisma.workerProfile.count(),
      this.prisma.report.count({
        where: { status: { in: [ReportStatus.OPEN, ReportStatus.IN_REVIEW] } },
      }),
      this.prisma.serviceRequest.groupBy({ by: ['status'], _count: { _all: true } }),
    ]);

    const byStatus = Object.fromEntries(
      (Object.values(RequestStatus) as RequestStatus[]).map((s) => [s, 0]),
    ) as Record<RequestStatus, number>;
    for (const row of requestsByStatus) {
      byStatus[row.status] = row._count._all;
    }

    return { users, workers, openReports, requestsByStatus: byStatus };
  }

  // --- Users -----------------------------------------------------------------------------

  async listUsers(query: ListAdminUsersQueryDto) {
    const { page, pageSize, skip } = pageParams(query);
    const where = {
      ...(query.status ? { status: query.status } : { status: { not: AccountStatus.DELETED } }),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' as const } },
              { phone: { contains: query.q } },
              { email: { contains: query.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          status: true,
          activeMode: true,
          createdAt: true,
          workerProfile: { select: { id: true, headline: true, identityStatus: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async updateUserStatus(actorId: string, userId: string, dto: UpdateUserStatusDto, ip?: string) {
    if (dto.status !== AccountStatus.ACTIVE && dto.status !== AccountStatus.SUSPENDED) {
      throw new BadRequestException('Solo se puede poner ACTIVE o SUSPENDED');
    }
    if (userId === actorId) {
      throw new BadRequestException('No puede cambiar el estado de su propia cuenta');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, status: true },
    });
    if (!user || user.status === AccountStatus.DELETED) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.role === Role.ADMIN && dto.status === AccountStatus.SUSPENDED) {
      throw new ForbiddenException('No se puede suspender a otro administrador');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        activeMode: true,
        createdAt: true,
      },
    });

    await this.audit.log({
      actorId,
      action: dto.status === AccountStatus.SUSPENDED ? 'USER_SUSPEND' : 'USER_ACTIVATE',
      resource: 'User',
      resourceId: userId,
      metadata: { previousStatus: user.status, status: dto.status },
      ip,
    });

    return updated;
  }

  // --- Verifications ---------------------------------------------------------------------

  async listPendingVerifications(query: AdminPaginationQueryDto) {
    const { page, pageSize, skip } = pageParams(query);
    const where = { identityStatus: IdentityStatus.PENDING };
    const [items, total] = await Promise.all([
      this.prisma.workerProfile.findMany({
        where,
        orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
        skip,
        take: pageSize,
        select: {
          id: true,
          headline: true,
          identityStatus: true,
          dpi: true,
          nit: true,
          updatedAt: true,
          user: { select: { id: true, name: true, phone: true, status: true } },
        },
      }),
      this.prisma.workerProfile.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async decideVerification(
    actorId: string,
    profileId: string,
    dto: DecideVerificationDto,
    ip?: string,
  ) {
    if (dto.decision !== IdentityStatus.VERIFIED && dto.decision !== IdentityStatus.REJECTED) {
      throw new BadRequestException('La decisión debe ser VERIFIED o REJECTED');
    }

    const profile = await this.prisma.workerProfile.findUnique({
      where: { id: profileId },
      select: { id: true, userId: true, identityStatus: true, headline: true },
    });
    if (!profile) {
      throw new NotFoundException('Perfil de trabajador no encontrado');
    }
    if (profile.identityStatus !== IdentityStatus.PENDING) {
      throw new ConflictException('Este perfil no tiene una verificación pendiente');
    }

    const updated = await this.prisma.workerProfile.update({
      where: { id: profileId },
      data: { identityStatus: dto.decision },
      select: {
        id: true,
        identityStatus: true,
        user: { select: { id: true, name: true } },
      },
    });

    await this.audit.log({
      actorId,
      action: dto.decision === IdentityStatus.VERIFIED ? 'IDENTITY_APPROVE' : 'IDENTITY_REJECT',
      resource: 'WorkerProfile',
      resourceId: profileId,
      metadata: { userId: profile.userId, note: dto.note ?? null },
      ip,
    });

    await this.notifications.notify(profile.userId, {
      type: NotificationType.IDENTITY_DECISION,
      title:
        dto.decision === IdentityStatus.VERIFIED
          ? 'Identidad verificada'
          : 'Identidad no verificada',
      body:
        dto.decision === IdentityStatus.VERIFIED
          ? 'Tu identidad fue aprobada. Ya aparece como verificada en tu perfil.'
          : `Su identidad fue rechazada.${dto.note ? ` Motivo: ${dto.note}` : ' Revise sus datos e inténtelo de nuevo.'}`,
      link: '/panel',
    });

    return updated;
  }

  // --- Reports ---------------------------------------------------------------------------

  async listReports(query: ListAdminReportsQueryDto) {
    const { page, pageSize, skip } = pageParams(query);
    const where = {
      status: query.status
        ? query.status
        : { in: [ReportStatus.OPEN, ReportStatus.IN_REVIEW] as ReportStatus[] },
    };
    const [items, total] = await Promise.all([
      this.prisma.report.findMany({
        where,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip,
        take: pageSize,
        select: {
          id: true,
          targetType: true,
          targetId: true,
          reason: true,
          status: true,
          resolution: true,
          createdAt: true,
          resolvedAt: true,
          reporter: { select: { id: true, name: true, phone: true } },
        },
      }),
      this.prisma.report.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async resolveReport(
    actorId: string,
    reportId: string,
    dto: ResolveReportDto,
    dismiss: boolean,
    ip?: string,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { id: true, status: true, reporterId: true, targetType: true, targetId: true },
    });
    if (!report) {
      throw new NotFoundException('Reporte no encontrado');
    }
    if (report.status === ReportStatus.RESOLVED || report.status === ReportStatus.DISMISSED) {
      throw new ConflictException('Este reporte ya fue cerrado');
    }

    const status = dismiss ? ReportStatus.DISMISSED : ReportStatus.RESOLVED;
    const updated = await this.prisma.report.update({
      where: { id: reportId },
      data: { status, resolution: dto.resolution, resolvedAt: new Date() },
      select: {
        id: true,
        status: true,
        resolution: true,
        resolvedAt: true,
        targetType: true,
        targetId: true,
      },
    });

    await this.audit.log({
      actorId,
      action: dismiss ? 'REPORT_DISMISS' : 'REPORT_RESOLVE',
      resource: 'Report',
      resourceId: reportId,
      metadata: {
        resolution: dto.resolution,
        targetType: report.targetType,
        targetId: report.targetId,
      },
      ip,
    });

    await this.notifications.notify(report.reporterId, {
      type: NotificationType.REPORT_UPDATE,
      title: dismiss ? 'Reporte desestimado' : 'Reporte resuelto',
      body: dto.resolution,
      link: null,
    });

    return updated;
  }

  /**
   * Mensajes de una conversación reportada (solo OPEN/IN_REVIEW + target CONVERSATION).
   * Siempre escribe AuditLog de acceso.
   */
  async getReportConversation(actorId: string, reportId: string, ip?: string) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        status: true,
        targetType: true,
        targetId: true,
        reason: true,
        createdAt: true,
      },
    });

    // Sin reporte, tipo incorrecto o ya cerrado: denegar (no revelar si la conversación existe).
    if (
      !report ||
      report.targetType !== ReportTarget.CONVERSATION ||
      (report.status !== ReportStatus.OPEN && report.status !== ReportStatus.IN_REVIEW)
    ) {
      await this.audit.log({
        actorId,
        action: 'REPORT_CONVERSATION_ACCESS_DENIED',
        resource: 'Report',
        resourceId: reportId,
        metadata: {
          reason: !report
            ? 'NOT_FOUND'
            : report.targetType !== ReportTarget.CONVERSATION
              ? 'WRONG_TARGET'
              : 'CLOSED',
        },
        ip,
      });
      throw new ForbiddenException('No puede ver esta conversación sin un reporte abierto');
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: report.targetId },
      select: {
        id: true,
        clientId: true,
        workerId: true,
        createdAt: true,
        client: { select: { id: true, name: true } },
        worker: { select: { id: true, name: true } },
      },
    });
    if (!conversation) {
      await this.audit.log({
        actorId,
        action: 'REPORT_CONVERSATION_ACCESS_DENIED',
        resource: 'Report',
        resourceId: reportId,
        metadata: { reason: 'CONVERSATION_MISSING' },
        ip,
      });
      throw new NotFoundException('Conversación no encontrada');
    }

    const messages = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 500,
      select: {
        id: true,
        senderId: true,
        type: true,
        content: true,
        imagePath: true,
        latitude: true,
        longitude: true,
        createdAt: true,
      },
    });

    await this.audit.log({
      actorId,
      action: 'REPORT_CONVERSATION_ACCESS',
      resource: 'Report',
      resourceId: reportId,
      metadata: { conversationId: conversation.id, messageCount: messages.length },
      ip,
    });

    // Marcar en revisión la primera vez que un admin abre el hilo.
    if (report.status === ReportStatus.OPEN) {
      await this.prisma.report.update({
        where: { id: report.id },
        data: { status: ReportStatus.IN_REVIEW },
      });
    }

    const items = await Promise.all(
      messages.map(async (m) => {
        let imageUrl: string | null = null;
        if (m.type === MessageType.IMAGE && m.imagePath) {
          try {
            imageUrl = await this.storage.getSignedUrl(m.imagePath, CHAT_IMAGE_URL_TTL_SECONDS);
          } catch {
            imageUrl = null;
          }
        }
        return {
          id: m.id,
          senderId: m.senderId,
          type: m.type,
          content: m.content,
          imageUrl,
          latitude: m.latitude === null || m.latitude === undefined ? null : Number(m.latitude),
          longitude: m.longitude === null || m.longitude === undefined ? null : Number(m.longitude),
          createdAt: m.createdAt,
        };
      }),
    );

    return {
      report: {
        id: report.id,
        reason: report.reason,
        status: report.status === ReportStatus.OPEN ? ReportStatus.IN_REVIEW : report.status,
        createdAt: report.createdAt,
      },
      conversation: {
        id: conversation.id,
        client: conversation.client,
        worker: conversation.worker,
        createdAt: conversation.createdAt,
      },
      messages: items,
    };
  }

  // --- Catalog ---------------------------------------------------------------------------

  async listCategories() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true, active: true },
    });
  }

  async createCategory(actorId: string, dto: UpsertCategoryDto, ip?: string) {
    const slug = dto.slug?.trim() || slugify(dto.name);
    if (!slug) {
      throw new BadRequestException('El slug de la categoría no es válido');
    }
    try {
      const created = await this.prisma.category.create({
        data: { name: dto.name.trim(), slug, active: dto.active ?? true },
        select: { id: true, name: true, slug: true, active: true },
      });
      await this.audit.log({
        actorId,
        action: 'CATEGORY_CREATE',
        resource: 'Category',
        resourceId: created.id,
        metadata: { name: created.name, slug: created.slug },
        ip,
      });
      return created;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Ya existe una categoría con ese nombre o slug');
      }
      throw error;
    }
  }

  async updateCategory(actorId: string, id: string, dto: UpsertCategoryDto, ip?: string) {
    const existing = await this.prisma.category.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      throw new NotFoundException('Categoría no encontrada');
    }
    const slug = dto.slug?.trim() || slugify(dto.name);
    try {
      const updated = await this.prisma.category.update({
        where: { id },
        data: {
          name: dto.name.trim(),
          slug,
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
        select: { id: true, name: true, slug: true, active: true },
      });
      await this.audit.log({
        actorId,
        action: 'CATEGORY_UPDATE',
        resource: 'Category',
        resourceId: id,
        metadata: { name: updated.name, slug: updated.slug, active: updated.active },
        ip,
      });
      return updated;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Ya existe una categoría con ese nombre o slug');
      }
      throw error;
    }
  }

  async deleteCategory(actorId: string, id: string, ip?: string) {
    const existing = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true },
    });
    if (!existing) {
      throw new NotFoundException('Categoría no encontrada');
    }
    // Baja lógica: no romper servicios enlazados.
    await this.prisma.category.update({ where: { id }, data: { active: false } });
    await this.audit.log({
      actorId,
      action: 'CATEGORY_DEACTIVATE',
      resource: 'Category',
      resourceId: id,
      metadata: { name: existing.name, slug: existing.slug },
      ip,
    });
    return { id, active: false };
  }

  async listZones() {
    return this.prisma.zone.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        type: true,
        latitude: true,
        longitude: true,
        active: true,
      },
    });
  }

  async createZone(actorId: string, dto: UpsertZoneDto, ip?: string) {
    try {
      const created = await this.prisma.zone.create({
        data: {
          name: dto.name.trim(),
          type: dto.type.trim(),
          latitude: dto.latitude ?? null,
          longitude: dto.longitude ?? null,
          active: dto.active ?? true,
        },
        select: {
          id: true,
          name: true,
          type: true,
          latitude: true,
          longitude: true,
          active: true,
        },
      });
      await this.audit.log({
        actorId,
        action: 'ZONE_CREATE',
        resource: 'Zone',
        resourceId: created.id,
        metadata: { name: created.name, type: created.type },
        ip,
      });
      return created;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Ya existe una zona con ese nombre');
      }
      throw error;
    }
  }

  async updateZone(actorId: string, id: string, dto: UpsertZoneDto, ip?: string) {
    const existing = await this.prisma.zone.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      throw new NotFoundException('Zona no encontrada');
    }
    try {
      const updated = await this.prisma.zone.update({
        where: { id },
        data: {
          name: dto.name.trim(),
          type: dto.type.trim(),
          ...(dto.latitude !== undefined ? { latitude: dto.latitude } : {}),
          ...(dto.longitude !== undefined ? { longitude: dto.longitude } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
        select: {
          id: true,
          name: true,
          type: true,
          latitude: true,
          longitude: true,
          active: true,
        },
      });
      await this.audit.log({
        actorId,
        action: 'ZONE_UPDATE',
        resource: 'Zone',
        resourceId: id,
        metadata: { name: updated.name, type: updated.type, active: updated.active },
        ip,
      });
      return updated;
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException('Ya existe una zona con ese nombre');
      }
      throw error;
    }
  }

  async deleteZone(actorId: string, id: string, ip?: string) {
    const existing = await this.prisma.zone.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!existing) {
      throw new NotFoundException('Zona no encontrada');
    }
    await this.prisma.zone.update({ where: { id }, data: { active: false } });
    await this.audit.log({
      actorId,
      action: 'ZONE_DEACTIVATE',
      resource: 'Zone',
      resourceId: id,
      metadata: { name: existing.name },
      ip,
    });
    return { id, active: false };
  }

  // --- Audit log -------------------------------------------------------------------------

  async listAuditLog(query: AdminPaginationQueryDto) {
    const { page, pageSize, skip } = pageParams(query);
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          metadata: true,
          ip: true,
          createdAt: true,
          actor: { select: { id: true, name: true, role: true } },
        },
      }),
      this.prisma.auditLog.count(),
    ]);
    return { items, total, page, pageSize };
  }

  // --- Export ----------------------------------------------------------------------------

  async exportUsersCsv(): Promise<string> {
    const users = await this.prisma.user.findMany({
      where: { status: { not: AccountStatus.DELETED } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        status: true,
        activeMode: true,
        createdAt: true,
      },
    });

    const header = 'id,name,phone,email,role,status,activeMode,createdAt';
    const escape = (value: string | null | undefined) => {
      const raw = value ?? '';
      if (/[",\n]/.test(raw)) {
        return `"${raw.replace(/"/g, '""')}"`;
      }
      return raw;
    };

    const rows = users.map((u) =>
      [
        u.id,
        escape(u.name),
        escape(u.phone),
        escape(u.email),
        u.role,
        u.status,
        u.activeMode,
        u.createdAt.toISOString(),
      ].join(','),
    );
    return [header, ...rows].join('\n');
  }
}
