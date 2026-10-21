'use client';

import dynamic from 'next/dynamic';
import { LocateFixed, MapPin, Navigation } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ADDRESS_MAX_LENGTH } from '@/lib/chat';
import { getErrorMessage } from '@/lib/auth';
import type { LocationCoords } from './location-picker-map';
import { Modal } from './modal';

const LocationPickerMapLazy = dynamic(() => import('./location-picker-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-52 w-full items-center justify-center rounded-xl border border-border bg-brand-soft/40 text-xs text-muted">
      Cargando mapa…
    </div>
  ),
});

export interface AddressPayload {
  content?: string;
  latitude?: number;
  longitude?: number;
}

interface AddressShareDialogProps {
  peerName: string;
  onClose: () => void;
  onSend: (payload: AddressPayload) => Promise<void>;
}

/** Compartir ubicación estilo WhatsApp: mapa interactivo, GPS rápido y notas opcionales. */
export function AddressShareDialog({ peerName, onClose, onSend }: AddressShareDialogProps) {
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<LocationCoords | null>({
    latitude: 14.5333,
    longitude: -91.7,
  });
  const [gpsDetected, setGpsDetected] = useState(false);
  const [locating, setLocating] = useState(false);
  const [acknowledged, setAcknowledged] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = address.trim();
  const hasLocationOrText = coords !== null || trimmed.length >= 3;
  const canSend = hasLocationOrText && acknowledged && !sending;

  function detectMyLocation() {
    if (!('geolocation' in navigator)) {
      setError('Su navegador no permite obtener la ubicación GPS.');
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
        setGpsDetected(true);
        setLocating(false);
      },
      () => {
        setError('No pudimos leer su GPS. Puede tocar el mapa para marcar el punto manualmente.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 },
    );
  }

  // Al abrir el modal intenta ubicar el GPS automáticamente como en WhatsApp
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    let active = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active) return;
        setCoords({
          latitude: Number(position.coords.latitude.toFixed(6)),
          longitude: Number(position.coords.longitude.toFixed(6)),
        });
        setGpsDetected(true);
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 },
    );
    return () => {
      active = false;
    };
  }, []);

  async function sendPayload(customCoords: LocationCoords | null, customNote: string) {
    if (!acknowledged || sending) return;
    setSending(true);
    setError(null);
    try {
      const note = customNote.trim();
      await onSend({
        content: note || 'Ubicación compartida',
        ...(customCoords
          ? { latitude: customCoords.latitude, longitude: customCoords.longitude }
          : {}),
      });
      onClose();
    } catch (sendError) {
      setError(getErrorMessage(sendError));
      setSending(false);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSend) return;
    await sendPayload(coords, address);
  }

  return (
    <Modal title="Enviar ubicación" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3.5">
        <LocationPickerMapLazy
          coords={coords}
          onPick={(picked) => {
            setCoords(picked);
            setGpsDetected(false);
          }}
        />

        {/* Botón rápido estilo WhatsApp: "Enviar mi ubicación actual" */}
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-brand-soft/35 p-2.5">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={detectMyLocation}
              disabled={locating || sending}
              className="flex flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-white/80 disabled:opacity-60"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#1f6b4a] text-white">
                <LocateFixed aria-hidden className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-foreground">
                  {locating
                    ? 'Obteniendo ubicación GPS…'
                    : gpsDetected
                      ? 'Ubicación GPS lista'
                      : 'Usar mi ubicación actual (GPS)'}
                </span>
                <span className="block truncate text-xs text-muted">
                  {coords
                    ? `Lat ${coords.latitude.toFixed(5)}, Lng ${coords.longitude.toFixed(5)}`
                    : 'Toque aquí o marque un punto en el mapa de arriba'}
                </span>
              </span>
            </button>
            {coords ? (
              <Button
                type="button"
                size="sm"
                disabled={!acknowledged || sending}
                onClick={() => void sendPayload(coords, address)}
                className="shrink-0 bg-[#1f6b4a] text-white hover:bg-[#18553b]"
              >
                <Navigation aria-hidden className="mr-1.5 size-3.5" />
                Enviar ya
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="address-text" className="text-xs font-semibold text-foreground">
            Dirección o referencias adicionales (opcional)
          </label>
          <Textarea
            id="address-text"
            rows={2}
            maxLength={ADDRESS_MAX_LENGTH}
            value={address}
            placeholder="Ej.: Casa de portón verde frente a la tienda (opcional si ya marcó el mapa)"
            onChange={(event) => setAddress(event.target.value)}
          />
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--brand)]"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
            />
            <span>
              Comparto esta ubicación con <strong>{peerName}</strong> para coordinar el servicio.
            </span>
          </label>
        </div>

        {error ? (
          <p role="alert" className="text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!canSend}>
            <MapPin aria-hidden className="mr-1.5 size-4" />
            {sending ? 'Enviando…' : 'Enviar ubicación'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
