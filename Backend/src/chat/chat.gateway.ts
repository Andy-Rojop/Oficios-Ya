import { HttpException, Logger, UnauthorizedException } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { SkipThrottle } from '@nestjs/throttler';
import type { Namespace, Socket } from 'socket.io';
import type { AuthenticatedUser } from '../common/types/authenticated-user';
import { ChatRealtimeService } from './chat-realtime.service';
import { ChatWsAuthService } from './chat-ws-auth.service';
import {
  CHAT_NAMESPACE,
  ChatClientEvent,
  conversationRoom,
  SEND_RATE_LIMIT,
  userRoom,
} from './chat.constants';
import { ChatService } from './chat.service';
import { ConversationIdPayloadDto, SendMessageDto } from './dto/chat-requests.dto';
import { parseWsPayload } from './ws-validation';

/** Respuesta (ack) de todos los eventos cliente → servidor. */
export type WsAck<T> = { ok: true; data: T } | { ok: false; statusCode: number; error: string };

interface ChatSocketData {
  user?: AuthenticatedUser;
  sendTimestamps?: number[];
}

type ChatSocket = Socket<
  Record<string, never>,
  Record<string, never>,
  Record<string, never>,
  ChatSocketData
>;

/**
 * Namespace `/chat`. La autenticación ocurre en el handshake (cookie `access_token`); cada usuario
 * entra a su sala `user:{id}`. Los errores NUNCA se propagan al filtro HTTP: se responden por ack.
 *
 * Servidor → cliente: message:new, message:read, conversation:updated (ver ChatServerEvent).
 */
@SkipThrottle()
@WebSocketGateway({ namespace: CHAT_NAMESPACE })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly auth: ChatWsAuthService,
    private readonly chat: ChatService,
    private readonly realtime: ChatRealtimeService,
  ) {}

  afterInit(namespace: Namespace): void {
    this.realtime.setNamespace(namespace);
    namespace.use((socket, next) => {
      this.auth
        .authenticate(socket.handshake)
        .then((user) => {
          (socket.data as ChatSocketData).user = user;
          next();
        })
        .catch(() => next(new Error('unauthorized')));
    });
  }

  handleConnection(client: ChatSocket): void {
    const user = client.data.user;
    if (!user) {
      client.disconnect(true);
      return;
    }
    void client.join(userRoom(user.id));
  }

  @SubscribeMessage(ChatClientEvent.JOIN)
  onJoin(
    @ConnectedSocket() client: ChatSocket,
    @MessageBody() payload: unknown,
  ): Promise<WsAck<{ conversationId: string }>> {
    return this.run(client, async (user) => {
      const dto = await parseWsPayload(ConversationIdPayloadDto, payload);
      await this.chat.assertCanJoin(user.id, dto.conversationId);
      await client.join(conversationRoom(dto.conversationId));
      return { conversationId: dto.conversationId };
    });
  }

  @SubscribeMessage(ChatClientEvent.SEND)
  onSend(@ConnectedSocket() client: ChatSocket, @MessageBody() payload: unknown) {
    return this.run(client, async (user) => {
      this.assertSendRate(client);
      const dto = await parseWsPayload(SendMessageDto, payload);
      return this.chat.sendMessage(user.id, dto);
    });
  }

  @SubscribeMessage(ChatClientEvent.READ)
  onRead(@ConnectedSocket() client: ChatSocket, @MessageBody() payload: unknown) {
    return this.run(client, async (user) => {
      const dto = await parseWsPayload(ConversationIdPayloadDto, payload);
      return this.chat.markRead(user.id, dto.conversationId);
    });
  }

  /** Re-valida la sesión, ejecuta el handler y convierte cualquier error en un ack `{ ok: false }`. */
  private async run<T>(
    client: ChatSocket,
    handler: (user: AuthenticatedUser) => Promise<T>,
  ): Promise<WsAck<T>> {
    const user = client.data.user;
    if (!user) {
      client.disconnect(true);
      return { ok: false, statusCode: 401, error: 'Debes iniciar sesión para usar el chat' };
    }
    let current = user;
    try {
      current = await this.auth.ensureSessionActive(user);
      client.data.user = current;
    } catch {
      client.disconnect(true);
      return {
        ok: false,
        statusCode: 401,
        error: 'Tu sesión ya no es válida. Inicia sesión de nuevo',
      };
    }

    try {
      return { ok: true, data: await handler(current) };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        client.disconnect(true);
      }
      if (error instanceof HttpException) {
        return { ok: false, statusCode: error.getStatus(), error: this.messageOf(error) };
      }
      this.logger.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
      return {
        ok: false,
        statusCode: 500,
        error: 'No se pudo completar la acción. Inténtalo de nuevo',
      };
    }
  }

  private messageOf(error: HttpException): string {
    const body = error.getResponse();
    if (typeof body === 'string') return body;
    const message = (body as { message?: string | string[] }).message;
    return Array.isArray(message) ? (message[0] ?? error.message) : (message ?? error.message);
  }

  /** Antispam por conexión: ventana deslizante de SEND_RATE_LIMIT.max mensajes. */
  private assertSendRate(client: ChatSocket): void {
    const now = Date.now();
    const recent = (client.data.sendTimestamps ?? []).filter(
      (t) => now - t < SEND_RATE_LIMIT.windowMs,
    );
    if (recent.length >= SEND_RATE_LIMIT.max) {
      client.data.sendTimestamps = recent;
      throw new HttpException('Estás enviando mensajes muy rápido. Espera unos segundos', 429);
    }
    recent.push(now);
    client.data.sendTimestamps = recent;
  }
}
