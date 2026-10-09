import Link from 'next/link';
import { ContactButton } from '@/components/chat/contact-button';
import { RequestServiceButton } from '@/components/requests/request-service-button';

interface OwnProfileActionsProps {
  workerProfileId: string;
  workerName: string;
  isOwner: boolean;
}

/**
 * En el perfil público: el dueño ve un aviso + «Editar perfil»;
 * el visitante ve Contactar / Solicitar servicio.
 */
export function OwnProfileActions({
  workerProfileId,
  workerName,
  isOwner,
}: OwnProfileActionsProps) {
  if (isOwner) {
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-accent-soft/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground">Así ven su perfil los clientes.</p>
        <Link
          href="/panel/perfil"
          className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark sm:w-auto"
        >
          Editar perfil
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <ContactButton workerProfileId={workerProfileId} />
      <RequestServiceButton workerProfileId={workerProfileId} workerName={workerName} />
    </div>
  );
}
