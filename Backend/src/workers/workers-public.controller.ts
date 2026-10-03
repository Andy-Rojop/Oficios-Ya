import { Controller, Get, Param } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UUID_PIPE } from '../common/pipes/uuid.pipe';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { PublicWorkerProfileDto, WorkerIdentityDto } from './dto/worker-profile-response.dto';
import { WorkersService } from './workers.service';

@ApiTags('workers')
@Controller('workers')
export class WorkersPublicController {
  constructor(private readonly workers: WorkersService) {}

  @Public()
  @Get(':id')
  @ApiOperation({
    summary: 'RF-017: perfil público de un trabajador (sin dpi, nit ni datos privados)',
  })
  getPublicProfile(@Param('id', UUID_PIPE) id: string): Promise<PublicWorkerProfileDto> {
    return this.workers.getPublicProfile(id);
  }

  @Get(':id/identity')
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Datos de identidad (dpi/nit): solo el dueño del perfil o un admin' })
  getIdentity(
    @Param('id', UUID_PIPE) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<WorkerIdentityDto> {
    return this.workers.getIdentity(id, user);
  }
}
