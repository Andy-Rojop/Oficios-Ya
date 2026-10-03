import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CatalogService } from './catalog.service';
import type { CategoryListItem, ZoneListItem } from './catalog.service';

@ApiTags('catalog')
@Public()
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('zones')
  @ApiOperation({ summary: 'Lista pública de zonas activas (aldeas, cantones, caseríos...)' })
  zones(): Promise<ZoneListItem[]> {
    return this.catalogService.listZones();
  }

  @Get('categories')
  @ApiOperation({ summary: 'Lista pública de categorías de oficios activas' })
  categories(): Promise<CategoryListItem[]> {
    return this.catalogService.listCategories();
  }
}
