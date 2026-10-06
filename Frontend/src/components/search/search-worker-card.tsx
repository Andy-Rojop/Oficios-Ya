import Image from 'next/image';
import Link from 'next/link';
import { AVAILABILITY_LABELS } from '@/lib/workers';
import { formatCardPrice, type SearchWorkerCard } from '@/lib/search';

export function SearchWorkerCardView({ worker }: { worker: SearchWorkerCard }) {
  const zones = worker.zones
    .map((z) => z.name)
    .slice(0, 3)
    .join(', ');
  const extraZones = worker.zones.length > 3 ? ` +${worker.zones.length - 3}` : '';

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface transition hover:border-foreground/20 hover:shadow-md">
      <Link href={`/trabajador/${worker.id}`} className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-soft sm:h-24 sm:w-24">
          {worker.photoUrl ? (
            <Image src={worker.photoUrl} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs font-medium text-muted">
              Sin foto
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground sm:text-lg">
                {worker.headline}
              </h2>
              <p className="truncate text-sm text-muted">{worker.name}</p>
            </div>
            <span
              className={
                worker.availability === 'AVAILABLE'
                  ? 'shrink-0 rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent-dark'
                  : worker.availability === 'BUSY'
                    ? 'shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900'
                    : 'shrink-0 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-muted'
              }
            >
              {AVAILABILITY_LABELS[worker.availability]}
            </span>
          </div>

          <p className="line-clamp-2 text-sm text-muted">{worker.description}</p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted sm:text-sm">
            {worker.mainCategory ? <span>{worker.mainCategory.name}</span> : null}
            <span>
              ★ {worker.ratingAverage.toFixed(1)}
              {worker.ratingCount > 0 ? ` (${worker.ratingCount})` : ''}
            </span>
            <span className="font-medium text-foreground">{formatCardPrice(worker)}</span>
            {worker.negotiable && worker.price ? (
              <span className="text-muted">· También a convenir</span>
            ) : null}
            {worker.distanceKm != null ? <span>~{worker.distanceKm.toFixed(1)} km</span> : null}
          </div>

          {zones ? (
            <p className="truncate text-xs text-muted">
              {zones}
              {extraZones}
            </p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
