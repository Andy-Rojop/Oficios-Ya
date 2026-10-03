'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { getErrorMessage, isUnauthorized, useMe } from '@/lib/auth';
import { chatApi } from '@/lib/chat';

/** «Contactar» en el perfil público: crea (o reabre) la conversación y lleva al hilo. */
export function ContactButton({ workerProfileId }: { workerProfileId: string }) {
  const router = useRouter();
  const me = useMe();

  const contact = useMutation({
    mutationFn: () => chatApi.createConversation(workerProfileId),
    onSuccess: (conversation) => router.push(`/mensajes/${conversation.id}`),
    onError: (error) => {
      if (isUnauthorized(error)) goToLogin();
    },
  });

  function goToLogin() {
    router.push(`/ingresar?next=${encodeURIComponent(`/trabajador/${workerProfileId}`)}`);
  }

  function onClick() {
    // Sin sesión se pide ingresar y se vuelve a este perfil.
    if (!me.isLoading && !me.data) {
      goToLogin();
      return;
    }
    contact.mutate();
  }

  return (
    <div className="space-y-1.5">
      <Button
        className="w-full sm:w-auto"
        size="lg"
        onClick={onClick}
        disabled={contact.isPending || me.isLoading}
      >
        {contact.isPending ? 'Abriendo chat…' : 'Contactar'}
      </Button>
      {contact.isError && !isUnauthorized(contact.error) ? (
        <p role="alert" className="text-sm font-medium text-red-700">
          {getErrorMessage(contact.error)}
        </p>
      ) : null}
    </div>
  );
}
