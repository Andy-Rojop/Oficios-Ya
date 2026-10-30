'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Lock, Phone, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField, FormMessage } from '@/components/forms/form-field';
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

  // Redirección si ya hay sesión (o acabamos de guardar el usuario en caché).
  // No esperar `isFetching`: en iOS un refetch largo dejaba “Entrando…” congelado.
  useEffect(() => {
    if (redirected.current || me.isLoading || !me.data) return;
    redirected.current = true;

    void (async () => {
      let current = me.data;
      if (!current) {
        redirected.current = false;
        return;
      }
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
        queryClient.setQueryData(ME_QUERY_KEY, undefined);
        setError(getErrorMessage(err));
      }
    })();
  }, [me.data, me.isLoading, mode, nextParam, queryClient, router]);

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
  // Solo “Entrando…” en carga inicial o con sesión válida lista para redirigir.
  const checkingSession = (me.isLoading || Boolean(me.data)) && !error && !isSubmitting;

  if (checkingSession && !error) {
    return <p className="text-center text-sm text-[#667085]">Entrando…</p>;
  }

  const phoneField = register('phone');
  const registerHref =
    mode === 'WORKER' ? '/registro?mode=WORKER' : mode === 'CLIENT' ? '/registro?mode=CLIENT' : '/registro';

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {roleLabel ? (
        <p className="rounded-xl bg-white px-3 py-2 text-sm text-[#1B2A4A] shadow-sm">
          Entrará como <strong>{roleLabel}</strong>.{' '}
          <Link href="/roles" className="font-medium text-accent underline-offset-2 hover:underline">
            Cambiar rol
          </Link>
        </p>
      ) : null}

      {justReset ? (
        <FormMessage tone="success">
          Contraseña actualizada. Ingrese con su nueva contraseña.
        </FormMessage>
      ) : null}

      <FormField id="phone" label="Teléfono (+502)" error={errors.phone?.message}>
        {(aria) => (
          <div className="flex h-12 items-center gap-2 rounded-xl border border-[#E4E7EC] bg-white px-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <Phone className="h-4 w-4 shrink-0 text-[#98A2B3]" aria-hidden />
            <span className="rounded-md bg-[#F2F4F7] px-2 py-1 text-sm font-semibold text-[#1B2A4A]">
              +502
            </span>
            <input
              {...aria}
              {...phoneField}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="5555 0001"
              className="h-full min-w-0 flex-1 bg-transparent text-base text-[#1B2A4A] outline-none placeholder:text-[#98A2B3]"
              onChange={(event) => {
                const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
                event.target.value =
                  digits.length > 4 ? `${digits.slice(0, 4)} ${digits.slice(4)}` : digits;
                void phoneField.onChange(event);
              }}
            />
          </div>
        )}
      </FormField>

      <FormField id="password" label="Contraseña" error={errors.password?.message}>
        {(aria) => (
          <div className="relative">
            <Lock
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-[#98A2B3]"
              aria-hidden
            />
            <Input
              {...aria}
              type="password"
              autoComplete="current-password"
              maxLength={15}
              placeholder="••••••••"
              className="h-12 rounded-xl border-[#E4E7EC] pl-10 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
              {...register('password')}
            />
          </div>
        )}
      </FormField>

      <div className="flex justify-end">
        <Link href="/recuperar" className="text-sm font-semibold text-accent hover:text-accent-dark">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      <Button
        type="submit"
        variant="accent"
        className="h-12 w-full rounded-xl text-base font-semibold"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Ingresando…' : 'Ingresar'}
        {isSubmitting ? null : <ArrowRight className="h-4 w-4" aria-hidden />}
      </Button>

      <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[#98A2B3]">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        El inicio de sesión no envía SMS.
      </p>

      <div className="border-t border-[#E4E7EC] pt-5 text-center text-sm text-[#667085]">
        ¿No tienes cuenta?{' '}
        <Link href={registerHref} className="font-semibold text-accent hover:text-accent-dark">
          Crear cuenta
        </Link>
      </div>
    </form>
  );
}
