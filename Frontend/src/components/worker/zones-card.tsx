'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FormField, FormMessage } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { getErrorMessage } from '@/lib/auth';
import { useZones } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import { WORKER_QUERY_KEYS, workersApi, type OwnWorkerProfile } from '@/lib/workers';

export function ZonesCard({ profile }: { profile: OwnWorkerProfile }) {
  const zones = useZones();
  const queryClient = useQueryClient();
  const [offersHome, setOffersHome] = useState(profile.offersHomeService ?? false);
  const [baseZoneId, setBaseZoneId] = useState(profile.baseZoneId ?? '');
  const [selected, setSelected] = useState<string[]>(profile.zones.map((zone) => zone.id));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      await workersApi.updateProfile({
        headline: profile.headline,
        description: profile.description,
        experienceYears: profile.experienceYears,
        mainCategoryId: profile.mainCategory?.id ?? null,
        schedule: profile.schedule,
        visibleChannels: profile.visibleChannels,
        offersHomeService: offersHome,
        baseZoneId: baseZoneId || null,
      });
      return workersApi.setZones(offersHome ? selected : []);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(WORKER_QUERY_KEYS.profile, updated);
      void queryClient.invalidateQueries({ queryKey: WORKER_QUERY_KEYS.completeness });
      setSaved(true);
      setError(null);
    },
  });

  function toggle(id: string, checked: boolean) {
    setSaved(false);
    setSelected((current) => (checked ? [...current, id] : current.filter((item) => item !== id)));
  }

  function onSave() {
    setSaved(false);
    if (!baseZoneId) {
      setError('Indique la zona en donde se ubica');
      return;
    }
    if (offersHome && selected.length === 0) {
      setError('Marque al menos una zona donde trabaja a domicilio');
      return;
    }
    setError(null);
    mutation.mutate();
  }

  return (
    <Card className="space-y-4 border-orange-200/80">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>Zonas</CardTitle>
          <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-orange-800">
            Obligatorio
          </span>
        </div>
        <CardDescription>Indique dónde se ubica y si atiende a domicilio.</CardDescription>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">¿Cuenta con servicio a domicilio?</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: true, label: 'Sí' },
            { value: false, label: 'No' },
          ].map((option) => {
            const selectedOption = offersHome === option.value;
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => {
                  setSaved(false);
                  setOffersHome(option.value);
                }}
                className={cn(
                  'rounded-xl border px-3 py-3 text-sm font-semibold transition',
                  selectedOption
                    ? 'border-accent bg-accent text-white'
                    : 'border-border bg-surface hover:bg-brand-soft',
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      {zones.isLoading ? <p className="text-sm text-muted">Cargando zonas…</p> : null}
      {zones.isError ? (
        <FormMessage tone="error">{getErrorMessage(zones.error)}</FormMessage>
      ) : null}

      <FormField id="base-zone" label="Zona en donde te ubicas" error={error?.includes('ubica') ? error : undefined}>
        {(aria) => (
          <Select
            {...aria}
            value={baseZoneId}
            onChange={(event) => {
              setSaved(false);
              setBaseZoneId(event.target.value);
            }}
          >
            <option value="">Seleccione su zona</option>
            {zones.data?.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      {offersHome ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Zona(s) en donde trabajas a domicilio</p>
          <p className="text-xs text-muted">Marca las aldeas, cantones o sectores que cubres.</p>
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
        </div>
      ) : null}

      {error && !error.includes('ubica') ? (
        <FormMessage tone="error">{error}</FormMessage>
      ) : null}
      {mutation.isError ? (
        <FormMessage tone="error">{getErrorMessage(mutation.error)}</FormMessage>
      ) : null}
      {saved ? <FormMessage tone="success">Zonas guardadas.</FormMessage> : null}
      <Button disabled={mutation.isPending} onClick={onSave}>
        {mutation.isPending ? 'Guardando…' : 'Guardar zona(s)'}
      </Button>
    </Card>
  );
}
