'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { getErrorMessage, isUnauthorized, useMe } from '@/lib/auth';
import {
  counterpart,
  formatDate,
  REQUEST_QUERY_KEYS,
  requestsApi,
  type ServiceRequestDto,
} from '@/lib/requests';
import { StatusBadge } from './status-badge';

const EMPTY_CLIENT =
  'Aún no ha solicitado ningún servicio. Busque un trabajador y toque «Solicitar servicio» en su perfil.';
const EMPTY_WORKER =
  'Aún no ha recibido solicitudes. Cuando un cliente le pida un servicio, aparecerá aquí.';

/**
 * Lista de solicitudes según el modo activo (cliente o trabajador).
 * No mezcla ambos roles en la misma vista.
 */
export function RequestsView() {
  const router = useRouter();
  const me = useMe();
  const asWorker = me.data?.activeMode === 'WORKER';
  const role = asWorker ? 'worker' : 'client';

  const requests = useQuery<ServiceRequestDto[], Error>({
    queryKey: REQUEST_QUERY_KEYS.list(role),
    queryFn: () => requestsApi.list(role),
    enabled: Boolean(me.data),
    staleTime: 15_000,
    retry: 1,
    // Evita vaciar la lista en cada remount/refetch (parpadeo en Safari).
    placeholderData: (previous) => previous,
  });

  useEffect(() => {
    if (isUnauthorized(me.error) || isUnauthorized(requests.error)) {
      router.replace('/ingresar?next=/solicitudes');
    }
  }, [me.error, requests.error, router]);

  const visible = requests.data ?? [];
  const emptyText = asWorker ? EMPTY_WORKER : EMPTY_CLIENT;
  const showInitialLoading =
    (me.isLoading && !me.data) || (requests.isPending && !requests.data);

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <header className="space-y-1">
        <h1
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
          style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
        >
          Mis solicitudes
        </h1>
        <p className="text-sm text-muted">
          {asWorker
            ? 'Pedidos que le enviaron los clientes.'
            : 'Historial y estado de los servicios que solicitó.'}
        </p>
      </header>

      {showInitialLoading ? (
        <p className="text-muted">Cargando sus solicitudes…</p>
      ) : requests.isError && !requests.data && !isUnauthorized(requests.error) ? (
        <Card className="space-y-3">
          <p role="alert" className="text-sm font-medium text-red-700">
            {getErrorMessage(requests.error)}
          </p>
          <button
            className="text-sm font-semibold text-brand underline"
            onClick={() => requests.refetch()}
          >
            Reintentar
          </button>
        </Card>
      ) : visible.length === 0 ? (
        <Card className="space-y-2 text-center">
          <p className="text-sm text-muted">{emptyText}</p>
          {!asWorker ? (
            <Link href="/buscar" className="inline-block text-sm font-semibold text-brand underline">
              Buscar trabajadores
            </Link>
          ) : null}
        </Card>
      ) : (
        <ul className="space-y-3">
          {visible.map((request) => (
            <RequestRow key={request.id} request={request} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RequestRow({ request }: { request: ServiceRequestDto }) {
  const other = counterpart(request);
  const needsAction =
    request.actions.canConfirm ||
    (request.myRole === 'WORKER' && request.status === 'SENT') ||
    request.actions.canReview;

  return (
    <li>
      <Link
        href={`/solicitudes/${request.id}`}
        className="block rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover-fine:-translate-y-0.5 hover-fine:border-accent/30 hover-fine:shadow-md"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{other.name}</p>
            {other.subtitle ? (
              <p className="truncate text-xs text-accent-dark">{other.subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-1.5">
            {request.urgent ? (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800">
                Urgente
              </span>
            ) : null}
            <StatusBadge status={request.status} />
          </div>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-foreground/90">{request.description}</p>
        <p className="mt-3 flex flex-wrap items-center gap-x-3 border-t border-border/70 pt-2 text-xs text-muted">
          <span>Enviada el {formatDate(request.createdAt)}</span>
          {request.service ? <span>· {request.service.name}</span> : null}
          {needsAction ? (
            <span className="font-semibold text-accent">· Requiere su atención</span>
          ) : null}
        </p>
      </Link>
    </li>
  );
}
