import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  href?: string;
  /** En la barra de trabajador (fondo navy) se usa el logo blanco. */
  inverted?: boolean;
  className?: string;
}

/**
 * Logo oficial. Ambas variantes en el DOM con opacity para evitar flash
 * al cambiar de modo en Safari (decode de otra imagen).
 */
export function BrandLogo({ href = '/', inverted = false, className }: BrandLogoProps) {
  const mark = (
    <span className={cn('relative inline-flex h-8 w-[7.5rem] items-center sm:h-10 sm:w-[9.5rem]', className)}>
      <Image
        src="/logo-oficiosya.png"
        alt="OficiosYA"
        width={1400}
        height={343}
        priority
        className={cn(
          'absolute inset-0 h-full w-auto object-contain object-left transition-opacity duration-150',
          inverted ? 'opacity-0' : 'opacity-100',
        )}
      />
      <Image
        src="/logo-oficiosya-blanco.png"
        alt=""
        width={1400}
        height={345}
        priority
        aria-hidden
        className={cn(
          'absolute inset-0 h-full w-auto object-contain object-left transition-opacity duration-150',
          inverted ? 'opacity-100' : 'opacity-0',
        )}
      />
    </span>
  );

  if (!href) return mark;

  return (
    <Link href={href} className="inline-flex shrink-0 items-center" aria-label="OficiosYA">
      {mark}
    </Link>
  );
}
