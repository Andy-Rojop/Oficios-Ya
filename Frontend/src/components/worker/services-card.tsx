'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { useState } from 'react';
import { FormField, FormMessage } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage } from '@/lib/auth';
import { useCategories } from '@/lib/catalog';
import {
  PRICE_MODE_LABELS,
  PRICE_UNIT_LABELS,
  WORKER_QUERY_KEYS,
  formatServicePrice,
  workersApi,
  type OwnWorkerProfile,
  type PriceMode,
  type PriceUnit,
  type ServiceDto,
} from '@/lib/workers';
import { ImagePicker } from './image-picker';

const PRICE_MODES = Object.keys(PRICE_MODE_LABELS) as PriceMode[];
const PRICE_UNITS = Object.keys(PRICE_UNIT_LABELS) as PriceUnit[];
const MAX_PHOTOS = 5;

interface FormState {
  categoryId: string;
  name: string;
  description: string;
  priceMode: PriceMode;
  priceAmount: string;
  priceUnit: PriceUnit;
  active: boolean;
}

function emptyForm(defaultCategoryId: string): FormState {
  return {
    categoryId: defaultCategoryId,
    name: '',
    description: '',
    priceMode: 'FIXED',
    priceAmount: '',
    priceUnit: 'JOB',
    active: true,
  };
}

function fromService(service: ServiceDto): FormState {
  return {
    categoryId: service.categoryId,
    name: service.name,
    description: service.description,
    priceMode: service.priceMode,
    priceAmount: service.priceAmount === null ? '' : String(service.priceAmount),
    priceUnit: service.priceUnit,
    active: service.active,
  };
}

export function ServicesCard({ profile }: { profile: OwnWorkerProfile }) {
  const queryClient = useQueryClient();
  const servicesQuery = useQuery<ServiceDto[], Error>({
    queryKey: WORKER_QUERY_KEYS.services,
    queryFn: workersApi.listServices,
  });
  // `editing`: null = formulario cerrado, 'new' = crear, otro valor = id del servicio en edición.
  const [editing, setEditing] = useState<string | null>(null);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: WORKER_QUERY_KEYS.services });
    void queryClient.invalidateQueries({ queryKey: WORKER_QUERY_KEYS.completeness });
  }

  const deleteMutation = useMutation({ mutationFn: workersApi.deleteService, onSuccess: refresh });
  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      workersApi.updateService(id, { active }),
    onSuccess: refresh,
  });

  const services = servicesQuery.data ?? [];
  const editingService =
    editing && editing !== 'new' ? services.find((item) => item.id === editing) : undefined;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Mis servicios</CardTitle>
          <CardDescription>Publica lo que ofreces con un precio de referencia.</CardDescription>
        </div>
        {editing === null ? (
          <Button size="sm" onClick={() => setEditing('new')}>
            Agregar servicio
          </Button>
        ) : null}
      </div>

      {servicesQuery.isLoading ? <p className="text-sm text-muted">Cargando servicios…</p> : null}
      {servicesQuery.isError ? (
        <FormMessage tone="error">{getErrorMessage(servicesQuery.error)}</FormMessage>
      ) : null}
      {deleteMutation.isError ? (
        <FormMessage tone="error">{getErrorMessage(deleteMutation.error)}</FormMessage>
      ) : null}

      {editing !== null ? (
        <ServiceForm
          key={editing}
          service={editingService}
          defaultCategoryId={profile.mainCategory?.id ?? ''}
          onDone={() => {
            setEditing(null);
            refresh();
          }}
          onCancel={() => setEditing(null)}
        />
      ) : null}

      {services.length === 0 && !servicesQuery.isLoading && editing === null ? (
        <p className="text-sm text-muted">Aún no tienes servicios. Agrega el primero.</p>
      ) : null}

      <ul className="space-y-3">
        {services.map((service) => (
          <li key={service.id} className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold">{service.name}</p>
                <p className="text-sm text-muted">
                  {service.categoryName} · {formatServicePrice(service)}
                </p>
              </div>
              <span
                className={
                  service.active
                    ? 'rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-dark'
                    : 'rounded-full bg-border px-2.5 py-0.5 text-xs font-semibold text-muted'
                }
              >
                {service.active ? 'Activo' : 'Pausado'}
              </span>
            </div>
            <p className="whitespace-pre-line text-sm">{service.description}</p>

            <ServicePhotos service={service} onChanged={refresh} />

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(service.id)}>
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={toggleMutation.isPending}
                onClick={() => toggleMutation.mutate({ id: service.id, active: !service.active })}
              >
                {service.active ? 'Pausar' : 'Activar'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-700 hover:bg-red-50"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (window.confirm(`¿Eliminar el servicio "${service.name}"?`)) {
                    deleteMutation.mutate(service.id);
                  }
                }}
              >
                Eliminar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ServicePhotos({ service, onChanged }: { service: ServiceDto; onChanged: () => void }) {
  const [file, setFile] = useState<File | null>(null);

  const upload = useMutation({
    mutationFn: (selected: File) => workersApi.uploadServicePhoto(service.id, selected),
    onSuccess: () => {
      setFile(null);
      onChanged();
    },
  });
  const remove = useMutation({
    mutationFn: (index: number) => workersApi.deleteServicePhoto(service.id, index),
    onSuccess: onChanged,
  });

  return (
    <div className="space-y-2">
      {service.photos.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {service.photos.map((url, index) => (
            <li
              key={url}
              className="relative aspect-square overflow-hidden rounded-lg border border-border"
            >
              <Image
                src={url}
                alt={`Foto ${index + 1} de ${service.name}`}
                fill
                sizes="(min-width: 640px) 20vw, 33vw"
                className="object-cover"
              />
              <button
                type="button"
                aria-label={`Quitar foto ${index + 1}`}
                disabled={remove.isPending}
                onClick={() => remove.mutate(index)}
                className="absolute right-1 top-1 flex size-7 items-center justify-center rounded-full bg-black/60 text-sm text-white hover:bg-black/80"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {service.photos.length < MAX_PHOTOS ? (
        <div className="flex flex-wrap items-center gap-2">
          <ImagePicker
            id={`photo-${service.id}`}
            label="Elegir foto"
            file={file}
            onChange={setFile}
            disabled={upload.isPending}
          />
          {file ? (
            <Button size="sm" disabled={upload.isPending} onClick={() => upload.mutate(file)}>
              {upload.isPending ? 'Subiendo…' : 'Subir foto'}
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted">Alcanzaste el máximo de {MAX_PHOTOS} fotos.</p>
      )}
      {upload.isError ? (
        <FormMessage tone="error">{getErrorMessage(upload.error)}</FormMessage>
      ) : null}
      {remove.isError ? (
        <FormMessage tone="error">{getErrorMessage(remove.error)}</FormMessage>
      ) : null}
    </div>
  );
}

function ServiceForm({
  service,
  defaultCategoryId,
  onDone,
  onCancel,
}: {
  service: ServiceDto | undefined;
  defaultCategoryId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const categories = useCategories();
  const [form, setForm] = useState<FormState>(() =>
    service ? fromService(service) : emptyForm(defaultCategoryId),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof workersApi.createService>[0]) =>
      service ? workersApi.updateService(service.id, input) : workersApi.createService(input),
    onSuccess: onDone,
  });

  const negotiable = form.priceMode === 'NEGOTIABLE';

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const found: Record<string, string> = {};
    const categoryId = form.categoryId || categories.data?.[0]?.id || '';
    if (!categoryId) found.categoryId = 'Elige una categoría';
    if (form.name.trim().length < 3) found.name = 'Escribe un nombre (mínimo 3 caracteres)';
    if (form.description.trim().length < 10)
      found.description = 'Describe el servicio (mínimo 10 caracteres)';

    let priceAmount: number | null = null;
    if (!negotiable) {
      priceAmount = Number(form.priceAmount);
      if (form.priceAmount.trim() === '' || !Number.isFinite(priceAmount) || priceAmount <= 0) {
        found.priceAmount = 'Ingresa un precio mayor a cero';
      }
    }

    setErrors(found);
    if (Object.keys(found).length > 0) return;

    mutation.mutate({
      categoryId,
      name: form.name.trim(),
      description: form.description.trim(),
      priceMode: form.priceMode,
      priceAmount: negotiable ? null : priceAmount,
      priceUnit: form.priceUnit,
      active: form.active,
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="space-y-4 rounded-xl border border-brand/40 bg-brand-soft/30 p-4"
    >
      <p className="font-semibold">{service ? 'Editar servicio' : 'Nuevo servicio'}</p>

      <FormField id="service-name" label="Nombre del servicio" error={errors.name}>
        {(aria) => (
          <Input
            {...aria}
            value={form.name}
            maxLength={100}
            onChange={(event) => set('name', event.target.value)}
          />
        )}
      </FormField>

      <FormField id="service-category" label="Categoría" error={errors.categoryId}>
        {(aria) => (
          <Select
            {...aria}
            value={form.categoryId || categories.data?.[0]?.id || ''}
            onChange={(event) => set('categoryId', event.target.value)}
          >
            {categories.data?.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      <FormField id="service-description" label="Descripción" error={errors.description}>
        {(aria) => (
          <Textarea
            {...aria}
            rows={3}
            value={form.description}
            maxLength={1000}
            onChange={(event) => set('description', event.target.value)}
          />
        )}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id="service-price-mode" label="Tipo de precio">
          {(aria) => (
            <Select
              {...aria}
              value={form.priceMode}
              onChange={(event) => set('priceMode', event.target.value as PriceMode)}
            >
              {PRICE_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {PRICE_MODE_LABELS[mode]}
                </option>
              ))}
            </Select>
          )}
        </FormField>

        <FormField id="service-price" label="Precio (Q)" error={errors.priceAmount}>
          {(aria) => (
            <Input
              {...aria}
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              disabled={negotiable}
              value={negotiable ? '' : form.priceAmount}
              placeholder={negotiable ? 'A convenir' : '0.00'}
              onChange={(event) => set('priceAmount', event.target.value)}
            />
          )}
        </FormField>

        <FormField id="service-price-unit" label="Unidad">
          {(aria) => (
            <Select
              {...aria}
              value={form.priceUnit}
              onChange={(event) => set('priceUnit', event.target.value as PriceUnit)}
            >
              {PRICE_UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {PRICE_UNIT_LABELS[unit]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 accent-[var(--brand)]"
          checked={form.active}
          onChange={(event) => set('active', event.target.checked)}
        />
        Servicio activo (visible para los clientes)
      </label>

      {mutation.isError ? (
        <FormMessage tone="error">{getErrorMessage(mutation.error)}</FormMessage>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando…' : 'Guardar servicio'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
