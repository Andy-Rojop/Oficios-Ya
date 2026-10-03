import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { UUID_PIPE } from '../common/pipes/uuid.pipe';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import {
  CreateReviewDto,
  ListReviewsQueryDto,
  ReplyReviewDto,
  ReportReviewDto,
  type PublicReviewDto,
  type WorkerReviewsPageDto,
} from './dto/review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@ApiCookieAuth('access_token')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'El cliente califica una solicitud COMPLETED y confirmada (una por solicitud)',
  })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateReviewDto,
  ): Promise<PublicReviewDto> {
    return this.reviews.create(user.id, dto);
  }

  @Patch(':id/reply')
  @ApiOperation({ summary: 'El trabajador responde a su reseña (una sola vez)' })
  reply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @Body() dto: ReplyReviewDto,
  ): Promise<PublicReviewDto> {
    return this.reviews.reply(user.id, id, dto.reply);
  }

  @Post(':id/report')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reportar una reseña (crea un Report abierto)' })
  report(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', UUID_PIPE) id: string,
    @Body() dto: ReportReviewDto,
  ) {
    return this.reviews.report(user.id, id, dto.reason);
  }
}

/** Lista pública de reseñas de un perfil (el `:id` es el id del perfil público del trabajador). */
@ApiTags('reviews')
@Controller('workers')
export class WorkerReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Public()
  @Get(':id/reviews')
  @ApiOperation({ summary: 'RF-049: reseñas públicas de un trabajador (sin datos privados)' })
  list(
    @Param('id', UUID_PIPE) id: string,
    @Query() query: ListReviewsQueryDto,
  ): Promise<WorkerReviewsPageDto> {
    return this.reviews.listForWorker(id, query);
  }
}
