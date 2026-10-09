import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { QuoteStatus, RequestStatus } from '../../generated/prisma/enums';
import {
  QUOTE_AMOUNT_MAX,
  QUOTE_SCOPE_MAX_LENGTH,
  QUOTE_SCOPE_MIN_LENGTH,
  REQUEST_DESCRIPTION_MAX_LENGTH,
  REQUEST_DESCRIPTION_MIN_LENGTH,
} from '../request.constants';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** POST /requests: se envía exactamente uno de workerProfileId / workerUserId. */
export class CreateRequestDto {
  @ApiPropertyOptional({ description: 'Id del perfil de trabajador (el del perfil público)' })
  @IsOptional()
  @IsUUID('all', { message: 'El perfil del trabajador no es válido' })
  workerProfileId?: string;

  @ApiPropertyOptional({ description: 'Id del usuario trabajador (alternativa a workerProfileId)' })
  @IsOptional()
  @IsUUID('all', { message: 'El usuario trabajador no es válido' })
  workerUserId?: string;

  @ApiPropertyOptional({ description: 'Servicio del trabajador al que se refiere la solicitud' })
  @IsOptional()
  @IsUUID('all', { message: 'El servicio no es válido' })
  serviceId?: string;

  @ApiProperty({
    minLength: REQUEST_DESCRIPTION_MIN_LENGTH,
    maxLength: REQUEST_DESCRIPTION_MAX_LENGTH,
  })
  @Transform(trim)
  @IsString({ message: 'La descripción debe ser texto' })
  @MinLength(REQUEST_DESCRIPTION_MIN_LENGTH, {
    message: `Describa lo que necesita con al menos ${REQUEST_DESCRIPTION_MIN_LENGTH} caracteres`,
  })
  @MaxLength(REQUEST_DESCRIPTION_MAX_LENGTH, {
    message: `La descripción no puede superar ${REQUEST_DESCRIPTION_MAX_LENGTH} caracteres`,
  })
  description: string;

  @ApiPropertyOptional({ description: 'Fecha deseada (ISO 8601)' })
  @IsOptional()
  @IsDateString({}, { message: 'La fecha deseada no es válida' })
  desiredDate?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean({ message: 'Indique si es urgente (sí o no)' })
  urgent?: boolean;
}

/** GET /requests */
export class ListRequestsQueryDto {
  @ApiPropertyOptional({
    enum: ['client', 'worker'],
    description:
      'Solo las que hice como cliente o las que recibí como trabajador. Sin valor: ambas',
  })
  @IsOptional()
  @IsIn(['client', 'worker'], { message: 'El rol debe ser client o worker' })
  role?: 'client' | 'worker';

  @ApiPropertyOptional({ enum: RequestStatus })
  @IsOptional()
  @IsEnum(RequestStatus, { message: 'El estado no es válido' })
  status?: RequestStatus;
}

/** PATCH /requests/:id/status */
export class ChangeRequestStatusDto {
  @ApiProperty({ enum: RequestStatus })
  @IsEnum(RequestStatus, { message: 'El estado no es válido' })
  status: RequestStatus;
}

/** POST /requests/:id/quotes */
export class CreateQuoteDto {
  @ApiProperty({ description: 'Monto en GTQ', minimum: 0.01, maximum: QUOTE_AMOUNT_MAX })
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'El monto debe ser un número con máximo 2 decimales' },
  )
  @Min(0.01, { message: 'El monto debe ser mayor que cero' })
  @Max(QUOTE_AMOUNT_MAX, { message: 'El monto es demasiado grande' })
  amount: number;

  @ApiProperty({ minLength: QUOTE_SCOPE_MIN_LENGTH, maxLength: QUOTE_SCOPE_MAX_LENGTH })
  @Transform(trim)
  @IsString({ message: 'El alcance debe ser texto' })
  @MinLength(QUOTE_SCOPE_MIN_LENGTH, {
    message: `Describa el alcance con al menos ${QUOTE_SCOPE_MIN_LENGTH} caracteres`,
  })
  @MaxLength(QUOTE_SCOPE_MAX_LENGTH, {
    message: `El alcance no puede superar ${QUOTE_SCOPE_MAX_LENGTH} caracteres`,
  })
  scope: string;
}

/** PATCH /quotes/:id */
export class RespondQuoteDto {
  @ApiProperty({ enum: [QuoteStatus.ACCEPTED, QuoteStatus.REJECTED] })
  @IsIn([QuoteStatus.ACCEPTED, QuoteStatus.REJECTED], {
    message: 'Responda con ACCEPTED o REJECTED',
  })
  status: 'ACCEPTED' | 'REJECTED';
}
