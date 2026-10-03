import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PriceUnit } from '../generated/prisma/enums';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { UploadedImage } from '../storage/image-upload.interceptor';
import { StorageService } from '../storage/storage.service';
import type { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { ServiceResponseDto, decimalToNumber } from './dto/worker-profile-response.dto';
import { resolveServicePrice } from './service-pricing.util';
import { WorkersService } from './workers.service';

export const MAX_SERVICES_PER_WORKER = 20;
export const MAX_PHOTOS_PER_SERVICE = 5;

const SERVICE_SELECT = {
  id: true,
  workerProfileId: true,
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

@Injectable()
export class WorkerServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly workers: WorkersService,
  ) {}

  private toDto(service: Parameters<typeof ServiceResponseDto.fromEntity>[0]): ServiceResponseDto {
    return ServiceResponseDto.fromEntity(service, (path) => this.storage.getPublicUrl(path));
  }

  private async assertActiveCategory(categoryId: string): Promise<void> {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, active: true },
      select: { id: true },
    });
    if (!category) {
      throw new BadRequestException('La categoría seleccionada no existe');
    }
  }

  private async findOwned(userId: string, serviceId: string) {
    const profileId = await this.workers.requireProfileId(userId);
    const service = await this.prisma.service.findFirst({
      where: { id: serviceId, workerProfileId: profileId },
      select: SERVICE_SELECT,
    });
    if (!service) {
      throw new NotFoundException('No encontramos este servicio');
    }
    return service;
  }

  async list(userId: string): Promise<ServiceResponseDto[]> {
    const profileId = await this.workers.requireProfileId(userId);
    const services = await this.prisma.service.findMany({
      where: { workerProfileId: profileId },
      select: SERVICE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return services.map((service) => this.toDto(service));
  }

  async create(userId: string, dto: CreateServiceDto): Promise<ServiceResponseDto> {
    const profileId = await this.workers.requireProfileId(userId);
    const priceAmount = resolveServicePrice(dto.priceMode, dto.priceAmount);
    await this.assertActiveCategory(dto.categoryId);

    const count = await this.prisma.service.count({ where: { workerProfileId: profileId } });
    if (count >= MAX_SERVICES_PER_WORKER) {
      throw new BadRequestException(
        `Puedes publicar como máximo ${MAX_SERVICES_PER_WORKER} servicios`,
      );
    }

    const created = await this.prisma.service.create({
      data: {
        workerProfileId: profileId,
        categoryId: dto.categoryId,
        name: dto.name,
        description: dto.description,
        priceMode: dto.priceMode,
        priceAmount,
        priceUnit: dto.priceUnit ?? PriceUnit.JOB,
        active: dto.active ?? true,
      },
      select: SERVICE_SELECT,
    });
    return this.toDto(created);
  }

  async update(
    userId: string,
    serviceId: string,
    dto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    const current = await this.findOwned(userId, serviceId);

    // El precio se valida con el valor final (lo enviado + lo ya guardado).
    const finalMode = dto.priceMode ?? current.priceMode;
    const finalAmount =
      dto.priceAmount !== undefined
        ? dto.priceAmount
        : current.priceAmount === null
          ? null
          : decimalToNumber(current.priceAmount);
    const priceAmount = resolveServicePrice(finalMode, finalAmount);

    if (dto.categoryId !== undefined) {
      await this.assertActiveCategory(dto.categoryId);
    }

    const updated = await this.prisma.service.update({
      where: { id: serviceId },
      data: {
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        priceMode: finalMode,
        priceAmount,
        ...(dto.priceUnit !== undefined ? { priceUnit: dto.priceUnit } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
      select: SERVICE_SELECT,
    });
    return this.toDto(updated);
  }

  async remove(userId: string, serviceId: string): Promise<void> {
    const current = await this.findOwned(userId, serviceId);
    await this.prisma.service.delete({ where: { id: serviceId } });
    await Promise.all(current.photos.map((path) => this.storage.deleteObjectSilently(path)));
  }

  /** RF-014: agrega una foto (multipart) al servicio. */
  async addPhoto(
    userId: string,
    serviceId: string,
    file: UploadedImage | undefined,
  ): Promise<ServiceResponseDto> {
    if (!file) {
      throw new BadRequestException('Adjunta una imagen en el campo "file"');
    }
    const current = await this.findOwned(userId, serviceId);
    if (current.photos.length >= MAX_PHOTOS_PER_SERVICE) {
      throw new BadRequestException(
        `Cada servicio admite como máximo ${MAX_PHOTOS_PER_SERVICE} fotos`,
      );
    }

    const path = await this.storage.uploadPublic(
      file.buffer,
      `workers/${current.workerProfileId}/services/${serviceId}/${randomUUID()}.webp`,
    );

    try {
      const updated = await this.prisma.service.update({
        where: { id: serviceId },
        data: { photos: { push: path } },
        select: SERVICE_SELECT,
      });
      return this.toDto(updated);
    } catch (error) {
      await this.storage.deleteObjectSilently(path);
      throw error;
    }
  }

  /** Quita una foto del servicio por su posición (0 = primera). */
  async removePhoto(userId: string, serviceId: string, index: number): Promise<ServiceResponseDto> {
    const current = await this.findOwned(userId, serviceId);
    const path = current.photos[index];
    if (path === undefined) {
      throw new NotFoundException('No encontramos esa foto');
    }

    const updated = await this.prisma.service.update({
      where: { id: serviceId },
      data: { photos: current.photos.filter((_, position) => position !== index) },
      select: SERVICE_SELECT,
    });
    await this.storage.deleteObjectSilently(path);
    return this.toDto(updated);
  }
}
