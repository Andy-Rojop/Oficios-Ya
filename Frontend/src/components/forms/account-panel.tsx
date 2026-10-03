'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField, FormMessage } from '@/components/forms/form-field';
import { PhoneOtpFlow, type PhoneVerification } from '@/components/forms/phone-otp-flow';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ME_QUERY_KEY,
  changePhone,
  getErrorMessage,
  isUnauthorized,
  switchMode,
  updateEmail,
  useLogout,
  useMe,
  type ActiveMode,
  type UserDto,
} from '@/lib/auth';
import { useZones } from '@/lib/catalog';
import { signOutFirebase } from '@/lib/firebase';
import { formatPhoneDisplay } from '@/lib/phone';
import { cn } from '@/lib/utils';

const MODE_OPTIONS: { value: ActiveMode; label: string; description: string }[] = [
  { value: 'CLIENT', label: 'Cliente', description: 'Busco quién me ayude' },
  { value: 'WORKER', label: 'Trabajador', description: 'Ofrezco mis servicios' },
];

export function AccountPanel() {
  const router = useRouter();
  const { data: user, isLoading, error } = useMe();
  const unauthorized = isUnauthorized(error);

  useEffect(() => {
    if (unauthorized) {
      router.replace('/ingresar?next=/cuenta');
    }
  }, [unauthorized, router]);

  if (isLoading) {
    return <p className="text-muted">Cargando tu cuenta…</p>;
  }

  if (!user) {
    if (unauthorized) {
      return <p className="text-muted">Redirigiendo…</p>;
    }
    return (
      <FormMessage tone="error">
        {error ? getErrorMessage(error) : 'No se pudo cargar tu cuenta.'}
      </FormMessage>
    );
  }

  return (
    <div className="space-y-5">
      <ProfileCard user={user} />
      <ModeCard user={user} />
      <EmailCard user={user} />
      <PhoneChangeCard />
      <SessionCard />
    </div>
  );
}

function ProfileCard({ user }: { user: UserDto }) {
  const zones = useZones();
  const zone = zones.data?.find((item) => item.id === user.zoneId);

  const rows: [string, string][] = [
    ['Nombre', user.name],
    ['Teléfono', formatPhoneDisplay(user.phone)],
    ['Correo', user.email ?? 'Sin correo'],
    ['Zona', zone ? zone.name : user.zoneId ? 'Cargando…' : 'Sin zona'],
  ];

  return (
    <Card className="space-y-4">
      <CardTitle>Mi perfil</CardTitle>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
            <dd className="break-words text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function ModeCard({ user }: { user: UserDto }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: switchMode,
    onSuccess: (updated) => queryClient.setQueryData(ME_QUERY_KEY, updated),
  });

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <CardTitle>Modo de uso</CardTitle>
        <CardDescription>Cambia entre buscar trabajadores y ofrecer tus servicios.</CardDescription>
      </div>
      <div role="radiogroup" aria-label="Modo de uso" className="grid grid-cols-2 gap-2">
        {MODE_OPTIONS.map((option) => {
          const selected = user.activeMode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={mutation.isPending}
              onClick={() => {
                if (!selected) mutation.mutate(option.value);
              }}
              className={cn(
                'rounded-lg border p-3 text-left transition-colors disabled:opacity-60',
                selected
                  ? 'border-brand bg-brand-soft text-brand-dark'
                  : 'border-border bg-surface hover:bg-brand-soft/60',
              )}
            >
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="block text-xs text-muted">{option.description}</span>
            </button>
          );
        })}
      </div>
      {mutation.isError ? (
        <FormMessage tone="error">{getErrorMessage(mutation.error)}</FormMessage>
      ) : null}
    </Card>
  );
}

const emailSchema = z.object({
  email: z.union([z.literal(''), z.email('Ingresa un correo válido').max(254)]),
});
type EmailValues = z.infer<typeof emailSchema>;

function EmailCard({ user }: { user: UserDto }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: user.email ?? '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setMessage(null);
    setError(null);
    try {
      const updated = await updateEmail(email === '' ? null : email);
      queryClient.setQueryData(ME_QUERY_KEY, updated);
      reset({ email: updated.email ?? '' });
      setMessage(updated.email ? 'Correo guardado.' : 'Correo eliminado.');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  });

  return (
    <Card>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-1">
          <CardTitle>Correo electrónico</CardTitle>
          <CardDescription>Opcional. Déjalo vacío para quitarlo.</CardDescription>
        </div>
        <FormField id="email" label="Correo" error={errors.email?.message}>
          {(aria) => <Input {...aria} type="email" autoComplete="email" {...register('email')} />}
        </FormField>
        {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        {message ? <FormMessage tone="success">{message}</FormMessage> : null}
        <Button type="submit" variant="outline" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Guardando…' : 'Guardar correo'}
        </Button>
      </form>
    </Card>
  );
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
});
type PasswordValues = z.infer<typeof passwordSchema>;

/** RF-005: nuevo teléfono verificado por SMS + contraseña actual. */
function PhoneChangeCard() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [verification, setVerification] = useState<PhoneVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ currentPassword }) => {
    if (!verification) return;
    setError(null);
    try {
      const updated = await changePhone({
        firebaseIdToken: verification.firebaseIdToken,
        currentPassword,
      });
      await signOutFirebase();
      queryClient.setQueryData(ME_QUERY_KEY, updated);
      setVerification(null);
      setOpen(false);
      setDone(true);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  });

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <CardTitle>Cambiar teléfono</CardTitle>
        <CardDescription>Verificaremos el número nuevo con un código SMS.</CardDescription>
      </div>

      {done ? <FormMessage tone="success">Teléfono actualizado.</FormMessage> : null}

      {!open ? (
        <Button
          variant="outline"
          onClick={() => {
            setDone(false);
            setOpen(true);
          }}
        >
          Cambiar mi número
        </Button>
      ) : !verification ? (
        <div className="space-y-3">
          <PhoneOtpFlow onVerified={setVerification} phoneHint="Ingresa tu número nuevo." />
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormMessage tone="success">
            Número nuevo verificado: <strong>{formatPhoneDisplay(verification.phone)}</strong>
          </FormMessage>
          <FormField
            id="currentPassword"
            label="Contraseña actual"
            error={errors.currentPassword?.message}
          >
            {(aria) => (
              <Input
                {...aria}
                type="password"
                autoComplete="current-password"
                {...register('currentPassword')}
              />
            )}
          </FormField>
          {error ? <FormMessage tone="error">{error}</FormMessage> : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Confirmar cambio'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setVerification(null);
                setOpen(false);
                void signOutFirebase();
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}

function SessionCard() {
  const router = useRouter();
  const logout = useLogout();

  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <CardTitle>Sesión</CardTitle>
        <CardDescription>Cierra la sesión en este dispositivo.</CardDescription>
      </div>
      <Button
        variant="outline"
        disabled={logout.isPending}
        onClick={() =>
          logout.mutate(undefined, {
            onSettled: () => {
              router.replace('/ingresar');
            },
          })
        }
      >
        {logout.isPending ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </Button>
    </Card>
  );
}
