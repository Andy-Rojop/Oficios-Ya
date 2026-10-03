import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/storage.module';
import { ChatGateway } from './chat.gateway';
import { ChatRealtimeService } from './chat-realtime.service';
import { ChatService } from './chat.service';
import { ChatWsAuthService } from './chat-ws-auth.service';
import { ConversationAccessService } from './conversation-access.service';
import { ConversationsController } from './conversations.controller';

/** RF-039, RF-040, RF-065 a RF-069 — Fase 4: chat privado (REST + Socket.IO namespace /chat). */
@Module({
  imports: [AuthModule, StorageModule],
  controllers: [ConversationsController],
  providers: [
    ConversationAccessService,
    ChatRealtimeService,
    ChatWsAuthService,
    ChatService,
    ChatGateway,
  ],
  exports: [ConversationAccessService, ChatRealtimeService],
})
export class ChatModule {}
