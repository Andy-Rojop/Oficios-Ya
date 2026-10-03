import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequireWorkerMode } from '../common/decorators/require-worker-mode.decorator';
import { UUID_PIPE } from '../common/pipes/uuid.pipe';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { ImageUploadInterceptor, type UploadedImage } from '../storage/image-upload.interceptor';
import { CreatePortfolioItemDto, PortfolioItemResponseDto } from './dto/portfolio.dto';
import { PortfolioService } from './portfolio.service';

@ApiTags('portfolio')
@ApiCookieAuth('access_token')
@RequireWorkerMode()
@Controller('workers/me/portfolio')
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}

  @Get()
  @ApiOperation({ summary: 'RF-021: listar mi portafolio' })
  list(@CurrentUser() user: AuthenticatedUser): Promise<PortfolioItemResponseDto[]> {
    return this.portfolio.list(user.id);
  }

  @Post()
  @UseInterceptors(ImageUploadInterceptor)
  @ApiOperation({
    summary: 'RF-021/RF-022: subir una foto al portafolio (multipart: file, title, description?)',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePortfolioItemDto,
    @UploadedFile() file: UploadedImage | undefined,
  ): Promise<PortfolioItemResponseDto> {
    return this.portfolio.create(user.id, dto, file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'RF-021: eliminar una foto del portafolio' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
  ): Promise<void> {
    return this.portfolio.remove(user.id, id);
  }
}
