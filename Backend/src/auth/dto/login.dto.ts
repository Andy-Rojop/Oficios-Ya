import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { IsGuatemalaPhone } from '../../common/validators/is-guatemala-phone.decorator';

export class LoginDto {
  @ApiProperty({
    example: '+50255551234',
    description: 'Teléfono de Guatemala (se normaliza a E.164)',
  })
  @IsGuatemalaPhone()
  phone: string;

  @ApiProperty()
  @IsString({ message: 'La contraseña es obligatoria' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MaxLength(72, { message: 'La contraseña no puede superar 72 caracteres' })
  password: string;
}
