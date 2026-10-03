import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { NOTIFICATIONS_DEFAULT_LIMIT, NOTIFICATIONS_MAX_LIMIT } from '../notifications.constants';

/** GET /notifications */
export class ListNotificationsQueryDto {
  @ApiPropertyOptional({ description: 'Id de la última notificación cargada (nextCursor)' })
  @IsOptional()
  @IsUUID('all', { message: 'El cursor no es válido' })
  cursor?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: NOTIFICATIONS_MAX_LIMIT,
    default: NOTIFICATIONS_DEFAULT_LIMIT,
  })
  @IsOptional()
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite mínimo es 1' })
  @Max(NOTIFICATIONS_MAX_LIMIT, { message: `El límite máximo es ${NOTIFICATIONS_MAX_LIMIT}` })
  limit?: number;

  @ApiPropertyOptional({ description: 'Solo las no leídas' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === true || value === 'true' || value === '1')
  @IsBoolean({ message: 'unreadOnly debe ser verdadero o falso' })
  unreadOnly?: boolean;
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export interface NotificationsPageDto {
  items: NotificationDto[];
  unreadCount: number;
  nextCursor: string | null;
}

/** Datos para crear una notificación desde otros módulos. */
export interface NotifyInput {
  type: string;
  title: string;
  body: string;
  link?: string | null;
}
