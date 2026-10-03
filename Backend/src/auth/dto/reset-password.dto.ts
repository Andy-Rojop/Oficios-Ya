import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'ID token de Firebase tras verificar el SMS' })
  @IsString({ message: 'El código de verificación es obligatorio' })
  @IsNotEmpty({ message: 'El código de verificación es obligatorio' })
  firebaseIdToken: string;

  @ApiProperty({ minLength: 8 })
  @IsString({ message: 'La nueva contraseña es obligatoria' })
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La nueva contraseña no puede superar 72 caracteres' })
  newPassword: string;
}
