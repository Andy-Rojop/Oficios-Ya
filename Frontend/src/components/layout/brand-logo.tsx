import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  href?: string;
  /** En header trabajador (fondo navy) usa contraste alto. */
  inverted?: boolean;
  className?: string;
}

/**
 * Wordmark Figma inicio: «oficios» + «YA!» naranja.
 */
export function BrandLogo({ href = '/', inverted = false, className }: BrandLogoProps) {
  const mark = (
    <span
      className={cn(
        'inline-flex items-baseline text-base font-bold tracking-tight sm:text-lg',
        inverted ? 'text-white' : 'text-foreground',
        className,
      )}
      style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
    >
      oficios
      <span className={inverted ? 'text-[#ff8a4c]' : 'text-accent'}>YA!</span>
    </span>
  );

  if (!href) return mark;

  return (
    <Link href={href} className="shrink-0" aria-label="OficiosYA">
      {mark}
    </Link>
  );
}
