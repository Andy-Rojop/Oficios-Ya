'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField, FormMessage } from '@/components/forms/form-field';
import { PhoneInput } from '@/components/forms/phone-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  applyAuthenticatedUser,
  fetchMe,
  getErrorMessage,
  login,
  safeNextPath,
  switchMode,
  type ActiveMode,
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

function defaultNextForMode(mode: ActiveMode | null): string {
  return mode === 'WORKER' ? '/panel' : '/';
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const mode = parseMode(searchParams.get('mode'));
  const nextParam = searchParams.get('next');
  const next = safeNextPath(nextParam, defaultNextForMode(mode));
  const justReset = searchParams.get('recuperada') === '1';
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: '', password: '' },
  });

  useEffect(() => {
    if (!nextParam) return;
    let cancelled = false;
    fetchMe()
      .then(async (user) => {
        if (cancelled) return;
        let current = user;
        if (mode && current.activeMode !== mode) {
          current = await switchMode(mode);
        }
        await applyAuthenticatedUser(queryClient, current);
        router.replace(next);
      })
      .catch(() => {
        // sin sesión: se muestra el formulario normal
      });
    return () => {
      cancelled = true;
    };
  }, [nextParam, next, mode, queryClient, router]);

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    const phone = normalizeGuatemalaPhone(values.phone);
    if (!phone) return;
    try {
      let user = await login({ phone, password: values.password });
      if (mode && user.activeMode !== mode) {
        user = await switchMode(mode);
      }
      await applyAuthenticatedUser(queryClient, user);
      router.replace(next);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  });

  const roleLabel = mode === 'WORKER' ? 'trabajador' : mode === 'CLIENT' ? 'cliente' : null;

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

      <Button type="submit" className="w-full" disabled={isSubmitting}>
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
          href="/registro"
          className="font-medium text-brand underline-offset-4 hover:underline"
        >
          Crear una cuenta
        </Link>
      </div>
    </form>
  );
}
