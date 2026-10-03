import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { Availability, PriceMode, PriceUnit } from '../../generated/prisma/enums';
import { PriceMode as PriceModeEnum } from '../../generated/prisma/enums';
import { decimalToNumber } from '../../workers/dto/worker-profile-response.dto';
import type { DecimalLike, UrlResolver } from '../../workers/dto/worker-profile-response.dto';

export const DESCRIPTION_SNIPPET_LENGTH = 160;

// --- Entradas mínimas (select explícito: dpi, nit, passwordHash y teléfono NO se leen) --------

export interface SearchCardSource {
  id: string;
  headline: string;
  description: string;
  availability: Availability;
  ratingAverage: DecimalLike;
  ratingCount: number;
  user: { name: string };
  mainCategory: { id: string; name: string; slug: string } | null;
  zones: {
    zone: { id: string; name: string; latitude: DecimalLike | null; longitude: DecimalLike | null };
  }[];
  services: {
    priceMode: PriceMode;
    priceAmount: DecimalLike | null;
    priceUnit: PriceUnit;
    photos: string[];
  }[];
  portfolioItems: { imagePath: string }[];
}

// --- DTOs ------------------------------------------------------------------------------------

export class SearchZoneDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional({
    nullable: true,
    description: 'Centro aproximado de la zona, nunca una dirección',
  })
  lat: number | null;
  @ApiPropertyOptional({ nullable: true }) lng: number | null;
}

export class SearchCategoryDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() slug: string;
}

export class SearchPricePreviewDto {
  @ApiProperty({ enum: ['FIXED', 'FROM'] }) mode: PriceMode;
  @ApiProperty({ description: 'GTQ' }) amount: number;
  @ApiProperty({ enum: ['JOB', 'HOUR', 'VISIT', 'METER'] }) unit: PriceUnit;
}

/** Tarjeta pública ligera de un trabajador. Se construye campo por campo. */
export class SearchWorkerCardDto {
  @ApiProperty({ description: 'Id del WorkerProfile (usar en /trabajador/:id)' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty() headline: string;
  @ApiProperty({ description: 'Resumen de la descripción (máx. 160 caracteres)' })
  description: string;
  @ApiProperty() ratingAverage: number;
  @ApiProperty() ratingCount: number;
  @ApiProperty({ enum: ['AVAILABLE', 'BUSY', 'UNAVAILABLE'] }) availability: Availability;
  @ApiPropertyOptional({ nullable: true, type: SearchCategoryDto })
  mainCategory: SearchCategoryDto | null;
  @ApiProperty({ type: [SearchZoneDto] }) zones: SearchZoneDto[];
  @ApiPropertyOptional({
    nullable: true,
    type: SearchPricePreviewDto,
    description: 'Servicio activo FIXED/FROM más barato; null si solo hay servicios a convenir',
  })
  price: SearchPricePreviewDto | null;
  @ApiProperty({ description: 'true si tiene al menos un servicio activo "A convenir"' })
  negotiable: boolean;
  @ApiPropertyOptional({ nullable: true }) photoUrl: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Solo con orden "near" y coordenadas' })
  distanceKm: number | null;

  static fromEntity(
    source: SearchCardSource,
    toPublicUrl: UrlResolver,
    distanceKm: number | null = null,
  ): SearchWorkerCardDto {
    const dto = new SearchWorkerCardDto();
    dto.id = source.id;
    dto.name = source.user.name;
    dto.headline = source.headline;
    dto.description = toSnippet(source.description);
    dto.ratingAverage = decimalToNumber(source.ratingAverage);
    dto.ratingCount = source.ratingCount;
    dto.availability = source.availability;
    dto.mainCategory = source.mainCategory
      ? {
          id: source.mainCategory.id,
          name: source.mainCategory.name,
          slug: source.mainCategory.slug,
        }
      : null;
    dto.zones = source.zones.map(({ zone }) => ({
      id: zone.id,
      name: zone.name,
      lat: zone.latitude === null ? null : decimalToNumber(zone.latitude),
      lng: zone.longitude === null ? null : decimalToNumber(zone.longitude),
    }));

    let cheapest: SearchPricePreviewDto | null = null;
    let negotiable = false;
    for (const service of source.services) {
      if (service.priceMode === PriceModeEnum.NEGOTIABLE) {
        negotiable = true;
        continue;
      }
      if (service.priceAmount === null) continue;
      const amount = decimalToNumber(service.priceAmount);
      if (!(amount > 0)) continue;
      if (!cheapest || amount < cheapest.amount) {
        cheapest = { mode: service.priceMode, amount, unit: service.priceUnit };
      }
    }
    dto.price = cheapest;
    dto.negotiable = negotiable;

    const portfolioPath = source.portfolioItems[0]?.imagePath;
    const servicePhoto = source.services.flatMap((service) => service.photos)[0];
    const photoPath = portfolioPath ?? servicePhoto;
    dto.photoUrl = photoPath ? toPublicUrl(photoPath) : null;
    dto.distanceKm = distanceKm;
    return dto;
  }
}

export class SearchWorkersResponseDto {
  @ApiProperty({ type: [SearchWorkerCardDto] }) items: SearchWorkerCardDto[];
  @ApiPropertyOptional({
    nullable: true,
    description: 'Pasar como ?cursor= para la siguiente página',
  })
  nextCursor: string | null;
}

export class SearchSuggestionDto {
  @ApiProperty({ enum: ['category', 'worker'] }) type: 'category' | 'worker';
  @ApiProperty() label: string;
  @ApiPropertyOptional({ description: 'Slug de la categoría (type = category)' }) slug?: string;
  @ApiPropertyOptional({ description: 'Id del perfil (type = worker)' }) workerId?: string;
}

export function toSnippet(text: string, max = DESCRIPTION_SNIPPET_LENGTH): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}
