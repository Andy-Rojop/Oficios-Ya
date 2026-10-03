import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ChangePhoneDto {
  @ApiProperty({ description: 'ID token de Firebase verificado con el NUEVO teléfono' })
  @IsString({ message: 'El código de verificación es obligatorio' })
  @IsNotEmpty({ message: 'El código de verificación es obligatorio' })
  firebaseIdToken: string;

  @ApiProperty()
  @IsString({ message: 'La contraseña actual es obligatoria' })
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria' })
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres' })
  currentPassword: string;
}
