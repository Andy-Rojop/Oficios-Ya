'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, Flag } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ADMIN_QUERY_KEYS, adminApi, type ReportConversation, type ReportRow } from '@/lib/admin';
import { getErrorMessage } from '@/lib/auth';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-amber-100 text-amber-900',
  IN_REVIEW: 'bg-orange-100 text-orange-900',
  RESOLVED: 'bg-emerald-100 text-emerald-900',
  DISMISSED: 'bg-border text-muted',
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Pendiente',
  IN_REVIEW: 'En revisión',
  RESOLVED: 'Resuelto',
  DISMISSED: 'Desestimado',
};

export function ReportsPage() {
  const [page, setPage] = useState(1);
  const [conversation, setConversation] = useState<ReportConversation | null>(null);
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ADMIN_QUERY_KEYS.reports(page),
    queryFn: () => adminApi.reports(page),
  });
  const stats = useQuery({ queryKey: ADMIN_QUERY_KEYS.stats, queryFn: adminApi.stats });

  const resolve = useMutation({
    mutationFn: (input: { id: string; resolution: string; dismiss: boolean }) =>
      input.dismiss
        ? adminApi.dismissReport(input.id, input.resolution)
        : adminApi.resolveReport(input.id, input.resolution),
    onSuccess: () => {
      setConversation(null);
      void qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
      void qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.stats });
    },
  });

  const loadConversation = useMutation({
    mutationFn: (id: string) => adminApi.reportConversation(id),
    onSuccess: (data) => {
      setConversation(data);
      void qc.invalidateQueries({ queryKey: ['admin', 'reports'] });
    },
  });

  const pendingCount = useMemo(() => {
    const items = list.data?.items ?? [];
    return items.filter((row) => row.status === 'OPEN' || row.status === 'IN_REVIEW').length;
  }, [list.data?.items]);

  return (
    <section className="space-y-5">
      <header className="space-y-1">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
        >
          Panel de Moderación de Reportes
        </h1>
        <p className="text-sm text-muted">
          Revise reportes abiertos, revise el chat y resuelva o desestime casos.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          icon={<Flag className="h-5 w-5 text-amber-600" aria-hidden />}
          label="Reportes pendientes"
          value={stats.data?.openReports ?? pendingCount}
          hint="Requieren atención"
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-accent" aria-hidden />}
          label="En esta página"
          value={list.data?.items.length ?? 0}
          hint={`Total filtrado: ${list.data?.total ?? 0}`}
        />
      </div>

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
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Reportes recientes</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-brand-soft/60 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Motivo</th>
                  <th className="px-4 py-3">Reportado por</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Acciones</th>
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
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#1a2332]/55 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-detail-title"
          onClick={() => setConversation(null)}
        >
          <div
            className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Detalle de reporte
                </p>
                <h2 id="report-detail-title" className="text-lg font-semibold">
                  Conversación reportada
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {conversation.conversation.client.name} ↔ {conversation.conversation.worker.name}
                </p>
                <p className="text-xs text-muted">Motivo: {conversation.report.reason}</p>
              </div>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-semibold',
                  STATUS_STYLES[conversation.report.status] ?? 'bg-border text-muted',
                )}
              >
                {STATUS_LABELS[conversation.report.status] ?? conversation.report.status}
              </span>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                Evidencia del chat
              </p>
              <ul className="max-h-80 space-y-2 overflow-y-auto rounded-xl border border-border bg-[#f7f8fa] p-3">
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
                        className={cn(
                          'rounded-xl px-3 py-2 text-sm shadow-sm',
                          isClient ? 'ml-6 bg-white' : 'mr-6 bg-accent-soft',
                        )}
                      >
                        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-semibold">{author}</span>
                          <time className="text-[11px] text-muted">
                            {format(new Date(msg.createdAt), 'd MMM · HH:mm', { locale: es })}
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
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button size="sm" variant="ghost" onClick={() => setConversation(null)}>
                Cerrar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={resolve.isPending}
                onClick={() => {
                  const resolution = window.prompt('Motivo de desestimar')?.trim();
                  if (resolution) {
                    resolve.mutate({
                      id: conversation.report.id,
                      resolution,
                      dismiss: true,
                    });
                  }
                }}
              >
                Desestimar reporte
              </Button>
              <Button
                size="sm"
                className="bg-red-700 text-white hover:bg-red-800"
                disabled={resolve.isPending}
                onClick={() => {
                  const resolution = window.prompt('Resolución / sanción')?.trim();
                  if (resolution) {
                    resolve.mutate({
                      id: conversation.report.id,
                      resolution,
                      dismiss: false,
                    });
                  }
                }}
              >
                Suspender / sancionar
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {(resolve.isError || loadConversation.isError) && (
        <p role="alert" className="text-sm text-red-700">
          {getErrorMessage(resolve.error ?? loadConversation.error)}
        </p>
      )}
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <Card className="flex items-start gap-3 p-4 sm:p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft">
        {icon}
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-0.5 text-3xl font-semibold tracking-tight">{value}</p>
        <p className="text-xs text-muted">{hint}</p>
      </div>
    </Card>
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
      <td className="px-4 py-3">
        <p className="font-medium">{row.targetType}</p>
        <p className="font-mono text-[11px] text-muted">{row.targetId.slice(0, 8)}…</p>
      </td>
      <td className="max-w-xs px-4 py-3">{row.reason}</td>
      <td className="px-4 py-3">
        <p>{row.reporter.name}</p>
        <p className="text-xs text-muted">{row.reporter.phone}</p>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
        {format(new Date(row.createdAt), 'd MMM yyyy', { locale: es })}
      </td>
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex rounded-full px-2.5 py-1 text-xs font-semibold',
            STATUS_STYLES[row.status] ?? 'bg-border text-muted',
          )}
        >
          {STATUS_LABELS[row.status] ?? row.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {row.targetType === 'CONVERSATION' ? (
            <Button size="sm" variant="accent" disabled={busy} onClick={onOpenChat}>
              Revisar detalle
            </Button>
          ) : (
            <>
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
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
