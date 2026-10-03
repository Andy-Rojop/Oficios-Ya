import Link from 'next/link';
import { HomeSearchForm } from '@/components/search/home-search-form';
import { SearchWorkerCardView } from '@/components/search/search-worker-card';
import { WorkersMapLazy } from '@/components/map/workers-map-lazy';
import type { CatalogCategory, SearchWorkerCard } from '@/lib/search';

interface ClientHomeProps {
  /** Nombre del usuario si ya inició sesión (opcional). */
  userName?: string | null;
  categories: CatalogCategory[];
  workers: SearchWorkerCard[];
}

/**
 * Vista de cliente: buscador + listado de trabajadores registrados
 * (así se ve el directorio cuando ya hay perfiles públicos).
 */
export function ClientHome({ userName, categories, workers }: ClientHomeProps) {
  return (
    <section className="space-y-10">
      <div className="max-w-2xl space-y-5">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand">
          El Asintal, Retalhuleu
        </p>
        <h1
          className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl"
          style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
        >
          {userName ? `Hola, ${userName.split(' ')[0]}` : 'OficiosYa'}
        </h1>
        <p className="max-w-xl text-lg text-muted">
          Encontrá personas de confianza para tu casa o negocio. Mirá precios de referencia, fotos y
          contactalos por chat privado.
        </p>
        <HomeSearchForm />
      </div>

      {categories.length > 0 ? (
        <div className="space-y-3">
          <h2
            className="text-lg font-semibold"
            style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
          >
            Oficios
          </h2>
          <ul className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/categorias/${category.slug}`}
                  className="inline-flex rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-foreground transition hover:border-brand/40 hover:bg-brand-soft"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              Trabajadores disponibles
            </h2>
            <p className="text-sm text-muted">
              Perfiles con teléfono verificado. Las zonas del mapa son aproximadas.
            </p>
          </div>
          <Link
            href="/buscar"
            className="inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold text-foreground transition hover:bg-brand-soft"
          >
            Ver todos
          </Link>
        </div>

        {workers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface px-5 py-10 text-center">
            <p className="font-medium text-foreground">Todavía no hay trabajadores públicos.</p>
            <p className="mt-1 text-sm text-muted">
              Cuando alguien complete su perfil, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workers.map((worker) => (
              <SearchWorkerCardView key={worker.id} worker={worker} />
            ))}
          </div>
        )}

        {workers.length > 0 ? (
          <div className="space-y-2 pt-2">
            <h3 className="text-base font-semibold">Zonas en el mapa</h3>
            <WorkersMapLazy workers={workers} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
