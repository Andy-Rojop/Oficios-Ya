'use client';

import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function LocationBubbleMapInner({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={16}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      attributionControl={false}
      className="pointer-events-none z-0 h-full w-full"
    >
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <CircleMarker
        center={[latitude, longitude]}
        radius={10}
        pathOptions={{
          color: '#ffffff',
          weight: 3,
          fillColor: '#e11d48',
          fillOpacity: 1,
        }}
      />
    </MapContainer>
  );
}
