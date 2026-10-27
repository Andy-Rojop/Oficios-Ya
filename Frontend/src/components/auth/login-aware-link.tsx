'use client';

import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { useMe } from '@/lib/auth';

type LinkProps = Omit<ComponentProps<typeof Link>, 'href'> & {
  href: string;
  children: ReactNode;
};

/**
 * Si no hay sesión, el enlace lleva a iniciar sesión y vuelve a `href` después.
 * La landing puede mostrar contenido, pero usarlo requiere cuenta.
 */
export function LoginAwareLink({ href, children, ...rest }: LinkProps) {
  const { data: user, isLoading, isFetching } = useMe();
  const waiting = isLoading || isFetching;
  const target =
    !waiting && !user ? `/ingresar?next=${encodeURIComponent(href)}` : href;

  return (
    <Link href={target} {...rest}>
      {children}
    </Link>
  );
}
