import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * RF-051 a RF-054 — Fase 6: notificaciones en la app.
 * Importa ChatModule solo para reutilizar ChatRealtimeService (salas `user:{id}` de Socket.IO).
 */
@Module({
  imports: [ChatModule],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
