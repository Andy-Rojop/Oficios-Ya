import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthPageShell } from '@/components/forms/auth-page-shell';
import { LoginForm } from '@/components/forms/login-form';

export const metadata: Metadata = { title: 'Ingresar' };

export default function IngresarPage() {
  return (
    <AuthPageShell
      title="Ingresar"
      description="Ingrese con su teléfono y su contraseña. El inicio de sesión no envía SMS."
    >
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthPageShell>
  );
}
