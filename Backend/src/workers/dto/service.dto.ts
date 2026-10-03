import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PriceMode, PriceUnit } from '../../generated/prisma/enums';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** RF-014/RF-015. priceAmount es obligatorio y positivo salvo con priceMode = NEGOTIABLE. */
export class CreateServiceDto {
  @ApiProperty()
  @IsUUID('all', { message: 'La categoría seleccionada no es válida' })
  categoryId: string;

  @ApiProperty({ example: 'Reparación de puertas' })
  @Transform(trim)
  @IsString({ message: 'El nombre del servicio debe ser texto' })
  @MinLength(3, { message: 'El nombre del servicio debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre del servicio no puede superar 100 caracteres' })
  name: string;

  @ApiProperty()
  @Transform(trim)
  @IsString({ message: 'La descripción del servicio debe ser texto' })
  @MinLength(10, { message: 'La descripción del servicio debe tener al menos 10 caracteres' })
  @MaxLength(1000, { message: 'La descripción del servicio no puede superar 1000 caracteres' })
  description: string;

  @ApiProperty({ enum: ['FIXED', 'FROM', 'NEGOTIABLE'] })
  @IsEnum(PriceMode, { message: 'El tipo de precio debe ser FIXED, FROM o NEGOTIABLE' })
  priceMode: PriceMode;

  @ApiPropertyOptional({ nullable: true, description: 'GTQ. Obligatorio y > 0 salvo NEGOTIABLE' })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'El precio debe ser un número' })
  priceAmount?: number | null;

  @ApiPropertyOptional({ enum: ['JOB', 'HOUR', 'VISIT', 'METER'], default: 'JOB' })
  @IsOptional()
  @IsEnum(PriceUnit, { message: 'La unidad de precio debe ser JOB, HOUR, VISIT o METER' })
  priceUnit?: PriceUnit;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso' })
  active?: boolean;
}

/** PATCH: todos los campos son opcionales; el precio se valida combinado con el valor guardado. */
export class UpdateServiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('all', { message: 'La categoría seleccionada no es válida' })
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'El nombre del servicio debe ser texto' })
  @MinLength(3, { message: 'El nombre del servicio debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre del servicio no puede superar 100 caracteres' })
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'La descripción del servicio debe ser texto' })
  @MinLength(10, { message: 'La descripción del servicio debe tener al menos 10 caracteres' })
  @MaxLength(1000, { message: 'La descripción del servicio no puede superar 1000 caracteres' })
  description?: string;

  @ApiPropertyOptional({ enum: ['FIXED', 'FROM', 'NEGOTIABLE'] })
  @IsOptional()
  @IsEnum(PriceMode, { message: 'El tipo de precio debe ser FIXED, FROM o NEGOTIABLE' })
  priceMode?: PriceMode;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'El precio debe ser un número' })
  priceAmount?: number | null;

  @ApiPropertyOptional({ enum: ['JOB', 'HOUR', 'VISIT', 'METER'] })
  @IsOptional()
  @IsEnum(PriceUnit, { message: 'La unidad de precio debe ser JOB, HOUR, VISIT o METER' })
  priceUnit?: PriceUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso' })
  active?: boolean;
}
