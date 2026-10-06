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
  'Aún no has solicitado ningún servicio. Buscá un trabajador y tocá «Solicitar servicio» en su perfil.';
const EMPTY_WORKER =
  'Aún no has recibido solicitudes. Cuando un cliente te pida un servicio, aparecerá aquí.';

/**
 * Lista de solicitudes según el modo activo (cliente o trabajador).
 * No mezcla ambos roles en la misma vista.
 */
export function RequestsView() {
  const router = useRouter();
  const me = useMe();

  const requests = useQuery<ServiceRequestDto[], Error>({
    queryKey: REQUEST_QUERY_KEYS.list,
    queryFn: () => requestsApi.list(),
    refetchOnMount: 'always',
    retry: false,
  });

  useEffect(() => {
    if (isUnauthorized(me.error) || isUnauthorized(requests.error)) {
      router.replace('/ingresar?next=/solicitudes');
    }
  }, [me.error, requests.error, router]);

  const asWorker = me.data?.activeMode === 'WORKER';
  const all = requests.data ?? [];
  const visible = all.filter((request) => request.myRole === (asWorker ? 'WORKER' : 'CLIENT'));
  const emptyText = asWorker ? EMPTY_WORKER : EMPTY_CLIENT;

  return (
    <section className="mx-auto w-full max-w-2xl space-y-4">
      <header className="space-y-1">
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
        >
          Solicitudes
        </h1>
        <p className="text-sm text-muted">
          {asWorker
            ? 'Pedidos que te enviaron los clientes.'
            : 'Servicios que pediste a trabajadores.'}
        </p>
      </header>

      {requests.isLoading || me.isLoading ? (
        <p className="text-muted">Cargando tus solicitudes…</p>
      ) : requests.isError && !isUnauthorized(requests.error) ? (
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
        className="block rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors hover:bg-brand-soft/50"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold">{other.name}</p>
            {other.subtitle ? (
              <p className="truncate text-xs text-brand-dark">{other.subtitle}</p>
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
        <p className="mt-2 line-clamp-2 text-sm">{request.description}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 text-xs text-muted">
          <span>Enviada el {formatDate(request.createdAt)}</span>
          {request.service ? <span>· {request.service.name}</span> : null}
          {needsAction ? (
            <span className="font-semibold text-brand">· Requiere tu atención</span>
          ) : null}
        </p>
      </Link>
    </li>
  );
}
