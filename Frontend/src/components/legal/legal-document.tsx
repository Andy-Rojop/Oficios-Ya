import Link from 'next/link';
import type { ReactNode } from 'react';

export function LegalDocument({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto w-full max-w-3xl space-y-6 pb-10">
      <header className="space-y-2 border-b border-border pb-5">
        <p className="text-sm text-muted">
          <Link href="/" className="font-semibold text-brand underline-offset-2 hover:underline">
            OficiosYa
          </Link>
        </p>
        <h1
          className="text-2xl font-semibold tracking-tight sm:text-3xl"
          style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
        >
          {title}
        </h1>
        <p className="text-sm text-muted">Última actualización: {updatedAt}</p>
      </header>

      <div className="space-y-5 text-sm leading-relaxed text-foreground/90 sm:text-[0.95rem]">
        {children}
      </div>

      <footer className="border-t border-border pt-4 text-sm text-muted">
        <p className="flex flex-wrap gap-x-4 gap-y-2">
          <Link href="/terminos" className="font-medium text-brand underline-offset-2 hover:underline">
            Términos y condiciones
          </Link>
          <Link
            href="/privacidad"
            className="font-medium text-brand underline-offset-2 hover:underline"
          >
            Aviso de privacidad
          </Link>
          <Link href="/ingresar" className="underline-offset-2 hover:underline">
            Ingresar
          </Link>
        </p>
      </footer>
    </article>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
