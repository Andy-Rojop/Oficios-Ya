import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Datos mínimos de una conversación para decidir accesos. */
export interface AccessibleConversation {
  id: string;
  clientId: string;
  workerId: string;
}

/**
 * ÚNICO lugar donde se decide quién puede ver o escribir en una conversación:
 *  - solo los participantes (cliente y trabajador) acceden a ella;
 *  - si existe un bloqueo en cualquier dirección, nadie puede enviar mensajes.
 */
@Injectable()
export class ConversationAccessService {
  constructor(private readonly prisma: PrismaService) {}

  isParticipant(conversation: AccessibleConversation, userId: string): boolean {
    return conversation.clientId === userId || conversation.workerId === userId;
  }

  /** Id de la otra persona de la conversación (asume que `userId` participa). */
  otherParticipantId(conversation: AccessibleConversation, userId: string): string {
    return conversation.clientId === userId ? conversation.workerId : conversation.clientId;
  }

  /**
   * Carga la conversación solo si `userId` participa. Para no revelar si un identificador existe,
   * "no existe" y "no participas" responden igual (404).
   */
  async getForParticipant(conversationId: string, userId: string): Promise<AccessibleConversation> {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, clientId: true, workerId: true },
    });
    if (!conversation || !this.isParticipant(conversation, userId)) {
      throw new NotFoundException('Conversación no encontrada');
    }
    return conversation;
  }

  /** true si A bloqueó a B o B bloqueó a A. */
  async isBlockedEitherWay(userA: string, userB: string): Promise<boolean> {
    const block = await this.prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userA, blockedId: userB },
          { blockerId: userB, blockedId: userA },
        ],
      },
      select: { id: true },
    });
    return block !== null;
  }

  /** Lanza 403 si hay un bloqueo entre ambos (en cualquier dirección). */
  async assertNotBlocked(userA: string, userB: string): Promise<void> {
    if (await this.isBlockedEitherWay(userA, userB)) {
      throw new ForbiddenException('No puedes enviar mensajes en esta conversación');
    }
  }

  /** Participante + sin bloqueo: requisito para enviar mensajes o subir imágenes. */
  async getForSending(conversationId: string, userId: string): Promise<AccessibleConversation> {
    const conversation = await this.getForParticipant(conversationId, userId);
    await this.assertNotBlocked(userId, this.otherParticipantId(conversation, userId));
    return conversation;
  }
}
