import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginForm } from '@/components/forms/login-form';
import { LoginScreen } from '@/components/forms/login-screen';

export const metadata: Metadata = { title: 'Ingresar' };

export default function IngresarPage() {
  return (
    <LoginScreen>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </LoginScreen>
  );
}
