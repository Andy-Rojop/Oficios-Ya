'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ADMIN_QUERY_KEYS, adminApi } from '@/lib/admin';
import { getErrorMessage, useMe } from '@/lib/auth';

export function CatalogsPage() {
  const me = useMe();
  const isAdmin = me.data?.role === 'ADMIN';
  const qc = useQueryClient();
  const categories = useQuery({
    queryKey: ADMIN_QUERY_KEYS.categories,
    queryFn: adminApi.categories,
  });
  const zones = useQuery({ queryKey: ADMIN_QUERY_KEYS.zones, queryFn: adminApi.zones });

  const [catName, setCatName] = useState('');
  const [zoneName, setZoneName] = useState('');
  const [zoneType, setZoneType] = useState('aldea');

  const createCategory = useMutation({
    mutationFn: () => adminApi.createCategory({ name: catName }),
    onSuccess: () => {
      setCatName('');
      void qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.categories });
    },
  });
  const deleteCategory = useMutation({
    mutationFn: (id: string) => adminApi.deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.categories }),
  });
  const reactivateCategory = useMutation({
    mutationFn: (row: { id: string; name: string; slug: string }) =>
      adminApi.updateCategory(row.id, { name: row.name, slug: row.slug, active: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.categories }),
  });
  const createZone = useMutation({
    mutationFn: () => adminApi.createZone({ name: zoneName, type: zoneType }),
    onSuccess: () => {
      setZoneName('');
      void qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.zones });
    },
  });
  const deleteZone = useMutation({
    mutationFn: (id: string) => adminApi.deleteZone(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.zones }),
  });
  const reactivateZone = useMutation({
    mutationFn: (row: { id: string; name: string; type: string }) =>
      adminApi.updateZone(row.id, { name: row.name, type: row.type, active: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.zones }),
  });

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Catálogos</h1>
        <p className="text-sm text-muted">
          Categorías y zonas. Solo ADMIN puede crear o desactivar.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-semibold">Categorías</h2>
          {isAdmin ? (
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (catName.trim()) createCategory.mutate();
              }}
            >
              <Input
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Nueva categoría"
              />
              <Button type="submit" size="sm" disabled={createCategory.isPending}>
                Agregar
              </Button>
            </form>
          ) : null}
          {categories.isLoading ? (
            <p className="text-sm text-muted">Cargando…</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {(categories.data ?? []).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <p className="font-medium">
                      {c.name}{' '}
                      {!c.active ? <span className="text-xs text-muted">(inactiva)</span> : null}
                    </p>
                    <p className="text-xs text-muted">{c.slug}</p>
                  </div>
                  {isAdmin ? (
                    c.active ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteCategory.mutate(c.id)}
                      >
                        Desactivar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reactivateCategory.isPending}
                        onClick={() => reactivateCategory.mutate(c)}
                      >
                        Reactivar
                      </Button>
                    )
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold">Zonas</h2>
          {isAdmin ? (
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (zoneName.trim()) createZone.mutate();
              }}
            >
              <Input
                className="min-w-[10rem] flex-1"
                value={zoneName}
                onChange={(e) => setZoneName(e.target.value)}
                placeholder="Nombre de zona"
              />
              <Input
                className="w-28"
                value={zoneType}
                onChange={(e) => setZoneType(e.target.value)}
                placeholder="Tipo"
              />
              <Button type="submit" size="sm" disabled={createZone.isPending}>
                Agregar
              </Button>
            </form>
          ) : null}
          {zones.isLoading ? (
            <p className="text-sm text-muted">Cargando…</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {(zones.data ?? []).map((z) => (
                <li key={z.id} className="flex items-center justify-between gap-2 py-2">
                  <div>
                    <p className="font-medium">
                      {z.name}{' '}
                      {!z.active ? <span className="text-xs text-muted">(inactiva)</span> : null}
                    </p>
                    <p className="text-xs text-muted">{z.type}</p>
                  </div>
                  {isAdmin ? (
                    z.active ? (
                      <Button size="sm" variant="outline" onClick={() => deleteZone.mutate(z.id)}>
                        Desactivar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reactivateZone.isPending}
                        onClick={() => reactivateZone.mutate(z)}
                      >
                        Reactivar
                      </Button>
                    )
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {(createCategory.isError ||
        createZone.isError ||
        deleteCategory.isError ||
        deleteZone.isError ||
        reactivateCategory.isError ||
        reactivateZone.isError) && (
        <p role="alert" className="text-sm text-red-700">
          {getErrorMessage(
            createCategory.error ??
              createZone.error ??
              deleteCategory.error ??
              deleteZone.error ??
              reactivateCategory.error ??
              reactivateZone.error,
          )}
        </p>
      )}
    </section>
  );
}
