import Image from 'next/image';
import { ChevronRight, MapPin, Star, type LucideIcon } from 'lucide-react';
import { LoginAwareLink } from '@/components/auth/login-aware-link';
import { HomeCollage, OFICIO_VISUALS } from '@/components/client/home-collage';
import { HomeSearchForm } from '@/components/search/home-search-form';
import { formatCardPrice, type CatalogCategory, type SearchWorkerCard } from '@/lib/search';
import { AVAILABILITY_LABELS } from '@/lib/workers';

interface ClientHomeProps {
  userName?: string | null;
  categories: CatalogCategory[];
  workers: SearchWorkerCard[];
}

const CATEGORY_ORDER = [
  'carpinteria',
  'electricidad',
  'plomeria',
  'albanileria',
  'jardineria',
  'pintura',
];

/**
 * Inicio cliente según Figma: hero navy + búsqueda naranja, categorías y perfiles.
 */
export function ClientHome({ userName, categories, workers }: ClientHomeProps) {
  const greeting = userName ? `Hola, ${userName.split(' ')[0]}` : null;
  const spotlight = [
    ...workers.filter((w) => w.availability === 'AVAILABLE'),
    ...workers.filter((w) => w.availability !== 'AVAILABLE'),
  ].slice(0, 6);

  const categoryTiles = pickCategories(categories);

  return (
    <div className="pb-12">
      <section className="relative left-1/2 z-20 w-screen max-w-[100vw] -translate-x-1/2 -mt-6">
        <div className="relative min-h-[min(58vh,520px)] overflow-hidden bg-[#1a2332] sm:min-h-[min(62vh,560px)]">
          <HomeCollage categories={categories} />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#121820]/92 via-[#1a2332]/70 to-[#1a2332]/25"
            aria-hidden
          />

          <div className="relative z-10 mx-auto flex min-h-[min(58vh,520px)] w-full max-w-6xl flex-col justify-end px-4 pb-9 pt-16 sm:min-h-[min(62vh,560px)] sm:px-6 sm:pb-12 sm:pt-20">
            <div className="max-w-xl">
              <p className="animate-[home-fade-up_0.7s_ease-out_both] text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
                El Asintal, Retalhuleu
              </p>
              <h1
                className="mt-2 animate-[home-fade-up_0.7s_ease-out_0.08s_both] text-3xl font-semibold leading-tight tracking-tight text-white sm:text-5xl"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Oficios de confianza cerca de usted
              </h1>
              {greeting ? (
                <p className="mt-2 animate-[home-fade-up_0.7s_ease-out_0.12s_both] text-sm font-medium text-white/90">
                  {greeting}
                </p>
              ) : null}
              <p className="mt-2 max-w-md animate-[home-fade-up_0.7s_ease-out_0.16s_both] text-sm text-white/80 sm:text-base">
                Encuentre carpinteros, electricistas, plomeros y más cerca de su zona.
              </p>

              <div className="relative z-30 mt-5 w-full max-w-lg animate-[home-fade-up_0.7s_ease-out_0.24s_both]">
                <HomeSearchForm variant="hero" categories={categories} workers={workers} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {categoryTiles.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-12">
          <h2
            className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            ¿Qué necesita resolver?
          </h2>
          <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categoryTiles.map(({ category, Icon }) => (
              <li key={category.id}>
                <LoginAwareLink
                  href={`/categorias/${category.slug}`}
                  className="group flex h-full flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-5 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent transition group-hover:bg-accent group-hover:text-white">
                    <Icon aria-hidden className="h-6 w-6" strokeWidth={2} />
                  </span>
                  <span className="text-sm font-semibold leading-snug text-foreground">
                    {category.name}
                  </span>
                </LoginAwareLink>
              </li>
            ))}
            <li className="col-span-2 sm:col-span-1 lg:col-span-1">
              <LoginAwareLink
                href="/buscar"
                className="flex h-full min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-accent/40 bg-accent-soft/50 px-3 py-5 text-center transition hover:border-accent hover:bg-accent-soft"
              >
                <span className="text-sm font-semibold text-accent-dark">Ver todos</span>
                <ChevronRight aria-hidden className="h-4 w-4 text-accent" />
              </LoginAwareLink>
            </li>
          </ul>
        </section>
      ) : null}

      {spotlight.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6 sm:pt-14">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2
                className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
                style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
              >
                Perfiles destacados
              </h2>
              <p className="mt-1 text-sm text-muted">Trabajadores cerca, listos para atenderle.</p>
            </div>
            <LoginAwareLink
              href="/buscar"
              className="hidden items-center gap-1 text-sm font-semibold text-accent hover:text-accent-dark sm:inline-flex"
            >
              Ver mapa
              <ChevronRight aria-hidden className="h-4 w-4" />
            </LoginAwareLink>
          </div>

          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spotlight.map((worker, index) => (
              <li key={worker.id}>
                <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-accent/35 hover:shadow-md">
                  <LoginAwareLink
                    href={`/trabajador/${worker.id}`}
                    className="relative block aspect-[4/3] overflow-hidden bg-brand-soft"
                  >
                    {worker.photoUrl ? (
                      <Image
                        src={worker.photoUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        priority={index === 0}
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center bg-gradient-to-br from-accent-soft via-[#fff7f2] to-brand-soft text-6xl font-semibold text-accent/35">
                        {(worker.name || '?').charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="absolute left-3 top-3">
                      {worker.availability === 'AVAILABLE' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-emerald-700 shadow-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Disponible
                        </span>
                      ) : (
                        <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-foreground shadow-sm">
                          {AVAILABILITY_LABELS[worker.availability]}
                        </span>
                      )}
                    </span>
                  </LoginAwareLink>

                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <LoginAwareLink href={`/trabajador/${worker.id}`} className="min-w-0 space-y-1">
                      <h3
                        className="line-clamp-2 text-base font-semibold leading-snug text-foreground"
                        style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
                      >
                        {worker.name}
                      </h3>
                      <p className="line-clamp-1 text-sm text-muted">
                        {worker.headline || worker.mainCategory?.name}
                      </p>
                      <p className="inline-flex items-center gap-1 text-xs text-muted">
                        <MapPin aria-hidden className="h-3.5 w-3.5 shrink-0" />
                        El Asintal, Retalhuleu
                        {worker.distanceKm != null ? ` · ~${worker.distanceKm.toFixed(1)} km` : ''}
                      </p>
                    </LoginAwareLink>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                        <Star aria-hidden className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                        {worker.ratingAverage.toFixed(1)}
                        {worker.ratingCount > 0 ? (
                          <span className="font-normal text-muted">({worker.ratingCount})</span>
                        ) : null}
                      </span>
                      <span className="font-semibold text-foreground">{formatCardPrice(worker)}</span>
                    </div>

                    <div className="mt-auto flex gap-2 pt-2">
                      <LoginAwareLink
                        href={`/trabajador/${worker.id}`}
                        className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-border bg-surface text-sm font-semibold text-foreground transition hover:bg-brand-soft"
                      >
                        Ver perfil
                      </LoginAwareLink>
                      <LoginAwareLink
                        href={`/trabajador/${worker.id}`}
                        className="inline-flex h-10 flex-1 items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white transition hover:bg-accent-dark"
                      >
                        Solicitar
                      </LoginAwareLink>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex justify-center">
            <LoginAwareLink
              href="/buscar"
              className="inline-flex h-12 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-white shadow-md shadow-accent/25 transition hover:-translate-y-0.5 hover:bg-accent-dark"
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

function pickCategories(
  categories: CatalogCategory[],
): Array<{ category: CatalogCategory; Icon: LucideIcon }> {
  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const picked: CatalogCategory[] = [];
  for (const slug of CATEGORY_ORDER) {
    const found = bySlug.get(slug);
    if (found) picked.push(found);
  }
  for (const category of categories) {
    if (picked.length >= 5) break;
    if (!picked.some((item) => item.id === category.id)) picked.push(category);
  }
  return picked.slice(0, 5).map((category) => ({
    category,
    Icon: OFICIO_VISUALS[category.slug]?.Icon ?? OFICIO_VISUALS.carpinteria!.Icon,
  }));
}
