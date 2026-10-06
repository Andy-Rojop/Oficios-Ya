import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Briefcase, Check, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Elegí cómo entrar',
  description:
    'Entrá como cliente para buscar oficios, o como trabajador para ofrecer tus servicios.',
};

const ROLES = [
  {
    mode: 'CLIENT' as const,
    title: 'Cliente',
    badge: 'Busco un oficio',
    description: 'Encontrá plomeros, electricistas y más cerca de vos en El Asintal.',
    points: ['Mapa de oficios cercanos', 'Precios de referencia', 'Chat privado'],
    loginHref: '/ingresar?mode=CLIENT',
    registerHref: '/registro?mode=CLIENT',
    Icon: Search,
    tone: 'dark' as const,
  },
  {
    mode: 'WORKER' as const,
    title: 'Trabajador',
    badge: 'Ofrezco mis servicios',
    description: 'Mostrá tu oficio, precios y fotos. Recibí solicitudes de clientes.',
    points: ['Perfil público', 'Solicitudes y cotizaciones', 'Más visibilidad local'],
    loginHref: '/ingresar?mode=WORKER',
    registerHref: '/registro?mode=WORKER',
    Icon: Briefcase,
    tone: 'accent' as const,
  },
] as const;

export default function RolesPage() {
  return (
    <section className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 -mt-6 overflow-hidden">
      <div className="absolute inset-0 bg-foreground" aria-hidden />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_20%,rgba(30,58,95,0.4),transparent_42%),radial-gradient(ellipse_at_85%_10%,rgba(255,255,255,0.1),transparent_40%)]"
        aria-hidden
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/40 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="max-w-xl animate-[home-fade-up_0.65s_ease-out_both]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">El Asintal</p>
          <h1
            className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl"
            style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
          >
            ¿Cómo querés entrar?
          </h1>
          <p className="mt-3 max-w-md text-base text-white/75 sm:text-lg">
            Elegí tu rol. Después podés cambiarlo cuando quieras desde tu cuenta.
          </p>
        </header>

        <ul className="mt-8 grid gap-4 sm:mt-10 lg:grid-cols-2">
          {ROLES.map(
            (
              { mode, title, badge, description, points, loginHref, registerHref, Icon, tone },
              index,
            ) => {
              const isAccent = tone === 'accent';
              return (
                <li
                  key={mode}
                  className="animate-[home-fade-up_0.65s_ease-out_both]"
                  style={{ animationDelay: `${80 + index * 90}ms` }}
                >
                  <article
                    className={cn(
                      'relative flex h-full flex-col overflow-hidden rounded-3xl border p-5 sm:p-6',
                      'transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.22)]',
                      isAccent
                        ? 'border-accent/30 bg-gradient-to-br from-accent via-accent to-accent-dark text-white shadow-[0_16px_36px_rgba(30,58,95,0.3)]'
                        : 'border-white/15 bg-gradient-to-br from-white via-white to-brand-soft text-foreground shadow-[0_16px_36px_rgba(0,0,0,0.2)]',
                    )}
                  >
                    <div
                      className={cn(
                        'pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full blur-2xl',
                        isAccent ? 'bg-white/20' : 'bg-foreground/10',
                      )}
                      aria-hidden
                    />

                    <div className="relative flex items-start justify-between gap-3">
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em]',
                          isAccent ? 'bg-white/15 text-white' : 'bg-foreground/10 text-foreground',
                        )}
                      >
                        {badge}
                      </span>
                      <span
                        className={cn(
                          'flex h-12 w-12 items-center justify-center rounded-2xl',
                          isAccent ? 'bg-white/15 text-white' : 'bg-foreground text-white',
                        )}
                      >
                        <Icon className="h-6 w-6" aria-hidden strokeWidth={1.75} />
                      </span>
                    </div>

                    <h2
                      className="relative mt-5 text-2xl font-semibold tracking-tight sm:text-3xl"
                      style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
                    >
                      {title}
                    </h2>
                    <p
                      className={cn(
                        'relative mt-2 text-sm leading-relaxed',
                        isAccent ? 'text-white/85' : 'text-muted',
                      )}
                    >
                      {description}
                    </p>

                    <ul className="relative mt-5 space-y-2">
                      {points.map((point) => (
                        <li key={point} className="flex items-center gap-2 text-sm font-medium">
                          <Check
                            aria-hidden
                            className={cn(
                              'h-4 w-4 shrink-0',
                              isAccent ? 'text-white' : 'text-foreground',
                            )}
                          />
                          {point}
                        </li>
                      ))}
                    </ul>

                    <div className="relative mt-auto flex flex-col gap-2 pt-6">
                      <Link
                        href={loginHref}
                        className={cn(
                          'inline-flex h-11 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition',
                          isAccent
                            ? 'bg-white text-accent-dark hover:bg-white/90'
                            : 'bg-foreground text-white hover:bg-brand-dark',
                        )}
                      >
                        Entrar
                        <ArrowRight aria-hidden className="h-4 w-4" />
                      </Link>
                      <Link
                        href={registerHref}
                        className={cn(
                          'inline-flex h-11 items-center justify-center rounded-xl border text-sm font-semibold transition',
                          isAccent
                            ? 'border-white/35 bg-white/10 text-white hover:bg-white/20'
                            : 'border-border bg-surface text-foreground hover:bg-brand-soft',
                        )}
                      >
                        Crear cuenta
                      </Link>
                    </div>
                  </article>
                </li>
              );
            },
          )}
        </ul>
      </div>
    </section>
  );
}
