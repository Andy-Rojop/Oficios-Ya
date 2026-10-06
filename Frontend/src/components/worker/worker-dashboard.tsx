'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Inbox, MessageSquare, Wrench } from 'lucide-react';
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
  const { data: user } = useMe();
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
  const firstName = user?.name?.split(' ')[0] ?? 'Trabajador';

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-brand px-5 py-7 text-white sm:px-7 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_20%,rgba(30,58,95,0.45),transparent_42%),radial-gradient(ellipse_at_90%_0%,rgba(255,255,255,0.08),transparent_40%)]"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white">
              Panel de trabajador
            </p>
            <h1
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              Hola, {firstName}
            </h1>
            <p className="text-sm text-white/75 sm:text-base">
              Administrá tu oficio, disponibilidad y cómo te ven los clientes en El Asintal.
            </p>
          </div>
          <Link
            href={`/trabajador/${profile.id}`}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-brand transition hover:bg-white/90"
          >
            Ver perfil público
            <ExternalLink aria-hidden className="h-4 w-4" />
          </Link>
        </div>

        <ul className="relative mt-6 grid gap-2 sm:grid-cols-3">
          <QuickLink
            href="/solicitudes"
            label="Solicitudes"
            hint="Pedidos de clientes"
            Icon={Inbox}
          />
          <QuickLink
            href="/mensajes"
            label="Mensajes"
            hint="Chat con clientes"
            Icon={MessageSquare}
          />
          <QuickLink
            href={`/trabajador/${profile.id}`}
            label="Tu vitrina"
            hint="Así te ven afuera"
            Icon={Wrench}
          />
        </ul>
      </section>

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

function QuickLink({
  href,
  label,
  hint,
  Icon,
}: {
  href: string;
  label: string;
  hint: string;
  Icon: typeof Inbox;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-3 transition hover:bg-white/15"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
          <Icon aria-hidden className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold">{label}</span>
          <span className="block text-xs text-white/65">{hint}</span>
        </span>
      </Link>
    </li>
  );
}
