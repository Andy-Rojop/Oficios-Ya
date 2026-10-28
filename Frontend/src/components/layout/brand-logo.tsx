import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  href?: string;
  /** En header trabajador (fondo navy) usa contraste alto. */
  inverted?: boolean;
  className?: string;
}

/**
 * Wordmark del Figma: «OficiosYa» sobre pastilla naranja.
 */
export function BrandLogo({ href = '/', inverted = false, className }: BrandLogoProps) {
  const mark = (
    <span
      className={cn(
        'inline-flex items-center rounded-lg px-2.5 py-1 text-base font-bold tracking-tight sm:text-lg',
        inverted ? 'bg-white text-foreground' : 'bg-[#f59a2c] text-[#1a2332]',
        className,
      )}
      style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
    >
      OficiosYa
    </span>
  );

  if (!href) return mark;

  return (
    <Link href={href} className="shrink-0" aria-label="OficiosYa">
      {mark}
    </Link>
  );
}
