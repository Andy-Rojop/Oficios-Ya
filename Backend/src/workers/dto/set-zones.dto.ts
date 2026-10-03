import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export const MAX_COVERAGE_ZONES = 30;

export class SetZonesDto {
  @ApiProperty({
    type: [String],
    description: 'IDs de las zonas de cobertura (reemplaza la lista actual)',
  })
  @IsArray({ message: 'Las zonas deben enviarse como una lista' })
  @ArrayMaxSize(MAX_COVERAGE_ZONES, {
    message: `Puedes elegir como máximo ${MAX_COVERAGE_ZONES} zonas`,
  })
  @ArrayUnique({ message: 'No repitas zonas' })
  @IsUUID('all', { each: true, message: 'Alguna zona seleccionada no es válida' })
  zoneIds: string[];
}
