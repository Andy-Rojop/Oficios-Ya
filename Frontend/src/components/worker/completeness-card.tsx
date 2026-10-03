'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { WORKER_QUERY_KEYS, workersApi, type Completeness } from '@/lib/workers';

export function CompletenessCard() {
  const { data } = useQuery<Completeness, Error>({
    queryKey: WORKER_QUERY_KEYS.completeness,
    queryFn: workersApi.getCompleteness,
  });

  if (!data) {
    return null;
  }

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <CardTitle>Tu perfil está al {data.percentage}%</CardTitle>
        <CardDescription>
          {data.complete
            ? '¡Perfil completo! Los clientes confían más en perfiles completos.'
            : 'Completa estos pasos para que más clientes te encuentren.'}
        </CardDescription>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={data.percentage}
        aria-label="Completitud del perfil"
        className="h-2.5 w-full overflow-hidden rounded-full bg-brand-soft"
      >
        <div
          className="h-full rounded-full bg-brand transition-all"
          style={{ width: `${data.percentage}%` }}
        />
      </div>
      <ul className="space-y-1.5 text-sm">
        {data.items.map((item) => (
          <li key={item.key} className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className={item.done ? 'font-bold text-brand' : 'font-bold text-muted'}
            >
              {item.done ? '✓' : '○'}
            </span>
            <span className={item.done ? 'text-muted line-through' : 'text-foreground'}>
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
