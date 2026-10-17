'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ADMIN_QUERY_KEYS, adminApi } from '@/lib/admin';
import { getErrorMessage, useMe } from '@/lib/auth';

export function UsersPage() {
  const me = useMe();
  const isAdmin = me.data?.role === 'ADMIN';
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: [...ADMIN_QUERY_KEYS.users(page), search],
    queryFn: () => adminApi.users(page, 20, search || undefined),
  });

  const userSuggestions = (() => {
    const items = list.data?.items ?? [];
    const needle = q.trim().toLowerCase();
    return items
      .filter((u) => {
        if (!needle) return true;
        const hay = `${u.name} ${u.phone} ${u.email ?? ''} ${u.role} ${u.status}`.toLowerCase();
        return hay.includes(needle) && u.name.toLowerCase() !== needle;
      })
      .slice(0, 6);
  })();

  const setStatus = useMutation({
    mutationFn: (input: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) =>
      adminApi.setUserStatus(input.id, input.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });

  const exportCsv = useMutation({
    mutationFn: () => adminApi.exportUsersCsv(),
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="text-sm text-muted">
            Listado y suspensión (solo ADMIN puede cambiar estado).
          </p>
        </div>
        {isAdmin ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={exportCsv.isPending}
            onClick={() => exportCsv.mutate()}
          >
            {exportCsv.isPending ? 'Exportando…' : 'Exportar CSV'}
          </Button>
        ) : null}
      </div>

      <form
        className="relative flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setSearch(q.trim());
          setFocused(false);
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Input
            value={q}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(e) => {
              setQ(e.target.value);
              setFocused(true);
            }}
            placeholder="Buscar por nombre, teléfono o correo"
          />
          {focused && userSuggestions.length > 0 ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-40 overflow-hidden rounded-xl border border-border bg-surface shadow-lg">
              <div className="border-b border-border/60 bg-brand-soft/40 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
                Sugerencias de usuarios en el sistema
              </div>
              <ul className="max-h-56 divide-y divide-border/50 overflow-y-auto py-1">
                {userSuggestions.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setQ(u.name);
                        setPage(1);
                        setSearch(u.name);
                        setFocused(false);
                      }}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-brand-soft/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">{u.name}</p>
                        <p className="truncate text-xs text-muted">
                          {u.phone}
                          {u.email ? ` · ${u.email}` : ''}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
                        {u.role} · {u.status}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <Button type="submit" size="sm" variant="outline">
          Buscar
        </Button>
      </form>

      {list.isLoading ? (
        <p className="text-muted">Cargando…</p>
      ) : list.isError ? (
        <Card>
          <p role="alert" className="text-sm text-red-700">
            {getErrorMessage(list.error)}
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-border/40 text-xs uppercase text-muted">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Teléfono</th>
                <th className="px-3 py-2">Rol</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(list.data?.items ?? []).map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-3 py-2">
                    <p className="font-medium">{u.name}</p>
                    {u.email ? <p className="text-xs text-muted">{u.email}</p> : null}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{u.phone}</td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2">{u.status}</td>
                  <td className="px-3 py-2">
                    {isAdmin && u.role !== 'ADMIN' ? (
                      u.status === 'ACTIVE' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={setStatus.isPending}
                          onClick={() => setStatus.mutate({ id: u.id, status: 'SUSPENDED' })}
                        >
                          Suspender
                        </Button>
                      ) : u.status === 'SUSPENDED' ? (
                        <Button
                          size="sm"
                          disabled={setStatus.isPending}
                          onClick={() => setStatus.mutate({ id: u.id, status: 'ACTIVE' })}
                        >
                          Reactivar
                        </Button>
                      ) : null
                    ) : (
                      <span className="text-xs text-muted">—</span>
                    )}
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

      {setStatus.isError || exportCsv.isError ? (
        <p role="alert" className="text-sm text-red-700">
          {getErrorMessage(setStatus.error ?? exportCsv.error)}
        </p>
      ) : null}
    </section>
  );
}
