import { Injectable, Logger } from '@nestjs/common';
import type { Namespace } from 'socket.io';
import { userRoom } from './chat.constants';

/**
 * Puente entre la lógica de negocio y el namespace `/chat`: el gateway registra el namespace y el
 * resto de servicios emiten sin depender de Socket.IO directamente. Sin namespace (tests o antes
 * de arrancar) los eventos se ignoran.
 */
@Injectable()
export class ChatRealtimeService {
  private readonly logger = new Logger(ChatRealtimeService.name);
  private namespace: Namespace | null = null;

  setNamespace(namespace: Namespace): void {
    this.namespace = namespace;
  }

  /** Emite a todas las pestañas/dispositivos conectados del usuario (sala `user:{id}`). */
  emitToUser(userId: string, event: string, payload: unknown): void {
    if (!this.namespace) return;
    try {
      this.namespace.to(userRoom(userId)).emit(event, payload);
    } catch (error) {
      this.logger.warn(
        `No se pudo emitir "${event}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
