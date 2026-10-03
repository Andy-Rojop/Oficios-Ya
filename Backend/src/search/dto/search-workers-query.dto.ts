import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Availability } from '../../generated/prisma/enums';

export const SEARCH_SORTS = ['near', 'rating', 'price', 'recent'] as const;
export type SearchSort = (typeof SEARCH_SORTS)[number];

export const SEARCH_DEFAULT_LIMIT = 20;
export const SEARCH_MAX_LIMIT = 50;

interface TransformParams {
  value: unknown;
  key: string;
  obj: Record<string, unknown>;
}

/**
 * Los parámetros vacíos del formulario (?minRating=) se tratan como "no enviado". Se mira el valor
 * original (obj[key]) porque la conversión implícita convertiría '' en 0 antes de llegar aquí.
 */
const emptyToUndefined = ({ value, key, obj }: TransformParams) => {
  const original = obj?.[key];
  if (original === '' || original === null) return undefined;
  return value;
};

const trimOrUndefined = ({ value, key, obj }: TransformParams) => {
  const original = obj?.[key];
  if (typeof original !== 'string') return emptyToUndefined({ value, key, obj });
  const trimmed = original.trim();
  return trimmed === '' ? undefined : trimmed;
};

/** RF-029 a RF-035. Todos los filtros son opcionales y se combinan con AND. */
export class SearchWorkersQueryDto {
  @ApiPropertyOptional({ description: 'Texto libre: oficio, descripción o nombre de servicio' })
  @Transform(trimOrUndefined)
  @IsOptional()
  @IsString({ message: 'La búsqueda debe ser texto' })
  @MaxLength(100, { message: 'La búsqueda no puede superar 100 caracteres' })
  q?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUUID('all', { message: 'La categoría no es válida' })
  categoryId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsUUID('all', { message: 'La zona no es válida' })
  zoneId?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 5 })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'La calificación mínima debe ser un número' },
  )
  @Min(0, { message: 'La calificación mínima debe estar entre 0 y 5' })
  @Max(5, { message: 'La calificación mínima debe estar entre 0 y 5' })
  minRating?: number;

  @ApiPropertyOptional({ enum: ['AVAILABLE', 'BUSY', 'UNAVAILABLE'] })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEnum(Availability, { message: 'La disponibilidad debe ser AVAILABLE, BUSY o UNAVAILABLE' })
  availability?: Availability;

  @ApiPropertyOptional({ minimum: 0, description: 'GTQ. Solo servicios activos con precio' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'El precio mínimo debe ser un número' },
  )
  @Min(0, { message: 'El precio mínimo no puede ser negativo' })
  priceMin?: number;

  @ApiPropertyOptional({ minimum: 0, description: 'GTQ. Solo servicios activos con precio' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'El precio máximo debe ser un número' },
  )
  @Min(0, { message: 'El precio máximo no puede ser negativo' })
  priceMax?: number;

  @ApiPropertyOptional({ enum: SEARCH_SORTS, default: 'rating' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsIn(SEARCH_SORTS, { message: 'El orden debe ser near, rating, price o recent' })
  sort?: SearchSort;

  @ApiPropertyOptional({
    description: 'Latitud del usuario (orden "near", centro de zona aproximado)',
  })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'La latitud debe ser un número' })
  @Min(-90, { message: 'La latitud no es válida' })
  @Max(90, { message: 'La latitud no es válida' })
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitud del usuario (orden "near")' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsNumber(
    { allowNaN: false, allowInfinity: false },
    { message: 'La longitud debe ser un número' },
  )
  @Min(-180, { message: 'La longitud no es válida' })
  @Max(180, { message: 'La longitud no es válida' })
  lng?: number;

  @ApiPropertyOptional({ description: 'Cursor opaco devuelto por la página anterior' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString({ message: 'El cursor no es válido' })
  @MaxLength(500, { message: 'El cursor no es válido' })
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: SEARCH_MAX_LIMIT, default: SEARCH_DEFAULT_LIMIT })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite debe ser al menos 1' })
  @Max(SEARCH_MAX_LIMIT, { message: `El límite no puede superar ${SEARCH_MAX_LIMIT}` })
  limit?: number;
}

export class SearchSuggestionsQueryDto {
  @ApiPropertyOptional({ description: 'Mínimo 2 caracteres' })
  @Transform(trimOrUndefined)
  @IsOptional()
  @IsString({ message: 'La búsqueda debe ser texto' })
  @MaxLength(60, { message: 'La búsqueda no puede superar 60 caracteres' })
  q?: string;
}
