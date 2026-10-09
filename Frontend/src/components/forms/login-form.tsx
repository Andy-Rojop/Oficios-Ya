'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField, FormMessage } from '@/components/forms/form-field';
import { PhoneInput } from '@/components/forms/phone-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ME_QUERY_KEY,
  getErrorMessage,
  login,
  resolvePostAuthPath,
  switchMode,
  useMe,
  type ActiveMode,
} from '@/lib/auth';
import { normalizeGuatemalaPhone } from '@/lib/phone';
import { UI_COPY } from '@/lib/ui-copy';

const loginSchema = z.object({
  phone: z
    .string()
    .min(1, 'Ingrese su número de teléfono')
    .refine(
      (value) => normalizeGuatemalaPhone(value) !== null,
      'Ingrese un teléfono válido de Guatemala (8 dígitos)',
    ),
  password: z.string().min(1, 'Ingrese su contraseña'),
});

type LoginValues = z.infer<typeof loginSchema>;

function parseMode(value: string | null): ActiveMode | null {
  if (value === 'CLIENT' || value === 'WORKER') return value;
  return null;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const mode = parseMode(searchParams.get('mode'));
  const nextParam = searchParams.get('next');
  const justReset = searchParams.get('recuperada') === '1';
  const [error, setError] = useState<string | null>(null);
  /** Solo se lee/escribe en el effect (evita doble redirect). */
  const redirected = useRef(false);

  const me = useMe();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
  });

  // Redirección suave si ya hay sesión o acabamos de guardar el usuario en caché.
  useEffect(() => {
    if (redirected.current || me.isLoading || me.isFetching || !me.data) return;
    redirected.current = true;

    void (async () => {
      let current = me.data;
      try {
        if (mode && current.activeMode !== mode) {
          current = await switchMode(mode);
          queryClient.setQueryData(ME_QUERY_KEY, current);
        }
        router.replace(
          resolvePostAuthPath({
            activeMode: current.activeMode,
            requestedMode: mode,
            next: nextParam,
          }),
        );
      } catch (err) {
        redirected.current = false;
        setError(getErrorMessage(err));
      }
    })();
  }, [me.data, me.isLoading, me.isFetching, mode, nextParam, queryClient, router]);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const phone = normalizeGuatemalaPhone(values.phone);
    if (!phone) {
      setError('Ingrese un teléfono válido de Guatemala (8 dígitos)');
      return;
    }
    try {
      let user = await login({ phone, password: values.password });
      if (mode && user.activeMode !== mode) {
        user = await switchMode(mode);
      }
      // El effect redirige cuando `me.data` queda en caché.
      queryClient.setQueryData(ME_QUERY_KEY, user);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  });

  const roleLabel = mode === 'WORKER' ? 'trabajador' : mode === 'CLIENT' ? 'cliente' : null;
  const checkingSession = (me.isLoading || Boolean(me.data)) && !error;

  if (checkingSession && !error) {
    return <p className="text-center text-sm text-muted">Entrando…</p>;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {roleLabel ? (
        <p className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-brand-dark">
          Entrará como <strong>{roleLabel}</strong>.{' '}
          <Link href="/roles" className="font-medium underline-offset-2 hover:underline">
            Cambiar rol
          </Link>
        </p>
      ) : null}

      {justReset ? (
        <FormMessage tone="success">
          Contraseña actualizada. Ingrese con su nueva contraseña.
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

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Ingresando…' : 'Ingresar'}
      </Button>

      <div className="flex flex-col gap-2 text-center text-sm sm:flex-row sm:justify-between">
        <Link
          href="/recuperar"
          className="font-medium text-brand underline-offset-4 hover:underline"
        >
          {UI_COPY.forgotPassword}
        </Link>
        <Link
          href={
            mode === 'WORKER'
              ? '/registro?mode=WORKER'
              : mode === 'CLIENT'
                ? '/registro?mode=CLIENT'
                : '/registro'
          }
          className="font-medium text-brand underline-offset-4 hover:underline"
        >
          {UI_COPY.createAccount}
        </Link>
      </div>
    </form>
  );
}
