import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, MapPin, Star, Zap } from 'lucide-react';
import { LoginAwareLink } from '@/components/auth/login-aware-link';
import { HomeCollage } from '@/components/client/home-collage';
import { HomeSearchForm } from '@/components/search/home-search-form';
import { SearchWorkerCardView } from '@/components/search/search-worker-card';
import { formatCardPrice, type CatalogCategory, type SearchWorkerCard } from '@/lib/search';
import { AVAILABILITY_LABELS } from '@/lib/workers';

interface ClientHomeProps {
  userName?: string | null;
  categories: CatalogCategory[];
  workers: SearchWorkerCard[];
}

/**
 * Portada intacta. El “plus” va en las personas: disponibles ahora,
 * en vivo, a pantalla casi completa — sin bloque de categorías.
 */
export function ClientHome({ userName, categories, workers }: ClientHomeProps) {
  const greeting = userName ? `Hola, ${userName.split(' ')[0]}` : null;
  const available = workers.filter((w) => w.availability === 'AVAILABLE');
  const spotlight = [
    ...available,
    ...workers.filter((w) => w.availability !== 'AVAILABLE'),
  ].slice(0, 5);
  const spotlightIds = new Set(spotlight.map((w) => w.id));
  const rest = workers.filter((w) => !spotlightIds.has(w.id));
  const liveCount = available.length;

  return (
    <div className="pb-10">
      {/* —— Portada: sin cambios —— */}
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

      {/* —— PLUS: disponibles en vivo (personas, no categorías) —— */}
      <section className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 overflow-hidden bg-[#0c121c] text-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            backgroundImage:
              'radial-gradient(ellipse 80% 50% at 20% 0%, rgba(37,99,235,0.45), transparent 55%), radial-gradient(ellipse 60% 40% at 90% 100%, rgba(16,185,129,0.18), transparent 50%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          aria-hidden
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
            maskImage: 'linear-gradient(to bottom, black, transparent 92%)',
          }}
        />

        <div className="relative mx-auto max-w-6xl px-4 pt-9 sm:px-6 sm:pt-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-lg">
              <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-[home-live-ping_1.6s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                En vivo · El Asintal
              </p>
              <h2
                className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                {liveCount > 0
                  ? `${liveCount} disponible${liveCount === 1 ? '' : 's'} ahora`
                  : 'Trabajadores cerca de usted'}
              </h2>
              <p className="mt-2 text-sm text-white/65 sm:text-base">
                Deslice y toque un perfil. Chat directo, sin intermediarios.
              </p>
            </div>
            <LoginAwareLink
              href="/buscar"
              className="inline-flex h-11 items-center gap-1 rounded-full bg-white px-5 text-sm font-semibold text-foreground transition hover:bg-white/90"
            >
              Abrir mapa
              <ChevronRight aria-hidden className="h-4 w-4" />
            </LoginAwareLink>
          </div>

          {/* Stories / anillos rápidos */}
          {spotlight.length > 0 ? (
            <div className="mt-6 flex gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {spotlight.map((worker) => (
                <LoginAwareLink
                  key={`ring-${worker.id}`}
                  href={`/trabajador/${worker.id}`}
                  className="flex w-16 shrink-0 flex-col items-center gap-1.5"
                >
                  <span
                    className={
                      worker.availability === 'AVAILABLE'
                        ? 'rounded-full bg-gradient-to-tr from-emerald-400 via-sky-400 to-blue-500 p-[2.5px]'
                        : 'rounded-full bg-white/25 p-[2.5px]'
                    }
                  >
                    <span className="relative block h-14 w-14 overflow-hidden rounded-full bg-[#1a2332] ring-2 ring-[#0c121c]">
                      {worker.photoUrl ? (
                        <Image
                          src={worker.photoUrl}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-lg font-semibold text-white/50">
                          {(worker.name || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="w-full truncate text-center text-[11px] font-medium text-white/80">
                    {worker.name.split(' ')[0]}
                  </span>
                </LoginAwareLink>
              ))}
            </div>
          ) : null}
        </div>

        {/* Tarjetas cine: casi a pantalla */}
        {spotlight.length > 0 ? (
          <div className="relative mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-11 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-5 sm:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] sm:pb-14 [&::-webkit-scrollbar]:hidden">
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
                      <span className="h-1.5 w-1.5 animate-[home-live-ping_1.6s_ease-out_infinite] rounded-full bg-white" />
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
        ) : (
          <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 px-6 py-12 text-center backdrop-blur-sm">
              <Zap aria-hidden className="mx-auto h-8 w-8 text-emerald-300" />
              <p
                className="mt-3 text-xl font-semibold"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Pronto habrá gente disponible aquí
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/65">
                Sea el primero en ofrecer su oficio en El Asintal.
              </p>
              <Link
                href="/registro"
                className="mt-6 inline-flex h-11 items-center rounded-full bg-white px-5 text-sm font-semibold text-foreground"
              >
                Ofrecer un oficio
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* —— CTA fuerte —— */}
      <section className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 bg-accent">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-7 sm:flex-row sm:items-center sm:px-6 sm:py-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">
              ¿Lo necesita hoy?
            </p>
            <h3
              className="mt-1 text-xl font-semibold text-white sm:text-2xl"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              Busque por mapa, oficio o nombre
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <LoginAwareLink
              href="/buscar"
              className="inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-accent transition hover:bg-white/90"
            >
              Buscar ahora
            </LoginAwareLink>
            <Link
              href="/registro"
              className="inline-flex h-11 items-center rounded-xl border border-white/35 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Soy trabajador
            </Link>
          </div>
        </div>
      </section>

      {/* —— Lista —— */}
      <section className="mx-auto mt-10 max-w-6xl space-y-5 px-0 sm:mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
              Directorio
            </p>
            <h2
              className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              Todos los trabajadores
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              Primero disponibles, luego ocupados y al final no disponibles.
            </p>
          </div>
          <LoginAwareLink
            href="/buscar"
            className="inline-flex h-11 items-center rounded-xl bg-foreground px-4 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Ver todos
          </LoginAwareLink>
        </div>

        {workers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-5 py-12 text-center sm:px-8">
            <p
              className="text-xl font-semibold text-foreground"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              Pronto verá oficios aquí
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Mientras tanto busque por categoría o regístrese para ofrecer su oficio.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <LoginAwareLink
                href="/buscar"
                className="inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Buscar oficios
              </LoginAwareLink>
              <Link
                href="/registro"
                className="inline-flex h-11 items-center rounded-xl border border-border bg-surface px-5 text-sm font-semibold transition hover:bg-brand-soft"
              >
                Registrarme
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {(spotlight.length > 0 ? rest : workers).map((worker) => (
              <SearchWorkerCardView key={worker.id} worker={worker} />
            ))}
            {spotlight.length > 0 && rest.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-surface/60 px-4 py-6 text-center text-sm text-muted">
                Esos son todos por ahora.{' '}
                <LoginAwareLink href="/buscar" className="font-semibold text-accent hover:underline">
                  Explorar en el mapa
                </LoginAwareLink>
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
