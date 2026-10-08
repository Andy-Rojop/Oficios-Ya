'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField, FormMessage } from '@/components/forms/form-field';
import { PhoneInput } from '@/components/forms/phone-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ME_QUERY_KEY,
  fetchMe,
  getErrorMessage,
  login,
  safeNextPath,
  switchMode,
  type ActiveMode,
  type UserDto,
} from '@/lib/auth';
import { normalizeGuatemalaPhone } from '@/lib/phone';

const loginSchema = z.object({
  phone: z
    .string()
    .min(1, 'Ingresa tu número de teléfono')
    .refine(
      (value) => normalizeGuatemalaPhone(value) !== null,
      'Ingresa un teléfono válido de Guatemala (8 dígitos)',
    ),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

type LoginValues = z.infer<typeof loginSchema>;

function parseMode(value: string | null): ActiveMode | null {
  if (value === 'CLIENT' || value === 'WORKER') return value;
  return null;
}

/** Destino post-login: panel del trabajador o home del cliente (como el feed de Facebook). */
function destinationFor(user: UserDto, mode: ActiveMode | null, nextParam: string | null): string {
  const effective = mode ?? user.activeMode;
  const fallback = effective === 'WORKER' ? '/panel' : '/';
  return safeNextPath(nextParam, fallback);
}

function goToApp(path: string) {
  // Navegación completa: evita quedarse en /ingresar si el router client falla.
  window.location.assign(path);
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const mode = parseMode(searchParams.get('mode'));
  const nextParam = searchParams.get('next');
  const justReset = searchParams.get('recuperada') === '1';
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
  });

  // Si ya hay sesión, no mostrar el formulario: ir al panel/home.
  useEffect(() => {
    let cancelled = false;
    fetchMe()
      .then(async (user) => {
        if (cancelled) return;
        setRedirecting(true);
        let current = user;
        if (mode && current.activeMode !== mode) {
          current = await switchMode(mode);
        }
        queryClient.setQueryData(ME_QUERY_KEY, current);
        goToApp(destinationFor(current, mode, nextParam));
      })
      .catch(() => {
        // sin sesión: formulario normal
      });
    return () => {
      cancelled = true;
    };
  }, [mode, nextParam, queryClient]);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const phone = normalizeGuatemalaPhone(values.phone);
    if (!phone) {
      setError('Ingresa un teléfono válido de Guatemala (8 dígitos)');
      return;
    }
    try {
      let user = await login({ phone, password: values.password });
      if (mode && user.activeMode !== mode) {
        user = await switchMode(mode);
      }
      queryClient.setQueryData(ME_QUERY_KEY, user);
      setRedirecting(true);
      goToApp(destinationFor(user, mode, nextParam));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  });

  const roleLabel = mode === 'WORKER' ? 'trabajador' : mode === 'CLIENT' ? 'cliente' : null;
  const busy = isSubmitting || redirecting;

  if (redirecting) {
    return <p className="text-center text-sm text-muted">Entrando…</p>;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {roleLabel ? (
        <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-dark">
          Vas a entrar como <strong>{roleLabel}</strong>.{' '}
          <Link href="/roles" className="font-medium underline-offset-2 hover:underline">
            Cambiar rol
          </Link>
        </p>
      ) : null}

      {justReset ? (
        <FormMessage tone="success">
          Contraseña actualizada. Ingresa con tu nueva contraseña.
        </FormMessage>
      ) : null}

      <FormField id="phone" label="Teléfono" error={errors.phone?.message}>
        {(aria) => <PhoneInput {...aria} {...register('phone')} />}
      </FormField>

      <FormField id="password" label="Contraseña" error={errors.password?.message}>
        {(aria) => (
          <Input
            {...aria}
            type="password"
            autoComplete="current-password"
            {...register('password')}
          />
        )}
      </FormField>

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      <Button type="submit" className="w-full" disabled={busy}>
        {isSubmitting ? 'Ingresando…' : 'Ingresar'}
      </Button>

      <div className="flex flex-col gap-2 text-center text-sm sm:flex-row sm:justify-between">
        <Link
          href="/recuperar"
          className="font-medium text-brand underline-offset-4 hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </Link>
        <Link
          href={mode === 'WORKER' ? '/registro?mode=WORKER' : '/registro'}
          className="font-medium text-brand underline-offset-4 hover:underline"
        >
          Crear una cuenta
        </Link>
      </div>
    </form>
  );
}
