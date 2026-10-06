import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PortfolioItemResponseDto,
  type PortfolioItemSource,
} from '../../portfolio/dto/portfolio.dto';
import type {
  Availability,
  IdentityStatus,
  PriceMode,
  PriceUnit,
} from '../../generated/prisma/enums';
import { IdentityStatus as IdentityStatusEnum } from '../../generated/prisma/enums';
import { readStoredSchedule, readStoredVisibleChannels } from '../schedule.util';
import type { StoredSchedule, StoredVisibleChannels } from './schedule.dto';

export type UrlResolver = (path: string) => string;

/** Decimal de Prisma (o number/string) convertible a number. */
export type DecimalLike = number | string | { toNumber(): number };

export function decimalToNumber(value: DecimalLike): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  return value.toNumber();
}

// --- Entradas mínimas (no incluyen dpi/nit/passwordHash a propósito) -------------------------

export interface CategorySource {
  id: string;
  name: string;
  slug: string;
}

export interface ZoneSource {
  id: string;
  name: string;
  type: string;
}

export interface ServiceSource {
  id: string;
  categoryId: string;
  category: { name: string };
  name: string;
  description: string;
  priceMode: PriceMode;
  priceAmount: DecimalLike | null;
  priceUnit: PriceUnit;
  photos: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// --- Servicios -------------------------------------------------------------------------------

export class ServiceResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() categoryId: string;
  @ApiProperty() categoryName: string;
  @ApiProperty() name: string;
  @ApiProperty() description: string;
  @ApiProperty({ enum: ['FIXED', 'FROM', 'NEGOTIABLE'] }) priceMode: PriceMode;
  @ApiPropertyOptional({ nullable: true, description: 'GTQ; null solo si priceMode = NEGOTIABLE' })
  priceAmount: number | null;
  @ApiProperty({ enum: ['JOB', 'HOUR', 'VISIT', 'METER'] }) priceUnit: PriceUnit;
  @ApiProperty({ type: [String], description: 'URLs públicas de las fotos' }) photos: string[];
  @ApiProperty() active: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(service: ServiceSource, toPublicUrl: UrlResolver): ServiceResponseDto {
    const dto = new ServiceResponseDto();
    dto.id = service.id;
    dto.categoryId = service.categoryId;
    dto.categoryName = service.category.name;
    dto.name = service.name;
    dto.description = service.description;
    dto.priceMode = service.priceMode;
    dto.priceAmount = service.priceAmount === null ? null : decimalToNumber(service.priceAmount);
    dto.priceUnit = service.priceUnit;
    dto.photos = service.photos.map(toPublicUrl);
    dto.active = service.active;
    dto.createdAt = service.createdAt;
    dto.updatedAt = service.updatedAt;
    return dto;
  }
}

// --- Perfil propio (privado: incluye dpi/nit) ------------------------------------------------

export interface OwnWorkerProfileSource {
  id: string;
  headline: string;
  description: string;
  experienceYears: number | null;
  schedule: unknown;
  availability: Availability;
  visibleChannels: unknown;
  identityStatus: IdentityStatus;
  dpi: string | null;
  nit: string | null;
  ratingAverage: DecimalLike;
  ratingCount: number;
  completedJobs: number;
  createdAt: Date;
  updatedAt: Date;
  mainCategory: CategorySource | null;
  zones: { zone: ZoneSource }[];
}

export class OwnWorkerProfileDto {
  @ApiProperty() id: string;
  @ApiProperty() headline: string;
  @ApiProperty() description: string;
  @ApiPropertyOptional({ nullable: true }) experienceYears: number | null;
  @ApiPropertyOptional({ nullable: true }) schedule: StoredSchedule | null;
  @ApiProperty({ enum: ['AVAILABLE', 'BUSY', 'UNAVAILABLE'] }) availability: Availability;
  @ApiProperty() visibleChannels: StoredVisibleChannels;
  @ApiPropertyOptional({ nullable: true }) mainCategory: CategorySource | null;
  @ApiProperty() zones: ZoneSource[];
  @ApiProperty({ enum: ['NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED'] })
  identityStatus: IdentityStatus;
  @ApiPropertyOptional({ nullable: true, description: 'PRIVADO: solo el dueño o un admin' })
  dpi: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'PRIVADO: solo el dueño o un admin' })
  nit: string | null;
  @ApiProperty() ratingAverage: number;
  @ApiProperty() ratingCount: number;
  @ApiProperty() completedJobs: number;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  static fromEntity(profile: OwnWorkerProfileSource): OwnWorkerProfileDto {
    const dto = new OwnWorkerProfileDto();
    dto.id = profile.id;
    dto.headline = profile.headline;
    dto.description = profile.description;
    dto.experienceYears = profile.experienceYears;
    dto.schedule = readStoredSchedule(profile.schedule);
    dto.availability = profile.availability;
    dto.visibleChannels = readStoredVisibleChannels(profile.visibleChannels);
    dto.mainCategory = profile.mainCategory
      ? {
          id: profile.mainCategory.id,
          name: profile.mainCategory.name,
          slug: profile.mainCategory.slug,
        }
      : null;
    dto.zones = profile.zones.map(({ zone }) => ({
      id: zone.id,
      name: zone.name,
      type: zone.type,
    }));
    dto.identityStatus = profile.identityStatus;
    dto.dpi = profile.dpi;
    dto.nit = profile.nit;
    dto.ratingAverage = decimalToNumber(profile.ratingAverage);
    dto.ratingCount = profile.ratingCount;
    dto.completedJobs = profile.completedJobs;
    dto.createdAt = profile.createdAt;
    dto.updatedAt = profile.updatedAt;
    return dto;
  }
}

/** Respuesta de GET /workers/:id/identity (solo dueño o admin). */
export class WorkerIdentityDto {
  @ApiProperty({ enum: ['NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED'] })
  identityStatus: IdentityStatus;
  @ApiPropertyOptional({ nullable: true }) dpi: string | null;
  @ApiPropertyOptional({ nullable: true }) nit: string | null;

  static fromEntity(profile: {
    identityStatus: IdentityStatus;
    dpi: string | null;
    nit: string | null;
  }): WorkerIdentityDto {
    const dto = new WorkerIdentityDto();
    dto.identityStatus = profile.identityStatus;
    dto.dpi = profile.dpi;
    dto.nit = profile.nit;
    return dto;
  }
}

// --- Perfil público (NUNCA dpi / nit / passwordHash / teléfono oculto) -----------------------

export interface PublicWorkerProfileSource {
  id: string;
  headline: string;
  description: string;
  experienceYears: number | null;
  schedule: unknown;
  availability: Availability;
  visibleChannels: unknown;
  identityStatus: IdentityStatus;
  ratingAverage: DecimalLike;
  ratingCount: number;
  completedJobs: number;
  createdAt: Date;
  user: { name: string; phone: string; email: string | null };
  mainCategory: CategorySource | null;
  zones: { zone: ZoneSource }[];
  services: ServiceSource[];
  portfolioItems: PortfolioItemSource[];
}

export class PublicContactDto {
  @ApiPropertyOptional({ nullable: true, description: 'Solo si el trabajador eligió mostrarlo' })
  phone: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Solo si el trabajador eligió mostrarlo' })
  whatsapp: string | null;
  @ApiPropertyOptional({ nullable: true, description: 'Solo si el trabajador eligió mostrarlo' })
  email: string | null;
}

/**
 * DTO público del trabajador (RF-017). Se construye campo por campo: aunque la entrada traiga
 * dpi, nit, passwordHash u otros datos privados, jamás se copian a la respuesta.
 */
export class PublicWorkerProfileDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() headline: string;
  @ApiProperty() description: string;
  @ApiPropertyOptional({ nullable: true }) experienceYears: number | null;
  @ApiPropertyOptional({ nullable: true }) schedule: StoredSchedule | null;
  @ApiProperty({ enum: ['AVAILABLE', 'BUSY', 'UNAVAILABLE'] }) availability: Availability;
  @ApiPropertyOptional({ nullable: true }) mainCategory: CategorySource | null;
  @ApiProperty() zones: ZoneSource[];
  @ApiProperty({ description: 'true si el trabajador tiene identidad verificada' })
  identityVerified: boolean;
  @ApiProperty() ratingAverage: number;
  @ApiProperty() ratingCount: number;
  @ApiProperty() completedJobs: number;
  @ApiProperty() contact: PublicContactDto;
  @ApiProperty({ type: [ServiceResponseDto] }) services: ServiceResponseDto[];
  @ApiProperty({ type: [PortfolioItemResponseDto] }) portfolio: PortfolioItemResponseDto[];
  @ApiProperty() memberSince: Date;

  static fromEntity(
    profile: PublicWorkerProfileSource,
    toPublicUrl: UrlResolver,
    options: { includeContact?: boolean } = {},
  ): PublicWorkerProfileDto {
    const channels = readStoredVisibleChannels(profile.visibleChannels);
    const includeContact = options.includeContact === true;

    const contact = new PublicContactDto();
    // Teléfono/correo solo para usuarios autenticados y si el trabajador eligió mostrarlos.
    contact.phone = includeContact && channels.phone ? profile.user.phone : null;
    contact.whatsapp = includeContact && channels.whatsapp ? profile.user.phone : null;
    contact.email = includeContact && channels.email ? profile.user.email : null;

    const dto = new PublicWorkerProfileDto();
    dto.id = profile.id;
    dto.name = profile.user.name;
    dto.headline = profile.headline;
    dto.description = profile.description;
    dto.experienceYears = profile.experienceYears;
    dto.schedule = readStoredSchedule(profile.schedule);
    dto.availability = profile.availability;
    dto.mainCategory = profile.mainCategory
      ? {
          id: profile.mainCategory.id,
          name: profile.mainCategory.name,
          slug: profile.mainCategory.slug,
        }
      : null;
    dto.zones = profile.zones.map(({ zone }) => ({
      id: zone.id,
      name: zone.name,
      type: zone.type,
    }));
    dto.identityVerified = profile.identityStatus === IdentityStatusEnum.VERIFIED;
    dto.ratingAverage = decimalToNumber(profile.ratingAverage);
    dto.ratingCount = profile.ratingCount;
    dto.completedJobs = profile.completedJobs;
    dto.contact = contact;
    dto.services = profile.services
      .filter((service) => service.active)
      .map((service) => ServiceResponseDto.fromEntity(service, toPublicUrl));
    dto.portfolio = profile.portfolioItems.map((item) =>
      PortfolioItemResponseDto.fromEntity(item, toPublicUrl),
    );
    dto.memberSince = profile.createdAt;
    return dto;
  }
}

/** Respuesta de GET /workers/me/completeness. */
export class CompletenessResponseDto {
  @ApiProperty({ minimum: 0, maximum: 100 }) percentage: number;
  @ApiProperty() complete: boolean;
  @ApiProperty() items: { key: string; label: string; weight: number; done: boolean }[];
}
