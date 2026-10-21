import Link from 'next/link';
import {
  Drill,
  Flower2,
  Hammer,
  Paintbrush,
  Plug,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { CatalogCategory } from '@/lib/search';

interface CollageTile {
  slug: string;
  name: string;
  href: string;
  image: string;
  Icon: LucideIcon;
  span?: 'wide' | 'tall' | 'normal';
}

const TILE_BY_SLUG: Record<
  string,
  { image: string; Icon: LucideIcon; span: CollageTile['span'] }
> = {
  carpinteria: {
    image:
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=70',
    Icon: Drill,
    span: 'wide',
  },
  electricidad: {
    image:
      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=70',
    Icon: Plug,
    span: 'normal',
  },
  plomeria: {
    image:
      'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=800&q=70',
    Icon: Wrench,
    span: 'tall',
  },
  pintura: {
    image:
      'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=800&q=70',
    Icon: Paintbrush,
    span: 'normal',
  },
  albanileria: {
    image:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=70',
    Icon: Hammer,
    span: 'normal',
  },
  jardineria: {
    image:
      'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=800&q=70',
    Icon: Flower2,
    span: 'normal',
  },
  herreria: {
    image:
      'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=800&q=70',
    Icon: Wrench,
    span: 'normal',
  },
  mecanica: {
    image:
      'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=800&q=70',
    Icon: Wrench,
    span: 'normal',
  },
};

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?auto=format&fit=crop&w=800&q=70',
];

function buildTiles(categories: CatalogCategory[]): CollageTile[] {
  const preferred = ['carpinteria', 'electricidad', 'plomeria', 'pintura', 'albanileria', 'jardineria'];
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  const picked: CatalogCategory[] = [];

  for (const slug of preferred) {
    const found = bySlug.get(slug);
    if (found) picked.push(found);
  }
  for (const category of categories) {
    if (picked.length >= 6) break;
    if (!picked.some((item) => item.id === category.id)) picked.push(category);
  }

  return picked.slice(0, 6).map((category, index) => {
    const visual = TILE_BY_SLUG[category.slug];
    return {
      slug: category.slug,
      name: category.name,
      href: `/categorias/${category.slug}`,
      image: visual?.image ?? FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]!,
      Icon: visual?.Icon ?? Hammer,
      span: visual?.span ?? (index === 0 ? 'wide' : 'normal'),
    };
  });
}

function tileClass(span: CollageTile['span']): string {
  if (span === 'wide') return 'sm:col-span-2 sm:row-span-1';
  if (span === 'tall') return 'sm:col-span-1 sm:row-span-2';
  return 'sm:col-span-1 sm:row-span-1';
}

/** Collage visual de oficios comunes para el hero de inicio (no un mapa). */
export function HomeCollage({ categories }: { categories: CatalogCategory[] }) {
  const tiles = buildTiles(categories);

  return (
    <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 gap-1 sm:grid-cols-4 sm:grid-rows-2 sm:gap-1.5">
      {tiles.map((tile) => {
        const Icon = tile.Icon;
        return (
          <Link
            key={tile.slug}
            href={tile.href}
            className={`group relative min-h-[140px] overflow-hidden bg-foreground ${tileClass(tile.span)}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={tile.image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
            <span
              className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/10"
              aria-hidden
            />
            <span className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-white">
              <span className="flex size-8 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                <Icon aria-hidden className="size-4" />
              </span>
              <span className="text-sm font-semibold drop-shadow-sm sm:text-base">{tile.name}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
