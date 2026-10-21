import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'ID token de Firebase tras verificar el SMS' })
  @IsString({ message: 'El código de verificación es obligatorio' })
  @IsNotEmpty({ message: 'El código de verificación es obligatorio' })
  firebaseIdToken: string;

  @ApiProperty({ minLength: 8, maxLength: 15, description: 'Entre 8 y 15 caracteres, letras y números' })
  @IsString({ message: 'La nueva contraseña es obligatoria' })
  @MinLength(8, { message: 'La nueva contraseña debe tener al menos 8 caracteres' })
  @MaxLength(15, { message: 'La nueva contraseña no puede superar 15 caracteres' })
  @Matches(/^(?=.*[A-Za-zÁÉÍÓÚÜÑáéíóúüñ])(?=.*\d).+$/, {
    message: 'La nueva contraseña debe combinar letras y números',
  })
  newPassword: string;
}
