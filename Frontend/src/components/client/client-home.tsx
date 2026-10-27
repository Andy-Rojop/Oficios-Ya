import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronRight,
  Drill,
  Flower2,
  Hammer,
  MapPin,
  MessageCircle,
  Paintbrush,
  Plug,
  Scissors,
  Search,
  Star,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
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

/** Colores sólidos por oficio — sin fotos, sin competir con la portada. */
const CATEGORY_TILE: Record<string, { bg: string; ink: string }> = {
  albanileria: { bg: '#c45c26', ink: '#fff7f0' },
  albañileria: { bg: '#c45c26', ink: '#fff7f0' },
  carpinteria: { bg: '#8b5a2b', ink: '#fff8f0' },
  electricidad: { bg: '#c9a227', ink: '#1a1400' },
  herreria: { bg: '#4a5568', ink: '#f7fafc' },
  jardineria: { bg: '#2f6b4f', ink: '#f0faf4' },
  mecanica: { bg: '#334155', ink: '#f1f5f9' },
  pintura: { bg: '#0e7490', ink: '#ecfeff' },
  plomeria: { bg: '#1d4ed8', ink: '#eff6ff' },
  costura: { bg: '#9d174d', ink: '#fdf2f8' },
};

const TILE_FALLBACKS = [
  { bg: '#1e3a5f', ink: '#e8eef6' },
  { bg: '#0f766e', ink: '#ecfdf5' },
  { bg: '#7c2d12', ink: '#fff7ed' },
  { bg: '#1e40af', ink: '#eff6ff' },
];

function normalizeSlug(slug: string) {
  return slug
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function categoryIcon(slug: string): LucideIcon {
  return CATEGORY_ICONS[normalizeSlug(slug)] ?? Hammer;
}

function categoryTile(slug: string, index: number) {
  return CATEGORY_TILE[normalizeSlug(slug)] ?? TILE_FALLBACKS[index % TILE_FALLBACKS.length]!;
}

/**
 * Portada intacta. Debajo: oficios con icono/color (estilo TaskRabbit,
 * sin repetir fotos del collage) + destacados + lista con más ritmo.
 */
export function ClientHome({ userName, categories, workers }: ClientHomeProps) {
  const greeting = userName ? `Hola, ${userName.split(' ')[0]}` : null;
  const availableCount = workers.filter((w) => w.availability === 'AVAILABLE').length;
  const spotlight = [
    ...workers.filter((w) => w.availability === 'AVAILABLE'),
    ...workers.filter((w) => w.availability !== 'AVAILABLE'),
  ].slice(0, 4);
  const spotlightIds = new Set(spotlight.map((w) => w.id));
  const rest = workers.filter((w) => !spotlightIds.has(w.id));

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

      {/* —— Oficios: iconos + color (TaskRabbit), cero fotos —— */}
      {categories.length > 0 ? (
        <section className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 bg-[#f3f6fa]">
          <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
                  Elija un oficio
                </p>
                <h2
                  className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                  style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
                >
                  ¿Qué necesita hoy?
                </h2>
              </div>
              <LoginAwareLink
                href="/buscar"
                className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-accent transition hover:text-accent-dark sm:inline-flex"
              >
                Ver todos
                <ChevronRight aria-hidden className="h-4 w-4" />
              </LoginAwareLink>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 px-4 pb-8 sm:grid-cols-4 sm:gap-4 sm:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] sm:pb-10">
            {categories.map((category, index) => {
              const Icon = categoryIcon(category.slug);
              const tile = categoryTile(category.slug, index);
              return (
                <LoginAwareLink
                  key={category.id}
                  href={`/categorias/${category.slug}`}
                  className="group relative flex min-h-[7.5rem] flex-col justify-between overflow-hidden rounded-2xl p-4 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md sm:min-h-[8.5rem] sm:p-5"
                  style={{ backgroundColor: tile.bg, color: tile.ink }}
                >
                  <span
                    className="pointer-events-none absolute -right-3 -top-3 h-20 w-20 rounded-full bg-black/10 transition duration-500 group-hover:scale-125"
                    aria-hidden
                  />
                  <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-black/15 backdrop-blur-[2px]">
                    <Icon aria-hidden className="h-5 w-5" strokeWidth={2.25} />
                  </span>
                  <span className="relative mt-3">
                    <span className="block text-base font-semibold leading-tight sm:text-lg">
                      {category.name}
                    </span>
                    <span className="mt-1 inline-flex items-center gap-0.5 text-xs font-semibold opacity-85">
                      Ver cerca
                      <ChevronRight aria-hidden className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                    </span>
                  </span>
                </LoginAwareLink>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* —— Cómo funciona: ritmo / plus entre bloques —— */}
      <section className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 border-y border-border/80 bg-white">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3 sm:gap-8 sm:px-6 sm:py-10">
          {[
            {
              Icon: Search,
              step: '1',
              title: 'Busque el oficio',
              text: 'Toque una categoría o escriba lo que necesita.',
            },
            {
              Icon: MapPin,
              step: '2',
              title: 'Elija cerca de usted',
              text: 'Vea quién está disponible ahora en El Asintal.',
            },
            {
              Icon: MessageCircle,
              step: '3',
              title: 'Escriba y acuerde',
              text: 'Chat directo con el trabajador, sin rodeos.',
            },
          ].map(({ Icon, step, title, text }) => (
            <div key={step} className="flex gap-3 sm:block sm:text-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-white sm:mx-auto">
                <Icon aria-hidden className="h-5 w-5" />
              </div>
              <div className="sm:mt-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
                  Paso {step}
                </p>
                <h3
                  className="mt-0.5 text-base font-semibold text-foreground"
                  style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
                >
                  {title}
                </h3>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* —— Destacados: personas (no stock de oficios) —— */}
      {spotlight.length > 0 ? (
        <section className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 bg-foreground text-white">
          <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-[#7db4ff]">
                  <Star aria-hidden className="h-3.5 w-3.5 fill-current" />
                  {availableCount > 0
                    ? `${availableCount} disponible${availableCount === 1 ? '' : 's'} ahora`
                    : 'Cerca de usted'}
                </p>
                <h2
                  className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl"
                  style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
                >
                  Destacados cerca
                </h2>
                <p className="mt-1 text-sm text-white/65">
                  Deslice para ver quién puede atenderle hoy.
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

          <div className="mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-9 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-4 sm:px-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] sm:pb-11 [&::-webkit-scrollbar]:hidden">
            {spotlight.map((worker) => (
              <LoginAwareLink
                key={worker.id}
                href={`/trabajador/${worker.id}`}
                className="group relative h-[22rem] w-[72vw] max-w-[260px] shrink-0 snap-start overflow-hidden rounded-3xl bg-[#2a3548] sm:h-[24rem] sm:w-[240px]"
              >
                {worker.photoUrl ? (
                  <Image
                    src={worker.photoUrl}
                    alt=""
                    fill
                    sizes="260px"
                    className="object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#2a3548] to-[#1a2332]">
                    <span className="text-5xl font-semibold text-white/25">
                      {(worker.name || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <span
                  className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"
                  aria-hidden
                />
                <span
                  className={
                    worker.availability === 'AVAILABLE'
                      ? 'absolute left-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white'
                      : 'absolute left-3 top-3 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white backdrop-blur-sm'
                  }
                >
                  {AVAILABILITY_LABELS[worker.availability]}
                </span>
                <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-4">
                  <span className="text-lg font-semibold leading-tight text-white">
                    {worker.name}
                  </span>
                  <span className="line-clamp-1 text-sm text-white/80">
                    {worker.mainCategory?.name ?? worker.headline}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/90">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 backdrop-blur-sm">
                      <Star aria-hidden className="h-3 w-3 fill-amber-300 text-amber-300" />
                      {worker.ratingAverage.toFixed(1)}
                    </span>
                    <span className="font-semibold">{formatCardPrice(worker)}</span>
                  </span>
                  <span className="mt-1 inline-flex w-fit items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-white">
                    Ver perfil
                    <ChevronRight aria-hidden className="h-3.5 w-3.5" />
                  </span>
                </span>
              </LoginAwareLink>
            ))}
          </div>
        </section>
      ) : null}

      {/* —— Lista completa —— */}
      <section className="mx-auto mt-10 max-w-6xl space-y-5 px-0 sm:mt-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">
              Todos los perfiles
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
            {(spotlight.length > 0 ? rest : workers).map((worker) => (
              <SearchWorkerCardView key={worker.id} worker={worker} />
            ))}
            {spotlight.length > 0 && rest.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-surface/60 px-4 py-6 text-center text-sm text-muted">
                Esos son todos por ahora.{' '}
                <LoginAwareLink href="/buscar" className="font-semibold text-accent hover:underline">
                  Buscar más oficios
                </LoginAwareLink>
              </p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
