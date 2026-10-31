import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  href?: string;
  /** En la barra de trabajador (fondo navy) se usa el logo blanco. */
  inverted?: boolean;
  className?: string;
}

/** Logo oficial: isotipo, wordmark y lema. */
export function BrandLogo({ href = '/', inverted = false, className }: BrandLogoProps) {
  const mark = (
    <Image
      src={inverted ? '/logo-oficiosya-blanco.png' : '/logo-oficiosya.png'}
      alt="OficiosYA"
      width={1400}
      height={inverted ? 345 : 343}
      priority
      className={cn('h-8 w-auto sm:h-10', className)}
    />
  );

  if (!href) return mark;

  return (
    <Link href={href} className="inline-flex shrink-0 items-center">
      {mark}
    </Link>
  );
}
