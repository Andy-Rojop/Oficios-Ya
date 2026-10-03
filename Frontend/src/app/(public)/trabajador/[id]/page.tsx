import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ContactButton } from '@/components/chat/contact-button';
import { RequestServiceButton } from '@/components/requests/request-service-button';
import { Card, CardTitle } from '@/components/ui/card';
import { WorkerReviews } from '@/components/worker/worker-reviews';
import { ApiError } from '@/lib/api-client';
import { formatPhoneDisplay } from '@/lib/phone';
import {
  AVAILABILITY_LABELS,
  DAY_KEYS,
  DAY_LABELS,
  formatServicePrice,
  workersApi,
  type PublicWorkerProfile,
} from '@/lib/workers';

interface PageProps {
  params: Promise<{ id: string }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function loadProfile(id: string): Promise<PublicWorkerProfile> {
  if (!UUID_REGEX.test(id)) {
    notFound();
  }
  try {
    return await workersApi.getPublicProfile(id);
  } catch (error) {
    if (error instanceof ApiError && (error.statusCode === 404 || error.statusCode === 400)) {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const profile = await loadProfile(id);
    return {
      title: `${profile.name} · ${profile.headline}`,
      description: profile.description.slice(0, 160),
    };
  } catch {
    return { title: 'Trabajador' };
  }
}

const AVAILABILITY_STYLES = {
  AVAILABLE: 'bg-brand-soft text-brand-dark',
  BUSY: 'bg-amber-100 text-amber-900',
  UNAVAILABLE: 'bg-border text-muted',
} as const;

export default async function TrabajadorPage({ params }: PageProps) {
  const { id } = await params;
  const profile = await loadProfile(id);

  const hasSchedule = profile.schedule !== null;
  const { phone, whatsapp, email } = profile.contact;
  const hasContact = Boolean(phone || whatsapp || email);

  return (
    <article className="mx-auto w-full max-w-3xl space-y-5">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h1
              className="break-words text-3xl font-semibold tracking-tight"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              {profile.name}
            </h1>
            <p className="text-lg text-brand-dark">{profile.headline}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${AVAILABILITY_STYLES[profile.availability]}`}
          >
            {AVAILABILITY_LABELS[profile.availability]}
          </span>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          {profile.mainCategory ? (
            <Fact label="Categoría" value={profile.mainCategory.name} />
          ) : null}
          {profile.experienceYears !== null ? (
            <Fact
              label="Experiencia"
              value={`${profile.experienceYears} ${profile.experienceYears === 1 ? 'año' : 'años'}`}
            />
          ) : null}
          <Fact
            label="Calificación"
            value={
              profile.ratingCount > 0
                ? `${profile.ratingAverage.toFixed(1)} (${profile.ratingCount})`
                : 'Aún sin reseñas'
            }
          />
          <Fact label="Trabajos completados" value={String(profile.completedJobs)} />
          {profile.identityVerified ? <Fact label="Identidad" value="Verificada" /> : null}
        </dl>

        <p className="whitespace-pre-line">{profile.description}</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <ContactButton workerProfileId={profile.id} />
          <RequestServiceButton workerProfileId={profile.id} workerName={profile.name} />
        </div>
      </Card>

      {profile.zones.length > 0 ? (
        <Card className="space-y-3">
          <CardTitle>Zonas donde trabaja</CardTitle>
          <ul className="flex flex-wrap gap-2">
            {profile.zones.map((zone) => (
              <li
                key={zone.id}
                className="rounded-full bg-brand-soft px-3 py-1 text-sm text-brand-dark"
              >
                {zone.name}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <CardTitle>Servicios</CardTitle>
        {profile.services.length === 0 ? (
          <p className="text-sm text-muted">Este trabajador aún no publica servicios.</p>
        ) : (
          <ul className="space-y-4">
            {profile.services.map((service) => (
              <li key={service.id} className="space-y-3 rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold">{service.name}</h3>
                    <p className="text-sm text-muted">{service.categoryName}</p>
                  </div>
                  <p className="font-semibold text-brand-dark">{formatServicePrice(service)}</p>
                </div>
                <p className="whitespace-pre-line text-sm">{service.description}</p>
                {service.photos.length > 0 ? (
                  <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {service.photos.map((url, index) => (
                      <li
                        key={url}
                        className="relative aspect-square overflow-hidden rounded-lg border border-border"
                      >
                        <Image
                          src={url}
                          alt={`Foto ${index + 1} de ${service.name}`}
                          fill
                          sizes="(min-width: 640px) 20vw, 33vw"
                          className="object-cover"
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {profile.portfolio.length > 0 ? (
        <Card className="space-y-4">
          <CardTitle>Portafolio</CardTitle>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {profile.portfolio.map((item) => (
              <li key={item.id} className="space-y-1.5">
                <div className="relative aspect-square overflow-hidden rounded-xl border border-border">
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    sizes="(min-width: 640px) 33vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <p className="text-sm font-semibold">{item.title}</p>
                {item.description ? <p className="text-xs text-muted">{item.description}</p> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {hasSchedule ? (
        <Card className="space-y-3">
          <CardTitle>Horario de atención</CardTitle>
          <dl className="grid gap-1.5 text-sm">
            {DAY_KEYS.map((day) => {
              const value = profile.schedule?.[day];
              if (!value) return null;
              return (
                <div
                  key={day}
                  className="flex justify-between gap-4 border-b border-border/60 pb-1.5 last:border-0"
                >
                  <dt className="font-medium">{DAY_LABELS[day]}</dt>
                  <dd className="text-muted">
                    {value.closed || !value.from || !value.to
                      ? 'Cerrado'
                      : `${value.from} a ${value.to}`}
                  </dd>
                </div>
              );
            })}
          </dl>
        </Card>
      ) : null}

      <WorkerReviews workerProfileId={profile.id} />

      {hasContact ? (
        <Card className="space-y-3">
          <CardTitle>Contacto</CardTitle>
          <ul className="space-y-2 text-sm">
            {phone ? (
              <li>
                Teléfono:{' '}
                <a className="font-semibold text-brand underline" href={`tel:${phone}`}>
                  {formatPhoneDisplay(phone)}
                </a>
              </li>
            ) : null}
            {whatsapp ? (
              <li>
                WhatsApp:{' '}
                <a
                  className="font-semibold text-brand underline"
                  href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {formatPhoneDisplay(whatsapp)}
                </a>
              </li>
            ) : null}
            {email ? (
              <li>
                Correo:{' '}
                <a className="font-semibold text-brand underline" href={`mailto:${email}`}>
                  {email}
                </a>
              </li>
            ) : null}
          </ul>
        </Card>
      ) : null}

      <p className="text-center text-sm text-muted">
        <Link href="/buscar" className="underline">
          Volver a buscar trabajadores
        </Link>
      </p>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
