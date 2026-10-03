import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ZoneListItem {
  id: string;
  name: string;
  type: string;
}

export interface CategoryListItem {
  id: string;
  name: string;
  slug: string;
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  listZones(): Promise<ZoneListItem[]> {
    return this.prisma.zone.findMany({
      where: { active: true },
      select: { id: true, name: true, type: true },
      orderBy: { name: 'asc' },
    });
  }

  listCategories(): Promise<CategoryListItem[]> {
    return this.prisma.category.findMany({
      where: { active: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  }
}
