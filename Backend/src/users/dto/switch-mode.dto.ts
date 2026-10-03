import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { ActiveMode } from '../../generated/prisma/enums';

export class SwitchModeDto {
  @ApiProperty({ enum: ['CLIENT', 'WORKER'] })
  @IsIn([ActiveMode.CLIENT, ActiveMode.WORKER], { message: 'El modo debe ser CLIENT o WORKER' })
  mode: ActiveMode;
}
