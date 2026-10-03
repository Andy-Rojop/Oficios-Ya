import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LIMITS } from '@oficiosya/shared';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { REPORT_REASON_MAX_LENGTH, REPORT_REASON_MIN_LENGTH } from '../../chat/chat.constants';
import { REVIEWS_MAX_LIMIT } from '../reviews.constants';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const emptyToUndefined = ({ value }: { value: unknown }) => {
  const trimmed = typeof value === 'string' ? value.trim() : value;
  return trimmed === '' ? undefined : trimmed;
};

/** POST /reviews */
export class CreateReviewDto {
  @ApiProperty({ description: 'Solicitud finalizada y confirmada que se califica' })
  @IsUUID('all', { message: 'La solicitud no es válida' })
  requestId: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt({ message: 'La calificación debe ser un número entero de 1 a 5' })
  @Min(1, { message: 'La calificación mínima es 1' })
  @Max(5, { message: 'La calificación máxima es 5' })
  rating: number;

  @ApiPropertyOptional({ maxLength: LIMITS.REVIEW_COMMENT_MAX })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString({ message: 'El comentario debe ser texto' })
  @MaxLength(LIMITS.REVIEW_COMMENT_MAX, {
    message: `El comentario no puede superar ${LIMITS.REVIEW_COMMENT_MAX} caracteres`,
  })
  comment?: string;
}

/** PATCH /reviews/:id/reply */
export class ReplyReviewDto {
  @ApiProperty({ minLength: 1, maxLength: LIMITS.REVIEW_COMMENT_MAX })
  @Transform(trim)
  @IsString({ message: 'La respuesta debe ser texto' })
  @MinLength(1, { message: 'Escribe tu respuesta' })
  @MaxLength(LIMITS.REVIEW_COMMENT_MAX, {
    message: `La respuesta no puede superar ${LIMITS.REVIEW_COMMENT_MAX} caracteres`,
  })
  reply: string;
}

/** POST /reviews/:id/report */
export class ReportReviewDto {
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

/** GET /workers/:id/reviews */
export class ListReviewsQueryDto {
  @ApiPropertyOptional({ description: 'Id de la última reseña ya cargada (nextCursor)' })
  @IsOptional()
  @IsUUID('all', { message: 'El cursor no es válido' })
  cursor?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: REVIEWS_MAX_LIMIT })
  @IsOptional()
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite mínimo es 1' })
  @Max(REVIEWS_MAX_LIMIT, { message: `El límite máximo es ${REVIEWS_MAX_LIMIT}` })
  limit?: number;
}

/** Reseña pública: sin ids ni datos privados del cliente (solo nombre abreviado). */
export interface PublicReviewDto {
  id: string;
  rating: number;
  comment: string | null;
  authorName: string;
  workerReply: string | null;
  repliedAt: Date | null;
  createdAt: Date;
}

export interface WorkerReviewsPageDto {
  ratingAverage: number;
  ratingCount: number;
  items: PublicReviewDto[];
  nextCursor: string | null;
}

export interface ReviewRow {
  id: string;
  rating: number;
  comment: string | null;
  workerReply: string | null;
  repliedAt: Date | null;
  createdAt: Date;
  client: { name: string };
}

/** "Ana García López" -> "Ana G." (nunca se expone el nombre completo ni el teléfono). */
export function shortName(fullName: string): string {
  const [first, second] = fullName.trim().split(/\s+/);
  if (!first) return 'Cliente';
  return second ? `${first} ${second.charAt(0).toUpperCase()}.` : first;
}

export function toPublicReview(row: ReviewRow): PublicReviewDto {
  return {
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    authorName: shortName(row.client.name),
    workerReply: row.workerReply,
    repliedAt: row.repliedAt,
    createdAt: row.createdAt,
  };
}
