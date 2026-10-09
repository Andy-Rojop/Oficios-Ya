'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ADDRESS_MAX_LENGTH } from '@/lib/chat';
import { getErrorMessage } from '@/lib/auth';
import { Modal } from './modal';

export interface AddressPayload {
  content: string;
  latitude?: number;
  longitude?: number;
}

interface AddressShareDialogProps {
  peerName: string;
  onClose: () => void;
  onSend: (payload: AddressPayload) => Promise<void>;
}

type Coords = { latitude: number; longitude: number };

/** Compartir dirección: exige leer el aviso de seguridad y confirmarlo antes de enviar. */
export function AddressShareDialog({ peerName, onClose, onSend }: AddressShareDialogProps) {
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = address.trim();
  const canSend = trimmed.length >= 5 && acknowledged && !sending;

  function attachMyLocation() {
    if (!('geolocation' in navigator)) {
      setError('Su navegador no permite obtener la ubicación.');
      return;
    }
    setError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        });
        setLocating(false);
      },
      () => {
        setError('No pudimos obtener su ubicación. Escriba la dirección a mano.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      await onSend({ content: trimmed, ...(coords ?? {}) });
      onClose();
    } catch (sendError) {
      setError(getErrorMessage(sendError));
      setSending(false);
    }
  }

  return (
    <Modal title="Compartir mi dirección" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div
          role="alert"
          className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
        >
          <p className="font-semibold">Cuidado con su seguridad</p>
          <p>
            Comparta su dirección solo con personas en las que confíe y cuando ya haya acordado el
            trabajo. Quien esté en esta conversación ({peerName}) podrá verla y conservarla.
            OficiosYa nunca le pedirá su dirección por mensaje.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="address-text" className="text-sm font-medium">
            Dirección y referencias
          </label>
          <Textarea
            id="address-text"
            rows={3}
            maxLength={ADDRESS_MAX_LENGTH}
            value={address}
            autoFocus
            placeholder="Ej.: 2a calle 3-45, zona 1, El Asintal. Casa azul, frente a la tienda"
            onChange={(event) => setAddress(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={attachMyLocation}
            disabled={locating}
          >
            {locating ? 'Buscando…' : coords ? 'Actualizar ubicación' : 'Agregar mi ubicación'}
          </Button>
          {coords ? (
            <>
              <span className="text-brand-dark">Ubicación adjunta</span>
              <button
                type="button"
                className="text-muted underline"
                onClick={() => setCoords(null)}
              >
                Quitar
              </button>
            </>
          ) : (
            <span className="text-muted">Opcional</span>
          )}
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-[var(--brand)]"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          <span>Entiendo el riesgo y quiero compartir mi dirección con {peerName}.</span>
        </label>

        {error ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSend}>
            {sending ? 'Enviando…' : 'Enviar dirección'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
