import type { Metadata } from 'next';
import { AuthPageShell } from '@/components/forms/auth-page-shell';
import { RecoverForm } from '@/components/forms/recover-form';

export const metadata: Metadata = { title: 'Recuperar contraseña' };

export default function RecuperarPage() {
  return (
    <AuthPageShell
      title="Recuperar contraseña"
      description="Verifica tu teléfono con un código SMS y elige una contraseña nueva."
    >
      <RecoverForm />
    </AuthPageShell>
  );
}
