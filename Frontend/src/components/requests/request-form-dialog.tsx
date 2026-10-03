'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Modal } from '@/components/chat/modal';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getErrorMessage, isUnauthorized } from '@/lib/auth';
import {
  REQUEST_DESCRIPTION_MAX,
  REQUEST_DESCRIPTION_MIN,
  REQUEST_QUERY_KEYS,
  requestsApi,
} from '@/lib/requests';
import { formatServicePrice, workersApi } from '@/lib/workers';

interface RequestFormDialogProps {
  workerProfileId: string;
  workerName: string;
  onClose: () => void;
  /** Se llama si la sesión expiró para llevar al usuario a ingresar. */
  onUnauthorized?: () => void;
}

/** Formulario «Solicitar servicio»: crea la solicitud y abre su detalle. */
export function RequestFormDialog({
  workerProfileId,
  workerName,
  onClose,
  onUnauthorized,
}: RequestFormDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serviceId, setServiceId] = useState('');
  const [description, setDescription] = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [urgent, setUrgent] = useState(false);

  const profile = useQuery({
    queryKey: ['workers', 'public', workerProfileId],
    queryFn: () => workersApi.getPublicProfile(workerProfileId),
    staleTime: 60_000,
  });
  const services = profile.data?.services ?? [];

  const create = useMutation({
    mutationFn: () =>
      requestsApi.create({
        workerProfileId,
        description: description.trim(),
        ...(serviceId ? { serviceId } : {}),
        ...(desiredDate ? { desiredDate: new Date(`${desiredDate}T12:00:00`).toISOString() } : {}),
        urgent,
      }),
    onSuccess: (request) => {
      void queryClient.invalidateQueries({ queryKey: REQUEST_QUERY_KEYS.list });
      router.push(`/solicitudes/${request.id}`);
    },
    onError: (error) => {
      if (isUnauthorized(error)) onUnauthorized?.();
    },
  });

  const trimmed = description.trim();
  const valid =
    trimmed.length >= REQUEST_DESCRIPTION_MIN && trimmed.length <= REQUEST_DESCRIPTION_MAX;

  return (
    <Modal title={`Solicitar servicio a ${workerName}`} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid && !create.isPending) create.mutate();
        }}
      >
        {services.length > 0 ? (
          <div className="space-y-1">
            <label htmlFor="request-service" className="text-sm font-medium">
              Servicio (opcional)
            </label>
            <Select
              id="request-service"
              value={serviceId}
              onChange={(event) => setServiceId(event.target.value)}
            >
              <option value="">Otro / no estoy seguro</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} · {formatServicePrice(service)}
                </option>
              ))}
            </Select>
          </div>
        ) : null}

        <div className="space-y-1">
          <label htmlFor="request-description" className="text-sm font-medium">
            ¿Qué necesitas?
          </label>
          <Textarea
            id="request-description"
            rows={4}
            autoFocus
            maxLength={REQUEST_DESCRIPTION_MAX}
            value={description}
            placeholder="Describe el trabajo con detalle (mínimo 10 caracteres)"
            onChange={(event) => setDescription(event.target.value)}
          />
          <p className="text-right text-xs text-muted">
            {trimmed.length}/{REQUEST_DESCRIPTION_MAX}
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="request-date" className="text-sm font-medium">
            Fecha deseada (opcional)
          </label>
          <input
            id="request-date"
            type="date"
            min={format(new Date(), 'yyyy-MM-dd')}
            value={desiredDate}
            onChange={(event) => setDesiredDate(event.target.value)}
            className="block h-11 w-full rounded-lg border border-border bg-surface px-3 text-base focus-visible:border-ring"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={urgent}
            onChange={(event) => setUrgent(event.target.checked)}
            className="h-5 w-5 accent-brand"
          />
          Es urgente
        </label>

        {create.isError && !isUnauthorized(create.error) ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            {getErrorMessage(create.error)}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!valid || create.isPending}>
            {create.isPending ? 'Enviando…' : 'Enviar solicitud'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
