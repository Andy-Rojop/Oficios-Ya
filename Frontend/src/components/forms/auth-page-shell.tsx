import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';

interface AuthPageShellProps {
  title: string;
  description: string;
  children: ReactNode;
}

/** Contenedor centrado y mobile-first para las pantallas de autenticación. */
export function AuthPageShell({ title, description, children }: AuthPageShellProps) {
  return (
    <section className="mx-auto w-full max-w-md space-y-5 py-4 sm:py-8">
      <header className="space-y-2">
        <h1
          className="text-3xl font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
        >
          {title}
        </h1>
        <p className="text-muted">{description}</p>
      </header>
      <Card>{children}</Card>
    </section>
  );
}
