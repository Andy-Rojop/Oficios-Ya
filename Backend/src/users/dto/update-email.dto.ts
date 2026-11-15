import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, Matches, MaxLength, ValidateIf } from 'class-validator';

export class UpdateEmailDto {
  @ApiProperty({
    nullable: true,
    example: 'maria@ejemplo.com',
    description: 'Correo nuevo, o null / cadena vacía para quitarlo',
  })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim().toLowerCase();
    return trimmed === '' ? null : trimmed;
  })
  @ValidateIf((dto: UpdateEmailDto) => dto.email !== null)
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @MaxLength(80, { message: 'El correo electrónico es demasiado largo' })
  @Matches(/^(?!.*\d{4,}).*$/, {
    message: 'El correo no puede tener más de 3 dígitos seguidos',
  })
  email: string | null;
}
