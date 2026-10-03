import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AccountStatus, MessageType, ReportStatus, ReportTarget } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import type { UploadedImage } from '../storage/image-upload.interceptor';
import { StorageService } from '../storage/storage.service';
import { ChatRealtimeService } from './chat-realtime.service';
import {
  CHAT_IMAGE_URL_TTL_SECONDS,
  ChatServerEvent,
  INBOX_MAX_CONVERSATIONS,
  MESSAGES_DEFAULT_LIMIT,
  MESSAGE_ADDRESS_MAX_LENGTH,
  MESSAGE_CAPTION_MAX_LENGTH,
  MESSAGE_TEXT_MAX_LENGTH,
} from './chat.constants';
import { ConversationAccessService } from './conversation-access.service';
import type {
  CreateConversationDto,
  ListMessagesQueryDto,
  SendMessageDto,
} from './dto/chat-requests.dto';
import {
  buildPreview,
  type ChatImageUploadDto,
  type ConversationSummaryDto,
  MessageResponseDto,
  type MessageSource,
  type MessagesPageDto,
  type ReportCreatedDto,
} from './dto/chat-responses.dto';

/** Selección compartida para armar la bandeja y el resumen de una conversación. */
const SUMMARY_SELECT = {
  id: true,
  clientId: true,
  workerId: true,
  lastMessageAt: true,
  createdAt: true,
  client: { select: { id: true, name: true } },
  worker: {
    select: { id: true, name: true, workerProfile: { select: { id: true, headline: true } } },
  },
  messages: {
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    take: 1,
    select: { id: true, senderId: true, type: true, content: true, createdAt: true },
  },
};

interface SummaryRow {
  id: string;
  clientId: string;
  workerId: string;
  lastMessageAt: Date | null;
  createdAt: Date;
  client: { id: string; name: string };
  worker: { id: string; name: string; workerProfile: { id: string; headline: string } | null };
  messages: {
    id: string;
    senderId: string;
    type: MessageType;
    content: string | null;
    createdAt: Date;
  }[];
}

/** Datos ya validados para crear un Message. */
export interface NormalizedMessageInput {
  type: MessageType;
  content: string | null;
  imagePath: string | null;
  latitude: number | null;
  longitude: number | null;
}

/** Prefijo obligatorio de las imágenes: solo se aceptan las que subió ESTE usuario a ESTA conversación. */
export const chatImagePrefix = (conversationId: string, userId: string): string =>
  `conversations/${conversationId}/${userId}/`;

/** Valida y normaliza el contenido según el tipo de mensaje (TEXT | IMAGE | ADDRESS). */
export function normalizeMessageInput(
  dto: Pick<
    SendMessageDto,
    'conversationId' | 'type' | 'content' | 'imagePath' | 'latitude' | 'longitude'
  >,
  senderId: string,
): NormalizedMessageInput {
  const content = dto.content?.trim() ? dto.content.trim() : null;
  const hasLat = dto.latitude !== undefined && dto.latitude !== null;
  const hasLng = dto.longitude !== undefined && dto.longitude !== null;

  switch (dto.type) {
    case MessageType.TEXT: {
      if (!content) throw new BadRequestException('Escribe un mensaje');
      if (content.length > MESSAGE_TEXT_MAX_LENGTH) {
        throw new BadRequestException(
          `El mensaje no puede superar ${MESSAGE_TEXT_MAX_LENGTH} caracteres`,
        );
      }
      return { type: dto.type, content, imagePath: null, latitude: null, longitude: null };
    }
    case MessageType.IMAGE: {
      const path = dto.imagePath ?? '';
      const prefix = chatImagePrefix(dto.conversationId, senderId);
      if (!path.startsWith(prefix) || path.includes('..') || !path.endsWith('.webp')) {
        throw new BadRequestException('La imagen no es válida. Súbela de nuevo');
      }
      if (content && content.length > MESSAGE_CAPTION_MAX_LENGTH) {
        throw new BadRequestException(
          `El texto de la foto no puede superar ${MESSAGE_CAPTION_MAX_LENGTH} caracteres`,
        );
      }
      return { type: dto.type, content, imagePath: path, latitude: null, longitude: null };
    }
    case MessageType.ADDRESS: {
      if (!content) throw new BadRequestException('Escribe la dirección y algunas referencias');
      if (content.length > MESSAGE_ADDRESS_MAX_LENGTH) {
        throw new BadRequestException(
          `La dirección no puede superar ${MESSAGE_ADDRESS_MAX_LENGTH} caracteres`,
        );
      }
      if (hasLat !== hasLng) {
        throw new BadRequestException('Envía la latitud y la longitud juntas, o ninguna');
      }
      return {
        type: dto.type,
        content,
        imagePath: null,
        latitude: hasLat ? (dto.latitude as number) : null,
        longitude: hasLng ? (dto.longitude as number) : null,
      };
    }
    default:
      throw new BadRequestException('El tipo de mensaje no es válido');
  }
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ConversationAccessService,
    private readonly storage: StorageService,
    private readonly realtime: ChatRealtimeService,
  ) {}

  // --- Conversaciones --------------------------------------------------------------------

  /** Crea la conversación cliente↔trabajador (una por pareja) o devuelve la existente. */
  async createOrGetConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationSummaryDto> {
    if (Boolean(dto.workerProfileId) === Boolean(dto.workerUserId)) {
      throw new BadRequestException('Indica el trabajador con el que quieres hablar');
    }

    const profile = await this.prisma.workerProfile.findFirst({
      where: dto.workerProfileId ? { id: dto.workerProfileId } : { userId: dto.workerUserId },
      select: { userId: true, user: { select: { status: true } } },
    });
    if (!profile || profile.user.status !== AccountStatus.ACTIVE) {
      throw new NotFoundException('Trabajador no encontrado');
    }
    const workerUserId = profile.userId;
    if (workerUserId === userId) {
      throw new BadRequestException('No puedes iniciar una conversación contigo mismo');
    }
    await this.access.assertNotBlocked(userId, workerUserId);

    // Una conversación por pareja: se reutiliza aunque el rol esté invertido.
    const pairWhere = {
      OR: [
        { clientId: userId, workerId: workerUserId },
        { clientId: workerUserId, workerId: userId },
      ],
    };
    let conversation = await this.prisma.conversation.findFirst({
      where: pairWhere,
      select: { id: true },
    });
    if (!conversation) {
      try {
        conversation = await this.prisma.conversation.create({
          data: { clientId: userId, workerId: workerUserId },
          select: { id: true },
        });
      } catch (error) {
        // Carrera: otra petición la creó entre el find y el create (@@unique clientId+workerId).
        if ((error as { code?: string }).code !== 'P2002') throw error;
        conversation = await this.prisma.conversation.findFirst({
          where: pairWhere,
          select: { id: true },
        });
        if (!conversation) throw error;
      }
    }
    return this.getSummary(conversation.id, userId);
  }

  /**
   * Bandeja de entrada. Una conversación sin mensajes solo la ve quien la inició (el cliente);
   * el trabajador la ve cuando recibe el primer mensaje.
   */
  async listConversations(userId: string): Promise<ConversationSummaryDto[]> {
    const rows = (await this.prisma.conversation.findMany({
      where: {
        OR: [{ clientId: userId }, { workerId: userId, lastMessageAt: { not: null } }],
      },
      orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
      take: INBOX_MAX_CONVERSATIONS,
      select: SUMMARY_SELECT,
    })) as SummaryRow[];
    return this.buildSummaries(userId, rows);
  }

  async getConversation(userId: string, conversationId: string): Promise<ConversationSummaryDto> {
    await this.access.getForParticipant(conversationId, userId);
    return this.getSummary(conversationId, userId);
  }

  // --- Mensajes --------------------------------------------------------------------------

  /** Paginación por cursor: del más nuevo al más antiguo; `nextCursor` carga los anteriores. */
  async getMessages(
    userId: string,
    conversationId: string,
    query: ListMessagesQueryDto,
  ): Promise<MessagesPageDto> {
    await this.access.getForParticipant(conversationId, userId);
    const limit = query.limit ?? MESSAGES_DEFAULT_LIMIT;

    if (query.cursor) {
      const anchor = await this.prisma.message.findFirst({
        where: { id: query.cursor, conversationId },
        select: { id: true },
      });
      if (!anchor) throw new BadRequestException('El cursor no es válido');
    }

    const rows = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: await Promise.all(page.map((row) => this.toMessageDto(row))),
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  /** Persiste un mensaje y lo reparte por Socket.IO a ambos participantes. */
  async sendMessage(userId: string, dto: SendMessageDto): Promise<MessageResponseDto> {
    const conversation = await this.access.getForSending(dto.conversationId, userId);
    const input = normalizeMessageInput(dto, userId);

    const now = new Date();
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: userId,
          type: input.type,
          content: input.content,
          imagePath: input.imagePath,
          latitude: input.latitude,
          longitude: input.longitude,
          createdAt: now,
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: now },
        select: { id: true },
      }),
    ]);

    const response = await this.toMessageDto(message);
    const peerId = this.access.otherParticipantId(conversation, userId);
    this.realtime.emitToUser(userId, ChatServerEvent.MESSAGE_NEW, response);
    this.realtime.emitToUser(peerId, ChatServerEvent.MESSAGE_NEW, response);
    await this.notifyConversationUpdated(conversation.id, [userId, peerId]);
    return response;
  }

  /** Marca como leídos los mensajes recibidos y avisa a la otra persona. */
  async markRead(
    userId: string,
    conversationId: string,
  ): Promise<{ updated: number; readAt: Date | null }> {
    const conversation = await this.access.getForParticipant(conversationId, userId);
    const readAt = new Date();
    const { count } = await this.prisma.message.updateMany({
      where: { conversationId, senderId: { not: userId }, readAt: null },
      data: { readAt },
    });
    if (count === 0) {
      return { updated: 0, readAt: null };
    }

    const peerId = this.access.otherParticipantId(conversation, userId);
    const receipt = { conversationId, readerId: userId, readAt };
    this.realtime.emitToUser(peerId, ChatServerEvent.MESSAGE_READ, receipt);
    this.realtime.emitToUser(userId, ChatServerEvent.MESSAGE_READ, receipt);
    await this.notifyConversationUpdated(conversationId, [userId]);
    return { updated: count, readAt };
  }

  /** `conversation:join`: confirma que participa (404 si no). */
  async assertCanJoin(userId: string, conversationId: string): Promise<void> {
    await this.access.getForParticipant(conversationId, userId);
  }

  // --- Imágenes --------------------------------------------------------------------------

  /** Sube la imagen al bucket PRIVADO y devuelve la ruta + una URL firmada de vigencia corta. */
  async uploadImage(
    userId: string,
    conversationId: string,
    file: UploadedImage | undefined,
  ): Promise<ChatImageUploadDto> {
    await this.access.getForSending(conversationId, userId);
    if (!file) {
      throw new BadRequestException('Adjunta una imagen en el campo "file"');
    }

    const path = `${chatImagePrefix(conversationId, userId)}${randomUUID()}.webp`;
    const imagePath = await this.storage.uploadPrivate(file.buffer, path);
    try {
      const signedUrl = await this.storage.getSignedUrl(imagePath, CHAT_IMAGE_URL_TTL_SECONDS);
      return { imagePath, signedUrl };
    } catch (error) {
      await this.storage.deleteObjectSilently(imagePath, 'private');
      throw error;
    }
  }

  // --- Bloqueo y reportes ----------------------------------------------------------------

  async block(userId: string, conversationId: string): Promise<ConversationSummaryDto> {
    const conversation = await this.access.getForParticipant(conversationId, userId);
    const peerId = this.access.otherParticipantId(conversation, userId);
    await this.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: peerId } },
      create: { blockerId: userId, blockedId: peerId },
      update: {},
    });
    await this.notifyConversationUpdated(conversationId, [userId, peerId]);
    return this.getSummary(conversationId, userId);
  }

  /** Quita SOLO el bloqueo que hizo el usuario (no el de la otra persona). */
  async unblock(userId: string, conversationId: string): Promise<ConversationSummaryDto> {
    const conversation = await this.access.getForParticipant(conversationId, userId);
    const peerId = this.access.otherParticipantId(conversation, userId);
    await this.prisma.block.deleteMany({ where: { blockerId: userId, blockedId: peerId } });
    await this.notifyConversationUpdated(conversationId, [userId, peerId]);
    return this.getSummary(conversationId, userId);
  }

  /** Reporte mínimo (la moderación llega con el módulo de administración). Idempotente mientras siga abierto. */
  async report(userId: string, conversationId: string, reason: string): Promise<ReportCreatedDto> {
    await this.access.getForParticipant(conversationId, userId);
    const existing = await this.prisma.report.findFirst({
      where: {
        reporterId: userId,
        targetType: ReportTarget.CONVERSATION,
        targetId: conversationId,
        status: ReportStatus.OPEN,
      },
      select: { id: true, status: true },
    });
    if (existing) {
      return { id: existing.id, status: existing.status };
    }
    const created = await this.prisma.report.create({
      data: {
        reporterId: userId,
        targetType: ReportTarget.CONVERSATION,
        targetId: conversationId,
        reason,
      },
      select: { id: true, status: true },
    });
    return { id: created.id, status: created.status };
  }

  // --- Internos --------------------------------------------------------------------------

  private async getSummary(
    conversationId: string,
    userId: string,
  ): Promise<ConversationSummaryDto> {
    const row = (await this.prisma.conversation.findFirst({
      where: { id: conversationId, OR: [{ clientId: userId }, { workerId: userId }] },
      select: SUMMARY_SELECT,
    })) as SummaryRow | null;
    if (!row) {
      throw new NotFoundException('Conversación no encontrada');
    }
    const [summary] = await this.buildSummaries(userId, [row]);
    if (!summary) {
      throw new NotFoundException('Conversación no encontrada');
    }
    return summary;
  }

  private async buildSummaries(
    userId: string,
    rows: SummaryRow[],
  ): Promise<ConversationSummaryDto[]> {
    if (rows.length === 0) return [];

    const conversationIds = rows.map((row) => row.id);
    const peerIds = rows.map((row) => this.access.otherParticipantId(row, userId));

    const [unreadGroups, blocks] = await Promise.all([
      this.prisma.message.groupBy({
        by: ['conversationId'],
        where: { conversationId: { in: conversationIds }, senderId: { not: userId }, readAt: null },
        _count: { _all: true },
      }),
      this.prisma.block.findMany({
        where: {
          OR: [
            { blockerId: userId, blockedId: { in: peerIds } },
            { blockerId: { in: peerIds }, blockedId: userId },
          ],
        },
        select: { blockerId: true, blockedId: true },
      }),
    ]);
    const unreadByConversation = new Map(
      unreadGroups.map((group) => [group.conversationId, group._count._all] as const),
    );

    return rows.map((row) => {
      const peerIsWorker = row.workerId !== userId;
      const peer = peerIsWorker ? row.worker : row.client;
      const peerId = peer.id;
      const blockedByMe = blocks.some((b) => b.blockerId === userId && b.blockedId === peerId);
      const blockedByPeer = blocks.some((b) => b.blockerId === peerId && b.blockedId === userId);
      const last = row.messages[0] ?? null;
      const workerProfile = peerIsWorker ? row.worker.workerProfile : null;

      return {
        id: row.id,
        peer: {
          id: peer.id,
          name: peer.name,
          headline: workerProfile?.headline ?? null,
          workerProfileId: workerProfile?.id ?? null,
        },
        lastMessage: last
          ? {
              id: last.id,
              senderId: last.senderId,
              type: last.type,
              preview: buildPreview(last),
              createdAt: last.createdAt,
            }
          : null,
        unreadCount: unreadByConversation.get(row.id) ?? 0,
        updatedAt: row.lastMessageAt ?? row.createdAt,
        blockedByMe,
        canSend: !blockedByMe && !blockedByPeer,
      };
    });
  }

  /** Envía `conversation:updated` (resumen personalizado) a cada usuario; nunca rompe la operación. */
  private async notifyConversationUpdated(
    conversationId: string,
    userIds: string[],
  ): Promise<void> {
    await Promise.all(
      userIds.map(async (id) => {
        try {
          const summary = await this.getSummary(conversationId, id);
          this.realtime.emitToUser(id, ChatServerEvent.CONVERSATION_UPDATED, summary);
        } catch (error) {
          this.logger.warn(
            `No se pudo notificar conversation:updated: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }),
    );
  }

  /** Convierte la fila en DTO; las imágenes se firman al vuelo con vigencia corta. */
  private async toMessageDto(row: MessageSource): Promise<MessageResponseDto> {
    let imageUrl: string | null = null;
    if (row.type === MessageType.IMAGE && row.imagePath) {
      try {
        imageUrl = await this.storage.getSignedUrl(row.imagePath, CHAT_IMAGE_URL_TTL_SECONDS);
      } catch {
        imageUrl = null; // el mensaje se entrega igual; el cliente muestra "foto no disponible"
      }
    }
    return MessageResponseDto.fromEntity(row, imageUrl);
  }
}
