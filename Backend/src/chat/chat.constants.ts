/** Namespace de Socket.IO. Nota: el prefijo global `api/v1` solo aplica a HTTP, no a WebSocket. */
export const CHAT_NAMESPACE = '/chat';

export const userRoom = (userId: string): string => `user:${userId}`;
export const conversationRoom = (conversationId: string): string =>
  `conversation:${conversationId}`;

/** Eventos cliente -> servidor. */
export const ChatClientEvent = {
  JOIN: 'conversation:join',
  SEND: 'message:send',
  READ: 'message:read',
} as const;

/** Eventos servidor -> cliente. */
export const ChatServerEvent = {
  MESSAGE_NEW: 'message:new',
  MESSAGE_READ: 'message:read',
  CONVERSATION_UPDATED: 'conversation:updated',
} as const;

/** Vigencia corta de las URLs firmadas de imágenes del chat (bucket privado). */
export const CHAT_IMAGE_URL_TTL_SECONDS = 600;

export const MESSAGE_TEXT_MAX_LENGTH = 2000;
export const MESSAGE_ADDRESS_MAX_LENGTH = 500;
export const MESSAGE_CAPTION_MAX_LENGTH = 500;
export const REPORT_REASON_MIN_LENGTH = 10;
export const REPORT_REASON_MAX_LENGTH = 1000;

export const MESSAGES_DEFAULT_LIMIT = 30;
export const MESSAGES_MAX_LIMIT = 50;
export const INBOX_MAX_CONVERSATIONS = 100;
export const PREVIEW_MAX_LENGTH = 80;

/** Antispam por socket: máximo de mensajes por ventana. */
export const SEND_RATE_LIMIT = { max: 20, windowMs: 10_000 } as const;
