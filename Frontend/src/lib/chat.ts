import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiFetch } from './api-client';

export type MessageType = 'TEXT' | 'IMAGE' | 'ADDRESS';

/** Igual a MessageResponseDto del backend (fechas ISO). */
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string | null;
  /** URL firmada de vigencia corta (solo IMAGE). */
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  readAt: string | null;
  createdAt: string;
}

export interface MessagesPage {
  /** Del más nuevo al más antiguo. */
  items: ChatMessage[];
  nextCursor: string | null;
}

export interface ConversationSummary {
  id: string;
  peer: {
    id: string;
    name: string;
    headline: string | null;
    workerProfileId: string | null;
  };
  lastMessage: {
    id: string;
    senderId: string;
    type: MessageType;
    preview: string;
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
  blockedByMe: boolean;
  canSend: boolean;
}

export interface SendMessageInput {
  conversationId: string;
  type: MessageType;
  content?: string;
  imagePath?: string;
  latitude?: number;
  longitude?: number;
}

export interface MessageReadReceipt {
  conversationId: string;
  readerId: string;
  readAt: string;
}

export const CHAT_QUERY_KEYS = {
  conversations: ['chat', 'conversations'] as const,
  conversation: (id: string) => ['chat', 'conversation', id] as const,
  messages: (id: string) => ['chat', 'messages', id] as const,
};

export const MESSAGE_MAX_LENGTH = 2000;
export const ADDRESS_MAX_LENGTH = 500;
export const REPORT_REASON_MIN_LENGTH = 10;
export const REPORT_REASON_MAX_LENGTH = 1000;

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export const chatApi = {
  /** Crea (o devuelve) la conversación con un trabajador a partir del id de su perfil público. */
  createConversation: (workerProfileId: string) =>
    apiFetch<ConversationSummary>('/conversations', {
      method: 'POST',
      ...json({ workerProfileId }),
    }),
  listConversations: () => apiFetch<ConversationSummary[]>('/conversations'),
  getConversation: (id: string) => apiFetch<ConversationSummary>(`/conversations/${id}`),
  listMessages: (id: string, cursor?: string) =>
    apiFetch<MessagesPage>(
      `/conversations/${id}/messages${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
    ),
  uploadImage: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiFetch<{ imagePath: string; signedUrl: string }>(`/conversations/${id}/images`, {
      method: 'POST',
      body: form,
    });
  },
  block: (id: string) =>
    apiFetch<ConversationSummary>(`/conversations/${id}/block`, { method: 'POST' }),
  unblock: (id: string) =>
    apiFetch<ConversationSummary>(`/conversations/${id}/block`, { method: 'DELETE' }),
  report: (id: string, reason: string) =>
    apiFetch<{ id: string; status: string }>(`/conversations/${id}/report`, {
      method: 'POST',
      ...json({ reason }),
    }),
};

/** Hora para burbujas: 14:35. */
export function formatMessageTime(iso: string): string {
  return format(new Date(iso), 'HH:mm');
}

/** Etiqueta de día para separadores: Hoy, Ayer o "3 de octubre". */
export function formatDayLabel(iso: string): string {
  const date = new Date(iso);
  if (isToday(date)) return 'Hoy';
  if (isYesterday(date)) return 'Ayer';
  return format(date, "d 'de' MMMM", { locale: es });
}

/** Hora si fue hoy; si no, día corto (3 oct). Para la bandeja. */
export function formatInboxTime(iso: string): string {
  const date = new Date(iso);
  return isToday(date) ? format(date, 'HH:mm') : format(date, 'd MMM', { locale: es });
}

export function isSameDay(a: string, b: string): boolean {
  return format(new Date(a), 'yyyy-MM-dd') === format(new Date(b), 'yyyy-MM-dd');
}

/** Enlace a OpenStreetMap con un marcador (no se incrusta ningún mapa de terceros). */
export function mapLink(latitude: number, longitude: number): string {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`;
}

/** Ordena la bandeja por última actividad (más reciente primero). */
export function sortConversations(list: ConversationSummary[]): ConversationSummary[] {
  return [...list].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/** Inserta o reemplaza una conversación en la lista (evento conversation:updated). */
export function upsertConversation(
  list: ConversationSummary[] | undefined,
  next: ConversationSummary,
): ConversationSummary[] {
  const rest = (list ?? []).filter((item) => item.id !== next.id);
  return sortConversations([next, ...rest]);
}
