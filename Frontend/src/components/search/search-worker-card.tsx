import Image from 'next/image';
import { LoginAwareLink } from '@/components/auth/login-aware-link';
import { AVAILABILITY_LABELS } from '@/lib/workers';
import { formatCardPrice, type SearchWorkerCard } from '@/lib/search';

export function SearchWorkerCardView({ worker }: { worker: SearchWorkerCard }) {
  const zones = worker.zones
    .map((z) => z.name)
    .slice(0, 3)
    .join(', ');
  const extraZones = worker.zones.length > 3 ? ` +${worker.zones.length - 3}` : '';

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-md">
      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        <LoginAwareLink
          href={`/trabajador/${worker.id}`}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-brand-soft sm:h-24 sm:w-24"
        >
          {worker.photoUrl ? (
            <Image src={worker.photoUrl} alt="" fill sizes="96px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-xs font-medium text-muted">
              Sin foto
            </div>
          )}
        </LoginAwareLink>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <LoginAwareLink href={`/trabajador/${worker.id}`} className="min-w-0">
              <h2 className="truncate text-base font-semibold text-foreground sm:text-lg">
                {worker.name}
              </h2>
              <p className="truncate text-sm text-muted">
                {worker.headline || worker.mainCategory?.name}
              </p>
            </LoginAwareLink>
            <span
              className={
                worker.availability === 'AVAILABLE'
                  ? 'inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700'
                  : worker.availability === 'BUSY'
                    ? 'shrink-0 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900'
                    : 'shrink-0 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-muted'
              }
            >
              {worker.availability === 'AVAILABLE' ? (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Disponible
                </>
              ) : (
                AVAILABILITY_LABELS[worker.availability]
              )}
            </span>
          </div>

          <p className="line-clamp-2 text-sm text-muted">{worker.description}</p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted sm:text-sm">
            {worker.distanceKm != null ? (
              <span className="rounded-full bg-[#e7f6ee] px-2 py-0.5 text-xs font-semibold text-[#1f6b4a]">
                ~{worker.distanceKm.toFixed(1)} km
              </span>
            ) : null}
            {worker.mainCategory ? <span>{worker.mainCategory.name}</span> : null}
            <span>
              ★ {worker.ratingAverage.toFixed(1)}
              {worker.ratingCount > 0 ? ` (${worker.ratingCount})` : ''}
            </span>
            <span className="font-medium text-foreground">{formatCardPrice(worker)}</span>
          </div>

          {zones ? (
            <p className="truncate text-xs text-muted">
              {zones}
              {extraZones}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <LoginAwareLink
              href={`/trabajador/${worker.id}`}
              className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-semibold text-foreground transition hover:bg-brand-soft"
            >
              Ver perfil
            </LoginAwareLink>
            <LoginAwareLink
              href={`/trabajador/${worker.id}`}
              className="inline-flex h-9 items-center rounded-lg bg-accent px-3 text-xs font-semibold text-white transition hover:bg-accent-dark"
            >
              Solicitar
            </LoginAwareLink>
          </div>
        </div>
      </div>
    </article>
  );
}
