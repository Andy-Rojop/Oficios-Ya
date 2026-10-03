import type { QuoteStatus, RequestStatus } from '../../generated/prisma/enums';
import {
  allowedTargets,
  OPEN_STATUSES,
  QUOTABLE_STATUSES,
  type RequestActor,
} from '../request-status.util';

export interface QuoteDto {
  id: string;
  requestId: string | null;
  conversationId: string;
  amount: number;
  scope: string;
  status: QuoteStatus;
  createdAt: Date;
}

export interface RequestReviewDto {
  id: string;
  rating: number;
  comment: string | null;
  workerReply: string | null;
  repliedAt: Date | null;
  createdAt: Date;
}

/** Qué puede hacer el usuario actual con la solicitud (calculado en el servidor). */
export interface RequestActionsDto {
  /** Estados a los que puede mover la solicitud con PATCH /requests/:id/status. */
  statuses: RequestStatus[];
  /** El cliente puede confirmar un trabajo que el trabajador marcó como finalizado. */
  canConfirm: boolean;
  /** El trabajador puede enviar una cotización. */
  canQuote: boolean;
  /** El cliente puede aceptar/rechazar cotizaciones pendientes. */
  canRespondQuote: boolean;
  /** El cliente puede dejar su reseña. */
  canReview: boolean;
}

export interface RequestDto {
  id: string;
  status: RequestStatus;
  description: string;
  desiredDate: Date | null;
  urgent: boolean;
  clientConfirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Rol del usuario actual en ESTA solicitud. */
  myRole: RequestActor;
  client: { id: string; name: string };
  worker: { id: string; name: string; workerProfileId: string | null; headline: string | null };
  service: { id: string; name: string } | null;
  conversationId: string | null;
  review: RequestReviewDto | null;
  actions: RequestActionsDto;
  /** Solo en el detalle, y únicamente para participantes. */
  quotes?: QuoteDto[];
}

/** Forma de la fila de Prisma que usan los mappers (ver REQUEST_SELECT en requests.service). */
export interface RequestRow {
  id: string;
  clientId: string;
  workerId: string;
  description: string;
  desiredDate: Date | null;
  urgent: boolean;
  status: RequestStatus;
  clientConfirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  client: { id: string; name: string };
  worker: { id: string; name: string; workerProfile: { id: string; headline: string } | null };
  service: { id: string; name: string } | null;
  conversation: { id: string } | null;
  review: RequestReviewDto | null;
}

export interface QuoteRow {
  id: string;
  requestId: string | null;
  conversationId: string;
  amount: { toString(): string } | number;
  scope: string;
  status: QuoteStatus;
  createdAt: Date;
}

export function toQuoteDto(row: QuoteRow): QuoteDto {
  return {
    id: row.id,
    requestId: row.requestId,
    conversationId: row.conversationId,
    amount: Number(row.amount.toString()),
    scope: row.scope,
    status: row.status,
    createdAt: row.createdAt,
  };
}

export function buildActions(
  row: Pick<RequestRow, 'status' | 'clientConfirmedAt'> & { review: unknown | null },
  actor: RequestActor,
): RequestActionsDto {
  const isClient = actor === 'CLIENT';
  return {
    statuses: allowedTargets(row.status, actor),
    canConfirm: isClient && row.status === 'COMPLETED' && row.clientConfirmedAt === null,
    canQuote: !isClient && QUOTABLE_STATUSES.includes(row.status),
    canRespondQuote: isClient && OPEN_STATUSES.includes(row.status),
    canReview:
      isClient &&
      row.status === 'COMPLETED' &&
      row.clientConfirmedAt !== null &&
      row.review === null,
  };
}

export function toRequestDto(
  row: RequestRow,
  userId: string,
  options: { quotes?: QuoteRow[]; conversationId?: string | null } = {},
): RequestDto {
  const actor: RequestActor = row.clientId === userId ? 'CLIENT' : 'WORKER';
  const dto: RequestDto = {
    id: row.id,
    status: row.status,
    description: row.description,
    desiredDate: row.desiredDate,
    urgent: row.urgent,
    clientConfirmedAt: row.clientConfirmedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    myRole: actor,
    client: { id: row.client.id, name: row.client.name },
    worker: {
      id: row.worker.id,
      name: row.worker.name,
      workerProfileId: row.worker.workerProfile?.id ?? null,
      headline: row.worker.workerProfile?.headline ?? null,
    },
    service: row.service ? { id: row.service.id, name: row.service.name } : null,
    conversationId: options.conversationId ?? row.conversation?.id ?? null,
    review: row.review,
    actions: buildActions(row, actor),
  };
  if (options.quotes) {
    dto.quotes = options.quotes.map(toQuoteDto);
  }
  return dto;
}
