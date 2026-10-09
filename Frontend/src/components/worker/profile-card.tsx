'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { FormField, FormMessage } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage } from '@/lib/auth';
import { useCategories } from '@/lib/catalog';
import { cn } from '@/lib/utils';
import {
  AVAILABILITY_LABELS,
  DAY_KEYS,
  DAY_LABELS,
  IDENTITY_STATUS_LABELS,
  WORKER_QUERY_KEYS,
  workersApi,
  type Availability,
  type OwnWorkerProfile,
  type Schedule,
  type VisibleChannels,
} from '@/lib/workers';

/** Textos del perfil mínimo que crea el backend al activar el modo trabajador. */
const STUB_HEADLINE = 'Oficio por definir';
const STUB_DESCRIPTION = 'Perfil en construcción';

const DEFAULT_SCHEDULE: Schedule = {
  mon: { closed: false, from: '08:00', to: '17:00' },
  tue: { closed: false, from: '08:00', to: '17:00' },
  wed: { closed: false, from: '08:00', to: '17:00' },
  thu: { closed: false, from: '08:00', to: '17:00' },
  fri: { closed: false, from: '08:00', to: '17:00' },
  sat: { closed: false, from: '08:00', to: '12:00' },
  sun: { closed: true },
};

const CHANNEL_OPTIONS: { key: keyof VisibleChannels; label: string }[] = [
  { key: 'phone', label: 'Llamada telefónica' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'Correo electrónico' },
];

const AVAILABILITY_OPTIONS = Object.keys(AVAILABILITY_LABELS) as Availability[];

function useInvalidateWorker() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: WORKER_QUERY_KEYS.profile });
  };
}

/** Envío de DPI/NIT privado → identityStatus PENDING (cola admin). */
export function IdentityCard({ profile }: { profile: OwnWorkerProfile }) {
  const queryClient = useQueryClient();
  const [dpi, setDpi] = useState(profile.dpi ?? '');
  const [nit, setNit] = useState(profile.nit ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: workersApi.updateProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData(WORKER_QUERY_KEYS.profile, updated);
      setSaved(true);
      setError(null);
    },
  });

  const locked = profile.identityStatus === 'PENDING';

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    const cleanDpi = dpi.replace(/\D/g, '');
    if (cleanDpi.length !== 13) {
      setError('El DPI debe tener 13 dígitos');
      return;
    }
    const cleanNit = nit.trim();
    if (cleanNit && !/^\d{1,12}-?[\dKk]$/.test(cleanNit)) {
      setError('El NIT no es válido');
      return;
    }
    setError(null);
    mutation.mutate({
      headline: profile.headline,
      description: profile.description,
      experienceYears: profile.experienceYears,
      mainCategoryId: profile.mainCategory?.id ?? null,
      schedule: profile.schedule,
      visibleChannels: profile.visibleChannels,
      dpi: cleanDpi,
      nit: cleanNit === '' ? null : cleanNit,
    });
  }

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-1">
          <CardTitle>Verificación de identidad</CardTitle>
          <CardDescription>
            DPI y NIT son privados: solo los ve la administración para validar su perfil. No
            aparecen en su página pública.
          </CardDescription>
        </div>

        <p className="text-sm">
          Estado:{' '}
          <span
            className={cn(
              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide',
              profile.identityStatus === 'VERIFIED' && 'bg-foreground text-white',
              profile.identityStatus === 'PENDING' && 'bg-amber-100 text-amber-900',
              profile.identityStatus === 'REJECTED' && 'bg-red-100 text-red-800',
              profile.identityStatus === 'NOT_SUBMITTED' && 'bg-brand-soft text-muted',
            )}
          >
            {IDENTITY_STATUS_LABELS[profile.identityStatus]}
          </span>
        </p>

        <FormField
          id="dpi"
          label="DPI (13 dígitos)"
          error={error?.includes('DPI') ? error : undefined}
        >
          {(aria) => (
            <Input
              {...aria}
              inputMode="numeric"
              autoComplete="off"
              maxLength={13}
              value={dpi}
              disabled={locked || mutation.isPending}
              placeholder="1234567890101"
              onChange={(event) => {
                setSaved(false);
                setDpi(event.target.value.replace(/\D/g, '').slice(0, 13));
              }}
            />
          )}
        </FormField>

        <FormField id="nit" label="NIT (opcional)">
          {(aria) => (
            <Input
              {...aria}
              autoComplete="off"
              maxLength={14}
              value={nit}
              disabled={locked || mutation.isPending}
              placeholder="1234567-8"
              onChange={(event) => {
                setSaved(false);
                setNit(event.target.value);
              }}
            />
          )}
        </FormField>

        {locked ? (
          <p className="text-sm text-muted">
            Su solicitud está en revisión. Le avisaremos cuando haya una decisión.
          </p>
        ) : null}
        {error && !error.includes('DPI') ? <FormMessage tone="error">{error}</FormMessage> : null}
        {mutation.isError ? (
          <FormMessage tone="error">{getErrorMessage(mutation.error)}</FormMessage>
        ) : null}
        {saved ? (
          <FormMessage tone="success">Documentos enviados para revisión.</FormMessage>
        ) : null}

        <Button type="submit" disabled={locked || mutation.isPending}>
          {mutation.isPending
            ? 'Enviando…'
            : profile.identityStatus === 'VERIFIED' || profile.identityStatus === 'REJECTED'
              ? 'Reenviar para revisión'
              : 'Enviar para verificación'}
        </Button>
      </form>
    </Card>
  );
}

export function AvailabilityCard({ profile }: { profile: OwnWorkerProfile }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: workersApi.setAvailability,
    onSuccess: (updated) => queryClient.setQueryData(WORKER_QUERY_KEYS.profile, updated),
  });

  return (
    <Card className="space-y-4 rounded-3xl shadow-[0_8px_28px_rgba(0,0,0,0.05)]">
      <div className="space-y-1">
        <CardTitle>Disponibilidad</CardTitle>
        <CardDescription>Los clientes ven si puede tomar trabajos ahora.</CardDescription>
      </div>
      <div role="radiogroup" aria-label="Disponibilidad" className="grid gap-2 sm:grid-cols-3">
        {AVAILABILITY_OPTIONS.map((option) => {
          const selected = profile.availability === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={mutation.isPending}
              onClick={() => {
                if (!selected) mutation.mutate(option);
              }}
              className={cn(
                'rounded-2xl border px-3 py-4 text-sm font-semibold transition disabled:opacity-60',
                selected && option === 'AVAILABLE' && 'border-accent bg-accent text-white shadow-sm',
                selected && option === 'BUSY' && 'border-[#b45309] bg-[#b45309] text-white shadow-sm',
                selected &&
                  option === 'UNAVAILABLE' &&
                  'border-brand bg-brand text-white shadow-sm',
                !selected && 'border-border bg-surface hover:border-brand/20 hover:bg-brand-soft',
              )}
            >
              {AVAILABILITY_LABELS[option]}
            </button>
          );
        })}
      </div>
      {mutation.isError ? (
        <FormMessage tone="error">{getErrorMessage(mutation.error)}</FormMessage>
      ) : null}
    </Card>
  );
}

export function ProfileCard({ profile }: { profile: OwnWorkerProfile }) {
  const categories = useCategories();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateWorker();

  const [headline, setHeadline] = useState(
    profile.headline === STUB_HEADLINE ? '' : profile.headline,
  );
  const [description, setDescription] = useState(
    profile.description === STUB_DESCRIPTION ? '' : profile.description,
  );
  const [experience, setExperience] = useState(
    profile.experienceYears === null ? '' : String(profile.experienceYears),
  );
  const [categoryId, setCategoryId] = useState(profile.mainCategory?.id ?? '');
  const [channels, setChannels] = useState<VisibleChannels>(profile.visibleChannels);
  const [schedule, setSchedule] = useState<Schedule | null>(profile.schedule);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: workersApi.updateProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData(WORKER_QUERY_KEYS.profile, updated);
      invalidate();
      void queryClient.invalidateQueries({ queryKey: WORKER_QUERY_KEYS.completeness });
      setSaved(true);
    },
  });

  function updateDay(
    day: (typeof DAY_KEYS)[number],
    patch: { closed?: boolean; from?: string; to?: string },
  ) {
    setSaved(false);
    setSchedule((current) => {
      const base = current ?? DEFAULT_SCHEDULE;
      const previous = base[day] ?? { closed: false, from: '08:00', to: '17:00' };
      const next = { ...previous, ...patch };
      return {
        ...base,
        [day]: next.closed
          ? { closed: true }
          : { closed: false, from: next.from ?? '08:00', to: next.to ?? '17:00' },
      };
    });
  }

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};
    if (headline.trim().length < 3) found.headline = 'Escriba su oficio (mínimo 3 caracteres)';
    if (description.trim().length < 10)
      found.description = 'Describa su experiencia (mínimo 10 caracteres)';
    if (experience !== '') {
      const years = Number(experience);
      if (!Number.isInteger(years) || years < 0 || years > 60) {
        found.experience = 'Ingrese un número entero entre 0 y 60';
      }
    }
    if (schedule) {
      for (const day of DAY_KEYS) {
        const value = schedule[day];
        if (value && !value.closed && (!value.from || !value.to || value.from >= value.to)) {
          found.schedule = `Revise el horario del ${DAY_LABELS[day].toLowerCase()}: la hora de inicio debe ser anterior a la de fin`;
          break;
        }
      }
    }
    return found;
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    mutation.mutate({
      headline: headline.trim(),
      description: description.trim(),
      experienceYears: experience === '' ? null : Number(experience),
      mainCategoryId: categoryId === '' ? null : categoryId,
      schedule,
      visibleChannels: channels,
    });
  }

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div className="space-y-1">
          <CardTitle>Mi perfil de trabajador</CardTitle>
          <CardDescription>Así lo verán los clientes en su perfil público.</CardDescription>
        </div>

        <FormField id="headline" label="Oficio principal" error={errors.headline}>
          {(aria) => (
            <Input
              {...aria}
              value={headline}
              maxLength={100}
              placeholder="Ej.: Carpintero con experiencia"
              onChange={(event) => {
                setSaved(false);
                setHeadline(event.target.value);
              }}
            />
          )}
        </FormField>

        <FormField id="mainCategory" label="Categoría principal">
          {(aria) => (
            <Select
              {...aria}
              value={categoryId}
              onChange={(event) => {
                setSaved(false);
                setCategoryId(event.target.value);
              }}
            >
              <option value="">Sin categoría</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField
          id="description"
          label="Descripción"
          error={errors.description}
          hint="Cuente qué hace y por qué confiar en usted."
        >
          {(aria) => (
            <Textarea
              {...aria}
              value={description}
              maxLength={1000}
              onChange={(event) => {
                setSaved(false);
                setDescription(event.target.value);
              }}
            />
          )}
        </FormField>

        <FormField id="experience" label="Años de experiencia" error={errors.experience}>
          {(aria) => (
            <Input
              {...aria}
              type="number"
              inputMode="numeric"
              min={0}
              max={60}
              value={experience}
              onChange={(event) => {
                setSaved(false);
                setExperience(event.target.value);
              }}
            />
          )}
        </FormField>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Canales de contacto visibles</legend>
          <p className="text-xs text-muted">
            Por privacidad, su teléfono solo se muestra si lo activa aquí. El chat de la app
            siempre está disponible.
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {CHANNEL_OPTIONS.map((option) => (
              <label key={option.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--brand)]"
                  checked={channels[option.key]}
                  onChange={(event) => {
                    setSaved(false);
                    setChannels((current) => ({ ...current, [option.key]: event.target.checked }));
                  }}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold">Horario de atención</legend>
          {schedule === null ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSaved(false);
                setSchedule(DEFAULT_SCHEDULE);
              }}
            >
              Definir horario
            </Button>
          ) : (
            <div className="space-y-2">
              {DAY_KEYS.map((day) => {
                const value = schedule[day] ?? { closed: true };
                return (
                  <div
                    key={day}
                    className="grid grid-cols-[5.5rem_1fr] items-center gap-2 sm:grid-cols-[6rem_auto_1fr]"
                  >
                    <span className="text-sm font-medium">{DAY_LABELS[day]}</span>
                    <label className="flex items-center gap-2 text-sm text-muted">
                      <input
                        type="checkbox"
                        className="size-4 accent-[var(--brand)]"
                        checked={value.closed}
                        onChange={(event) => updateDay(day, { closed: event.target.checked })}
                      />
                      Cerrado
                    </label>
                    {!value.closed ? (
                      <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                        <Input
                          type="time"
                          aria-label={`${DAY_LABELS[day]}: desde`}
                          value={value.from ?? '08:00'}
                          onChange={(event) => updateDay(day, { from: event.target.value })}
                          className="w-32"
                        />
                        <span className="text-sm text-muted">a</span>
                        <Input
                          type="time"
                          aria-label={`${DAY_LABELS[day]}: hasta`}
                          value={value.to ?? '17:00'}
                          onChange={(event) => updateDay(day, { to: event.target.value })}
                          className="w-32"
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSaved(false);
                  setSchedule(null);
                }}
              >
                Quitar horario
              </Button>
            </div>
          )}
          {errors.schedule ? (
            <p role="alert" className="text-sm font-medium text-red-700">
              {errors.schedule}
            </p>
          ) : null}
        </fieldset>

        {mutation.isError ? (
          <FormMessage tone="error">{getErrorMessage(mutation.error)}</FormMessage>
        ) : null}
        {saved ? <FormMessage tone="success">Perfil guardado.</FormMessage> : null}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : 'Guardar perfil'}
        </Button>
      </form>
    </Card>
  );
}
