import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, Matches, ValidateNested } from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME_MESSAGE = 'La hora debe tener el formato HH:mm (por ejemplo 08:00)';

export const SCHEDULE_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type ScheduleDayKey = (typeof SCHEDULE_DAYS)[number];

export class ScheduleDayDto {
  @ApiProperty({ description: 'true si no atiende ese día' })
  @IsBoolean({ message: 'Indica si atiendes o no ese día' })
  closed: boolean;

  @ApiPropertyOptional({ example: '08:00' })
  @IsOptional()
  @Matches(TIME_REGEX, { message: TIME_MESSAGE })
  from?: string;

  @ApiPropertyOptional({ example: '17:00' })
  @IsOptional()
  @Matches(TIME_REGEX, { message: TIME_MESSAGE })
  to?: string;
}

/** Horario de atención por día (lun=mon ... dom=sun). Los días omitidos se consideran sin definir. */
export class ScheduleDto {
  @ApiPropertyOptional({ type: ScheduleDayDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleDayDto)
  mon?: ScheduleDayDto;
  @ApiPropertyOptional({ type: ScheduleDayDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleDayDto)
  tue?: ScheduleDayDto;
  @ApiPropertyOptional({ type: ScheduleDayDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleDayDto)
  wed?: ScheduleDayDto;
  @ApiPropertyOptional({ type: ScheduleDayDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleDayDto)
  thu?: ScheduleDayDto;
  @ApiPropertyOptional({ type: ScheduleDayDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleDayDto)
  fri?: ScheduleDayDto;
  @ApiPropertyOptional({ type: ScheduleDayDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleDayDto)
  sat?: ScheduleDayDto;
  @ApiPropertyOptional({ type: ScheduleDayDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleDayDto)
  sun?: ScheduleDayDto;
}

/** Canales de contacto que el trabajador decide mostrar en su perfil público. */
export class VisibleChannelsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'El canal "teléfono" debe ser verdadero o falso' })
  phone?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'El canal "WhatsApp" debe ser verdadero o falso' })
  whatsapp?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'El canal "correo" debe ser verdadero o falso' })
  email?: boolean;
}

/** Formato guardado en la columna JSON `schedule`. */
export type StoredSchedule = Partial<
  Record<ScheduleDayKey, { closed: boolean; from?: string; to?: string }>
>;

/** Formato guardado en la columna JSON `visibleChannels`. */
export interface StoredVisibleChannels {
  phone: boolean;
  whatsapp: boolean;
  email: boolean;
}
