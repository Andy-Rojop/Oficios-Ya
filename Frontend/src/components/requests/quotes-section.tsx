'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage } from '@/lib/auth';
import {
  formatDateTime,
  formatMoney,
  parseAmount,
  QUOTE_SCOPE_MAX,
  QUOTE_SCOPE_MIN,
  QUOTE_STATUS_LABELS,
  REQUEST_QUERY_KEYS,
  requestsApi,
  type QuoteDto,
  type ServiceRequestDto,
} from '@/lib/requests';
import { cn } from '@/lib/utils';

const QUOTE_STYLES = {
  SENT: 'bg-amber-100 text-amber-900',
  ACCEPTED: 'bg-brand-soft text-brand-dark',
  REJECTED: 'bg-border text-muted',
} as const;

/** Cotizaciones de la solicitud. El servidor solo las entrega a cliente y trabajador. */
export function QuotesSection({ request }: { request: ServiceRequestDto }) {
  const queryClient = useQueryClient();
  const quotes = request.quotes ?? [];
  const hasPending = quotes.some((quote) => quote.status === 'SENT');

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: REQUEST_QUERY_KEYS.detail(request.id) });
    void queryClient.invalidateQueries({ queryKey: REQUEST_QUERY_KEYS.list });
  }

  const respond = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACCEPTED' | 'REJECTED' }) =>
      requestsApi.respondQuote(id, status),
    onSuccess: refresh,
  });

  return (
    <div className="space-y-3">
      {quotes.length === 0 ? (
        <p className="text-sm text-muted">
          {request.actions.canQuote
            ? 'Aún no has enviado una cotización.'
            : 'Todavía no hay cotizaciones. Son privadas: solo tú y el trabajador pueden verlas.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {quotes.map((quote) => (
            <QuoteItem
              key={quote.id}
              quote={quote}
              canRespond={request.actions.canRespondQuote && quote.status === 'SENT'}
              busy={respond.isPending}
              onRespond={(status) => respond.mutate({ id: quote.id, status })}
            />
          ))}
        </ul>
      )}

      {respond.isError ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {getErrorMessage(respond.error)}
        </p>
      ) : null}

      {request.actions.canQuote && !hasPending ? (
        <QuoteForm requestId={request.id} onSent={refresh} />
      ) : request.actions.canQuote ? (
        <p className="text-xs text-muted">
          Podrás enviar otra cotización cuando el cliente responda la actual.
        </p>
      ) : null}
    </div>
  );
}

function QuoteItem({
  quote,
  canRespond,
  busy,
  onRespond,
}: {
  quote: QuoteDto;
  canRespond: boolean;
  busy: boolean;
  onRespond: (status: 'ACCEPTED' | 'REJECTED') => void;
}) {
  return (
    <li className="space-y-2 rounded-xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xl font-semibold text-brand-dark">{formatMoney(quote.amount)}</p>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-semibold',
            QUOTE_STYLES[quote.status],
          )}
        >
          {QUOTE_STATUS_LABELS[quote.status]}
        </span>
      </div>
      <p className="whitespace-pre-line text-sm">{quote.scope}</p>
      <p className="text-xs text-muted">{formatDateTime(quote.createdAt)}</p>
      {canRespond ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" disabled={busy} onClick={() => onRespond('ACCEPTED')}>
            Aceptar cotización
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => {
              if (window.confirm('¿Rechazar esta cotización?')) onRespond('REJECTED');
            }}
          >
            Rechazar
          </Button>
        </div>
      ) : null}
    </li>
  );
}

function QuoteForm({ requestId, onSent }: { requestId: string; onSent: () => void }) {
  const [amountText, setAmountText] = useState('');
  const [scope, setScope] = useState('');
  const amount = parseAmount(amountText);
  const trimmed = scope.trim();
  const valid = amount !== null && trimmed.length >= QUOTE_SCOPE_MIN;

  const send = useMutation({
    mutationFn: () =>
      requestsApi.createQuote(requestId, { amount: amount as number, scope: trimmed }),
    onSuccess: () => {
      setAmountText('');
      setScope('');
      onSent();
    },
  });

  return (
    <form
      className="space-y-3 rounded-xl bg-brand-soft/40 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !send.isPending) send.mutate();
      }}
    >
      <p className="text-sm font-semibold">Enviar cotización</p>
      <div className="space-y-1">
        <label htmlFor="quote-amount" className="text-sm font-medium">
          Monto (Q)
        </label>
        <Input
          id="quote-amount"
          inputMode="decimal"
          placeholder="Ej. 350 o 350.50"
          value={amountText}
          aria-invalid={amountText !== '' && amount === null}
          onChange={(event) => setAmountText(event.target.value)}
        />
        {amountText !== '' && amount === null ? (
          <p className="text-xs text-red-700">Escribe un monto válido, con máximo 2 decimales.</p>
        ) : null}
      </div>
      <div className="space-y-1">
        <label htmlFor="quote-scope" className="text-sm font-medium">
          Qué incluye
        </label>
        <Textarea
          id="quote-scope"
          rows={3}
          maxLength={QUOTE_SCOPE_MAX}
          value={scope}
          placeholder="Mano de obra, materiales, tiempo estimado…"
          onChange={(event) => setScope(event.target.value)}
        />
      </div>
      {send.isError ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {getErrorMessage(send.error)}
        </p>
      ) : null}
      <Button type="submit" disabled={!valid || send.isPending}>
        {send.isPending ? 'Enviando…' : 'Enviar cotización'}
      </Button>
    </form>
  );
}
