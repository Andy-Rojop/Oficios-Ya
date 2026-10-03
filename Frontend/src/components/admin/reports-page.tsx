'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ADMIN_QUERY_KEYS, adminApi, type ReportConversation, type ReportRow } from '@/lib/admin';
import { getErrorMessage } from '@/lib/auth';

export function ReportsPage() {
  const [page, setPage] = useState(1);
  const [conversation, setConversation] = useState<ReportConversation | null>(null);
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ADMIN_QUERY_KEYS.reports(page),
    queryFn: () => adminApi.reports(page),
  });

  const resolve = useMutation({
    mutationFn: (input: { id: string; resolution: string; dismiss: boolean }) =>
      input.dismiss
        ? adminApi.dismissReport(input.id, input.resolution)
        : adminApi.resolveReport(input.id, input.resolution),
    onSuccess: () => {
      setConversation(null);
      void qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
    },
  });

  const loadConversation = useMutation({
    mutationFn: (id: string) => adminApi.reportConversation(id),
    onSuccess: (data) => {
      setConversation(data);
      void qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
    },
  });

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Reportes</h1>
      <p className="text-sm text-muted">
        Reportes abiertos o en revisión. El chat solo se abre con un reporte activo.
      </p>

      {list.isLoading ? (
        <p className="text-muted">Cargando…</p>
      ) : list.isError ? (
        <Card>
          <p role="alert" className="text-sm text-red-700">
            {getErrorMessage(list.error)}
          </p>
        </Card>
      ) : !list.data?.items.length ? (
        <Card>
          <p className="text-sm text-muted">No hay reportes pendientes.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-border/40 text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Motivo</th>
                <th className="px-3 py-2">Reporta</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((row) => (
                <ReportTableRow
                  key={row.id}
                  row={row}
                  busy={resolve.isPending || loadConversation.isPending}
                  onResolve={(resolution, dismiss) =>
                    resolve.mutate({ id: row.id, resolution, dismiss })
                  }
                  onOpenChat={() => loadConversation.mutate(row.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {list.data && list.data.total > list.data.pageSize ? (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page * list.data.pageSize >= list.data.total}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      ) : null}

      {conversation ? (
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-semibold">Conversación reportada</h2>
              <p className="text-xs text-muted">
                {conversation.conversation.client.name} ↔ {conversation.conversation.worker.name} ·
                Motivo: {conversation.report.reason}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setConversation(null)}>
              Cerrar
            </Button>
          </div>
          <ul className="max-h-96 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
            {conversation.messages.length === 0 ? (
              <li className="text-sm text-muted">Sin mensajes en esta conversación.</li>
            ) : (
              conversation.messages.map((msg) => {
                const isClient = msg.senderId === conversation.conversation.client.id;
                const author = isClient
                  ? conversation.conversation.client.name
                  : conversation.conversation.worker.name;
                return (
                  <li
                    key={msg.id}
                    className={`rounded-lg px-3 py-2 text-sm ${isClient ? 'bg-brand-soft/50' : 'bg-border/40'}`}
                  >
                    <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-semibold">{author}</span>
                      <time className="text-[11px] text-muted">
                        {format(new Date(msg.createdAt), 'd MMM yyyy · HH:mm', { locale: es })}
                      </time>
                    </div>
                    {msg.type === 'IMAGE' && msg.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal de storage
                      <img
                        src={msg.imageUrl}
                        alt="Imagen del chat"
                        className="max-h-48 rounded-md"
                      />
                    ) : null}
                    {msg.type === 'LOCATION' && msg.latitude != null && msg.longitude != null ? (
                      <p className="font-mono text-xs">
                        Ubicación: {msg.latitude}, {msg.longitude}
                      </p>
                    ) : null}
                    {msg.content ? <p className="whitespace-pre-wrap">{msg.content}</p> : null}
                  </li>
                );
              })
            )}
          </ul>
        </Card>
      ) : null}

      {(resolve.isError || loadConversation.isError) && (
        <p role="alert" className="text-sm text-red-700">
          {getErrorMessage(resolve.error ?? loadConversation.error)}
        </p>
      )}
    </section>
  );
}

function ReportTableRow({
  row,
  busy,
  onResolve,
  onOpenChat,
}: {
  row: ReportRow;
  busy: boolean;
  onResolve: (resolution: string, dismiss: boolean) => void;
  onOpenChat: () => void;
}) {
  return (
    <tr className="border-t border-border align-top">
      <td className="px-3 py-2">
        <p className="font-medium">{row.targetType}</p>
        <p className="font-mono text-[11px] text-muted">{row.targetId}</p>
      </td>
      <td className="max-w-xs px-3 py-2">{row.reason}</td>
      <td className="px-3 py-2">
        <p>{row.reporter.name}</p>
        <p className="text-xs text-muted">{row.reporter.phone}</p>
      </td>
      <td className="px-3 py-2">{row.status}</td>
      <td className="px-3 py-2">
        <div className="flex flex-wrap gap-2">
          {row.targetType === 'CONVERSATION' ? (
            <Button size="sm" variant="outline" disabled={busy} onClick={onOpenChat}>
              Ver chat
            </Button>
          ) : null}
          <Button
            size="sm"
            disabled={busy}
            onClick={() => {
              const resolution = window.prompt('Resolución')?.trim();
              if (resolution) onResolve(resolution, false);
            }}
          >
            Resolver
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => {
              const resolution = window.prompt('Motivo de desestimar')?.trim();
              if (resolution) onResolve(resolution, true);
            }}
          >
            Desestimar
          </Button>
        </div>
      </td>
    </tr>
  );
}
