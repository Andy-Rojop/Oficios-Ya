import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { QuotesService } from './quotes.service';
import { QuotesController, RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

/** RF-037, RF-038, RF-041 a RF-044 — Fase 5: solicitudes de servicio y cotizaciones. */
@Module({
  imports: [ChatModule, NotificationsModule],
  controllers: [RequestsController, QuotesController],
  providers: [RequestsService, QuotesService],
  exports: [RequestsService],
})
export class RequestsModule {}
