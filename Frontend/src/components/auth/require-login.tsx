'use client';

import { Briefcase, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, type ReactNode } from 'react';
import { FormMessage } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import {
  getErrorMessage,
  isUnauthorized,
  useMe,
  useSwitchMode,
} from '@/lib/auth';

function currentPathWithQuery(pathname: string, search: string): string {
  return search ? `${pathname}?${search}` : pathname;
}

/**
 * Exige sesión iniciada. Si no hay usuario, redirige a /ingresar con `next`.
 * La cookie de auth vive en otro origen, así que la guarda es en el cliente.
 */
export function RequireLogin({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: user, isLoading, error } = useMe();
  const unauthorized = isUnauthorized(error);
  const next = currentPathWithQuery(pathname, searchParams.toString());

  useEffect(() => {
    // Solo redirigir cuando la carga inicial terminó (ignorar refetch de fondo).
    if (!isLoading && (unauthorized || !user)) {
      router.replace(`/ingresar?next=${encodeURIComponent(next)}`);
    }
  }, [unauthorized, user, isLoading, router, next]);

  if (isLoading && !user) {
    return <p className="text-muted">Cargando…</p>;
  }

  if (!user) {
    return <p className="text-muted">Redirigiendo para iniciar sesión…</p>;
  }

  return <>{children}</>;
}

/**
 * La búsqueda de oficios es del modo Cliente.
 * En modo Trabajador pide cambiar de modo (misma cuenta, menús separados).
 */
export function RequireClientMode({ children }: { children: ReactNode }) {
  const { data: user } = useMe();
  const mutation = useSwitchMode({ navigate: false });

  if (!user) return null;

  if (user.activeMode === 'WORKER') {
    return (
      <Card className="mx-auto max-w-lg space-y-4 rounded-3xl shadow-[0_8px_28px_rgba(26,35,50,0.05)]">
        <div className="space-y-1">
          <CardTitle>Búsqueda disponible en modo Cliente</CardTitle>
          <CardDescription>
            Su cuenta une ambos perfiles, pero cada modo tiene su menú. Ahora está como
            Trabajador (ofrece servicios). Para buscar a otras personas, cambie a Cliente.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={mutation.isPending}
            onClick={() => mutation.mutate('CLIENT')}
            className="gap-2"
          >
            <Search aria-hidden className="h-4 w-4" />
            {mutation.isPending ? 'Cambiando…' : 'Cambiar a Cliente'}
          </Button>
          <Link
            href="/panel"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-5 text-sm font-semibold text-foreground transition hover:bg-brand-soft"
          >
            <Briefcase aria-hidden className="h-4 w-4" />
            Ir a mi panel
          </Link>
        </div>
        {mutation.isError ? (
          <FormMessage tone="error">{getErrorMessage(mutation.error)}</FormMessage>
        ) : null}
      </Card>
    );
  }

  return <>{children}</>;
}

/** Búsqueda y categorías: sesión + modo Cliente. */
export function ProtectedDiscovery({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <RequireLogin>
        <RequireClientMode>{children}</RequireClientMode>
      </RequireLogin>
    </Suspense>
  );
}

/** Perfiles y rutas que solo exigen haber iniciado sesión. */
export function ProtectedLogin({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <RequireLogin>{children}</RequireLogin>
    </Suspense>
  );
}
