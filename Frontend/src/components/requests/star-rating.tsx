import { cn } from '@/lib/utils';

/** Estrellas de solo lectura (accesibles con texto alternativo). */
export function StarsDisplay({ rating, className }: { rating: number; className?: string }) {
  return (
    <span
      className={cn('inline-flex text-amber-500', className)}
      role="img"
      aria-label={`${rating} de 5 estrellas`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} aria-hidden className={n <= Math.round(rating) ? '' : 'text-border'}>
          ★
        </span>
      ))}
    </span>
  );
}

/** Selector de calificación de 1 a 5 con botones grandes (usable en móvil). */
export function StarPicker({
  value,
  onChange,
  labelledBy,
}: {
  value: number;
  onChange: (value: number) => void;
  labelledBy?: string;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
          onClick={() => onChange(n)}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-lg text-3xl leading-none transition-colors hover:bg-brand-soft',
            n <= value ? 'text-amber-500' : 'text-border',
          )}
        >
          ★
        </button>
      ))}
    </div>
  );
}
