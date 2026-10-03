'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ConfirmationResult } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField, FormMessage } from '@/components/forms/form-field';
import { PhoneInput } from '@/components/forms/phone-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  confirmOtp,
  getFirebaseErrorMessage,
  isFirebaseConfigured,
  startPhoneOtp,
} from '@/lib/firebase';
import { formatPhoneDisplay, normalizeGuatemalaPhone } from '@/lib/phone';

const RESEND_SECONDS = 60;

const phoneSchema = z.object({
  phone: z
    .string()
    .min(1, 'Ingresa tu número de teléfono')
    .refine(
      (value) => normalizeGuatemalaPhone(value) !== null,
      'Ingresa un teléfono válido de Guatemala (8 dígitos)',
    ),
});

const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'El código tiene 6 dígitos'),
});

type PhoneValues = z.infer<typeof phoneSchema>;
type CodeValues = z.infer<typeof codeSchema>;

export interface PhoneVerification {
  /** Teléfono en E.164 (+502XXXXXXXX). */
  phone: string;
  /** ID token de Firebase para enviar al backend. */
  firebaseIdToken: string;
}

interface PhoneOtpFlowProps {
  onVerified: (verification: PhoneVerification) => void;
  /** Texto del paso de teléfono. */
  phoneHint?: string;
}

/** Paso 1 compartido (registro, recuperar contraseña, cambiar teléfono): teléfono -> código SMS. */
export function PhoneOtpFlow({ onVerified, phoneHint }: PhoneOtpFlowProps) {
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  const phoneForm = useForm<PhoneValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: '' },
  });
  const codeForm = useForm<CodeValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: '' },
  });

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'code') {
      codeInputRef.current?.focus();
    }
  }, [step]);

  const sendCode = useCallback(async (e164: string) => {
    setError(null);
    setSending(true);
    try {
      const result = await startPhoneOtp(e164);
      setConfirmation(result);
      setPhone(e164);
      setCooldown(RESEND_SECONDS);
      setStep('code');
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setSending(false);
    }
  }, []);

  const onSubmitPhone = phoneForm.handleSubmit(async ({ phone: raw }) => {
    const e164 = normalizeGuatemalaPhone(raw);
    if (e164) {
      await sendCode(e164);
    }
  });

  const onSubmitCode = codeForm.handleSubmit(async ({ code }) => {
    if (!confirmation) return;
    setError(null);
    try {
      const firebaseIdToken = await confirmOtp(confirmation, code);
      onVerified({ phone, firebaseIdToken });
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    }
  });

  if (!isFirebaseConfigured()) {
    return (
      <FormMessage tone="error">
        La verificación por SMS aún no está configurada. Completa las variables{' '}
        <code>NEXT_PUBLIC_FIREBASE_*</code> en <code>Frontend/.env.local</code> y reinicia el
        servidor.
      </FormMessage>
    );
  }

  if (step === 'phone') {
    return (
      <form onSubmit={onSubmitPhone} noValidate className="space-y-4">
        <FormField
          id="phone"
          label="Número de teléfono"
          hint={phoneHint ?? 'Te enviaremos un código por SMS para verificarlo.'}
          error={phoneForm.formState.errors.phone?.message}
        >
          {(aria) => <PhoneInput {...aria} {...phoneForm.register('phone')} />}
        </FormField>
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        <Button type="submit" className="w-full" disabled={sending}>
          {sending ? 'Enviando código…' : 'Enviar código'}
        </Button>
      </form>
    );
  }

  const { ref: codeRef, ...codeRegister } = codeForm.register('code');

  return (
    <form onSubmit={onSubmitCode} noValidate className="space-y-4">
      <p className="text-sm text-muted">
        Enviamos un código de 6 dígitos al{' '}
        <strong className="text-foreground">{formatPhoneDisplay(phone)}</strong>.
      </p>
      <FormField
        id="code"
        label="Código de verificación"
        error={codeForm.formState.errors.code?.message}
      >
        {(aria) => (
          <Input
            {...aria}
            {...codeRegister}
            ref={(element) => {
              codeRef(element);
              codeInputRef.current = element;
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
            className="text-center text-lg tracking-[0.4em]"
          />
        )}
      </FormField>
      {error ? <FormMessage tone="error">{error}</FormMessage> : null}
      <Button type="submit" className="w-full" disabled={codeForm.formState.isSubmitting}>
        {codeForm.formState.isSubmitting ? 'Verificando…' : 'Verificar código'}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button
          type="button"
          className="font-medium text-brand underline-offset-4 hover:underline"
          onClick={() => {
            setStep('phone');
            setConfirmation(null);
            setError(null);
            codeForm.reset();
          }}
        >
          Cambiar número
        </button>
        <button
          type="button"
          className="font-medium text-brand underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
          disabled={cooldown > 0 || sending}
          onClick={() => void sendCode(phone)}
        >
          {cooldown > 0 ? `Reenviar código (${cooldown}s)` : 'Reenviar código'}
        </button>
      </div>
    </form>
  );
}
