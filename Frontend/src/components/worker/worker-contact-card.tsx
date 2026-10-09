'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardTitle } from '@/components/ui/card';
import { useMe } from '@/lib/auth';
import { formatPhoneDisplay } from '@/lib/phone';
import { workersApi } from '@/lib/workers';

interface ContactInfo {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
}

interface WorkerContactCardProps {
  workerProfileId: string;
  /** Contacto del SSR (vacío si el visitante no tiene sesión). */
  contact: ContactInfo;
}

/**
 * Contacto del perfil público: solo con sesión. Invitados ven un CTA para iniciar sesión.
 */
export function WorkerContactCard({ workerProfileId, contact: initialContact }: WorkerContactCardProps) {
  const pathname = usePathname();
  const me = useMe();
  const loginHref = `/ingresar?next=${encodeURIComponent(pathname)}`;

  const contactQuery = useQuery({
    queryKey: ['workers', 'public', workerProfileId, 'contact'],
    queryFn: () => workersApi.getPublicProfile(workerProfileId),
    enabled: Boolean(me.data),
    staleTime: 30_000,
  });

  const contact = contactQuery.data?.contact ?? initialContact;
  const { phone, whatsapp, email } = contact;
  const hasContact = Boolean(phone || whatsapp || email);

  if (me.isLoading || (me.data && contactQuery.isLoading && !hasContact)) {
    return (
      <Card className="space-y-3">
        <CardTitle>Contacto</CardTitle>
        <p className="text-sm text-muted">Cargando…</p>
      </Card>
    );
  }

  if (!me.data) {
    return (
      <Card className="space-y-3">
        <CardTitle>Contacto</CardTitle>
        <p className="text-sm text-muted">
          Inicie sesión para ver teléfono, WhatsApp o correo de este trabajador.
        </p>
        <Link
          href={loginHref}
          className="inline-flex h-10 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white transition hover:bg-brand-dark"
        >
          Iniciar sesión
        </Link>
      </Card>
    );
  }

  if (!hasContact) {
    return (
      <Card className="space-y-3">
        <CardTitle>Contacto</CardTitle>
        <p className="text-sm text-muted">
          Este trabajador no publicó canales de contacto. Puede escribirle por chat.
        </p>
      </Card>
    );
  }

  return (
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
  );
}
