import type { Metadata } from 'next';
import Link from 'next/link';
import { Briefcase, Search } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Elegí cómo entrar',
  description:
    'Entrá como cliente para buscar oficios, o como trabajador para ofrecer tus servicios.',
};

const ROLES = [
  {
    mode: 'CLIENT' as const,
    title: 'Cliente',
    description: 'Buscá trabajadores, mirá precios de referencia y contactalos por chat privado.',
    href: '/ingresar?mode=CLIENT',
    Icon: Search,
  },
  {
    mode: 'WORKER' as const,
    title: 'Trabajador',
    description: 'Publicá tus oficios, precios y fotos. Recibí solicitudes y coordiná el trabajo.',
    href: '/ingresar?mode=WORKER',
    Icon: Briefcase,
  },
] as const;

export default function RolesPage() {
  return (
    <section className="space-y-8">
      <header className="mx-auto max-w-xl space-y-2 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand">OficiosYa</p>
        <h1
          className="text-3xl font-semibold text-foreground sm:text-4xl"
          style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
        >
          ¿Cómo querés entrar?
        </h1>
        <p className="text-muted">
          Elegí tu rol. Después podés cambiarlo cuando quieras desde tu cuenta.
        </p>
      </header>

      <ul className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-2 sm:gap-6">
        {ROLES.map(({ mode, title, description, href, Icon }) => (
          <li key={mode}>
            <article className="flex h-full flex-col items-center rounded-2xl border border-border bg-surface px-6 py-8 text-center shadow-sm">
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-brand-soft text-brand">
                <Icon className="h-10 w-10" aria-hidden strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-bold uppercase tracking-wide text-brand-dark">{title}</h2>
              <p className="mt-2 flex-1 text-sm text-muted">{description}</p>
              <Link
                href={href}
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg border border-brand bg-surface text-sm font-semibold text-brand transition hover:bg-brand-soft"
              >
                Entrar
              </Link>
            </article>
          </li>
        ))}
      </ul>

      <p className="text-center text-sm text-muted">
        ¿Primera vez?{' '}
        <Link
          href="/registro"
          className="font-medium text-brand underline-offset-4 hover:underline"
        >
          Crear una cuenta
        </Link>
      </p>
    </section>
  );
}
