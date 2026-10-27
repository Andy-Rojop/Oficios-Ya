import Link from 'next/link';
import {
  Drill,
  Flower2,
  Hammer,
  MapPin,
  Paintbrush,
  Plug,
  Scissors,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { LoginAwareLink } from '@/components/auth/login-aware-link';
import { HomeCollage } from '@/components/client/home-collage';
import { HomeSearchForm } from '@/components/search/home-search-form';
import { SearchWorkerCardView } from '@/components/search/search-worker-card';
import type { CatalogCategory, SearchWorkerCard } from '@/lib/search';

interface ClientHomeProps {
  /** Nombre del usuario si ya inició sesión (opcional). */
  userName?: string | null;
  categories: CatalogCategory[];
  workers: SearchWorkerCard[];
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  albañileria: Hammer,
  albanileria: Hammer,
  carpinteria: Drill,
  electricidad: Plug,
  herreria: Wrench,
  jardineria: Flower2,
  mecanica: Wrench,
  pintura: Paintbrush,
  plomeria: Wrench,
  costura: Scissors,
};

function categoryIcon(slug: string): LucideIcon {
  const key = slug
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  return CATEGORY_ICONS[key] ?? Hammer;
}

function extraOficios(categories: CatalogCategory[], workers: SearchWorkerCard[]): string[] {
  const known = new Set(
    categories.map((category) => category.name.trim().toLowerCase()),
  );
  const seen = new Set<string>();
  const extras: string[] = [];
  for (const worker of workers) {
    const headline = worker.headline.trim();
    const key = headline.toLowerCase();
    if (!headline || known.has(key) || seen.has(key)) continue;
    seen.add(key);
    extras.push(headline);
    if (extras.length >= 6) break;
  }
  return extras;
}

/**
 * Vista de cliente: hero con collage + buscador; debajo, placa clara que
 * contrasta con la portada oscura (oficios y trabajadores).
 */
export function ClientHome({ userName, categories, workers }: ClientHomeProps) {
  const greeting = userName ? `Hola, ${userName.split(' ')[0]}` : null;
  const customOficios = extraOficios(categories, workers);

  return (
    <div className="pb-10">
      {/* —— Portada (se mantiene) —— */}
      <section className="relative left-1/2 z-20 w-screen max-w-[100vw] -translate-x-1/2 -mt-6">
        <div className="relative min-h-[min(62vh,560px)] bg-foreground sm:min-h-[min(68vh,620px)]">
          <HomeCollage categories={categories} />

          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#121820]/88 via-[#1a2332]/55 to-[#1a2332]/20"
            aria-hidden
          />
          {/* Fundido inferior: prepara el contraste con la placa clara. */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#121820] to-transparent sm:h-36"
            aria-hidden
          />

          <div className="relative z-10 mx-auto flex min-h-[min(62vh,560px)] w-full max-w-6xl flex-col justify-end px-4 pb-14 pt-16 sm:min-h-[min(68vh,620px)] sm:px-6 sm:pb-16 sm:pt-20">
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

      {/* —— Placa clara a todo el ancho que “sube” sobre la portada —— */}
      <div className="relative left-1/2 z-30 w-screen max-w-[100vw] -translate-x-1/2 -mt-8 sm:-mt-10">
        <div className="overflow-hidden rounded-t-[1.75rem] border border-border/80 border-b-0 bg-[#f7f8fa] shadow-[0_-12px_40px_rgba(18,24,32,0.18)] sm:rounded-t-[2rem]">
          {/* Puente local: una sola línea, sin competir con el hero. */}
          <div className="mx-auto flex max-w-6xl items-center gap-2 border-b border-border/70 bg-surface px-4 py-3 sm:px-6">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-white">
              <MapPin aria-hidden className="h-4 w-4" />
            </span>
            <p className="text-sm text-foreground">
              <span className="font-semibold">El Asintal</span>
              <span className="text-muted"> · Oficios verificados cerca de usted</span>
            </p>
          </div>

          <div className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6 sm:py-10">
            {categories.length > 0 || customOficios.length > 0 ? (
              <section className="space-y-5 animate-[home-fade-up_0.6s_ease-out_0.05s_both]">
                <div className="max-w-xl">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                    Catálogo
                  </p>
                  <h2
                    className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                    style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
                  >
                    Oficios
                  </h2>
                  <p className="mt-1.5 text-muted">
                    Elija el servicio que necesita. También aparecen oficios que registraron los
                    trabajadores.
                  </p>
                </div>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {categories.map((category, index) => {
                    const Icon = categoryIcon(category.slug);
                    return (
                      <li key={category.id}>
                        <LoginAwareLink
                          href={`/categorias/${category.slug}`}
                          className="group flex h-full flex-col gap-3 rounded-2xl border border-border/90 bg-surface p-4 shadow-[0_1px_0_rgba(26,35,50,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-[0_14px_28px_rgba(26,35,50,0.1)]"
                          style={{ animationDelay: `${index * 40}ms` }}
                        >
                          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-white transition group-hover:bg-accent">
                            <Icon aria-hidden className="h-5 w-5" />
                          </span>
                          <span className="text-sm font-semibold leading-snug text-foreground">
                            {category.name}
                          </span>
                        </LoginAwareLink>
                      </li>
                    );
                  })}
                  {customOficios.map((oficio, index) => (
                    <li key={`custom-${oficio}`}>
                      <LoginAwareLink
                        href={`/buscar?q=${encodeURIComponent(oficio)}`}
                        className="group flex h-full flex-col gap-3 rounded-2xl border border-dashed border-accent/30 bg-accent-soft/40 p-4 transition duration-200 hover:-translate-y-0.5 hover:border-accent/50 hover:bg-accent-soft"
                        style={{ animationDelay: `${(categories.length + index) * 40}ms` }}
                      >
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-white">
                          <Wrench aria-hidden className="h-5 w-5" />
                        </span>
                        <span className="text-sm font-semibold leading-snug text-foreground">
                          {oficio}
                        </span>
                      </LoginAwareLink>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="space-y-5 animate-[home-fade-up_0.6s_ease-out_0.12s_both]">
              <div className="flex flex-wrap items-end justify-between gap-3 border-t border-border/80 pt-10">
                <div className="max-w-xl">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
                    Cerca de usted
                  </p>
                  <h2
                    className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                    style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
                  >
                    Trabajadores disponibles
                  </h2>
                  <p className="mt-1.5 text-sm text-muted">
                    Primero quienes están disponibles, luego ocupados y al final no disponibles.
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
                <div className="relative overflow-hidden rounded-2xl border border-border bg-surface px-5 py-12 text-center sm:px-8">
                  <p
                    className="relative text-xl font-semibold text-foreground"
                    style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
                  >
                    Pronto verá oficios aquí
                  </p>
                  <p className="relative mx-auto mt-2 max-w-md text-sm text-muted">
                    Mientras tanto busque por categoría o regístrese para ofrecer su oficio.
                  </p>
                  <div className="relative mt-6 flex flex-wrap justify-center gap-3">
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
        </div>
      </div>
    </div>
  );
}
