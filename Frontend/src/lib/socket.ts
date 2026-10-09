import { io, type Socket } from 'socket.io-client';
import { apiFetch } from './api-client';

/** Cliente Socket.IO del chat privado (namespace /chat) — Fase 4. */

export const CHAT_EVENTS = {
  // cliente -> servidor
  JOIN: 'conversation:join',
  SEND: 'message:send',
  READ: 'message:read',
  // servidor -> cliente
  MESSAGE_NEW: 'message:new',
  MESSAGE_READ: 'message:read',
  CONVERSATION_UPDATED: 'conversation:updated',
  NOTIFICATION_NEW: 'notification:new',
} as const;

const ACK_TIMEOUT_MS = 12_000;

type Ack<T> = { ok: true; data: T } | { ok: false; statusCode: number; error: string };

let socket: Socket | null = null;
let refreshing = false;

function getWsUrl(): string {
  return (process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
}

/**
 * Socket singleton. `withCredentials` envía la cookie httpOnly `access_token` en el handshake;
 * el servidor valida el mismo JWT que la API HTTP.
 */
export function getChatSocket(): Socket {
  if (!socket) {
    const instance = io(`${getWsUrl()}/chat`, {
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });

    // Un rechazo del handshake (access token vencido) no se reintenta solo: se renueva la sesión
    // con el refresh token y se vuelve a conectar una vez.
    instance.on('connect_error', (error) => {
      if (error.message !== 'unauthorized' || refreshing) return;
      refreshing = true;
      apiFetch('/auth/refresh', { method: 'POST' })
        .then(() => instance.connect())
        .catch(() => {
          // sesión caducada: la UI redirige a /ingresar cuando una petición HTTP responde 401
        })
        .finally(() => {
          refreshing = false;
        });
    });
    socket = instance;
  }
  return socket;
}

/** Conecta (si hace falta) y devuelve el socket. Solo en el navegador. */
export function connectChatSocket(): Socket {
  const instance = getChatSocket();
  if (!instance.connected && !instance.active) {
    instance.connect();
  }
  return instance;
}

/** Cierra la conexión (p. ej. al cerrar sesión). */
export function disconnectChatSocket(): void {
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
  }
}

/** Emite un evento y espera el ack del servidor `{ ok, data | error }`. */
export function emitWithAck<T>(instance: Socket, event: string, payload: unknown): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (!instance.connected) {
      reject(new Error('Sin conexión con el chat. Revise su conexión e inténtelo de nuevo.'));
      return;
    }
    instance
      .timeout(ACK_TIMEOUT_MS)
      .emit(event, payload, (timeoutError: Error | null, ack?: Ack<T>) => {
        if (timeoutError || !ack) {
          reject(new Error('El servidor no respondió. Inténtelo de nuevo.'));
          return;
        }
        if (!ack.ok) {
          reject(new Error(ack.error));
          return;
        }
        resolve(ack.data);
      });
  });
}
