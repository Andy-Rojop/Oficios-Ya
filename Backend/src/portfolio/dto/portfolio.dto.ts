import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Campos de texto del multipart de POST /workers/me/portfolio (la imagen va en el campo "file"). */
export class CreatePortfolioItemDto {
  @ApiProperty({ example: 'Closet de cedro' })
  @Transform(trim)
  @IsString({ message: 'El título debe ser texto' })
  @MinLength(2, { message: 'El título debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El título no puede superar 100 caracteres' })
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'La descripción debe ser texto' })
  @MaxLength(500, { message: 'La descripción no puede superar 500 caracteres' })
  description?: string;
}

export interface PortfolioItemSource {
  id: string;
  title: string;
  description: string | null;
  imagePath: string;
  createdAt: Date;
}

export class PortfolioItemResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() title: string;
  @ApiPropertyOptional({ nullable: true }) description: string | null;
  @ApiProperty({ description: 'URL pública de la imagen' }) imageUrl: string;
  @ApiProperty() createdAt: Date;

  static fromEntity(
    item: PortfolioItemSource,
    toPublicUrl: (path: string) => string,
  ): PortfolioItemResponseDto {
    const dto = new PortfolioItemResponseDto();
    dto.id = item.id;
    dto.title = item.title;
    dto.description = item.description;
    dto.imageUrl = toPublicUrl(item.imagePath);
    dto.createdAt = item.createdAt;
    return dto;
  }
}
