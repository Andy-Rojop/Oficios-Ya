import Link from 'next/link';
import { LoginAwareLink } from '@/components/auth/login-aware-link';
import { HomeCollage } from '@/components/client/home-collage';
import { HomeSearchForm } from '@/components/search/home-search-form';
import { SearchWorkerCardView } from '@/components/search/search-worker-card';
import type { CatalogCategory, SearchWorkerCard } from '@/lib/search';

interface ClientHomeProps {
  userName?: string | null;
  categories: CatalogCategory[];
  workers: SearchWorkerCard[];
}

/** Portada + CTA + listado. Sin bloque “en vivo”. */
export function ClientHome({ userName, categories, workers }: ClientHomeProps) {
  const greeting = userName ? `Hola, ${userName.split(' ')[0]}` : null;
  const availableCount = workers.filter((w) => w.availability === 'AVAILABLE').length;

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

      <section className="mx-auto mt-10 max-w-6xl space-y-5 px-0 sm:mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
              {availableCount > 0
                ? `${availableCount} disponible${availableCount === 1 ? '' : 's'} ahora`
                : 'Directorio'}
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
            {workers.map((worker) => (
              <SearchWorkerCardView key={worker.id} worker={worker} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
