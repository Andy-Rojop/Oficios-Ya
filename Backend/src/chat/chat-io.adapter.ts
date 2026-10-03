import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

type CreateIOServerOptions = Parameters<IoAdapter['createIOServer']>[1];

/**
 * Adaptador Socket.IO con CORS explícito para el frontend: `credentials: true` permite que el
 * navegador envíe las cookies httpOnly en el handshake (el origen NO puede ser "*").
 */
export class ChatIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly allowedOrigin: string,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: CreateIOServerOptions) {
    const withCors = {
      ...options,
      cors: { origin: this.allowedOrigin, credentials: true },
    } as CreateIOServerOptions;
    return super.createIOServer(port, withCors);
  }
}
