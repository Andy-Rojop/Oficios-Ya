import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class RegisterDto {
  @ApiProperty({ description: 'ID token de Firebase tras verificar el SMS' })
  @IsString({ message: 'El código de verificación es obligatorio' })
  @IsNotEmpty({ message: 'El código de verificación es obligatorio' })
  firebaseIdToken: string;

  @ApiProperty({ example: 'María López' })
  @Transform(trim)
  @IsString({ message: 'El nombre es obligatorio' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede superar 100 caracteres' })
  name: string;

  @ApiProperty({ minLength: 8 })
  @IsString({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres' })
  password: string;

  @ApiProperty({ description: 'ID de la zona (aldea, cantón, caserío...)' })
  @IsUUID('all', { message: 'La zona seleccionada no es válida' })
  zoneId: string;

  @ApiPropertyOptional({ example: 'maria@ejemplo.com' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim().toLowerCase();
    return trimmed === '' ? undefined : trimmed;
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @MaxLength(254, { message: 'El correo electrónico es demasiado largo' })
  email?: string;

  @ApiProperty({ example: true })
  @Equals(true, { message: 'Debes aceptar los términos y condiciones' })
  acceptTerms: true;

  @ApiPropertyOptional({ description: 'Iniciar directamente en modo trabajador' })
  @IsOptional()
  @IsBoolean({ message: 'startAsWorker debe ser verdadero o falso' })
  startAsWorker?: boolean;
}
