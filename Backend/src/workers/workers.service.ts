import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, IdentityStatus, Role } from '../generated/prisma/enums';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { ensureWorkerProfileStub } from '../users/worker-profile.stub';
import type { UpdateAvailabilityDto } from './dto/update-availability.dto';
import type { SetZonesDto } from './dto/set-zones.dto';
import type { UpdateWorkerProfileDto } from './dto/update-worker-profile.dto';
import {
  CompletenessResponseDto,
  OwnWorkerProfileDto,
  PublicWorkerProfileDto,
  WorkerIdentityDto,
} from './dto/worker-profile-response.dto';
import { computeProfileCompleteness } from './profile-completeness.util';
import { normalizeSchedule, normalizeVisibleChannels } from './schedule.util';

const OWN_PROFILE_INCLUDE = {
  mainCategory: { select: { id: true, name: true, slug: true } },
  zones: {
    select: { zone: { select: { id: true, name: true, type: true } } },
    orderBy: { zone: { name: 'asc' } },
  },
} satisfies Prisma.WorkerProfileInclude;

const SERVICE_SELECT = {
  id: true,
  categoryId: true,
  category: { select: { name: true } },
  name: true,
  description: true,
  priceMode: true,
  priceAmount: true,
  priceUnit: true,
  photos: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ServiceSelect;

/** Select explícito: dpi, nit y passwordHash NO se leen de la base de datos en el perfil público. */
const PUBLIC_PROFILE_SELECT = {
  id: true,
  headline: true,
  description: true,
  experienceYears: true,
  schedule: true,
  availability: true,
  visibleChannels: true,
  identityStatus: true,
  ratingAverage: true,
  ratingCount: true,
  completedJobs: true,
  createdAt: true,
  user: { select: { name: true, phone: true, email: true } },
  mainCategory: { select: { id: true, name: true, slug: true } },
  zones: {
    select: { zone: { select: { id: true, name: true, type: true } } },
    orderBy: { zone: { name: 'asc' } },
  },
  services: {
    where: { active: true },
    select: SERVICE_SELECT,
    orderBy: { createdAt: 'desc' },
  },
  portfolioItems: {
    select: { id: true, title: true, description: true, imagePath: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  },
} satisfies Prisma.WorkerProfileSelect;

@Injectable()
export class WorkersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /** Devuelve el id del WorkerProfile del usuario, creando el perfil mínimo si aún no existe. */
  async requireProfileId(userId: string): Promise<string> {
    const existing = await this.prisma.workerProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (existing) {
      return existing.id;
    }
    await this.prisma.$transaction((tx) => ensureWorkerProfileStub(tx, userId));
    const created = await this.prisma.workerProfile.findUniqueOrThrow({
      where: { userId },
      select: { id: true },
    });
    return created.id;
  }

  /** RF-011: perfil propio (incluye campos privados dpi/nit). */
  async getOwnProfile(userId: string): Promise<OwnWorkerProfileDto> {
    await this.requireProfileId(userId);
    const profile = await this.prisma.workerProfile.findUniqueOrThrow({
      where: { userId },
      include: OWN_PROFILE_INCLUDE,
    });
    return OwnWorkerProfileDto.fromEntity(profile);
  }

  /** RF-011/RF-012: actualiza los datos del perfil. */
  async upsertOwnProfile(
    userId: string,
    dto: UpdateWorkerProfileDto,
  ): Promise<OwnWorkerProfileDto> {
    if (dto.mainCategoryId) {
      const category = await this.prisma.category.findFirst({
        where: { id: dto.mainCategoryId, active: true },
        select: { id: true },
      });
      if (!category) {
        throw new BadRequestException('La categoría seleccionada no existe');
      }
    }

    const touchingIdentity = dto.dpi !== undefined || dto.nit !== undefined;
    let identityStatus: IdentityStatus | undefined;
    if (touchingIdentity) {
      const current = await this.prisma.workerProfile.findUnique({
        where: { userId },
        select: { dpi: true, nit: true },
      });
      const nextDpi = dto.dpi !== undefined ? dto.dpi : (current?.dpi ?? null);
      // Con DPI enviado: cola de verificación (RF-055). Sin DPI: vuelve a no enviado.
      identityStatus = nextDpi ? IdentityStatus.PENDING : IdentityStatus.NOT_SUBMITTED;
    }

    const data = {
      headline: dto.headline,
      description: dto.description,
      ...(dto.experienceYears !== undefined ? { experienceYears: dto.experienceYears } : {}),
      ...(dto.mainCategoryId !== undefined ? { mainCategoryId: dto.mainCategoryId } : {}),
      ...(dto.schedule !== undefined
        ? {
            schedule:
              dto.schedule === null
                ? Prisma.DbNull
                : (normalizeSchedule(dto.schedule) as Prisma.InputJsonObject),
          }
        : {}),
      ...(dto.visibleChannels !== undefined
        ? {
            visibleChannels:
              dto.visibleChannels === null
                ? Prisma.DbNull
                : (normalizeVisibleChannels(
                    dto.visibleChannels,
                  ) as unknown as Prisma.InputJsonObject),
          }
        : {}),
      ...(dto.dpi !== undefined ? { dpi: dto.dpi } : {}),
      ...(dto.nit !== undefined ? { nit: dto.nit } : {}),
      ...(identityStatus !== undefined ? { identityStatus } : {}),
    } satisfies Prisma.WorkerProfileUncheckedUpdateInput;

    const profile = await this.prisma.workerProfile.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
        identityStatus: identityStatus ?? IdentityStatus.NOT_SUBMITTED,
      },
      include: OWN_PROFILE_INCLUDE,
    });
    return OwnWorkerProfileDto.fromEntity(profile);
  }

  /** RF-013: reemplaza las zonas de cobertura. */
  async setZones(userId: string, dto: SetZonesDto): Promise<OwnWorkerProfileDto> {
    const profileId = await this.requireProfileId(userId);

    if (dto.zoneIds.length > 0) {
      const found = await this.prisma.zone.count({
        where: { id: { in: dto.zoneIds }, active: true },
      });
      if (found !== dto.zoneIds.length) {
        throw new BadRequestException('Alguna de las zonas seleccionadas no existe');
      }
    }

    await this.prisma.$transaction([
      this.prisma.workerZone.deleteMany({ where: { workerProfileId: profileId } }),
      this.prisma.workerZone.createMany({
        data: dto.zoneIds.map((zoneId) => ({ workerProfileId: profileId, zoneId })),
      }),
    ]);
    return this.getOwnProfile(userId);
  }

  /** RF-016: cambia la disponibilidad. */
  async setAvailability(userId: string, dto: UpdateAvailabilityDto): Promise<OwnWorkerProfileDto> {
    await this.requireProfileId(userId);
    await this.prisma.workerProfile.update({
      where: { userId },
      data: { availability: dto.availability },
    });
    return this.getOwnProfile(userId);
  }

  /** RF-020: porcentaje y checklist de completitud del perfil. */
  async getCompleteness(userId: string): Promise<CompletenessResponseDto> {
    await this.requireProfileId(userId);
    const profile = await this.prisma.workerProfile.findUniqueOrThrow({
      where: { userId },
      select: {
        headline: true,
        description: true,
        experienceYears: true,
        mainCategoryId: true,
        schedule: true,
        _count: {
          select: {
            zones: true,
            portfolioItems: true,
            services: { where: { active: true } },
          },
        },
      },
    });

    return computeProfileCompleteness({
      headline: profile.headline,
      description: profile.description,
      experienceYears: profile.experienceYears,
      mainCategoryId: profile.mainCategoryId,
      schedule: profile.schedule,
      zoneCount: profile._count.zones,
      activeServiceCount: profile._count.services,
      portfolioCount: profile._count.portfolioItems,
    });
  }

  /**
   * RF-017: perfil público. Solo si el teléfono del usuario está verificado y la cuenta activa.
   * El contacto (teléfono/WhatsApp/correo) solo se incluye cuando el visitante está autenticado.
   */
  async getPublicProfile(
    profileId: string,
    viewer?: AuthenticatedUser | null,
  ): Promise<PublicWorkerProfileDto> {
    const profile = await this.prisma.workerProfile.findFirst({
      where: {
        id: profileId,
        user: { phoneVerifiedAt: { not: null }, status: AccountStatus.ACTIVE },
      },
      select: PUBLIC_PROFILE_SELECT,
    });
    if (!profile) {
      throw new NotFoundException('No encontramos este perfil de trabajador');
    }
    return PublicWorkerProfileDto.fromEntity(profile, (path) => this.storage.getPublicUrl(path), {
      includeContact: Boolean(viewer),
    });
  }

  /** dpi/nit: únicamente el dueño del perfil o un administrador. */
  async getIdentity(profileId: string, requester: AuthenticatedUser): Promise<WorkerIdentityDto> {
    const profile = await this.prisma.workerProfile.findUnique({
      where: { id: profileId },
      select: { userId: true, identityStatus: true, dpi: true, nit: true },
    });
    if (!profile) {
      throw new NotFoundException('No encontramos este perfil de trabajador');
    }
    if (profile.userId !== requester.id && requester.role !== Role.ADMIN) {
      throw new ForbiddenException('No tienes permiso para ver estos datos');
    }
    return WorkerIdentityDto.fromEntity(profile);
  }
}
