'use client';

import { CircleHelp } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';

function LoginMark() {
  return (
    <Image
      src="/logo-oficiosya-blanco.png"
      alt="OficiosYA. El talento de tu comunidad, al alcance de todos."
      width={1400}
      height={345}
      priority
      className="h-14 w-auto sm:h-16 lg:h-20"
    />
  );
}

function QuietLink({ children }: { children: ReactNode }) {
  return (
    <a
      href="#contenido"
      onClick={(event) => event.preventDefault()}
      className="transition hover:text-foreground"
    >
      {children}
    </a>
  );
}

/** Pantalla de ingreso, fiel al prototipo: hero navy + formulario. */
export function LoginScreen({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#F7F8FA] lg:grid lg:grid-cols-2">
      <aside className="bg-[#1B2A4A] text-white lg:flex lg:min-h-dvh lg:flex-col lg:justify-between lg:px-12 lg:py-10 xl:px-16">
        <div className="px-5 pb-8 pt-6 lg:px-0 lg:pb-0 lg:pt-0">
          <LoginMark />
          <div className="mt-5 h-1 w-10 rounded-full bg-accent" />
          <h1 className="mt-5 max-w-md text-[1.65rem] font-bold leading-[1.15] tracking-tight lg:mt-8 lg:text-4xl xl:text-[2.65rem]">
            El talento de tu comunidad, al alcance de todos
          </h1>
        </div>

        <div className="mt-8 px-5 pb-8 lg:mt-14 lg:px-2 lg:pb-0">
          <Image
            src="/foto-login.png"
            alt="Carpintero en su taller."
            width={947}
            height={737}
            priority
            className="h-auto w-full max-w-lg rounded-2xl object-cover object-center"
          />
        </div>

      </aside>

      <section className="relative flex min-h-[70dvh] flex-col px-5 py-8 sm:px-8 lg:min-h-dvh lg:px-12 lg:py-8">
        <a
          href="#ayuda"
          onClick={(event) => event.preventDefault()}
          className="absolute right-5 top-5 hidden items-center gap-1.5 text-sm text-[#667085] transition hover:text-foreground lg:inline-flex"
        >
          <CircleHelp className="h-4 w-4" aria-hidden />
          ¿Necesitas ayuda?
        </a>

        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center">
          <p className="text-[11px] font-semibold tracking-[0.18em] text-accent">
            TU COMUNIDAD TE ESPERA
          </p>
          <h2 className="mt-2 text-[1.85rem] font-bold leading-tight tracking-tight text-[#1B2A4A] sm:text-4xl">
            ¡Bienvenido de nuevo!
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#667085]">
            Ingresa con tu teléfono y contraseña para seguir conectando.
          </p>
          <div className="mt-8">{children}</div>
        </div>

        <a
          href="#ayuda"
          onClick={(event) => event.preventDefault()}
          className="mx-auto mt-8 inline-flex items-center gap-1.5 text-sm text-[#667085] lg:hidden"
        >
          <CircleHelp className="h-4 w-4" aria-hidden />
          ¿Necesitas ayuda?
        </a>

        <footer className="mx-auto mt-auto hidden w-full max-w-3xl items-center justify-between pt-8 text-xs text-[#98A2B3] lg:flex">
          <p>© {new Date().getFullYear()} OficiosYA</p>
          <p className="flex gap-4">
            <QuietLink>Privacidad</QuietLink>
            <QuietLink>Términos y condiciones</QuietLink>
          </p>
        </footer>
      </section>
    </div>
  );
}
