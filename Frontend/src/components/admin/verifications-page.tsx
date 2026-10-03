'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ADMIN_QUERY_KEYS, adminApi } from '@/lib/admin';
import { getErrorMessage } from '@/lib/auth';

export function VerificationsPage() {
  const [page, setPage] = useState(1);
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ADMIN_QUERY_KEYS.verifications(page),
    queryFn: () => adminApi.verifications(page),
  });

  const decide = useMutation({
    mutationFn: (input: { id: string; decision: 'VERIFIED' | 'REJECTED'; note?: string }) =>
      adminApi.decideVerification(input.id, input.decision, input.note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'verifications'] }),
  });

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Verificaciones de identidad</h1>
      <p className="text-sm text-muted">Trabajadores con identidad pendiente de revisión.</p>

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
          <p className="text-sm text-muted">No hay verificaciones pendientes.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-border/40 text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Trabajador</th>
                <th className="px-3 py-2">Oficio</th>
                <th className="px-3 py-2">DPI</th>
                <th className="px-3 py-2">NIT</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <p className="font-medium">{row.user.name}</p>
                    <p className="text-xs text-muted">{row.user.phone}</p>
                  </td>
                  <td className="px-3 py-2">{row.headline}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.dpi ?? '—'}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.nit ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={decide.isPending}
                        onClick={() => decide.mutate({ id: row.id, decision: 'VERIFIED' })}
                      >
                        Aprobar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={decide.isPending}
                        onClick={() => {
                          const note = window.prompt('Motivo del rechazo (opcional)') ?? undefined;
                          decide.mutate({
                            id: row.id,
                            decision: 'REJECTED',
                            note: note || undefined,
                          });
                        }}
                      >
                        Rechazar
                      </Button>
                    </div>
                  </td>
                </tr>
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

      {decide.isError ? (
        <p role="alert" className="text-sm text-red-700">
          {getErrorMessage(decide.error)}
        </p>
      ) : null}
    </section>
  );
}
