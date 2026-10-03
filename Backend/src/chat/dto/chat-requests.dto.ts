import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MessageType } from '../../generated/prisma/enums';
import {
  MESSAGES_DEFAULT_LIMIT,
  MESSAGES_MAX_LIMIT,
  REPORT_REASON_MAX_LENGTH,
  REPORT_REASON_MIN_LENGTH,
} from '../chat.constants';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** POST /conversations — se envía exactamente uno de los dos identificadores. */
export class CreateConversationDto {
  @ApiPropertyOptional({ description: 'Id del perfil de trabajador (el del perfil público)' })
  @IsOptional()
  @IsUUID('all', { message: 'El perfil del trabajador no es válido' })
  workerProfileId?: string;

  @ApiPropertyOptional({ description: 'Id del usuario trabajador (alternativa a workerProfileId)' })
  @IsOptional()
  @IsUUID('all', { message: 'El usuario trabajador no es válido' })
  workerUserId?: string;
}

/** GET /conversations/:id/messages */
export class ListMessagesQueryDto {
  @ApiPropertyOptional({ description: 'Id del mensaje más antiguo ya cargado (nextCursor)' })
  @IsOptional()
  @IsUUID('all', { message: 'El cursor no es válido' })
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: MESSAGES_MAX_LIMIT, default: MESSAGES_DEFAULT_LIMIT })
  @IsOptional()
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite mínimo es 1' })
  @Max(MESSAGES_MAX_LIMIT, { message: `El límite máximo es ${MESSAGES_MAX_LIMIT}` })
  limit?: number;
}

/** POST /conversations/:id/report */
export class ReportConversationDto {
  @ApiProperty({ minLength: REPORT_REASON_MIN_LENGTH, maxLength: REPORT_REASON_MAX_LENGTH })
  @Transform(trim)
  @IsString({ message: 'El motivo debe ser texto' })
  @MinLength(REPORT_REASON_MIN_LENGTH, {
    message: `Describe el motivo con al menos ${REPORT_REASON_MIN_LENGTH} caracteres`,
  })
  @MaxLength(REPORT_REASON_MAX_LENGTH, {
    message: `El motivo no puede superar ${REPORT_REASON_MAX_LENGTH} caracteres`,
  })
  reason: string;
}

/** Payload del evento Socket.IO `message:send`. */
export class SendMessageDto {
  @ApiProperty()
  @IsUUID('all', { message: 'La conversación no es válida' })
  conversationId: string;

  @ApiProperty({ enum: MessageType })
  @IsEnum(MessageType, { message: 'El tipo de mensaje no es válido' })
  type: MessageType;

  @ApiPropertyOptional({
    description: 'TEXT: mensaje. ADDRESS: dirección con referencias. IMAGE: pie opcional',
  })
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'El contenido debe ser texto' })
  @MaxLength(2000, { message: 'El mensaje es demasiado largo' })
  content?: string;

  @ApiPropertyOptional({ description: 'IMAGE: ruta devuelta por POST /conversations/:id/images' })
  @IsOptional()
  @IsString({ message: 'La imagen no es válida' })
  @MaxLength(300, { message: 'La imagen no es válida' })
  imagePath?: string;

  @ApiPropertyOptional({ description: 'ADDRESS: latitud (opcional, requiere longitud)' })
  @IsOptional()
  @IsNumber({}, { message: 'La latitud no es válida' })
  @Min(-90, { message: 'La latitud no es válida' })
  @Max(90, { message: 'La latitud no es válida' })
  latitude?: number;

  @ApiPropertyOptional({ description: 'ADDRESS: longitud (opcional, requiere latitud)' })
  @IsOptional()
  @IsNumber({}, { message: 'La longitud no es válida' })
  @Min(-180, { message: 'La longitud no es válida' })
  @Max(180, { message: 'La longitud no es válida' })
  longitude?: number;
}

/** Payload de `conversation:join` y `message:read`. */
export class ConversationIdPayloadDto {
  @ApiProperty()
  @IsUUID('all', { message: 'La conversación no es válida' })
  conversationId: string;
}
