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
 * Portada + carrusel de perfiles (claro, con plus).
 * Sin bloque “En vivo” ni listado “Todos los trabajadores”.
 */
export function ClientHome({ userName, categories, workers }: ClientHomeProps) {
  const greeting = userName ? `Hola, ${userName.split(' ')[0]}` : null;
  const availableCount = workers.filter((w) => w.availability === 'AVAILABLE').length;
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
                'radial-gradient(ellipse 70% 55% at 10% 0%, rgba(37,99,235,0.14), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 80%, rgba(14,116,144,0.12), transparent 50%)',
            }}
          />
          <div
            className="pointer-events-none absolute -right-16 top-10 h-56 w-56 rounded-full bg-[#2563eb]/10 blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl"
            aria-hidden
          />

          <div className="relative mx-auto flex max-w-6xl items-end justify-between gap-3 px-4 pt-9 sm:px-6 sm:pt-11">
            <div className="animate-[home-fade-up_0.7s_ease-out_both]">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-accent">
                {availableCount > 0 ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-[home-live-ping_1.6s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-emerald-500 opacity-70" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    {availableCount} disponible{availableCount === 1 ? '' : 's'} ahora
                  </>
                ) : (
                  'Cerca de usted'
                )}
              </p>
              <h2
                className="mt-1.5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Perfiles destacados
              </h2>
            </div>
            <p className="mb-1 hidden items-center gap-1 text-sm font-medium text-muted sm:inline-flex">
              Deslice
              <ChevronRight
                aria-hidden
                className="h-4 w-4 animate-[home-swipe-hint_1.4s_ease-in-out_infinite]"
              />
            </p>
          </div>

          <div className="relative mt-5">
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 sm:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] [&::-webkit-scrollbar]:hidden">
              {spotlight.map((worker, index) => (
                <LoginAwareLink
                  key={worker.id}
                  href={`/trabajador/${worker.id}`}
                  className="group flex w-[80vw] max-w-[310px] shrink-0 snap-center flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-[0_16px_44px_-18px_rgba(26,35,50,0.38)] ring-1 ring-[#1a2332]/8 transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_52px_-14px_rgba(26,35,50,0.42)] sm:w-[270px] sm:snap-start"
                  style={{
                    animation: `home-card-in 0.65s ease-out ${0.08 + index * 0.07}s both`,
                  }}
                >
                  <span className="relative block aspect-[3/4] w-full overflow-hidden bg-brand-soft">
                    {worker.photoUrl ? (
                      <Image
                        src={worker.photoUrl}
                        alt=""
                        fill
                        sizes="310px"
                        priority={index === 0}
                        className="object-cover transition duration-700 group-hover:scale-[1.05]"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center bg-gradient-to-br from-[#c9daf0] via-[#d7e3f4] to-[#e8eef6] text-7xl font-semibold text-[#1e3a5f]/30">
                        {(worker.name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span
                      className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent"
                      aria-hidden
                    />
                    <span className="absolute left-3 top-3">
                      {worker.availability === 'AVAILABLE' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md shadow-emerald-900/25">
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          Disponible
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-foreground shadow-sm">
                          {AVAILABILITY_LABELS[worker.availability]}
                        </span>
                      )}
                    </span>
                    {index === 0 ? (
                      <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-md">
                        Destacado
                      </span>
                    ) : null}
                  </span>

                  <span className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
                    <span
                      className="line-clamp-2 text-lg font-semibold leading-snug text-foreground sm:text-xl"
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
                    <span className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-3">
                      <span className="text-base font-semibold text-foreground">
                        {formatCardPrice(worker)}
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-accent px-3.5 py-2 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm shadow-accent/30 transition group-hover:bg-accent-dark group-hover:shadow-md">
                        Ver perfil
                        <ChevronRight
                          aria-hidden
                          className="h-3.5 w-3.5 transition group-hover:translate-x-0.5"
                        />
                      </span>
                    </span>
                  </span>
                </LoginAwareLink>
              ))}
            </div>
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-[#e8eef6] to-transparent sm:w-16"
              aria-hidden
            />
          </div>

          <div className="relative mx-auto flex max-w-6xl justify-center px-4 pb-10 pt-2 sm:px-6 sm:pb-12">
            <LoginAwareLink
              href="/buscar"
              className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-white shadow-lg shadow-[#1a2332]/20 transition hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-xl"
            >
              Ver todos en el mapa
              <ChevronRight aria-hidden className="h-4 w-4" />
            </LoginAwareLink>
          </div>
        </section>
      ) : null}
    </div>
  );
}
