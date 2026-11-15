'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ADMIN_QUERY_KEYS, adminApi, type AdminUserRow } from '@/lib/admin';
import { getErrorMessage, useMe } from '@/lib/auth';
import { sanitizeDigitsInput } from '@/lib/numeric-input';

function formatBanLabel(user: AdminUserRow): string {
  if (user.status !== 'SUSPENDED') return user.status;
  if (!user.bannedUntil) return 'SUSPENDED · permanente';
  const until = new Date(user.bannedUntil);
  if (Number.isNaN(until.getTime())) return 'SUSPENDED';
  if (until.getTime() <= Date.now()) return 'SUSPENDED · vencido';
  return `SUSPENDED · hasta ${until.toLocaleDateString('es-GT')}`;
}

export function UsersPage() {
  const me = useMe();
  const isAdmin = me.data?.role === 'ADMIN';
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [focused, setFocused] = useState(false);
  const [banTarget, setBanTarget] = useState<AdminUserRow | null>(null);
  const [banMode, setBanMode] = useState<'temporary' | 'permanent'>('temporary');
  const [banDays, setBanDays] = useState('7');
  const [banReason, setBanReason] = useState('');
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
    mutationFn: adminApi.setUserStatus,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      setBanTarget(null);
      setBanReason('');
      setBanDays('7');
      setBanMode('temporary');
    },
  });

  const exportCsv = useMutation({
    mutationFn: () => adminApi.exportUsersCsv(),
  });

  function submitBan() {
    if (!banTarget) return;
    const days = Number(banDays);
    if (banMode === 'temporary' && (!Number.isInteger(days) || days < 1 || days > 99)) {
      return;
    }
    setStatus.mutate({
      id: banTarget.id,
      status: 'SUSPENDED',
      ...(banMode === 'temporary' ? { banDays: days } : {}),
      ...(banReason.trim() ? { reason: banReason.trim() } : {}),
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="text-sm text-muted">
            Ban temporal (días), ban permanente o reactivación. Solo ADMIN.
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
                <th className="px-3 py-2">Oficio</th>
                <th className="px-3 py-2">Ubicación</th>
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
                  <td className="px-3 py-2 text-xs">
                    {u.workerProfile?.mainCategory?.name ??
                      u.workerProfile?.headline ??
                      '—'}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {u.zone?.name ?? u.workerProfile?.baseZone?.name ?? '—'}
                  </td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2 text-xs font-medium">{formatBanLabel(u)}</td>
                  <td className="px-3 py-2">
                    {isAdmin && u.role !== 'ADMIN' ? (
                      <div className="flex flex-wrap gap-2">
                        {u.status === 'ACTIVE' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={setStatus.isPending}
                            onClick={() => {
                              setBanTarget(u);
                              setBanMode('temporary');
                              setBanDays('7');
                              setBanReason('');
                            }}
                          >
                            Banear
                          </Button>
                        ) : null}
                        {u.status === 'SUSPENDED' ? (
                          <>
                            <Button
                              size="sm"
                              disabled={setStatus.isPending}
                              onClick={() =>
                                setStatus.mutate({ id: u.id, status: 'ACTIVE' })
                              }
                            >
                              Reactivar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={setStatus.isPending}
                              onClick={() => {
                                setBanTarget(u);
                                setBanMode(u.bannedUntil ? 'temporary' : 'permanent');
                                setBanDays('7');
                                setBanReason('');
                              }}
                            >
                              Cambiar ban
                            </Button>
                          </>
                        ) : null}
                      </div>
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

      {banTarget ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4 sm:items-center"
          role="presentation"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ban-user-title"
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl sm:p-6"
          >
            <h2 id="ban-user-title" className="text-lg font-semibold">
              Banear a {banTarget.name}
            </h2>
            <p className="mt-1 text-sm text-muted">
              Elija ban por días o permanente. Se cerrarán sus sesiones activas.
            </p>

            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="ban-mode"
                  checked={banMode === 'temporary'}
                  onChange={() => setBanMode('temporary')}
                />
                Por días
              </label>
              {banMode === 'temporary' ? (
                <Input
                  inputMode="numeric"
                  maxLength={2}
                  value={banDays}
                  onChange={(e) => setBanDays(sanitizeDigitsInput(e.target.value, 2))}
                  aria-label="Días de ban (1 a 99)"
                  placeholder="Ej. 7 (máx. 99)"
                />
              ) : null}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="ban-mode"
                  checked={banMode === 'permanent'}
                  onChange={() => setBanMode('permanent')}
                />
                Permanente
              </label>
              <Input
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Motivo (opcional)"
                maxLength={500}
              />
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={setStatus.isPending}
                onClick={() => setBanTarget(null)}
              >
                Cancelar
              </Button>
              <Button type="button" disabled={setStatus.isPending} onClick={submitBan}>
                {setStatus.isPending ? 'Aplicando…' : 'Confirmar ban'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
