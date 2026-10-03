'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FormMessage } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { getErrorMessage } from '@/lib/auth';
import { useZones } from '@/lib/catalog';
import { WORKER_QUERY_KEYS, workersApi, type OwnWorkerProfile } from '@/lib/workers';

export function ZonesCard({ profile }: { profile: OwnWorkerProfile }) {
  const zones = useZones();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string[]>(profile.zones.map((zone) => zone.id));
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: workersApi.setZones,
    onSuccess: (updated) => {
      queryClient.setQueryData(WORKER_QUERY_KEYS.profile, updated);
      void queryClient.invalidateQueries({ queryKey: WORKER_QUERY_KEYS.completeness });
      setSaved(true);
    },
  });

  function toggle(id: string, checked: boolean) {
    setSaved(false);
    setSelected((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
  }

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <CardTitle>Zonas donde trabajas</CardTitle>
        <CardDescription>Marca las aldeas, cantones o sectores que cubres.</CardDescription>
      </div>

      {zones.isLoading ? <p className="text-sm text-muted">Cargando zonas…</p> : null}
      {zones.isError ? (
        <FormMessage tone="error">{getErrorMessage(zones.error)}</FormMessage>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {zones.data?.map((zone) => (
          <label
            key={zone.id}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              className="size-4 accent-[var(--brand)]"
              checked={selected.includes(zone.id)}
              onChange={(event) => toggle(zone.id, event.target.checked)}
            />
            <span>{zone.name}</span>
          </label>
        ))}
      </div>

      {mutation.isError ? (
        <FormMessage tone="error">{getErrorMessage(mutation.error)}</FormMessage>
      ) : null}
      {saved ? <FormMessage tone="success">Zonas guardadas.</FormMessage> : null}
      <Button
        variant="outline"
        disabled={mutation.isPending}
        onClick={() => mutation.mutate(selected)}
      >
        {mutation.isPending ? 'Guardando…' : 'Guardar zonas'}
      </Button>
    </Card>
  );
}
