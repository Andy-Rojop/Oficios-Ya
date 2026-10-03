import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { UploadedImage } from '../storage/image-upload.interceptor';
import { StorageService } from '../storage/storage.service';
import { WorkersService } from '../workers/workers.service';
import { CreatePortfolioItemDto, PortfolioItemResponseDto } from './dto/portfolio.dto';

export const MAX_PORTFOLIO_ITEMS = 30;

const PORTFOLIO_SELECT = {
  id: true,
  title: true,
  description: true,
  imagePath: true,
  createdAt: true,
} as const;

@Injectable()
export class PortfolioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly workers: WorkersService,
  ) {}

  private toDto(item: Parameters<typeof PortfolioItemResponseDto.fromEntity>[0]) {
    return PortfolioItemResponseDto.fromEntity(item, (path) => this.storage.getPublicUrl(path));
  }

  async list(userId: string): Promise<PortfolioItemResponseDto[]> {
    const profileId = await this.workers.requireProfileId(userId);
    const items = await this.prisma.portfolioItem.findMany({
      where: { workerProfileId: profileId },
      select: PORTFOLIO_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    return items.map((item) => this.toDto(item));
  }

  /** RF-021/RF-022: crea un ítem del portafolio subiendo la imagen al bucket público. */
  async create(
    userId: string,
    dto: CreatePortfolioItemDto,
    file: UploadedImage | undefined,
  ): Promise<PortfolioItemResponseDto> {
    if (!file) {
      throw new BadRequestException('Adjunta una imagen en el campo "file"');
    }
    const profileId = await this.workers.requireProfileId(userId);

    const count = await this.prisma.portfolioItem.count({ where: { workerProfileId: profileId } });
    if (count >= MAX_PORTFOLIO_ITEMS) {
      throw new BadRequestException(
        `Tu portafolio admite como máximo ${MAX_PORTFOLIO_ITEMS} fotos. Elimina alguna para subir otra`,
      );
    }

    const imagePath = await this.storage.uploadPublic(
      file.buffer,
      `workers/${profileId}/portfolio/${randomUUID()}.webp`,
    );

    try {
      const created = await this.prisma.portfolioItem.create({
        data: {
          workerProfileId: profileId,
          title: dto.title,
          description: dto.description ? dto.description : null,
          imagePath,
        },
        select: PORTFOLIO_SELECT,
      });
      return this.toDto(created);
    } catch (error) {
      await this.storage.deleteObjectSilently(imagePath);
      throw error;
    }
  }

  async remove(userId: string, itemId: string): Promise<void> {
    const profileId = await this.workers.requireProfileId(userId);
    const item = await this.prisma.portfolioItem.findFirst({
      where: { id: itemId, workerProfileId: profileId },
      select: { id: true, imagePath: true },
    });
    if (!item) {
      throw new NotFoundException('No encontramos esta foto del portafolio');
    }
    await this.prisma.portfolioItem.delete({ where: { id: item.id } });
    await this.storage.deleteObjectSilently(item.imagePath);
  }
}
