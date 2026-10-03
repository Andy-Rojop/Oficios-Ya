'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ADMIN_QUERY_KEYS, adminApi } from '@/lib/admin';
import { getErrorMessage, useMe } from '@/lib/auth';

export function AuditPage() {
  const me = useMe();
  const [page, setPage] = useState(1);
  const list = useQuery({
    queryKey: ADMIN_QUERY_KEYS.audit(page),
    queryFn: () => adminApi.auditLog(page),
    enabled: me.data?.role === 'ADMIN',
  });

  if (me.data && me.data.role !== 'ADMIN') {
    return (
      <Card>
        <p className="text-sm text-muted">Solo los administradores pueden ver la bitácora.</p>
      </Card>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Bitácora</h1>
      <p className="text-sm text-muted">Registro de acciones administrativas.</p>

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
          <p className="text-sm text-muted">Aún no hay entradas en la bitácora.</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-border/40 text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Acción</th>
                <th className="px-3 py-2">Recurso</th>
                <th className="px-3 py-2">Detalle</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((row) => (
                <tr key={row.id} className="border-t border-border align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                    {format(new Date(row.createdAt), 'd MMM yyyy HH:mm', { locale: es })}
                  </td>
                  <td className="px-3 py-2">{row.actor?.name ?? '—'}</td>
                  <td className="px-3 py-2 font-medium">{row.action}</td>
                  <td className="px-3 py-2">
                    <p>{row.resource}</p>
                    <p className="font-mono text-[11px] text-muted">{row.resourceId ?? ''}</p>
                  </td>
                  <td className="max-w-xs px-3 py-2 font-mono text-[11px] text-muted">
                    {row.metadata ? JSON.stringify(row.metadata) : '—'}
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
    </section>
  );
}
