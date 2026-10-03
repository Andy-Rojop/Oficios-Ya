'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { ApiError } from '@/lib/api-client';
import { getErrorMessage, isUnauthorized, useMe } from '@/lib/auth';
import {
  counterpart,
  formatDate,
  REQUEST_QUERY_KEYS,
  requestsApi,
  statusActionLabel,
  statusConfirmMessage,
  statusHint,
  type RequestStatus,
  type ServiceRequestDto,
} from '@/lib/requests';
import { QuotesSection } from './quotes-section';
import { ReplyForm, ReviewForm } from './review-form';
import { StarsDisplay } from './star-rating';
import { StatusBadge } from './status-badge';

export function RequestDetailView({ requestId }: { requestId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useMe();

  const query = useQuery<ServiceRequestDto, Error>({
    queryKey: REQUEST_QUERY_KEYS.detail(requestId),
    queryFn: () => requestsApi.get(requestId),
    refetchOnMount: 'always',
    retry: false,
  });

  useEffect(() => {
    if (isUnauthorized(me.error) || isUnauthorized(query.error)) {
      router.replace(`/ingresar?next=/solicitudes/${requestId}`);
    }
  }, [me.error, query.error, router, requestId]);

  function onUpdated(request: ServiceRequestDto) {
    queryClient.setQueryData(REQUEST_QUERY_KEYS.detail(requestId), request);
    void queryClient.invalidateQueries({ queryKey: REQUEST_QUERY_KEYS.list });
  }

  const changeStatus = useMutation({
    mutationFn: (status: RequestStatus) => requestsApi.changeStatus(requestId, status),
    onSuccess: onUpdated,
    // Si otra persona cambió la solicitud, se recarga para mostrar el estado real.
    onError: () =>
      void queryClient.invalidateQueries({ queryKey: REQUEST_QUERY_KEYS.detail(requestId) }),
  });
  const confirm = useMutation({
    mutationFn: () => requestsApi.confirm(requestId),
    onSuccess: onUpdated,
    onError: () =>
      void queryClient.invalidateQueries({ queryKey: REQUEST_QUERY_KEYS.detail(requestId) }),
  });

  if (query.isLoading) {
    return <p className="text-center text-muted">Cargando la solicitud…</p>;
  }
  if (query.isError) {
    if (isUnauthorized(query.error)) return null;
    const notFound = query.error instanceof ApiError && query.error.statusCode === 404;
    return (
      <section className="mx-auto w-full max-w-2xl space-y-3 text-center">
        <p role="alert" className="font-semibold">
          {notFound ? 'No encontramos esta solicitud.' : getErrorMessage(query.error)}
        </p>
        <Link href="/solicitudes" className="text-sm font-semibold text-brand underline">
          Volver a mis solicitudes
        </Link>
      </section>
    );
  }

  const request = query.data;
  if (!request) return null;

  const other = counterpart(request);
  const { actions } = request;
  const busy = changeStatus.isPending || confirm.isPending;
  const actionError = changeStatus.error ?? confirm.error;
  const showQuotes = (request.quotes?.length ?? 0) > 0 || actions.canQuote;

  function runStatus(target: RequestStatus) {
    const message = statusConfirmMessage(target);
    if (message && !window.confirm(message)) return;
    changeStatus.mutate(target);
  }

  return (
    <article className="mx-auto w-full max-w-2xl space-y-5">
      <Link href="/solicitudes" className="inline-block text-sm font-semibold text-brand underline">
        ← Mis solicitudes
      </Link>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1
              className="break-words text-2xl font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              {request.myRole === 'CLIENT' ? 'Solicitud a ' : 'Solicitud de '}
              {request.myRole === 'CLIENT' && request.worker.workerProfileId ? (
                <Link href={`/trabajador/${request.worker.workerProfileId}`} className="underline">
                  {other.name}
                </Link>
              ) : (
                other.name
              )}
            </h1>
            {other.subtitle ? <p className="text-sm text-brand-dark">{other.subtitle}</p> : null}
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

        <p className="rounded-lg bg-brand-soft/60 px-3 py-2 text-sm">{statusHint(request)}</p>

        <p className="whitespace-pre-line">{request.description}</p>

        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          {request.service ? <Fact label="Servicio" value={request.service.name} /> : null}
          {request.desiredDate ? (
            <Fact label="Fecha deseada" value={formatDate(request.desiredDate)} />
          ) : null}
          <Fact label="Enviada" value={formatDate(request.createdAt)} />
        </dl>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {actions.statuses.map((target) => (
              <Button
                key={target}
                variant={target === 'REJECTED' || target === 'CANCELLED' ? 'outline' : 'default'}
                disabled={busy}
                onClick={() => runStatus(target)}
              >
                {statusActionLabel(target, request.myRole)}
              </Button>
            ))}
            {actions.canConfirm ? (
              <Button disabled={busy} onClick={() => confirm.mutate()}>
                Confirmar trabajo terminado
              </Button>
            ) : null}
            {request.conversationId ? (
              <Link
                href={`/mensajes/${request.conversationId}`}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-surface px-5 text-sm font-semibold hover:bg-brand-soft"
              >
                Abrir chat
              </Link>
            ) : null}
          </div>
          {actionError ? (
            <p role="alert" className="text-sm font-medium text-red-700">
              {getErrorMessage(actionError)}
            </p>
          ) : null}
        </div>
      </Card>

      {showQuotes ? (
        <Card className="space-y-3">
          <CardTitle>Cotizaciones</CardTitle>
          <QuotesSection request={request} />
        </Card>
      ) : null}

      {request.review || actions.canReview ? (
        <Card className="space-y-3">
          <CardTitle>Reseña</CardTitle>
          {request.review ? (
            <div className="space-y-2">
              <StarsDisplay rating={request.review.rating} className="text-xl" />
              {request.review.comment ? (
                <p className="whitespace-pre-line text-sm">{request.review.comment}</p>
              ) : null}
              <p className="text-xs text-muted">{formatDate(request.review.createdAt)}</p>
              {request.review.workerReply ? (
                <div className="rounded-lg bg-brand-soft/50 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Respuesta de {request.worker.name}
                  </p>
                  <p className="whitespace-pre-line">{request.review.workerReply}</p>
                </div>
              ) : request.myRole === 'WORKER' ? (
                <ReplyForm reviewId={request.review.id} requestId={request.id} />
              ) : null}
            </div>
          ) : (
            <ReviewForm requestId={request.id} workerProfileId={request.worker.workerProfileId} />
          )}
        </Card>
      ) : null}
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
