import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReviewsController, WorkerReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

/** RF-045 a RF-050 — Fase 5: reseñas verificadas de trabajos completados. */
@Module({
  imports: [NotificationsModule],
  controllers: [ReviewsController, WorkerReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
