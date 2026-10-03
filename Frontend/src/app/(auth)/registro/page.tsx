import type { Metadata } from 'next';
import { AuthPageShell } from '@/components/forms/auth-page-shell';
import { RegisterForm } from '@/components/forms/register-form';

export const metadata: Metadata = { title: 'Crear cuenta' };

export default function RegistroPage() {
  return (
    <AuthPageShell
      title="Crear cuenta"
      description="Verifica tu teléfono y completa tus datos. No necesitas correo electrónico."
    >
      <RegisterForm />
    </AuthPageShell>
  );
}
