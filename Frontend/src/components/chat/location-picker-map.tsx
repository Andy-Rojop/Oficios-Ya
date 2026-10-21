'use client';

import { useEffect } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

/** Centro por defecto: El Asintal, Retalhuleu. */
const DEFAULT_CENTER: [number, number] = [14.5333, -91.7];

function RecenterOnChange({ coords }: { coords: LocationCoords | null }) {
  const map = useMap();
  const lat = coords?.latitude;
  const lng = coords?.longitude;

  useEffect(() => {
    if (lat !== undefined && lng !== undefined) {
      map.flyTo([lat, lng], 16, { duration: 0.5 });
    }
  }, [map, lat, lng]);

  return null;
}

function ClickToPick({ onPick }: { onPick: (coords: LocationCoords) => void }) {
  useMapEvents({
    click(event) {
      onPick({
        latitude: Number(event.latlng.lat.toFixed(6)),
        longitude: Number(event.latlng.lng.toFixed(6)),
      });
    },
  });
  return null;
}

export default function LocationPickerMap({
  coords,
  onPick,
}: {
  coords: LocationCoords | null;
  onPick: (coords: LocationCoords) => void;
}) {
  const center: [number, number] = coords
    ? [coords.latitude, coords.longitude]
    : DEFAULT_CENTER;

  return (
    <div className="relative h-52 w-full overflow-hidden rounded-xl border border-border">
      <MapContainer
        center={center}
        zoom={coords ? 16 : 14}
        scrollWheelZoom
        className="z-0 h-full w-full cursor-crosshair"
        aria-label="Mapa para elegir ubicación"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RecenterOnChange coords={coords} />
        <ClickToPick onPick={onPick} />
        {coords ? (
          <CircleMarker
            center={[coords.latitude, coords.longitude]}
            radius={11}
            pathOptions={{
              color: '#ffffff',
              weight: 3,
              fillColor: '#e11d48',
              fillOpacity: 1,
            }}
          />
        ) : null}
      </MapContainer>
      <div className="pointer-events-none absolute bottom-2 left-2 right-2 z-[400] flex items-center justify-between gap-2 rounded-lg bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white">
        <span>
          {coords
            ? `Pin fijado (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`
            : 'Toque el mapa para mover el pin al punto exacto'}
        </span>
      </div>
    </div>
  );
}
