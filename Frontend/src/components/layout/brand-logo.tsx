import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  href?: string;
  /** En header trabajador (fondo navy) el logo va sobre una pastilla clara. */
  inverted?: boolean;
  className?: string;
}

/** Logo oficial: isotipo, wordmark y lema. */
export function BrandLogo({ href = '/', inverted = false, className }: BrandLogoProps) {
  const mark = (
    <Image
      src="/logo-oficiosya.png"
      alt="OficiosYA"
      width={1400}
      height={343}
      priority
      className={cn(
        'h-8 w-auto sm:h-10',
        inverted && 'rounded-md bg-white px-1.5 py-0.5',
        className,
      )}
    />
  );

  if (!href) return mark;

  return (
    <Link href={href} className="inline-flex shrink-0 items-center">
      {mark}
    </Link>
  );
}
