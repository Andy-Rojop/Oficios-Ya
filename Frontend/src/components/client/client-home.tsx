import Link from 'next/link';
import {
  Drill,
  Flower2,
  Hammer,
  Paintbrush,
  Plug,
  Scissors,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
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
 * Vista de cliente: hero con collage de oficios + buscador, luego catálogo y listado.
 */
export function ClientHome({ userName, categories, workers }: ClientHomeProps) {
  const greeting = userName ? `Hola, ${userName.split(' ')[0]}` : null;
  const customOficios = extraOficios(categories, workers);

  return (
    <div className="space-y-14 pb-8">
      <section className="relative left-1/2 z-20 w-screen max-w-[100vw] -translate-x-1/2 -mt-6">
        <div className="relative min-h-[min(68vh,620px)] bg-foreground">
          <HomeCollage categories={categories} />

          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#121820]/88 via-[#1a2332]/55 to-[#1a2332]/20"
            aria-hidden
          />

          <div className="relative z-10 mx-auto flex min-h-[min(68vh,620px)] w-full max-w-6xl flex-col justify-end px-4 pb-8 pt-20 sm:px-6 sm:pb-10">
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
                <Link
                  href="/buscar"
                  className="inline-flex h-9 items-center rounded-lg bg-accent px-3.5 text-sm font-semibold text-white transition hover:bg-accent-dark"
                >
                  Ver trabajadores
                </Link>
                <Link
                  href="/registro"
                  className="inline-flex h-9 items-center rounded-lg border border-white/30 bg-white/10 px-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20"
                >
                  Ofrecer un oficio
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {categories.length > 0 || customOficios.length > 0 ? (
        <section className="space-y-5">
          <div className="max-w-xl">
            <h2
              className="text-2xl font-semibold tracking-tight sm:text-3xl"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              Oficios
            </h2>
            <p className="mt-1 text-muted">
              Elija el servicio que necesita. También aparecen oficios que registraron los
              trabajadores.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {categories.map((category, index) => {
              const Icon = categoryIcon(category.slug);
              return (
                <li key={category.id}>
                  <Link
                    href={`/categorias/${category.slug}`}
                    className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-4 transition duration-200 hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)]"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-foreground transition group-hover:bg-foreground group-hover:text-white">
                      <Icon aria-hidden className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-semibold leading-snug text-foreground">
                      {category.name}
                    </span>
                  </Link>
                </li>
              );
            })}
            {customOficios.map((oficio, index) => (
              <li key={`custom-${oficio}`}>
                <Link
                  href={`/buscar?q=${encodeURIComponent(oficio)}`}
                  className="group flex h-full flex-col gap-3 rounded-2xl border border-dashed border-border bg-surface p-4 transition duration-200 hover:-translate-y-0.5 hover:border-foreground/25 hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)]"
                  style={{ animationDelay: `${(categories.length + index) * 40}ms` }}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
                    <Wrench aria-hidden className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold leading-snug text-foreground">{oficio}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-xl">
            <h2
              className="text-2xl font-semibold tracking-tight sm:text-3xl"
              style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
            >
              Trabajadores disponibles
            </h2>
            <p className="mt-1 text-sm text-muted">
              Primero quienes están disponibles, luego ocupados y al final no disponibles.
            </p>
          </div>
          <Link
            href="/buscar"
            className="inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark"
          >
            Ver todos
          </Link>
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
              <Link
                href="/buscar"
                className="inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-white transition hover:bg-brand-dark"
              >
                Buscar oficios
              </Link>
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
