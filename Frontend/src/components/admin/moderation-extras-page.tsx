'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FormMessage } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import {
  ADMIN_QUERY_KEYS,
  adminApi,
  type AvatarModerationRow,
  type CategoryRequestRow,
} from '@/lib/admin';
import { getErrorMessage } from '@/lib/auth';

/** Colas QA Johan: oficios nuevos y fotos de perfil. */
export function ModerationExtrasPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const oficios = useQuery({
    queryKey: ADMIN_QUERY_KEYS.categoryRequests(page),
    queryFn: () => adminApi.categoryRequests(page),
  });
  const avatars = useQuery({
    queryKey: ADMIN_QUERY_KEYS.avatars(page),
    queryFn: () => adminApi.pendingAvatars(page),
  });

  const decideOficio = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'VERIFIED' | 'REJECTED' }) =>
      adminApi.decideCategoryRequest(id, decision),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'category-requests'] });
    },
  });

  const decideAvatar = useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: 'VERIFIED' | 'REJECTED' }) =>
      adminApi.decideAvatar(id, decision),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'avatars'] });
    },
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
        >
          Aprobaciones
        </h1>
        <p className="text-sm text-muted">Oficios nuevos y fotos de perfil pendientes.</p>
      </header>

      <Card className="space-y-4">
        <div className="space-y-1">
          <CardTitle>Oficios nuevos</CardTitle>
          <CardDescription>Solicitudes de trabajadores para agregar un oficio al catálogo.</CardDescription>
        </div>
        {oficios.isError ? (
          <FormMessage tone="error">{getErrorMessage(oficios.error)}</FormMessage>
        ) : null}
        {oficios.isLoading ? <p className="text-sm text-muted">Cargando…</p> : null}
        <ul className="space-y-3">
          {(oficios.data?.items ?? []).map((item: CategoryRequestRow) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
            >
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-muted">
                  {item.requestedBy.name} · {item.requestedBy.phone}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={decideOficio.isPending}
                  onClick={() => decideOficio.mutate({ id: item.id, decision: 'VERIFIED' })}
                >
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={decideOficio.isPending}
                  onClick={() => decideOficio.mutate({ id: item.id, decision: 'REJECTED' })}
                >
                  Rechazar
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {!oficios.isLoading && (oficios.data?.items.length ?? 0) === 0 ? (
          <p className="text-sm text-muted">No hay solicitudes pendientes.</p>
        ) : null}
      </Card>

      <Card className="space-y-4">
        <div className="space-y-1">
          <CardTitle>Fotos de perfil</CardTitle>
          <CardDescription>Apruebe o rechace la foto antes de que sea pública.</CardDescription>
        </div>
        {avatars.isError ? (
          <FormMessage tone="error">{getErrorMessage(avatars.error)}</FormMessage>
        ) : null}
        {avatars.isLoading ? <p className="text-sm text-muted">Cargando…</p> : null}
        <ul className="space-y-3">
          {(avatars.data?.items ?? []).map((item: AvatarModerationRow) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative h-14 w-14 overflow-hidden rounded-full bg-brand-soft">
                  {item.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div>
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-muted">{item.phone}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={decideAvatar.isPending}
                  onClick={() => decideAvatar.mutate({ id: item.id, decision: 'VERIFIED' })}
                >
                  Aprobar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={decideAvatar.isPending}
                  onClick={() => decideAvatar.mutate({ id: item.id, decision: 'REJECTED' })}
                >
                  Rechazar
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {!avatars.isLoading && (avatars.data?.items.length ?? 0) === 0 ? (
          <p className="text-sm text-muted">No hay fotos pendientes.</p>
        ) : null}
      </Card>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Anterior
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)}>
          Siguiente
        </Button>
      </div>
    </div>
  );
}
