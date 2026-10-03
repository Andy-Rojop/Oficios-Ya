'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FormMessage } from '@/components/forms/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { ME_QUERY_KEY, getErrorMessage, isUnauthorized, switchMode, useMe } from '@/lib/auth';
import { WORKER_QUERY_KEYS, workersApi, type OwnWorkerProfile } from '@/lib/workers';
import { CompletenessCard } from './completeness-card';
import { PortfolioCard } from './portfolio-card';
import { AvailabilityCard, IdentityCard, ProfileCard } from './profile-card';
import { ServicesCard } from './services-card';
import { ZonesCard } from './zones-card';

/** Panel del trabajador (modo WORKER): perfil, zonas, servicios y portafolio. */
export function WorkerDashboard() {
  const router = useRouter();
  const { data: user, isLoading, error } = useMe();
  const unauthorized = isUnauthorized(error);

  useEffect(() => {
    if (unauthorized) {
      router.replace('/ingresar?next=/panel');
    }
  }, [unauthorized, router]);

  if (isLoading) {
    return <p className="text-muted">Cargando tu panel…</p>;
  }
  if (!user) {
    return unauthorized ? (
      <p className="text-muted">Redirigiendo…</p>
    ) : (
      <FormMessage tone="error">
        {error ? getErrorMessage(error) : 'No se pudo cargar tu panel.'}
      </FormMessage>
    );
  }

  if (user.activeMode !== 'WORKER') {
    return <ClientModeNotice />;
  }
  return <WorkerPanel />;
}

function ClientModeNotice() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => switchMode('WORKER'),
    onSuccess: (updated) => queryClient.setQueryData(ME_QUERY_KEY, updated),
  });

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <CardTitle>Estás en modo cliente</CardTitle>
        <CardDescription>
          Cambia a modo trabajador para publicar tu perfil, tus servicios y tu portafolio.
        </CardDescription>
      </div>
      {mutation.isError ? (
        <FormMessage tone="error">{getErrorMessage(mutation.error)}</FormMessage>
      ) : null}
      <Button disabled={mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? 'Cambiando…' : 'Cambiar a modo trabajador'}
      </Button>
    </Card>
  );
}

function WorkerPanel() {
  const profileQuery = useQuery<OwnWorkerProfile, Error>({
    queryKey: WORKER_QUERY_KEYS.profile,
    queryFn: workersApi.getProfile,
  });

  if (profileQuery.isLoading) {
    return <p className="text-muted">Cargando tu perfil…</p>;
  }
  if (!profileQuery.data) {
    return (
      <FormMessage tone="error">
        {profileQuery.error ? getErrorMessage(profileQuery.error) : 'No se pudo cargar tu perfil.'}
      </FormMessage>
    );
  }

  const profile = profileQuery.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1
          className="text-3xl font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
        >
          Mi panel
        </h1>
        <Link
          href={`/trabajador/${profile.id}`}
          className="inline-flex h-9 items-center rounded-lg border border-border bg-surface px-3 text-sm font-semibold hover:bg-brand-soft"
        >
          Ver mi perfil público
        </Link>
      </div>

      <CompletenessCard />
      <AvailabilityCard profile={profile} />
      <IdentityCard key={`identity-${profile.id}`} profile={profile} />
      {/* key: reinicia el formulario si el perfil se recarga con otro id (p. ej. tras cambiar de cuenta). */}
      <ProfileCard key={profile.id} profile={profile} />
      <ZonesCard key={`zones-${profile.id}`} profile={profile} />
      <ServicesCard profile={profile} />
      <PortfolioCard />
    </div>
  );
}
