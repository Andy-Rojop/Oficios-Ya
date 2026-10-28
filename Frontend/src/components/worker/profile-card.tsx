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
import { COHERENT_TEXT_MESSAGE, isCoherentText } from '@/lib/coherent-text';
import { sanitizeDigitsInput } from '@/lib/numeric-input';
import { cn } from '@/lib/utils';
import {
  AVAILABILITY_LABELS,
  DAY_KEYS,
  DAY_LABELS,
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
const CUSTOM_OFICIO_VALUE = '__custom__';

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

function RequiredMark() {
  return (
    <span className="ml-1 text-xs font-bold uppercase tracking-wide text-orange-600" title="Obligatorio">
      *
    </span>
  );
}

function useInvalidateWorker() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: WORKER_QUERY_KEYS.profile });
  };
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
        <CardDescription>Sirve de referencia a los clientes.</CardDescription>
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
                selected && option === 'AVAILABLE' && 'border-[#2563eb] bg-[#2563eb] text-white shadow-sm',
                selected && option === 'BUSY' && 'border-[#eab308] bg-[#eab308] text-[#422006] shadow-sm',
                selected &&
                  option === 'UNAVAILABLE' &&
                  'border-[#ea580c] bg-[#ea580c] text-white shadow-sm',
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

  const initialHeadline = profile.headline === STUB_HEADLINE ? '' : profile.headline;
  const matchedCategoryId =
    profile.mainCategory?.id ??
    categories.data?.find(
      (c) => c.name.toLowerCase() === initialHeadline.toLowerCase(),
    )?.id ??
    '';

  const [categoryId, setCategoryId] = useState(matchedCategoryId);
  const [customOficio, setCustomOficio] = useState(
    matchedCategoryId || !initialHeadline ? '' : initialHeadline,
  );
  const [oficioMode, setOficioMode] = useState<'catalog' | 'custom'>(
    matchedCategoryId || !initialHeadline ? 'catalog' : 'custom',
  );
  const [description, setDescription] = useState(
    profile.description === STUB_DESCRIPTION ? '' : profile.description,
  );
  const [experience, setExperience] = useState(
    profile.experienceYears === null ? '' : String(profile.experienceYears),
  );
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

  function resolveOficio(): { headline: string; mainCategoryId: string | null } | null {
    if (oficioMode === 'custom') {
      const name = customOficio.trim();
      if (name.length < 3) return null;
      return { headline: name, mainCategoryId: null };
    }
    const selected = categories.data?.find((c) => c.id === categoryId);
    if (!selected) return null;
    return { headline: selected.name, mainCategoryId: selected.id };
  }

  function validate(): Record<string, string> {
    const found: Record<string, string> = {};
    const oficio = resolveOficio();
    if (!oficio) {
      found.headline =
        oficioMode === 'custom'
          ? 'Escriba el nombre de su oficio (mínimo 3 caracteres)'
          : 'Elija un oficio de la lista';
    } else if (!isCoherentText(oficio.headline, 3)) {
      found.headline = COHERENT_TEXT_MESSAGE;
    }
    if (description.trim().length < 10)
      found.description = 'Describa de manera breve a qué se dedica (mínimo 10 caracteres)';
    else if (!isCoherentText(description, 8)) found.description = COHERENT_TEXT_MESSAGE;
    if (experience === '') {
      found.experience = 'Indique sus años de experiencia';
    } else {
      const years = Number(experience);
      if (!Number.isInteger(years) || years < 0 || years > 60) {
        found.experience = 'Ingrese un número entero entre 0 y 60';
      }
    }
    if (!schedule) {
      found.schedule = 'Defina su horario de atención';
    } else {
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
    const oficio = resolveOficio();
    if (!oficio) return;

    mutation.mutate({
      headline: oficio.headline,
      description: description.trim(),
      experienceYears: Number(experience),
      mainCategoryId: oficio.mainCategoryId,
      schedule,
      visibleChannels: channels,
      ...(oficioMode === 'custom' ? { requestNewOficio: true } : {}),
    });
  }

  const selectValue = oficioMode === 'custom' ? CUSTOM_OFICIO_VALUE : categoryId;

  return (
    <Card className="border-orange-200/80">
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Mi perfil de trabajador</CardTitle>
            <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-orange-800">
              Obligatorio
            </span>
          </div>
          <CardDescription>Así lo verán los clientes en su perfil público.</CardDescription>
        </div>

        <FormField
          id="headline"
          label={
            <>
              Nombre de su oficio
              <RequiredMark />
            </>
          }
          hint="Elija un oficio de la lista. Si no aparece, solicite uno nuevo."
          error={errors.headline}
        >
          {(aria) => (
            <div className="space-y-2">
              <Select
                {...aria}
                value={selectValue}
                onChange={(event) => {
                  setSaved(false);
                  const value = event.target.value;
                  if (value === CUSTOM_OFICIO_VALUE) {
                    setOficioMode('custom');
                    setCategoryId('');
                  } else {
                    setOficioMode('catalog');
                    setCategoryId(value);
                    setCustomOficio('');
                  }
                }}
              >
                <option value="">Seleccione un oficio</option>
                {categories.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
                <option value={CUSTOM_OFICIO_VALUE}>Otro — solicitar oficio nuevo</option>
              </Select>
              {oficioMode === 'custom' ? (
                <Input
                  value={customOficio}
                  maxLength={100}
                  placeholder="Escriba el oficio que necesita"
                  onChange={(event) => {
                    setSaved(false);
                    setCustomOficio(event.target.value);
                  }}
                />
              ) : null}
            </div>
          )}
        </FormField>

        <FormField
          id="description"
          label={
            <>
              Descripción
              <RequiredMark />
            </>
          }
          error={errors.description}
          hint="Describa de manera breve a qué se dedica"
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

        <FormField
          id="experience"
          label={
            <>
              Años de experiencia
              <RequiredMark />
            </>
          }
          error={errors.experience}
        >
          {(aria) => (
            <Input
              {...aria}
              type="text"
              inputMode="numeric"
              maxLength={2}
              placeholder="Ej.: 5"
              value={experience}
              onChange={(event) => {
                setSaved(false);
                setExperience(sanitizeDigitsInput(event.target.value, 2));
              }}
            />
          )}
        </FormField>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">
            Canales de contacto visibles
            <RequiredMark />
          </legend>
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
          <legend className="text-sm font-semibold">
            Horario de atención
            <RequiredMark />
          </legend>
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
