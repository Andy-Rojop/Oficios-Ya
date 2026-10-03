import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ChatRealtimeService } from '../chat/chat-realtime.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ListNotificationsQueryDto,
  NotificationDto,
  NotificationsPageDto,
  NotifyInput,
} from './dto/notification.dto';
import { NOTIFICATIONS_DEFAULT_LIMIT, NOTIFICATION_NEW_EVENT } from './notifications.constants';

const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  title: true,
  body: true,
  link: true,
  readAt: true,
  createdAt: true,
} as const;

/**
 * Notificaciones dentro de la app (RF-051 a RF-054).
 * `notify` lo usan Solicitudes, Reseñas y Administración: es "best-effort" y nunca lanza,
 * así que una falla al notificar no deshace la operación principal.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: ChatRealtimeService,
  ) {}

  /** Crea la notificación y, si la persona está conectada, la empuja por Socket.IO. */
  async notify(userId: string, input: NotifyInput): Promise<void> {
    try {
      const created = (await this.prisma.notification.create({
        data: {
          userId,
          type: input.type,
          title: input.title,
          body: input.body,
          link: input.link ?? null,
        },
        select: NOTIFICATION_SELECT,
      })) as NotificationDto;
      this.realtime.emitToUser(userId, NOTIFICATION_NEW_EVENT, created);
    } catch (error) {
      this.logger.warn(
        `No se pudo crear la notificación "${input.type}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /** Notificaciones propias, más recientes primero, con el total de no leídas. */
  async list(userId: string, query: ListNotificationsQueryDto): Promise<NotificationsPageDto> {
    const limit = query.limit ?? NOTIFICATIONS_DEFAULT_LIMIT;
    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, ...(query.unreadOnly ? { readAt: null } : {}) },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        select: NOTIFICATION_SELECT,
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: page,
      unreadCount,
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  /** Marca una notificación propia como leída (idempotente). Las ajenas "no existen" (404). */
  async markRead(userId: string, notificationId: string): Promise<NotificationDto> {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
      select: NOTIFICATION_SELECT,
    });
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }
    return notification;
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: count };
  }
}
