'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField, FormMessage } from '@/components/forms/form-field';
import { PhoneOtpFlow, type PhoneVerification } from '@/components/forms/phone-otp-flow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ME_QUERY_KEY, getErrorMessage, register as registerAccount } from '@/lib/auth';
import { useZones } from '@/lib/catalog';
import { signOutFirebase } from '@/lib/firebase';
import { formatPhoneDisplay } from '@/lib/phone';

const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(100, 'El nombre no puede superar 100 caracteres'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(72, 'La contraseña no puede superar 72 caracteres'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
    zoneId: z.string().min(1, 'Selecciona tu zona'),
    email: z.union([z.literal(''), z.email('Ingresa un correo válido').max(254)]),
    acceptTerms: z.boolean().refine((value) => value, 'Debes aceptar los términos y condiciones'),
    startAsWorker: z.boolean(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

type RegisterValues = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [verification, setVerification] = useState<PhoneVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const zones = useZones();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      password: '',
      confirmPassword: '',
      zoneId: '',
      email: '',
      acceptTerms: false,
      startAsWorker: false,
    },
  });

  if (!verification) {
    return <PhoneOtpFlow onVerified={setVerification} />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const user = await registerAccount({
        firebaseIdToken: verification.firebaseIdToken,
        name: values.name.trim(),
        password: values.password,
        zoneId: values.zoneId,
        ...(values.email ? { email: values.email } : {}),
        acceptTerms: true,
        ...(values.startAsWorker ? { startAsWorker: true } : {}),
      });
      await signOutFirebase();
      queryClient.setQueryData(ME_QUERY_KEY, user);
      router.replace('/panel');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormMessage tone="success">
        Teléfono verificado: <strong>{formatPhoneDisplay(verification.phone)}</strong>
      </FormMessage>

      <FormField id="name" label="Nombre completo" error={errors.name?.message}>
        {(aria) => <Input {...aria} autoComplete="name" {...register('name')} />}
      </FormField>

      <FormField
        id="password"
        label="Contraseña"
        hint="Mínimo 8 caracteres."
        error={errors.password?.message}
      >
        {(aria) => (
          <Input {...aria} type="password" autoComplete="new-password" {...register('password')} />
        )}
      </FormField>

      <FormField
        id="confirmPassword"
        label="Confirmar contraseña"
        error={errors.confirmPassword?.message}
      >
        {(aria) => (
          <Input
            {...aria}
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
          />
        )}
      </FormField>

      <FormField
        id="zoneId"
        label="Zona donde vives"
        hint="Aldea, cantón o caserío de El Asintal."
        error={
          errors.zoneId?.message ?? (zones.isError ? 'No se pudieron cargar las zonas.' : undefined)
        }
      >
        {(aria) => (
          <Select {...aria} {...register('zoneId')} disabled={zones.isLoading}>
            <option value="">{zones.isLoading ? 'Cargando zonas…' : 'Selecciona tu zona'}</option>
            {zones.data?.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      <FormField
        id="email"
        label="Correo electrónico (opcional)"
        hint="No es necesario para usar OficiosYa."
        error={errors.email?.message}
      >
        {(aria) => <Input {...aria} type="email" autoComplete="email" {...register('email')} />}
      </FormField>

      <div className="space-y-3 rounded-lg border border-border bg-background p-3">
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
            {...register('startAsWorker')}
          />
          <span>
            <span className="font-semibold">Quiero ofrecer mis servicios</span>
            <span className="block text-muted">
              Empezarás en modo trabajador. Puedes cambiarlo cuando quieras.
            </span>
          </span>
        </label>

        <div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-5 shrink-0 accent-[var(--brand)]"
              aria-invalid={Boolean(errors.acceptTerms)}
              aria-describedby={errors.acceptTerms ? 'acceptTerms-error' : undefined}
              {...register('acceptTerms')}
            />
            <span>Acepto los términos y condiciones y el aviso de privacidad de OficiosYa.</span>
          </label>
          {errors.acceptTerms ? (
            <p
              id="acceptTerms-error"
              role="alert"
              className="mt-1 text-sm font-medium text-red-700"
            >
              {errors.acceptTerms.message}
            </p>
          ) : null}
        </div>
      </div>

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
      </Button>

      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link
          href="/ingresar"
          className="font-medium text-brand underline-offset-4 hover:underline"
        >
          Ingresar
        </Link>
      </p>
    </form>
  );
}
