import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Public()
@ApiTags('health')
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'Estado de la API y conexión a PostgreSQL' })
  @ApiOkResponse({
    description: 'API operativa',
    schema: {
      example: {
        status: 'ok',
        service: 'oficiosya-api',
        database: 'up',
        timestamp: '2026-09-30T18:00:00.000Z',
      },
    },
  })
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;

    return {
      status: 'ok',
      service: 'oficiosya-api',
      database: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
