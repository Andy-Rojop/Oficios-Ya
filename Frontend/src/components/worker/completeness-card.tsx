'use client';

import { useQuery } from '@tanstack/react-query';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WORKER_QUERY_KEYS, workersApi, type Completeness } from '@/lib/workers';

export function CompletenessCard() {
  const { data } = useQuery<Completeness, Error>({
    queryKey: WORKER_QUERY_KEYS.completeness,
    queryFn: workersApi.getCompleteness,
  });

  if (!data) {
    return null;
  }

  const doneCount = data.items.filter((item) => item.done).length;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-surface p-5 shadow-[0_8px_28px_rgba(26,35,50,0.06)] sm:p-6">
      <div
        className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-accent/15 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-14 -left-10 h-36 w-36 rounded-full bg-ring/10 blur-2xl"
        aria-hidden
      />

      <div className="relative space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
              Completitud del perfil
            </p>
            <h2
              className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              {data.complete ? 'Perfil listo al 100%' : `Tu perfil está al ${data.percentage}%`}
            </h2>
            <p className="text-sm text-muted">
              {data.complete
                ? 'Los clientes confían más en perfiles completos. Ya estás visible con todo.'
                : 'Completá estos pasos para que más clientes te encuentren.'}
            </p>
          </div>
          <div
            className={cn(
              'rounded-2xl px-4 py-3 text-center',
              data.complete ? 'bg-accent-soft' : 'bg-brand-soft',
            )}
          >
            <p
              className={cn(
                'text-3xl font-semibold tabular-nums',
                data.complete ? 'text-accent-dark' : 'text-brand',
              )}
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              {data.percentage}%
            </p>
            <p className="text-xs font-medium text-muted">
              {doneCount}/{data.items.length} listos
            </p>
          </div>
        </div>

        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={data.percentage}
          aria-label="Completitud del perfil"
          className="h-3 w-full overflow-hidden rounded-full bg-brand-soft"
        >
          <div
            className={cn(
              'h-full rounded-full transition-all',
              data.complete ? 'bg-accent' : 'bg-brand',
            )}
            style={{ width: `${data.percentage}%` }}
          />
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {data.items.map((item) => (
            <li
              key={item.key}
              className={cn(
                'flex items-start gap-2.5 rounded-2xl border px-3 py-2.5 text-sm',
                item.done
                  ? 'border-accent/25 bg-accent-soft/70'
                  : 'border-border bg-brand-soft/60',
              )}
            >
              {item.done ? (
                <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-dark" />
              ) : (
                <Circle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
              )}
              <span className={item.done ? 'text-muted line-through' : 'font-medium text-foreground'}>
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
