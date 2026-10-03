import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Availability } from '../../generated/prisma/enums';

export class UpdateAvailabilityDto {
  @ApiProperty({ enum: ['AVAILABLE', 'BUSY', 'UNAVAILABLE'] })
  @IsEnum(Availability, { message: 'La disponibilidad debe ser AVAILABLE, BUSY o UNAVAILABLE' })
  availability: Availability;
}
