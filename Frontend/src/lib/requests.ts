import { LIMITS } from '@/lib/shared';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiFetch } from './api-client';

export type RequestStatus =
  'SENT' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type QuoteStatus = 'SENT' | 'ACCEPTED' | 'REJECTED';
export type RequestRole = 'CLIENT' | 'WORKER';

export interface QuoteDto {
  id: string;
  requestId: string | null;
  conversationId: string;
  amount: number;
  scope: string;
  status: QuoteStatus;
  createdAt: string;
}

export interface RequestReview {
  id: string;
  rating: number;
  comment: string | null;
  workerReply: string | null;
  repliedAt: string | null;
  createdAt: string;
}

/** Lo que el usuario actual puede hacer con la solicitud (lo calcula el servidor). */
export interface RequestActions {
  statuses: RequestStatus[];
  canConfirm: boolean;
  canQuote: boolean;
  canRespondQuote: boolean;
  canReview: boolean;
}

/** Igual a RequestDto del backend (fechas ISO). */
export interface ServiceRequestDto {
  id: string;
  status: RequestStatus;
  description: string;
  desiredDate: string | null;
  urgent: boolean;
  clientConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
  myRole: RequestRole;
  client: { id: string; name: string };
  worker: { id: string; name: string; workerProfileId: string | null; headline: string | null };
  service: { id: string; name: string } | null;
  conversationId: string | null;
  review: RequestReview | null;
  actions: RequestActions;
  quotes?: QuoteDto[];
}

export interface CreateRequestInput {
  workerProfileId: string;
  serviceId?: string;
  description: string;
  desiredDate?: string;
  urgent?: boolean;
}

export const REQUEST_QUERY_KEYS = {
  list: ['requests', 'list'] as const,
  detail: (id: string) => ['requests', 'detail', id] as const,
};

export const REQUEST_DESCRIPTION_MIN = 10;
export const REQUEST_DESCRIPTION_MAX = 1000;
export const QUOTE_SCOPE_MIN = 5;
export const QUOTE_SCOPE_MAX = 1000;
export const REVIEW_COMMENT_MAX = LIMITS.REVIEW_COMMENT_MAX;

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  SENT: 'Enviada',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  IN_PROGRESS: 'En curso',
  COMPLETED: 'Finalizada',
  CANCELLED: 'Cancelada',
};

export const REQUEST_STATUS_STYLES: Record<RequestStatus, string> = {
  SENT: 'bg-amber-100 text-amber-900',
  ACCEPTED: 'bg-brand-soft text-brand-dark',
  REJECTED: 'bg-red-100 text-red-800',
  IN_PROGRESS: 'bg-sky-100 text-sky-900',
  COMPLETED: 'bg-brand text-white',
  CANCELLED: 'bg-border text-muted',
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  SENT: 'Pendiente',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
};

/** Texto del botón que ejecuta cada cambio de estado, según quién lo hace. */
export function statusActionLabel(target: RequestStatus, role: RequestRole): string {
  switch (target) {
    case 'ACCEPTED':
      return 'Aceptar solicitud';
    case 'REJECTED':
      return 'Rechazar';
    case 'IN_PROGRESS':
      return 'Iniciar trabajo';
    case 'COMPLETED':
      return role === 'WORKER' ? 'Marcar como finalizado' : 'Confirmar trabajo terminado';
    case 'CANCELLED':
      return 'Cancelar solicitud';
    default:
      return REQUEST_STATUS_LABELS[target];
  }
}

/** Mensaje de confirmación para acciones que no se pueden deshacer. */
export function statusConfirmMessage(target: RequestStatus): string | null {
  switch (target) {
    case 'REJECTED':
      return '¿Rechazar esta solicitud? No se podrá deshacer.';
    case 'CANCELLED':
      return '¿Cancelar esta solicitud? No se podrá deshacer.';
    default:
      return null;
  }
}

export function statusHint(request: ServiceRequestDto): string {
  const mine = request.myRole;
  switch (request.status) {
    case 'SENT':
      return mine === 'WORKER'
        ? 'Un cliente te envió esta solicitud. Acéptala o recházala.'
        : 'Esperando la respuesta del trabajador.';
    case 'ACCEPTED':
      return mine === 'WORKER'
        ? 'Aceptaste la solicitud. Coordina los detalles por chat y envía tu cotización.'
        : 'El trabajador aceptó. Coordinen los detalles por chat.';
    case 'IN_PROGRESS':
      return 'El trabajo está en curso.';
    case 'COMPLETED':
      if (request.clientConfirmedAt) return 'Trabajo finalizado y confirmado por el cliente.';
      return mine === 'CLIENT'
        ? 'El trabajador marcó el trabajo como finalizado. Confírmalo para poder calificarlo.'
        : 'Marcaste el trabajo como finalizado. Falta que el cliente lo confirme.';
    case 'REJECTED':
      return 'El trabajador rechazó esta solicitud.';
    case 'CANCELLED':
      return 'La solicitud fue cancelada.';
  }
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export const requestsApi = {
  create: (input: CreateRequestInput) =>
    apiFetch<ServiceRequestDto>('/requests', { method: 'POST', ...json(input) }),
  list: (role?: 'client' | 'worker') =>
    apiFetch<ServiceRequestDto[]>(`/requests${role ? `?role=${role}` : ''}`),
  get: (id: string) => apiFetch<ServiceRequestDto>(`/requests/${id}`),
  changeStatus: (id: string, status: RequestStatus) =>
    apiFetch<ServiceRequestDto>(`/requests/${id}/status`, { method: 'PATCH', ...json({ status }) }),
  confirm: (id: string) =>
    apiFetch<ServiceRequestDto>(`/requests/${id}/confirm`, { method: 'POST' }),
  createQuote: (id: string, input: { amount: number; scope: string }) =>
    apiFetch<QuoteDto>(`/requests/${id}/quotes`, { method: 'POST', ...json(input) }),
  respondQuote: (quoteId: string, status: 'ACCEPTED' | 'REJECTED') =>
    apiFetch<QuoteDto>(`/quotes/${quoteId}`, { method: 'PATCH', ...json({ status }) }),
};

export function formatMoney(amount: number): string {
  const rounded = Number.isInteger(amount) ? amount.toFixed(0) : amount.toFixed(2);
  return `Q${rounded}`;
}

export function formatDate(iso: string): string {
  return format(new Date(iso), "d 'de' MMMM, yyyy", { locale: es });
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), 'd MMM yyyy, HH:mm', { locale: es });
}

/** Interpreta lo que escribió el usuario en un campo de monto. Devuelve null si no es válido. */
export function parseAmount(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  return value > 0 ? value : null;
}

/** La persona con la que se trata la solicitud, desde el punto de vista del usuario actual. */
export function counterpart(request: ServiceRequestDto): { name: string; subtitle: string | null } {
  return request.myRole === 'CLIENT'
    ? { name: request.worker.name, subtitle: request.worker.headline }
    : { name: request.client.name, subtitle: 'Cliente' };
}
