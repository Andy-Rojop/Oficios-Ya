import Link from 'next/link';
import {
  ChevronRight,
  Drill,
  Flower2,
  Hammer,
  Paintbrush,
  Plug,
  Scissors,
  Star,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { LoginAwareLink } from '@/components/auth/login-aware-link';
import {
  FALLBACK_OFICIO_IMAGES,
  HomeCollage,
  OFICIO_VISUALS,
} from '@/components/client/home-collage';
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

function oficioImage(slug: string, index: number): string {
  return OFICIO_VISUALS[slug]?.image ?? FALLBACK_OFICIO_IMAGES[index % FALLBACK_OFICIO_IMAGES.length]!;
}

/**
 * Vista de cliente: portada intacta + carrusel de oficios con foto
 * (patrón TaskRabbit / Thumbtack) y listado de trabajadores.
 */
export function ClientHome({ userName, categories, workers }: ClientHomeProps) {
  const greeting = userName ? `Hola, ${userName.split(' ')[0]}` : null;
  const availableCount = workers.filter((w) => w.availability === 'AVAILABLE').length;

  return (
    <div className="pb-10">
      {/* —— Portada: sin cambios de concepto —— */}
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

      {/* —— Populares: el “plus” que llama la atención (estilo TaskRabbit) —— */}
      {categories.length > 0 ? (
        <section className="relative left-1/2 mt-0 w-screen max-w-[100vw] -translate-x-1/2 bg-foreground text-white">
          <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                  Lo más pedido
                </p>
                <h2
                  className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"
                  style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
                >
                  Oficios populares
                </h2>
                <p className="mt-1 text-sm text-white/65">
                  Deslice y toque el que necesita — trabajadores cerca en El Asintal.
                </p>
              </div>
              <LoginAwareLink
                href="/buscar"
                className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-white/80 transition hover:text-white sm:inline-flex"
              >
                Ver todos
                <ChevronRight aria-hidden className="h-4 w-4" />
              </LoginAwareLink>
            </div>
          </div>

          <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-8 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 sm:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] sm:pb-10 [&::-webkit-scrollbar]:hidden">
            {categories.map((category, index) => {
              const Icon = OFICIO_VISUALS[category.slug]?.Icon ?? categoryIcon(category.slug);
              const image = oficioImage(category.slug, index);
              return (
                <LoginAwareLink
                  key={category.id}
                  href={`/categorias/${category.slug}`}
                  className="group relative h-56 w-[72vw] max-w-[280px] shrink-0 snap-start overflow-hidden rounded-3xl sm:h-64 sm:w-[240px]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <span
                    className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/10"
                    aria-hidden
                  />
                  <span className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white backdrop-blur-sm">
                      <Icon aria-hidden className="h-5 w-5" />
                    </span>
                    <span className="text-lg font-semibold leading-tight text-white drop-shadow">
                      {category.name}
                    </span>
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                      Ver cerca
                      <ChevronRight aria-hidden className="h-3.5 w-3.5" />
                    </span>
                  </span>
                </LoginAwareLink>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* —— Trabajadores: ancla humana después del carrusel —— */}
      <section className="mx-auto mt-10 max-w-6xl space-y-5 px-0 sm:mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-accent">
              <Star aria-hidden className="h-3.5 w-3.5 fill-current" />
              {availableCount > 0
                ? `${availableCount} disponible${availableCount === 1 ? '' : 's'} ahora`
                : 'En El Asintal'}
            </p>
            <h2
              className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"
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
