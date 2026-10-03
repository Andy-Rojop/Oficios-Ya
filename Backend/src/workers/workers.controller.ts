import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireWorkerMode } from '../common/decorators/require-worker-mode.decorator';
import { UUID_PIPE } from '../common/pipes/uuid.pipe';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { ImageUploadInterceptor, type UploadedImage } from '../storage/image-upload.interceptor';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';
import { SetZonesDto } from './dto/set-zones.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { UpdateWorkerProfileDto } from './dto/update-worker-profile.dto';
import {
  CompletenessResponseDto,
  OwnWorkerProfileDto,
  ServiceResponseDto,
} from './dto/worker-profile-response.dto';
import { WorkerServicesService } from './worker-services.service';
import { WorkersService } from './workers.service';

/** Rutas del trabajador autenticado (modo trabajador). Antes de GET /workers/:id en el módulo. */
@ApiTags('workers')
@ApiCookieAuth('access_token')
@RequireWorkerMode()
@Controller('workers/me')
export class WorkersController {
  constructor(
    private readonly workers: WorkersService,
    private readonly services: WorkerServicesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'RF-011: mi perfil de trabajador (incluye campos privados)' })
  getMe(@CurrentUser() user: AuthenticatedUser): Promise<OwnWorkerProfileDto> {
    return this.workers.getOwnProfile(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'RF-011/RF-012: crear o actualizar mi perfil' })
  updateMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateWorkerProfileDto,
  ): Promise<OwnWorkerProfileDto> {
    return this.workers.upsertOwnProfile(user.id, dto);
  }

  @Put('zones')
  @ApiOperation({ summary: 'RF-013: definir mis zonas de cobertura' })
  setZones(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetZonesDto,
  ): Promise<OwnWorkerProfileDto> {
    return this.workers.setZones(user.id, dto);
  }

  @Put('availability')
  @ApiOperation({ summary: 'RF-016: cambiar mi disponibilidad' })
  setAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAvailabilityDto,
  ): Promise<OwnWorkerProfileDto> {
    return this.workers.setAvailability(user.id, dto);
  }

  @Get('completeness')
  @ApiOperation({ summary: 'RF-020: porcentaje y checklist de completitud del perfil' })
  completeness(@CurrentUser() user: AuthenticatedUser): Promise<CompletenessResponseDto> {
    return this.workers.getCompleteness(user.id);
  }

  // --- Servicios (RF-014, RF-015) ---

  @Get('services')
  @ApiOperation({ summary: 'RF-014: listar mis servicios' })
  listServices(@CurrentUser() user: AuthenticatedUser): Promise<ServiceResponseDto[]> {
    return this.services.list(user.id);
  }

  @Post('services')
  @ApiOperation({ summary: 'RF-014/RF-015: crear un servicio' })
  createService(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateServiceDto,
  ): Promise<ServiceResponseDto> {
    return this.services.create(user.id, dto);
  }

  @Patch('services/:id')
  @ApiOperation({ summary: 'RF-014/RF-015: editar un servicio' })
  updateService(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @Body() dto: UpdateServiceDto,
  ): Promise<ServiceResponseDto> {
    return this.services.update(user.id, id, dto);
  }

  @Delete('services/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'RF-014: eliminar un servicio' })
  removeService(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
  ): Promise<void> {
    return this.services.remove(user.id, id);
  }

  @Post('services/:id/photos')
  @UseInterceptors(ImageUploadInterceptor)
  @ApiOperation({ summary: 'RF-014: subir una foto del servicio (multipart, campo "file")' })
  addServicePhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @UploadedFile() file: UploadedImage | undefined,
  ): Promise<ServiceResponseDto> {
    return this.services.addPhoto(user.id, id, file);
  }

  @Delete('services/:id/photos/:index')
  @ApiOperation({ summary: 'RF-014: quitar una foto del servicio por posición (0 = primera)' })
  removeServicePhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @Param('index', ParseIntPipe) index: number,
  ): Promise<ServiceResponseDto> {
    return this.services.removePhoto(user.id, id, index);
  }
}
