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
import { getErrorMessage, resetPassword } from '@/lib/auth';
import { signOutFirebase } from '@/lib/firebase';
import { formatPhoneDisplay } from '@/lib/phone';

const resetSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(72, 'La contraseña no puede superar 72 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme su contraseña'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

type ResetValues = z.infer<typeof resetSchema>;

export function RecoverForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [verification, setVerification] = useState<PhoneVerification | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  if (!verification) {
    return (
      <PhoneOtpFlow
        onVerified={setVerification}
        phoneHint="Ingrese el teléfono de su cuenta. Le enviaremos un código por SMS."
      />
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      await resetPassword({
        firebaseIdToken: verification.firebaseIdToken,
        newPassword: values.newPassword,
      });
      await signOutFirebase();
      queryClient.clear();
      router.replace('/ingresar?recuperada=1');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormMessage tone="success">
        Teléfono verificado: <strong>{formatPhoneDisplay(verification.phone)}</strong>
      </FormMessage>

      <FormField
        id="newPassword"
        label="Nueva contraseña"
        hint="Mínimo 8 caracteres."
        error={errors.newPassword?.message}
      >
        {(aria) => (
          <Input
            {...aria}
            type="password"
            autoComplete="new-password"
            {...register('newPassword')}
          />
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

      {error ? <FormMessage tone="error">{error}</FormMessage> : null}

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Guardando…' : 'Guardar contraseña'}
      </Button>

      <p className="text-center text-sm text-muted">
        <Link
          href="/ingresar"
          className="font-medium text-brand underline-offset-4 hover:underline"
        >
          Volver a ingresar
        </Link>
      </p>
    </form>
  );
}
