import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Star } from 'lucide-react';
import { formatCardPrice, type SearchWorkerCard } from '@/lib/search';
import { AVAILABILITY_LABELS } from '@/lib/workers';

const AVAILABILITY_STYLES = {
  AVAILABLE: 'bg-brand-soft text-brand-dark',
  BUSY: 'bg-amber-100 text-amber-900',
  UNAVAILABLE: 'bg-border text-muted',
} as const;

const MAX_ZONES_SHOWN = 3;

export function WorkerResultCard({ worker }: { worker: SearchWorkerCard }) {
  const extraZones = Math.max(0, worker.zones.length - MAX_ZONES_SHOWN);
  const hasPrice = worker.price !== null;

  return (
    <li>
      <Link
        href={`/trabajador/${worker.id}`}
        className="group flex gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:border-brand/60 hover:shadow-md sm:p-5"
      >
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-brand-soft sm:h-28 sm:w-28">
          {worker.photoUrl ? (
            <Image
              src={worker.photoUrl}
              alt={`Trabajo de ${worker.name}`}
              fill
              sizes="112px"
              className="object-cover"
            />
          ) : (
            <span
              aria-hidden
              className="flex h-full w-full items-center justify-center text-3xl font-semibold text-brand"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              {worker.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <h3 className="break-words text-lg font-semibold leading-snug text-foreground group-hover:text-brand-dark">
                {worker.headline}
              </h3>
              <p className="text-sm text-muted">{worker.name}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${AVAILABILITY_STYLES[worker.availability]}`}
            >
              {AVAILABILITY_LABELS[worker.availability]}
            </span>
          </div>

          <p className="line-clamp-2 text-sm text-foreground/90">{worker.description}</p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="inline-flex items-center gap-1" aria-label="Calificación">
              <Star aria-hidden className="h-4 w-4 fill-amber-400 text-amber-500" />
              {worker.ratingCount > 0 ? (
                <span>
                  <strong>{worker.ratingAverage.toFixed(1)}</strong>{' '}
                  <span className="text-muted">({worker.ratingCount})</span>
                </span>
              ) : (
                <span className="text-muted">Sin reseñas</span>
              )}
            </span>
            <span className="font-semibold text-brand-dark">
              {formatCardPrice(worker)}
              {hasPrice && worker.negotiable ? (
                <span className="ml-1 text-xs font-normal text-muted">· otros a convenir</span>
              ) : null}
            </span>
            {worker.distanceKm !== null ? (
              <span className="text-muted">a {worker.distanceKm.toFixed(1)} km</span>
            ) : null}
          </div>

          {worker.mainCategory || worker.zones.length > 0 ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
              {worker.mainCategory ? (
                <span className="rounded-full border border-border px-2 py-0.5">
                  {worker.mainCategory.name}
                </span>
              ) : null}
              {worker.zones.length > 0 ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin aria-hidden className="h-3.5 w-3.5" />
                  {worker.zones
                    .slice(0, MAX_ZONES_SHOWN)
                    .map((zone) => zone.name)
                    .join(', ')}
                  {extraZones > 0 ? ` y ${extraZones} más` : ''}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
      </Link>
    </li>
  );
}
