'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FormMessage } from '@/components/forms/form-field';
import { getErrorMessage, isUnauthorized, useMe } from '@/lib/auth';
import { WORKER_QUERY_KEYS, workersApi, type OwnWorkerProfile } from '@/lib/workers';
import { CompletenessCard } from './completeness-card';
import { AvailabilityCard, IdentityCard, ProfileCard } from './profile-card';
import { ZonesCard } from './zones-card';

/** Edición del perfil de trabajador (ruta /panel/perfil). */
export function PanelProfileEditor() {
  const router = useRouter();
  const { data: user, isLoading, isFetching, error } = useMe();
  const unauthorized = isUnauthorized(error);

  useEffect(() => {
    if (!isLoading && !isFetching && unauthorized) {
      router.replace('/ingresar?mode=WORKER&next=/panel/perfil');
    }
  }, [unauthorized, isLoading, isFetching, router]);

  const profileQuery = useQuery<OwnWorkerProfile, Error>({
    queryKey: WORKER_QUERY_KEYS.profile,
    queryFn: workersApi.getProfile,
    enabled: Boolean(user) && user?.activeMode === 'WORKER',
    refetchOnMount: 'always',
  });

  if (isLoading || (isFetching && !user)) {
    return <p className="text-muted">Cargando su perfil…</p>;
  }

  if (!user) {
    return unauthorized ? (
      <p className="text-muted">Redirigiendo…</p>
    ) : (
      <FormMessage tone="error">
        {error ? getErrorMessage(error) : 'No se pudo cargar su cuenta.'}
      </FormMessage>
    );
  }

  if (user.activeMode !== 'WORKER') {
    return (
      <FormMessage tone="error">
        Cambie a modo trabajador para editar su perfil público.{' '}
        <Link href="/cuenta" className="font-semibold underline">
          Ir a Cuenta
        </Link>
      </FormMessage>
    );
  }

  if (profileQuery.isLoading) {
    return <p className="text-muted">Cargando su perfil…</p>;
  }

  if (!profileQuery.data) {
    return (
      <FormMessage tone="error">
        {profileQuery.error
          ? getErrorMessage(profileQuery.error)
          : 'No se pudo cargar su perfil de trabajador.'}
      </FormMessage>
    );
  }

  const profile = profileQuery.data;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <p className="text-sm text-muted">
          <Link href="/panel" className="font-medium text-brand underline-offset-2 hover:underline">
            ← Volver al panel
          </Link>
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
          style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
        >
          Editar perfil
        </h1>
        <p className="text-sm text-muted">
          Actualice cómo lo ven los clientes en su perfil público.
        </p>
      </header>

      <CompletenessCard />
      <AvailabilityCard profile={profile} />
      <IdentityCard key={`identity-${profile.id}`} profile={profile} />
      <ProfileCard key={profile.id} profile={profile} />
      <ZonesCard key={`zones-${profile.id}`} profile={profile} />
    </div>
  );
}
