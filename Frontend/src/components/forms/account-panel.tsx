'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Briefcase, Check, LogOut, Mail, MapPin, Phone, Search, UserRound } from 'lucide-react';
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
  updateEmail,
  useLogout,
  useMe,
  useSwitchMode,
  type ActiveMode,
  type UserDto,
} from '@/lib/auth';
import { useZones } from '@/lib/catalog';
import { signOutFirebase } from '@/lib/firebase';
import { formatPhoneDisplay } from '@/lib/phone';
import { cn } from '@/lib/utils';

const MODE_OPTIONS: {
  value: ActiveMode;
  label: string;
  description: string;
  Icon: typeof Search;
}[] = [
  {
    value: 'CLIENT',
    label: 'Cliente',
    description: 'Busco quién me ayude',
    Icon: Search,
  },
  {
    value: 'WORKER',
    label: 'Trabajador',
    description: 'Ofrezco mis servicios',
    Icon: Briefcase,
  },
];

export function AccountPanel() {
  const router = useRouter();
  const { data: user, isLoading, isFetching, error } = useMe();
  const unauthorized = isUnauthorized(error);

  useEffect(() => {
    if (!isLoading && !isFetching && unauthorized) {
      router.replace('/ingresar?next=/cuenta');
    }
  }, [unauthorized, isLoading, isFetching, router]);

  if (isLoading || (isFetching && !user)) {
    return <p className="text-muted">Cargando su cuenta…</p>;
  }

  if (!user) {
    if (unauthorized) {
      return <p className="text-muted">Redirigiendo…</p>;
    }
    return (
      <FormMessage tone="error">
        {error ? getErrorMessage(error) : 'No se pudo cargar su cuenta.'}
      </FormMessage>
    );
  }

  const firstName = user.name.split(' ')[0] ?? 'Usuario';

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-3xl bg-brand px-5 py-7 text-white sm:px-7 sm:py-8 animate-[home-fade-up_0.55s_ease-out_both]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_20%,rgba(30,58,95,0.55),transparent_45%),radial-gradient(ellipse_at_90%_0%,rgba(255,255,255,0.08),transparent_40%)]"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/90">Mi cuenta</p>
            <h1
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              Hola, {firstName}
            </h1>
            <p className="text-sm text-white/75 sm:text-base">
              Datos de su cuenta, modo de uso y seguridad de acceso.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-white">
            <UserRound aria-hidden className="h-3.5 w-3.5" />
            {user.activeMode === 'WORKER' ? 'Trabajador' : 'Cliente'}
          </span>
        </div>
      </section>

      <div className="animate-[home-fade-up_0.55s_ease-out_0.08s_both] space-y-5">
        <ProfileCard user={user} />
        <ModeCard user={user} />
        <div className="grid gap-5 lg:grid-cols-2">
          <EmailCard user={user} />
          <PhoneChangeCard currentPhone={user.phone} />
        </div>
        <SessionCard />
      </div>
    </div>
  );
}

function ProfileCard({ user }: { user: UserDto }) {
  const zones = useZones();
  const zone = zones.data?.find((item) => item.id === user.zoneId);

  const rows: { label: string; value: string; Icon: typeof Phone }[] = [
    { label: 'Nombre', value: user.name, Icon: UserRound },
    { label: 'Teléfono', value: formatPhoneDisplay(user.phone), Icon: Phone },
    { label: 'Correo', value: user.email ?? 'Sin correo', Icon: Mail },
    {
      label: 'Zona',
      value: zone ? zone.name : user.zoneId ? 'Cargando…' : 'Sin zona',
      Icon: MapPin,
    },
  ];

  return (
    <Card className="space-y-4 rounded-3xl shadow-[0_8px_28px_rgba(26,35,50,0.05)]">
      <div className="space-y-1">
        <CardTitle>Mi perfil</CardTitle>
        <CardDescription>Información principal de su cuenta en OficiosYa.</CardDescription>
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map(({ label, value, Icon }) => (
          <div
            key={label}
            className="flex items-start gap-3 rounded-2xl border border-border bg-accent-soft/60 px-3.5 py-3"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
              <Icon aria-hidden className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <dt className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</dt>
              <dd className="break-words font-medium text-foreground">{value}</dd>
            </div>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function ModeCard({ user }: { user: UserDto }) {
  const mutation = useSwitchMode();

  return (
    <Card className="space-y-4 rounded-3xl shadow-[0_8px_28px_rgba(26,35,50,0.05)]">
      <div className="space-y-1">
        <CardTitle>Modo de uso</CardTitle>
        <CardDescription>
          Cliente ve Buscar. Trabajador ve el Panel. Puede cambiar cuando quiera.
        </CardDescription>
      </div>
      <div role="radiogroup" aria-label="Modo de uso" className="grid gap-3 sm:grid-cols-2">
        {MODE_OPTIONS.map(({ value, label, description, Icon }) => {
          const selected = user.activeMode === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={mutation.isPending}
              onClick={() => {
                if (!selected) mutation.mutate(value);
              }}
              className={cn(
                'relative flex items-start gap-3 rounded-2xl border-2 bg-surface p-4 text-left transition disabled:opacity-60',
                selected
                  ? 'border-accent shadow-[0_6px_20px_rgba(30,58,95,0.12)]'
                  : 'border-border hover:border-brand/30 hover:bg-brand-soft/60',
              )}
            >
              {selected ? (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                  <Check aria-hidden className="h-3 w-3" strokeWidth={3} />
                </span>
              ) : null}
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  selected ? 'bg-accent text-white' : 'bg-brand-soft text-brand',
                )}
              >
                <Icon aria-hidden className="h-5 w-5" />
              </span>
              <span className="pr-6">
                <span className="block text-sm font-semibold text-foreground">{label}</span>
                <span className="block text-xs text-muted">{description}</span>
              </span>
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
  email: z.union([z.literal(''), z.email('Ingrese un correo válido').max(254)]),
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
    <Card className="rounded-3xl shadow-[0_8px_28px_rgba(26,35,50,0.05)]">
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
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? 'Guardando…' : 'Guardar correo'}
        </Button>
      </form>
    </Card>
  );
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Ingrese su contraseña actual'),
});
type PasswordValues = z.infer<typeof passwordSchema>;

/** RF-005: nuevo teléfono verificado por SMS + contraseña actual. */
function PhoneChangeCard({ currentPhone }: { currentPhone: string }) {
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
    <Card className="space-y-4 rounded-3xl shadow-[0_8px_28px_rgba(26,35,50,0.05)]">
      <div className="space-y-1">
        <CardTitle>Cambiar teléfono</CardTitle>
        <CardDescription>
          Actual: <span className="font-medium text-foreground">{formatPhoneDisplay(currentPhone)}</span>
          . Verificaremos el número nuevo con SMS.
        </CardDescription>
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
          <PhoneOtpFlow onVerified={setVerification} phoneHint="Ingrese su número nuevo." />
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
  const logout = useLogout();

  return (
    <Card className="space-y-4 rounded-3xl border-border shadow-[0_8px_28px_rgba(26,35,50,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Sesión</CardTitle>
          <CardDescription>Cierre la sesión en este dispositivo.</CardDescription>
        </div>
        <Button variant="outline" disabled={logout.isPending} onClick={() => logout.mutate()}>
          <LogOut aria-hidden className="h-4 w-4" />
          {logout.isPending ? 'Cerrando…' : 'Cerrar sesión'}
        </Button>
      </div>
    </Card>
  );
}
