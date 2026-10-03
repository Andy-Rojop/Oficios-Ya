import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { MessageType } from '../../generated/prisma/enums';
import { PREVIEW_MAX_LENGTH } from '../chat.constants';

/** Decimal de Prisma (o number/string) convertible a number. */
type DecimalLike = number | string | { toNumber(): number };

const decimalToNumber = (value: DecimalLike): number =>
  typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : value.toNumber();

/** Fila de Message con lo estrictamente necesario para armar el DTO. */
export interface MessageSource {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  imagePath: string | null;
  latitude: DecimalLike | null;
  longitude: DecimalLike | null;
  readAt: Date | null;
  createdAt: Date;
}

export class MessageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() conversationId: string;
  @ApiProperty() senderId: string;
  @ApiProperty({ enum: ['TEXT', 'IMAGE', 'ADDRESS'] }) type: MessageType;
  @ApiPropertyOptional({ nullable: true }) content: string | null;
  @ApiPropertyOptional({
    nullable: true,
    description: 'URL firmada de vigencia corta (solo IMAGE); la ruta del bucket nunca se expone',
  })
  imageUrl: string | null;
  @ApiPropertyOptional({ nullable: true }) latitude: number | null;
  @ApiPropertyOptional({ nullable: true }) longitude: number | null;
  @ApiPropertyOptional({ nullable: true }) readAt: Date | null;
  @ApiProperty() createdAt: Date;

  static fromEntity(message: MessageSource, imageUrl: string | null): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.id = message.id;
    dto.conversationId = message.conversationId;
    dto.senderId = message.senderId;
    dto.type = message.type;
    dto.content = message.content;
    dto.imageUrl = imageUrl;
    dto.latitude = message.latitude === null ? null : decimalToNumber(message.latitude);
    dto.longitude = message.longitude === null ? null : decimalToNumber(message.longitude);
    dto.readAt = message.readAt;
    dto.createdAt = message.createdAt;
    return dto;
  }
}

export class MessagesPageDto {
  @ApiProperty({ type: [MessageResponseDto], description: 'Del más nuevo al más antiguo' })
  items: MessageResponseDto[];

  @ApiPropertyOptional({
    nullable: true,
    description: 'Enviar como ?cursor= para cargar mensajes más antiguos',
  })
  nextCursor: string | null;
}

export class ChatPeerDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({
    nullable: true,
    description: 'Oficio principal si la otra persona es trabajador',
  })
  headline: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Id del perfil público si es trabajador' })
  workerProfileId: string | null;
}

export class LastMessageDto {
  @ApiProperty() id: string;
  @ApiProperty() senderId: string;
  @ApiProperty({ enum: ['TEXT', 'IMAGE', 'ADDRESS'] }) type: MessageType;
  @ApiProperty({ description: 'Texto corto para la bandeja' }) preview: string;
  @ApiProperty() createdAt: Date;
}

export class ConversationSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() peer: ChatPeerDto;
  @ApiPropertyOptional({ nullable: true, type: LastMessageDto }) lastMessage: LastMessageDto | null;
  @ApiProperty() unreadCount: number;
  @ApiProperty({ description: 'Fecha del último mensaje (o de creación si aún no hay)' })
  updatedAt: Date;
  @ApiProperty({ description: 'Yo bloqueé a la otra persona' }) blockedByMe: boolean;
  @ApiProperty({ description: 'false si hay un bloqueo en cualquier dirección (no revela cuál)' })
  canSend: boolean;
}

export class ChatImageUploadDto {
  @ApiProperty({ description: 'Ruta en el bucket privado; se envía en message:send (type IMAGE)' })
  imagePath: string;
  @ApiProperty({ description: 'URL firmada de vigencia corta para previsualizar' })
  signedUrl: string;
}

export class ReportCreatedDto {
  @ApiProperty() id: string;
  @ApiProperty({ example: 'OPEN' }) status: string;
}

/** Texto corto para la bandeja de entrada (sin filtrar contenido sensible más allá del propio mensaje). */
export function buildPreview(message: { type: MessageType; content: string | null }): string {
  if (message.type === 'IMAGE') return 'Foto';
  if (message.type === 'ADDRESS') return 'Dirección compartida';
  const text = (message.content ?? '').replace(/\s+/g, ' ').trim();
  return text.length > PREVIEW_MAX_LENGTH ? `${text.slice(0, PREVIEW_MAX_LENGTH - 1)}…` : text;
}
