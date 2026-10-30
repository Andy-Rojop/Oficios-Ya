import Image from 'next/image';
import { Star } from 'lucide-react';
import { LoginAwareLink } from '@/components/auth/login-aware-link';
import { AVAILABILITY_LABELS } from '@/lib/workers';
import type { SearchWorkerCard } from '@/lib/search';

export function SearchWorkerCardView({ worker }: { worker: SearchWorkerCard }) {
  const zone = worker.zones[0]?.name;
  const category = worker.mainCategory?.name || worker.headline;

  return (
    <article className="rounded-2xl border border-[#e7eaf0] bg-white p-3 shadow-[0_8px_22px_rgba(16,24,40,0.1)]">
      <div className="flex gap-3">
        <LoginAwareLink
          href={`/trabajador/${worker.id}`}
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-brand-soft"
        >
          {worker.photoUrl ? (
            <Image src={worker.photoUrl} alt="" fill sizes="44px" className="object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center text-xs font-semibold text-[#1B2A4A]">
              {worker.name.slice(0, 1)}
            </span>
          )}
        </LoginAwareLink>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <LoginAwareLink href={`/trabajador/${worker.id}`} className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-[#1B2A4A]">{worker.name}</h2>
              <p className="truncate text-xs text-[#667085]">{category}</p>
            </LoginAwareLink>
            <span
              className={
                worker.availability === 'AVAILABLE'
                  ? 'shrink-0 rounded-full bg-[#fff4ec] px-2 py-0.5 text-[11px] font-semibold text-accent'
                  : worker.availability === 'BUSY'
                    ? 'shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900'
                    : 'shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-muted'
              }
            >
              {worker.availability === 'AVAILABLE' ? 'Disponible' : AVAILABILITY_LABELS[worker.availability]}
            </span>
          </div>

          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-[#667085]">
            <span className="inline-flex items-center gap-1 font-semibold text-[#1B2A4A]">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" aria-hidden />
              {worker.ratingAverage.toFixed(1)}
            </span>
            <span>({worker.ratingCount} reseña{worker.ratingCount === 1 ? '' : 's'})</span>
            {zone ? <span>{zone}</span> : null}
            {worker.distanceKm != null ? <span>~{worker.distanceKm.toFixed(1)} km</span> : null}
          </p>
        </div>
      </div>

      <LoginAwareLink
        href={`/trabajador/${worker.id}`}
        className="mt-3 flex h-10 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white transition hover:bg-accent-dark"
      >
        Solicitar Servicio
      </LoginAwareLink>
    </article>
  );
}
