import { ConflictException, ForbiddenException } from '@nestjs/common';
import { RequestStatus } from '../generated/prisma/enums';

/** Rol que cumple un usuario dentro de UNA solicitud (no depende de su modo activo). */
export type RequestActor = 'CLIENT' | 'WORKER';

/**
 * Máquina de estados de una solicitud: estado actual -> destino -> quién puede hacer el cambio.
 *
 *  SENT        -> ACCEPTED | REJECTED (trabajador) | CANCELLED (cliente)
 *  ACCEPTED    -> IN_PROGRESS (trabajador) | CANCELLED (cualquiera de los dos)
 *  IN_PROGRESS -> COMPLETED (trabajador: queda pendiente la confirmación del cliente;
 *                            cliente: finaliza y confirma en un solo paso)
 *  REJECTED, COMPLETED, CANCELLED son finales. Cancelar solo se permite en estados tempranos.
 */
export const REQUEST_TRANSITIONS: Readonly<
  Record<RequestStatus, Readonly<Partial<Record<RequestStatus, readonly RequestActor[]>>>>
> = {
  [RequestStatus.SENT]: {
    [RequestStatus.ACCEPTED]: ['WORKER'],
    [RequestStatus.REJECTED]: ['WORKER'],
    [RequestStatus.CANCELLED]: ['CLIENT'],
  },
  [RequestStatus.ACCEPTED]: {
    [RequestStatus.IN_PROGRESS]: ['WORKER'],
    [RequestStatus.CANCELLED]: ['CLIENT', 'WORKER'],
  },
  [RequestStatus.IN_PROGRESS]: {
    [RequestStatus.COMPLETED]: ['WORKER', 'CLIENT'],
  },
  [RequestStatus.REJECTED]: {},
  [RequestStatus.COMPLETED]: {},
  [RequestStatus.CANCELLED]: {},
};

/** Estados a los que `actor` puede mover una solicitud que está en `current`. */
export function allowedTargets(current: RequestStatus, actor: RequestActor): RequestStatus[] {
  return Object.entries(REQUEST_TRANSITIONS[current])
    .filter(([, actors]) => actors?.includes(actor))
    .map(([target]) => target as RequestStatus);
}

/** Estados en los que aún se pueden enviar/aceptar cotizaciones. */
export const QUOTABLE_STATUSES: readonly RequestStatus[] = [
  RequestStatus.SENT,
  RequestStatus.ACCEPTED,
];

/** Estados "abiertos": la solicitud sigue viva (el cliente aún puede responder cotizaciones). */
export const OPEN_STATUSES: readonly RequestStatus[] = [
  RequestStatus.SENT,
  RequestStatus.ACCEPTED,
  RequestStatus.IN_PROGRESS,
];

/**
 * Valida la transición. Si el cambio no existe en la máquina de estados -> 409;
 * si existe pero ese rol no puede hacerlo -> 403.
 */
export function assertTransition(
  current: RequestStatus,
  target: RequestStatus,
  actor: RequestActor,
): void {
  const actors = REQUEST_TRANSITIONS[current]?.[target];
  if (!actors) {
    throw new ConflictException(
      'No se puede cambiar la solicitud a ese estado desde su estado actual',
    );
  }
  if (!actors.includes(actor)) {
    throw new ForbiddenException('No tiene permiso para hacer este cambio en la solicitud');
  }
}
