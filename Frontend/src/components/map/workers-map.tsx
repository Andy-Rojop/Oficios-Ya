'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { SearchWorkerCard } from '@/lib/search';

/** Centro aproximado de El Asintal, Retalhuleu (si no hay zonas con coordenadas). */
const DEFAULT_CENTER: LatLngExpression = [14.5333, -91.7];
const MAX_LISTED_PER_ZONE = 4;

interface ZonePoint {
  id: string;
  name: string;
  position: [number, number];
  workers: { id: string; headline: string }[];
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

function FitToPoints({ points }: { points: ZonePoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0]!.position, 14);
      return;
    }
    const bounds: LatLngBoundsExpression = points.map((point) => point.position);
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
  }, [map, points]);
  return null;
}

export default function WorkersMap({ workers }: { workers: SearchWorkerCard[] }) {
  const points = useMemo(() => groupWorkersByZone(workers), [workers]);

  return (
    <div className="space-y-2">
      <MapContainer
        center={points[0]?.position ?? DEFAULT_CENTER}
        zoom={13}
        scrollWheelZoom={false}
        className="z-0 h-72 w-full rounded-2xl border border-border sm:h-96"
        aria-label="Mapa de zonas donde trabajan los resultados"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitToPoints points={points} />
        {points.map((point) => (
          <CircleMarker
            key={point.id}
            center={point.position}
            radius={Math.min(10 + point.workers.length * 2, 26)}
            pathOptions={{ color: '#154c29', weight: 2, fillColor: '#1f6b3a', fillOpacity: 0.55 }}
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
      <p className="text-xs text-muted">
        {points.length === 0
          ? 'Ninguna de estas zonas tiene ubicación en el mapa todavía.'
          : 'El mapa muestra el centro aproximado de cada zona, nunca la dirección de una persona.'}
      </p>
    </div>
  );
}
