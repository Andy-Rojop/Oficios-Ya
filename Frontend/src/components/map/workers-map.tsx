'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';
import type { SearchWorkerCard } from '@/lib/search';

/** Centro aproximado de El Asintal, Retalhuleu (si no hay zonas con coordenadas). */
export const DEFAULT_MAP_CENTER: LatLngExpression = [14.5333, -91.7];
const MAX_LISTED_PER_ZONE = 4;

export interface MapCenter {
  lat: number;
  lng: number;
}

interface ZonePoint {
  id: string;
  name: string;
  position: [number, number];
  workers: { id: string; headline: string }[];
}

export interface WorkersMapProps {
  workers: SearchWorkerCard[];
  /** Click en mapa/zona, marcadores de usuario y área, zoom con rueda, altura grande. */
  interactive?: boolean;
  /** Mapa a pantalla completa (hero): sin borde, ocupa el contenedor. */
  fill?: boolean;
  selectedCenter?: MapCenter | null;
  userCenter?: MapCenter | null;
  onSelectPoint?: (lat: number, lng: number) => void;
  className?: string;
  hideCaption?: boolean;
}

/**
 * Agrupa por zona. Solo se usan los centros aproximados de zona que llegan en los resultados de
 * búsqueda; nunca hay direcciones exactas ni coordenadas de un trabajador.
 */
export function groupWorkersByZone(workers: SearchWorkerCard[]): ZonePoint[] {
  const points = new Map<string, ZonePoint>();
  for (const worker of workers) {
    for (const zone of worker.zones) {
      if (zone.lat === null || zone.lng === null) continue;
      let point = points.get(zone.id);
      if (!point) {
        point = { id: zone.id, name: zone.name, position: [zone.lat, zone.lng], workers: [] };
        points.set(zone.id, point);
      }
      point.workers.push({ id: worker.id, headline: worker.headline });
    }
  }
  return [...points.values()];
}

function FitToView({
  points,
  selectedCenter,
  userCenter,
}: {
  points: ZonePoint[];
  selectedCenter?: MapCenter | null;
  userCenter?: MapCenter | null;
}) {
  const map = useMap();
  const selectedLat = selectedCenter?.lat;
  const selectedLng = selectedCenter?.lng;
  const userLat = userCenter?.lat;
  const userLng = userCenter?.lng;

  useEffect(() => {
    const coords: [number, number][] = points.map((point) => point.position);
    if (selectedLat !== undefined && selectedLng !== undefined) {
      coords.push([selectedLat, selectedLng]);
    }
    if (userLat !== undefined && userLng !== undefined) {
      coords.push([userLat, userLng]);
    }

    if (coords.length === 0) {
      map.setView(DEFAULT_MAP_CENTER, 13);
      return;
    }
    if (coords.length === 1) {
      map.setView(coords[0]!, 14);
      return;
    }
    const bounds: LatLngBoundsExpression = coords;
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, points, selectedLat, selectedLng, userLat, userLng]);
  return null;
}

function MapClickHandler({ onSelectPoint }: { onSelectPoint?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onSelectPoint?.(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function WorkersMap({
  workers,
  interactive = false,
  fill = false,
  selectedCenter = null,
  userCenter = null,
  onSelectPoint,
  className,
  hideCaption = false,
}: WorkersMapProps) {
  const points = useMemo(() => groupWorkersByZone(workers), [workers]);
  const initialCenter: LatLngExpression = selectedCenter
    ? [selectedCenter.lat, selectedCenter.lng]
    : (points[0]?.position ?? DEFAULT_MAP_CENTER);

  return (
    <div className={cn(fill ? 'h-full w-full' : 'space-y-2')}>
      <MapContainer
        center={initialCenter}
        zoom={fill ? 14 : 13}
        scrollWheelZoom={interactive}
        dragging={interactive || !fill}
        zoomControl={interactive || !fill}
        attributionControl={!fill}
        className={cn(
          'z-0 w-full',
          fill
            ? 'h-full min-h-full rounded-none border-0'
            : 'rounded-2xl border border-border',
          !fill &&
            (interactive
              ? 'h-[55vh] min-h-[280px] cursor-crosshair lg:h-full lg:min-h-[420px]'
              : 'h-72 sm:h-96'),
          className,
        )}
        aria-label="Mapa de zonas donde trabajan los resultados"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {!fill ? (
          <FitToView points={points} selectedCenter={selectedCenter} userCenter={userCenter} />
        ) : null}
        {interactive ? <MapClickHandler onSelectPoint={onSelectPoint} /> : null}

        {fill && points.length === 0 ? (
          <CircleMarker
            center={DEFAULT_MAP_CENTER}
            radius={14}
            pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#1e3a5f', fillOpacity: 0.9 }}
          >
            <Popup>
              <p className="text-sm font-semibold">El Asintal</p>
              <p className="text-xs text-muted">Retalhuleu · oficios cerca de usted</p>
            </Popup>
          </CircleMarker>
        ) : null}

        {userCenter ? (
          <CircleMarker
            center={[userCenter.lat, userCenter.lng]}
            radius={9}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              fillColor: '#276ef1',
              fillOpacity: 1,
            }}
          >
            <Popup>
              <p className="text-sm font-semibold">Su ubicación</p>
              <p className="text-xs text-muted">Aproximada (redondeada por privacidad)</p>
            </Popup>
          </CircleMarker>
        ) : null}

        {selectedCenter ? (
          <CircleMarker
            center={[selectedCenter.lat, selectedCenter.lng]}
            radius={12}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              fillColor: '#243248',
              fillOpacity: 0.92,
            }}
          >
            <Popup>
              <p className="text-sm font-semibold">Área elegida</p>
              <p className="text-xs text-muted">Mostramos oficios cercanos a este punto</p>
            </Popup>
          </CircleMarker>
        ) : null}

        {points.map((point) => (
          <CircleMarker
            key={point.id}
            center={point.position}
            radius={Math.min(10 + point.workers.length * 2, 26)}
            pathOptions={{ color: '#243248', weight: 2, fillColor: '#1e3a5f', fillOpacity: 0.75 }}
            eventHandlers={
              interactive && onSelectPoint
                ? {
                    click: (event) => {
                      event.originalEvent?.stopPropagation();
                      onSelectPoint(point.position[0], point.position[1]);
                    },
                  }
                : undefined
            }
          >
            <Popup>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">{point.name}</p>
                <p className="text-xs text-muted">
                  {point.workers.length}{' '}
                  {point.workers.length === 1 ? 'trabajador' : 'trabajadores'}
                </p>
                <ul className="list-inside list-disc">
                  {point.workers.slice(0, MAX_LISTED_PER_ZONE).map((worker) => (
                    <li key={worker.id}>
                      <Link href={`/trabajador/${worker.id}`} className="text-brand underline">
                        {worker.headline}
                      </Link>
                    </li>
                  ))}
                </ul>
                {point.workers.length > MAX_LISTED_PER_ZONE ? (
                  <p className="text-xs text-muted">
                    y {point.workers.length - MAX_LISTED_PER_ZONE} más
                  </p>
                ) : null}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      {!hideCaption ? (
        <p className="text-xs text-muted">
          {points.length === 0
            ? 'Ninguna de estas zonas tiene ubicación en el mapa todavía.'
            : interactive
              ? 'Toque el mapa o una zona para ver oficios cercanos. Los pines son centros de zona, nunca una dirección exacta.'
              : 'El mapa muestra el centro aproximado de cada zona, nunca la dirección de una persona.'}
        </p>
      ) : null}
    </div>
  );
}
