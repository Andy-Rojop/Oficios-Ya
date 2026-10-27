import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, MapPin, Star } from 'lucide-react';
import { LoginAwareLink } from '@/components/auth/login-aware-link';
import { HomeCollage } from '@/components/client/home-collage';
import { HomeSearchForm } from '@/components/search/home-search-form';
import { formatCardPrice, type CatalogCategory, type SearchWorkerCard } from '@/lib/search';
import { AVAILABILITY_LABELS } from '@/lib/workers';

interface ClientHomeProps {
  userName?: string | null;
  categories: CatalogCategory[];
  workers: SearchWorkerCard[];
}

/**
 * Portada + carrusel de perfiles grandes.
 * Sin bloque “En vivo” (anillos) ni listado “Todos los trabajadores”.
 */
export function ClientHome({ userName, categories, workers }: ClientHomeProps) {
  const greeting = userName ? `Hola, ${userName.split(' ')[0]}` : null;
  const spotlight = [
    ...workers.filter((w) => w.availability === 'AVAILABLE'),
    ...workers.filter((w) => w.availability !== 'AVAILABLE'),
  ].slice(0, 5);

  return (
    <div className="pb-10">
      <section className="relative left-1/2 z-20 w-screen max-w-[100vw] -translate-x-1/2 -mt-6">
        <div className="relative min-h-[min(62vh,560px)] bg-foreground sm:min-h-[min(68vh,620px)]">
          <HomeCollage categories={categories} />

          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#121820]/88 via-[#1a2332]/55 to-[#1a2332]/20"
            aria-hidden
          />

          <div className="relative z-10 mx-auto flex min-h-[min(62vh,560px)] w-full max-w-6xl flex-col justify-end px-4 pb-8 pt-16 sm:min-h-[min(68vh,620px)] sm:px-6 sm:pb-10 sm:pt-20">
            <div className="max-w-md">
              <p className="animate-[home-fade-up_0.7s_ease-out_both] text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                El Asintal, Retalhuleu
              </p>
              <h1
                className="mt-1.5 animate-[home-fade-up_0.7s_ease-out_0.08s_both] text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Oficios de confianza, cerca de usted
              </h1>
              {greeting ? (
                <p className="mt-1 animate-[home-fade-up_0.7s_ease-out_0.12s_both] text-sm font-medium text-white">
                  {greeting}
                </p>
              ) : null}
              <p className="mt-2 animate-[home-fade-up_0.7s_ease-out_0.16s_both] text-sm text-white/85 sm:text-base">
                Carpintería, electricidad, plomería y más. Toque un oficio o busque por nombre.
              </p>

              <div className="relative z-30 mt-4 animate-[home-fade-up_0.7s_ease-out_0.24s_both]">
                <HomeSearchForm variant="hero" categories={categories} workers={workers} />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 animate-[home-fade-up_0.7s_ease-out_0.32s_both]">
                <LoginAwareLink
                  href="/buscar"
                  className="inline-flex h-11 items-center rounded-xl bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent-dark"
                >
                  Ver trabajadores
                </LoginAwareLink>
                <Link
                  href="/registro"
                  className="inline-flex h-11 items-center rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  Ofrecer un oficio
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {spotlight.length > 0 ? (
        <section className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden bg-[#e8eef6]">
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden
            style={{
              backgroundImage:
                'radial-gradient(ellipse 70% 55% at 10% 0%, rgba(37,99,235,0.12), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 80%, rgba(14,116,144,0.1), transparent 50%)',
            }}
          />

          <div className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-10 pt-8 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 sm:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] sm:pb-12 sm:pt-10 [&::-webkit-scrollbar]:hidden">
            {spotlight.map((worker, index) => (
              <LoginAwareLink
                key={worker.id}
                href={`/trabajador/${worker.id}`}
                className="group flex w-[78vw] max-w-[300px] shrink-0 snap-center flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-[0_12px_40px_-18px_rgba(26,35,50,0.35)] ring-1 ring-[#1a2332]/8 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_48px_-16px_rgba(26,35,50,0.4)] sm:w-[260px] sm:snap-start"
              >
                <span className="relative block aspect-[4/5] w-full overflow-hidden bg-brand-soft">
                  {worker.photoUrl ? (
                    <Image
                      src={worker.photoUrl}
                      alt=""
                      fill
                      sizes="300px"
                      priority={index === 0}
                      className="object-cover transition duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center bg-gradient-to-br from-[#d7e3f4] to-[#e8eef6] text-6xl font-semibold text-[#1e3a5f]/35">
                      {(worker.name || '?').charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="absolute left-3 top-3">
                    {worker.availability === 'AVAILABLE' ? (
                      <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm">
                        Disponible
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-foreground shadow-sm">
                        {AVAILABILITY_LABELS[worker.availability]}
                      </span>
                    )}
                  </span>
                </span>

                <span className="flex flex-1 flex-col gap-2 p-4">
                  <span
                    className="line-clamp-2 text-lg font-semibold leading-snug text-foreground"
                    style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
                  >
                    {worker.name}
                  </span>
                  <span className="line-clamp-1 text-sm text-muted">
                    {worker.headline || worker.mainCategory?.name}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    {worker.mainCategory ? (
                      <span className="rounded-full bg-accent-soft px-2 py-0.5 font-medium text-accent-dark">
                        {worker.mainCategory.name}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#fff8e8] px-2 py-0.5 font-medium text-[#8a6a12]">
                      <Star aria-hidden className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {worker.ratingAverage.toFixed(1)}
                      {worker.ratingCount > 0 ? ` (${worker.ratingCount})` : ''}
                    </span>
                    {worker.distanceKm != null ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 font-medium text-foreground">
                        <MapPin aria-hidden className="h-3 w-3" />
                        ~{worker.distanceKm.toFixed(1)} km
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <span className="text-sm font-semibold text-foreground">
                      {formatCardPrice(worker)}
                    </span>
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white transition group-hover:bg-accent-dark">
                      Ver perfil
                      <ChevronRight aria-hidden className="h-3.5 w-3.5" />
                    </span>
                  </span>
                </span>
              </LoginAwareLink>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
