'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useMe } from '@/lib/auth';
import { RequestFormDialog } from './request-form-dialog';

interface RequestServiceButtonProps {
  workerProfileId: string;
  workerName: string;
  /** Ruta a la que volver tras ingresar (por defecto, el perfil del trabajador). */
  returnTo?: string;
  variant?: 'default' | 'outline';
}

/** «Solicitar servicio» en el perfil público: sin sesión pide ingresar y vuelve aquí. */
export function RequestServiceButton({
  workerProfileId,
  workerName,
  returnTo,
  variant = 'outline',
}: RequestServiceButtonProps) {
  const router = useRouter();
  const me = useMe();
  const [open, setOpen] = useState(false);

  function goToLogin() {
    router.push(
      `/ingresar?next=${encodeURIComponent(returnTo ?? `/trabajador/${workerProfileId}`)}`,
    );
  }

  function onClick() {
    if (!me.isLoading && !me.data) {
      goToLogin();
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <Button
        className="w-full sm:w-auto"
        size="lg"
        variant={variant}
        onClick={onClick}
        disabled={me.isLoading}
      >
        Solicitar servicio
      </Button>
      {open ? (
        <RequestFormDialog
          workerProfileId={workerProfileId}
          workerName={workerName}
          onClose={() => setOpen(false)}
          onUnauthorized={goToLogin}
        />
      ) : null}
    </>
  );
}
