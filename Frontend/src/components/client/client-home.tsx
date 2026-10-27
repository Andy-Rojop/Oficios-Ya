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
        <section className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden bg-[#0c121c] text-white">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            aria-hidden
            style={{
              backgroundImage:
                'radial-gradient(ellipse 80% 50% at 20% 0%, rgba(37,99,235,0.35), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(16,185,129,0.14), transparent 50%)',
            }}
          />

          <div className="relative flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-10 pt-8 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 sm:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] sm:pb-12 sm:pt-10 [&::-webkit-scrollbar]:hidden">
            {spotlight.map((worker, index) => (
              <LoginAwareLink
                key={worker.id}
                href={`/trabajador/${worker.id}`}
                className="group relative h-[min(70vh,32rem)] w-[82vw] max-w-[320px] shrink-0 snap-center overflow-hidden rounded-[1.75rem] bg-[#1a2332] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.65)] sm:h-[34rem] sm:w-[280px] sm:snap-start"
              >
                {worker.photoUrl ? (
                  <Image
                    src={worker.photoUrl}
                    alt=""
                    fill
                    sizes="320px"
                    priority={index === 0}
                    className="object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#243248] via-[#1a2332] to-[#0c121c]">
                    <span className="absolute left-1/2 top-[38%] -translate-x-1/2 text-8xl font-semibold text-white/15">
                      {(worker.name || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span
                  className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10"
                  aria-hidden
                />
                <span className="absolute left-4 top-4 flex items-center gap-2">
                  {worker.availability === 'AVAILABLE' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg shadow-emerald-900/40">
                      Disponible
                    </span>
                  ) : (
                    <span className="rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                      {AVAILABILITY_LABELS[worker.availability]}
                    </span>
                  )}
                </span>
                <span className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5">
                  <span className="text-2xl font-semibold leading-tight tracking-tight text-white">
                    {worker.name}
                  </span>
                  <span className="line-clamp-2 text-sm text-white/80">
                    {worker.headline || worker.mainCategory?.name}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white">
                    {worker.mainCategory ? (
                      <span className="rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
                        {worker.mainCategory.name}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
                      <Star aria-hidden className="h-3 w-3 fill-amber-300 text-amber-300" />
                      {worker.ratingAverage.toFixed(1)}
                      {worker.ratingCount > 0 ? (
                        <span className="text-white/70">({worker.ratingCount})</span>
                      ) : null}
                    </span>
                    {worker.distanceKm != null ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 backdrop-blur-sm">
                        <MapPin aria-hidden className="h-3 w-3" />
                        ~{worker.distanceKm.toFixed(1)} km
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-base font-semibold text-white">
                      {formatCardPrice(worker)}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition group-hover:bg-accent-dark">
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
