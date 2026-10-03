import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ScheduleDto, VisibleChannelsDto } from './schedule.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const trimOrNull = ({ value }: { value: unknown }) => {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') {
    const next = value.trim();
    return next === '' ? null : next;
  }
  return value;
};

/**
 * PUT /workers/me. `headline` y `description` son obligatorios; el resto es opcional:
 * - Omitido (undefined): no se modifica.
 * - null: se borra el valor.
 */
export class UpdateWorkerProfileDto {
  @ApiProperty({ example: 'Carpintero con 10 años de experiencia' })
  @Transform(trim)
  @IsString({ message: 'El oficio principal debe ser texto' })
  @MinLength(3, { message: 'El oficio principal debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El oficio principal no puede superar 100 caracteres' })
  headline: string;

  @ApiProperty()
  @Transform(trim)
  @IsString({ message: 'La descripción debe ser texto' })
  @MinLength(10, { message: 'La descripción debe tener al menos 10 caracteres' })
  @MaxLength(1000, { message: 'La descripción no puede superar 1000 caracteres' })
  description: string;

  @ApiPropertyOptional({ nullable: true, minimum: 0, maximum: 60 })
  @IsOptional()
  @IsInt({ message: 'Los años de experiencia deben ser un número entero' })
  @Min(0, { message: 'Los años de experiencia no pueden ser negativos' })
  @Max(60, { message: 'Los años de experiencia no pueden superar 60' })
  experienceYears?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID('all', { message: 'La categoría seleccionada no es válida' })
  mainCategoryId?: string | null;

  @ApiPropertyOptional({ type: ScheduleDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleDto)
  schedule?: ScheduleDto | null;

  @ApiPropertyOptional({ type: VisibleChannelsDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => VisibleChannelsDto)
  visibleChannels?: VisibleChannelsDto | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'PRIVADO: 13 dígitos. Nunca se expone públicamente',
  })
  @IsOptional()
  @Transform(trimOrNull)
  @ValidateIf((_, value) => typeof value === 'string')
  @Matches(/^\d{13}$/, { message: 'El DPI debe tener 13 dígitos' })
  dpi?: string | null;

  @ApiPropertyOptional({ nullable: true, description: 'PRIVADO. Nunca se expone públicamente' })
  @IsOptional()
  @Transform(trimOrNull)
  @ValidateIf((_, value) => typeof value === 'string')
  @Matches(/^\d{1,12}-?[\dKk]$/, { message: 'El NIT no es válido' })
  nit?: string | null;
}
