import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationAccessService } from '../chat/conversation-access.service';
import { AccountStatus, RequestStatus } from '../generated/prisma/enums';
import { NotificationType } from '../notifications/notifications.constants';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { recomputeWorkerStats } from '../workers/worker-stats.util';
import type {
  ChangeRequestStatusDto,
  CreateRequestDto,
  ListRequestsQueryDto,
} from './dto/request-requests.dto';
import {
  toRequestDto,
  type QuoteRow,
  type RequestDto,
  type RequestRow,
} from './dto/request-responses.dto';
import { DESIRED_DATE_GRACE_MS, REQUESTS_LIST_MAX } from './request.constants';
import { assertTransition, type RequestActor } from './request-status.util';
import { ensurePairConversation, findPairConversation } from './pair-conversation.util';

export const REQUEST_SELECT = {
  id: true,
  clientId: true,
  workerId: true,
  description: true,
  desiredDate: true,
  urgent: true,
  status: true,
  clientConfirmedAt: true,
  createdAt: true,
  updatedAt: true,
  client: { select: { id: true, name: true } },
  worker: {
    select: { id: true, name: true, workerProfile: { select: { id: true, headline: true } } },
  },
  service: { select: { id: true, name: true } },
  conversation: { select: { id: true } },
  review: {
    select: {
      id: true,
      rating: true,
      comment: true,
      workerReply: true,
      repliedAt: true,
      createdAt: true,
    },
  },
} as const;

export const QUOTE_SELECT = {
  id: true,
  requestId: true,
  conversationId: true,
  amount: true,
  scope: true,
  status: true,
  createdAt: true,
} as const;

/** Texto de la notificación según el nuevo estado (lo que hizo la otra persona). */
const STATUS_NOTIFICATION_TEXT: Partial<Record<RequestStatus, string>> = {
  [RequestStatus.ACCEPTED]: 'aceptó la solicitud',
  [RequestStatus.REJECTED]: 'rechazó la solicitud',
  [RequestStatus.IN_PROGRESS]: 'inició el trabajo',
  [RequestStatus.COMPLETED]: 'marcó el trabajo como finalizado',
  [RequestStatus.CANCELLED]: 'canceló la solicitud',
};

/** Datos mínimos para decidir permisos. */
interface RequestAccessRow {
  id: string;
  clientId: string;
  workerId: string;
  status: RequestStatus;
  clientConfirmedAt: Date | null;
}

/**
 * Ciclo de vida de una solicitud de servicio (RF-041 a RF-044).
 * Regla de privacidad: solo el cliente y el trabajador de la solicitud pueden verla;
 * para todos los demás "no existe" (404), igual que en el chat.
 */
@Injectable()
export class RequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ConversationAccessService,
    private readonly notifications: NotificationsService,
  ) {}

  /** El cliente actual envía una solicitud a un trabajador y queda enlazada a su conversación. */
  async create(userId: string, dto: CreateRequestDto): Promise<RequestDto> {
    if (Boolean(dto.workerProfileId) === Boolean(dto.workerUserId)) {
      throw new BadRequestException('Indique el trabajador al que desea pedir el servicio');
    }

    const profile = await this.prisma.workerProfile.findFirst({
      where: dto.workerProfileId ? { id: dto.workerProfileId } : { userId: dto.workerUserId },
      select: { id: true, userId: true, user: { select: { status: true } } },
    });
    if (!profile || profile.user.status !== AccountStatus.ACTIVE) {
      throw new NotFoundException('Trabajador no encontrado');
    }
    if (profile.userId === userId) {
      throw new BadRequestException('No puede solicitarse un servicio a sí mismo');
    }
    if (await this.access.isBlockedEitherWay(userId, profile.userId)) {
      throw new ForbiddenException('No puede enviar una solicitud a este trabajador');
    }

    if (dto.serviceId) {
      const service = await this.prisma.service.findFirst({
        where: { id: dto.serviceId, workerProfileId: profile.id, active: true },
        select: { id: true },
      });
      if (!service) {
        throw new BadRequestException(
          'El servicio elegido no pertenece a este trabajador o ya no está disponible',
        );
      }
    }

    let desiredDate: Date | null = null;
    if (dto.desiredDate) {
      desiredDate = new Date(dto.desiredDate);
      if (Number.isNaN(desiredDate.getTime())) {
        throw new BadRequestException('La fecha deseada no es válida');
      }
      if (desiredDate.getTime() < Date.now() - DESIRED_DATE_GRACE_MS) {
        throw new BadRequestException('La fecha deseada no puede estar en el pasado');
      }
    }

    const pending = await this.prisma.serviceRequest.findFirst({
      where: { clientId: userId, workerId: profile.userId, status: RequestStatus.SENT },
      select: { id: true },
    });
    if (pending) {
      throw new ConflictException('Ya tiene una solicitud pendiente con este trabajador');
    }

    // Se asegura la conversación fuera de la transacción (maneja la carrera de @@unique sin abortarla).
    const conversation = await ensurePairConversation(this.prisma, userId, profile.userId);

    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.serviceRequest.create({
        data: {
          clientId: userId,
          workerId: profile.userId,
          serviceId: dto.serviceId ?? null,
          description: dto.description,
          desiredDate,
          urgent: dto.urgent ?? false,
        },
        select: { id: true },
      });
      // Conversation.requestId es único: la primera solicitud de la pareja queda enlazada al chat.
      if (!conversation.requestId) {
        await tx.conversation.updateMany({
          where: { id: conversation.id, requestId: null },
          data: { requestId: request.id },
        });
      }
      return request;
    });

    const createdRequest = await this.getOne(userId, created.id);
    await this.notifications.notify(profile.userId, {
      type: NotificationType.REQUEST_NEW,
      title: 'Nueva solicitud de servicio',
      body: `${createdRequest.client.name} le envió una solicitud${createdRequest.urgent ? ' urgente' : ''}.`,
      link: `/solicitudes/${created.id}`,
    });
    return createdRequest;
  }

  /** Solicitudes del usuario (como cliente, como trabajador o ambas), más recientes primero. */
  async list(userId: string, query: ListRequestsQueryDto): Promise<RequestDto[]> {
    const participant =
      query.role === 'client'
        ? { clientId: userId }
        : query.role === 'worker'
          ? { workerId: userId }
          : { OR: [{ clientId: userId }, { workerId: userId }] };

    const rows = (await this.prisma.serviceRequest.findMany({
      where: { ...participant, ...(query.status ? { status: query.status } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: REQUESTS_LIST_MAX,
      select: REQUEST_SELECT,
    })) as unknown as RequestRow[];

    return rows.map((row) => toRequestDto(row, userId));
  }

  /** Detalle con cotizaciones; solo para el cliente o el trabajador de la solicitud. */
  async getOne(userId: string, requestId: string): Promise<RequestDto> {
    const row = (await this.prisma.serviceRequest.findFirst({
      where: { id: requestId, OR: [{ clientId: userId }, { workerId: userId }] },
      select: {
        ...REQUEST_SELECT,
        quotes: { orderBy: [{ createdAt: 'desc' }], select: QUOTE_SELECT },
      },
    })) as unknown as (RequestRow & { quotes: QuoteRow[] }) | null;
    if (!row) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    let conversationId = row.conversation?.id ?? null;
    if (!conversationId) {
      conversationId =
        (await findPairConversation(this.prisma, row.clientId, row.workerId))?.id ?? null;
    }
    return toRequestDto(row, userId, { quotes: row.quotes, conversationId });
  }

  /** Cambia el estado aplicando la máquina de estados y los permisos por rol. */
  async changeStatus(
    userId: string,
    requestId: string,
    dto: ChangeRequestStatusDto,
  ): Promise<RequestDto> {
    const row = await this.loadForParticipant(requestId, userId);
    const actor = this.actorOf(row, userId);
    assertTransition(row.status, dto.status, actor);

    const data: { status: RequestStatus; clientConfirmedAt?: Date } = { status: dto.status };
    // Si el cliente finaliza el trabajo, su confirmación queda registrada en el mismo paso.
    if (dto.status === RequestStatus.COMPLETED && actor === 'CLIENT') {
      data.clientConfirmedAt = new Date();
    }

    await this.prisma.$transaction(async (tx) => {
      // Se exige el estado leído: si otra petición cambió la solicitud, no se pisa.
      const result = await tx.serviceRequest.updateMany({
        where: { id: row.id, status: row.status },
        data,
      });
      if (result.count !== 1) {
        throw new ConflictException(
          'La solicitud cambió mientras la actualizaba. Recargue e inténtelo de nuevo',
        );
      }
      if (data.clientConfirmedAt) {
        await recomputeWorkerStats(tx, row.workerId, { ratings: false });
      }
    });

    const result = await this.getOne(userId, requestId);
    const verb = STATUS_NOTIFICATION_TEXT[dto.status];
    if (verb) {
      const actorName = actor === 'CLIENT' ? result.client.name : result.worker.name;
      await this.notifications.notify(actor === 'CLIENT' ? row.workerId : row.clientId, {
        type: NotificationType.REQUEST_STATUS,
        title: 'Tu solicitud cambió de estado',
        body: `${actorName} ${verb}.`,
        link: `/solicitudes/${row.id}`,
      });
    }
    return result;
  }

  /** El cliente confirma que el trabajo que el trabajador marcó como finalizado quedó listo. */
  async confirmCompletion(userId: string, requestId: string): Promise<RequestDto> {
    const row = await this.loadForParticipant(requestId, userId);
    if (this.actorOf(row, userId) !== 'CLIENT') {
      throw new ForbiddenException(
        'Solo el cliente puede confirmar que el trabajo quedó terminado',
      );
    }
    if (row.status !== RequestStatus.COMPLETED) {
      throw new ConflictException('El trabajador aún no ha marcado el trabajo como finalizado');
    }
    if (row.clientConfirmedAt) {
      throw new ConflictException('Ya confirmaste este trabajo');
    }

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.serviceRequest.updateMany({
        where: { id: row.id, status: RequestStatus.COMPLETED, clientConfirmedAt: null },
        data: { clientConfirmedAt: new Date() },
      });
      if (result.count !== 1) {
        throw new ConflictException('Ya confirmaste este trabajo');
      }
      await recomputeWorkerStats(tx, row.workerId, { ratings: false });
    });

    const result = await this.getOne(userId, requestId);
    await this.notifications.notify(row.workerId, {
      type: NotificationType.REQUEST_STATUS,
      title: 'Trabajo confirmado',
      body: `${result.client.name} confirmó que el trabajo quedó terminado.`,
      link: `/solicitudes/${row.id}`,
    });
    return result;
  }

  // --- Utilidades ------------------------------------------------------------------------

  private async loadForParticipant(requestId: string, userId: string): Promise<RequestAccessRow> {
    const row = await this.prisma.serviceRequest.findFirst({
      where: { id: requestId, OR: [{ clientId: userId }, { workerId: userId }] },
      select: { id: true, clientId: true, workerId: true, status: true, clientConfirmedAt: true },
    });
    if (!row) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    return row;
  }

  private actorOf(row: Pick<RequestAccessRow, 'clientId'>, userId: string): RequestActor {
    return row.clientId === userId ? 'CLIENT' : 'WORKER';
  }
}
