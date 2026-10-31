'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import type { LatLngBoundsExpression, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cn } from '@/lib/utils';
import { formatCardPrice, type SearchWorkerCard } from '@/lib/search';
import { AVAILABILITY_LABELS } from '@/lib/workers';

/** Centro aproximado de El Asintal, Retalhuleu (si no hay zonas con coordenadas). */
export const DEFAULT_MAP_CENTER: [number, number] = [14.5333, -91.7];
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

export interface WorkerMapPoint {
  id: string;
  name: string;
  headline: string;
  categoryName: string | null;
  zoneName: string;
  position: [number, number];
  availability: SearchWorkerCard['availability'];
  ratingAverage: number;
  ratingCount: number;
  priceLabel: string;
  distanceKm: number | null;
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

/** Hash determinístico simple para dispersar puntos aproximados sin revelar dirección exacta. */
function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Calcula una ubicación aproximada individual para cada trabajador alrededor del centro
 * de su zona más cercana (desplazamiento de ~150 m a ~450 m para que cada oficio tenga
 * su propio punto visible en el mapa sin exponer una dirección exacta).
 */
export function buildWorkerMapPoints(
  workers: SearchWorkerCard[],
  referenceCenter?: MapCenter | null,
): WorkerMapPoint[] {
  // Primero elegimos la zona de referencia de cada trabajador
  const chosenZoneByWorker = new Map<
    string,
    { id: string; name: string; lat: number; lng: number }
  >();
  const workersPerZone = new Map<string, string[]>();

  for (const worker of workers) {
    const validZones = worker.zones.filter(
      (z): z is { id: string; name: string; lat: number; lng: number } =>
        z.lat !== null && z.lng !== null,
    );

    let chosen: { id: string; name: string; lat: number; lng: number };
    if (validZones.length === 0) {
      chosen = {
        id: 'default-asintal',
        name: worker.zones[0]?.name ?? 'El Asintal (aprox.)',
        lat: DEFAULT_MAP_CENTER[0],
        lng: DEFAULT_MAP_CENTER[1],
      };
    } else if (referenceCenter) {
      chosen = validZones.reduce((best, candidate) => {
        const bestDist =
          (best.lat - referenceCenter.lat) ** 2 + (best.lng - referenceCenter.lng) ** 2;
        const candDist =
          (candidate.lat - referenceCenter.lat) ** 2 + (candidate.lng - referenceCenter.lng) ** 2;
        return candDist < bestDist ? candidate : best;
      }, validZones[0]!);
    } else {
      chosen = validZones[0]!;
    }

    chosenZoneByWorker.set(worker.id, chosen);
    const list = workersPerZone.get(chosen.id) ?? [];
    list.push(worker.id);
    workersPerZone.set(chosen.id, list);
  }

  return workers.map((worker) => {
    const zone = chosenZoneByWorker.get(worker.id)!;
    const siblings = workersPerZone.get(zone.id) ?? [worker.id];
    const indexInZone = Math.max(0, siblings.indexOf(worker.id));
    const hash = hashString(worker.id);

    // Ángulo áureo + semilla por trabajador para separar visualmente cada pin dentro de la zona
    const baseAngle = ((hash % 360) * Math.PI) / 180;
    const angle = baseAngle + indexInZone * 2.399963229728653;
    // Radio entre ~160 m (0.0015°) y ~420 m (0.0038°) alrededor del centro de la zona
    const ring = Math.floor(indexInZone / 6);
    const radiusDeg = 0.0015 + ((hash % 100) / 100) * 0.0016 + ring * 0.0012;

    const latOffset = Math.sin(angle) * radiusDeg;
    const lngOffset = Math.cos(angle) * radiusDeg;

    return {
      id: worker.id,
      name: worker.name,
      headline: worker.headline,
      categoryName: worker.mainCategory?.name ?? null,
      zoneName: zone.name,
      position: [
        Number((zone.lat + latOffset).toFixed(5)),
        Number((zone.lng + lngOffset).toFixed(5)),
      ],
      availability: worker.availability,
      ratingAverage: worker.ratingAverage,
      ratingCount: worker.ratingCount,
      priceLabel: formatCardPrice(worker),
      distanceKm: worker.distanceKm,
    };
  });
}

/**
 * Agrupa por zona. Se mantiene por compatibilidad con vistas o pruebas que consulten centros de zona.
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
      if (point.workers.length < MAX_LISTED_PER_ZONE) {
        point.workers.push({ id: worker.id, headline: worker.headline });
      }
    }
  }
  return [...points.values()];
}

function FitToView({
  workerPoints,
  selectedCenter,
  userCenter,
}: {
  workerPoints: WorkerMapPoint[];
  selectedCenter?: MapCenter | null;
  userCenter?: MapCenter | null;
}) {
  const map = useMap();
  const selectedLat = selectedCenter?.lat;
  const selectedLng = selectedCenter?.lng;
  const userLat = userCenter?.lat;
  const userLng = userCenter?.lng;

  useEffect(() => {
    const coords: [number, number][] = workerPoints.map((point) => point.position);
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
    map.fitBounds(bounds, { padding: [44, 44], maxZoom: 14 });
  }, [map, workerPoints, selectedLat, selectedLng, userLat, userLng]);
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
  const referenceCenter = selectedCenter ?? userCenter;
  const workerPoints = useMemo(
    () => buildWorkerMapPoints(workers, referenceCenter),
    [workers, referenceCenter],
  );
  const initialCenter: LatLngExpression = selectedCenter
    ? [selectedCenter.lat, selectedCenter.lng]
    : (workerPoints[0]?.position ?? DEFAULT_MAP_CENTER);

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
            : 'overflow-hidden rounded-2xl border border-border shadow-[0_10px_30px_rgba(26,35,50,0.08)]',
          !fill &&
            (interactive
              ? 'h-[36vh] min-h-[220px] cursor-crosshair sm:h-[45vh] lg:h-[min(58vh,480px)] lg:min-h-[300px]'
              : 'h-56 sm:h-72 md:h-96'),
          className,
        )}
        aria-label="Mapa de ubicaciones aproximadas de trabajadores"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {!fill ? (
          <FitToView
            workerPoints={workerPoints}
            selectedCenter={selectedCenter}
            userCenter={userCenter}
          />
        ) : null}
        {interactive ? <MapClickHandler onSelectPoint={onSelectPoint} /> : null}

        {fill && workerPoints.length === 0 ? (
          <CircleMarker
            center={DEFAULT_MAP_CENTER}
            radius={14}
            pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#f26522', fillOpacity: 0.9 }}
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
          <>
            <Circle
              center={[selectedCenter.lat, selectedCenter.lng]}
              radius={1800}
              pathOptions={{
                color: '#f26522',
                weight: 1.5,
                fillColor: '#f26522',
                fillOpacity: 0.08,
              }}
            />
            <CircleMarker
              center={[selectedCenter.lat, selectedCenter.lng]}
              radius={11}
              pathOptions={{
                color: '#ffffff',
                weight: 3,
                fillColor: '#1f6b4a',
                fillOpacity: 1,
              }}
            >
              <Popup>
                <p className="text-sm font-semibold">Punto consultado</p>
                <p className="text-xs text-muted">Disponibles ordenados del más cercano al más lejano</p>
              </Popup>
            </CircleMarker>
          </>
        ) : null}

        {workerPoints.map((worker) => {
          const fillColor =
            worker.availability === 'AVAILABLE'
              ? '#f26522'
              : worker.availability === 'BUSY'
                ? '#b45309'
                : '#64748b';

          return (
            <CircleMarker
              key={worker.id}
              center={worker.position}
              radius={10}
              pathOptions={{
                color: '#ffffff',
                weight: 2.5,
                fillColor,
                fillOpacity: 0.94,
              }}
              eventHandlers={{
                click: (event) => {
                  event.originalEvent?.stopPropagation();
                },
              }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.96}>
                <div className="text-xs">
                  <p className="font-semibold text-foreground">{worker.headline}</p>
                  <p className="text-muted">
                    {worker.name} · {worker.priceLabel}
                  </p>
                </div>
              </Tooltip>
              <Popup>
                <div className="min-w-[190px] space-y-1.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    {worker.categoryName ? (
                      <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">
                        {worker.categoryName}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-[#e7f6ee] px-2 py-0.5 text-[11px] font-semibold text-[#1f6b4a]">
                      {AVAILABILITY_LABELS[worker.availability]}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold leading-tight text-foreground">{worker.headline}</p>
                    <p className="text-xs text-muted">{worker.name}</p>
                  </div>
                  <p className="text-xs text-foreground">
                    ★ {worker.ratingAverage.toFixed(1)}
                    {worker.ratingCount > 0 ? ` (${worker.ratingCount})` : ''} ·{' '}
                    <span className="font-semibold">{worker.priceLabel}</span>
                  </p>
                  <p className="text-[11px] text-muted">
                    Ubicación aprox.: {worker.zoneName}
                    {worker.distanceKm !== null ? ` (~${worker.distanceKm.toFixed(1)} km)` : ''}
                  </p>
                  <Link
                    href={`/trabajador/${worker.id}`}
                    className="inline-block pt-1 text-xs font-semibold text-accent"
                  >
                    Ver perfil →
                  </Link>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
      {!hideCaption ? (
        <p className="text-xs text-muted">
          {workerPoints.length === 0
            ? 'No hay trabajadores con ubicación aproximada en este filtro todavía.'
            : interactive
              ? 'Cada punto azul representa la ubicación aproximada de un trabajador según su zona. Pase el cursor o toque un punto para ver su oficio y tarifa.'
              : 'El mapa muestra la ubicación aproximada de cada trabajador en su zona (protegiendo su dirección exacta).'}
        </p>
      ) : null}
    </div>
  );
}
