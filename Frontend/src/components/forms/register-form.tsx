'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Briefcase, Check, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { UI_COPY } from '@/lib/ui-copy';
import { cn } from '@/lib/utils';

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
    confirmPassword: z.string().min(1, 'Confirme su contraseña'),
    zoneId: z.string().min(1, 'Seleccione su zona'),
    email: z.union([z.literal(''), z.email('Ingrese un correo válido').max(254)]),
    acceptTerms: z.boolean().refine((value) => value, 'Debe aceptar los términos y condiciones'),
    startAsWorker: z.boolean(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  });

type RegisterValues = z.infer<typeof registerSchema>;
type RegisterRole = 'CLIENT' | 'WORKER';

const ROLE_OPTIONS = [
  {
    role: 'CLIENT' as const,
    title: 'Cliente',
    badge: 'Busco un oficio',
    description: 'Encuentre plomeros, electricistas y más cerca de usted en El Asintal.',
    points: ['Mapa de oficios cercanos', 'Precios de referencia', 'Chat privado'],
    Icon: Search,
    tone: 'dark' as const,
  },
  {
    role: 'WORKER' as const,
    title: 'Trabajador',
    badge: 'Ofrezco mis servicios',
    description: 'Muestre su oficio, precios y fotos. Reciba solicitudes de clientes.',
    points: ['Perfil público', 'Solicitudes y cotizaciones', 'Más visibilidad local'],
    Icon: Briefcase,
    tone: 'accent' as const,
  },
] as const;

interface RegisterFormProps {
  /** Prefill desde /registro?mode=CLIENT|WORKER */
  initialMode?: RegisterRole | null;
}

function RolePicker({
  value,
  onChange,
  compact = false,
}: {
  value: RegisterRole | null;
  onChange: (role: RegisterRole) => void;
  compact?: boolean;
}) {
  return (
    <fieldset className="space-y-4">
      {!compact ? (
        <legend className="sr-only">¿Cómo desea registrarse?</legend>
      ) : (
        <>
          <legend className="text-sm font-semibold text-foreground">Tipo de cuenta</legend>
          <p className="text-xs text-muted">Puede cambiarlo después desde su cuenta.</p>
        </>
      )}
      <div className={cn('grid gap-3', compact ? 'grid-cols-1' : 'gap-4 lg:grid-cols-2')}>
        {ROLE_OPTIONS.map(({ role, title, badge, description, points, Icon, tone }, index) => {
          const selected = value === role;
          const isAccent = tone === 'accent';
          return (
            <button
              key={role}
              type="button"
              onClick={() => onChange(role)}
              aria-pressed={selected}
              className={cn(
                'group relative overflow-hidden rounded-3xl border text-left transition duration-200',
                'hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.14)]',
                'animate-[home-fade-up_0.65s_ease-out_both]',
                compact ? 'px-4 py-4' : 'min-h-[280px] px-5 py-6 sm:px-6 sm:py-7',
                selected
                  ? isAccent
                    ? 'border-accent bg-accent text-white shadow-[0_16px_36px_rgba(30,58,95,0.35)]'
                    : 'border-foreground bg-foreground text-white shadow-[0_16px_36px_rgba(0,0,0,0.28)]'
                  : isAccent
                    ? 'border-accent/25 bg-gradient-to-br from-accent-soft via-surface to-surface'
                    : 'border-foreground/10 bg-gradient-to-br from-brand-soft via-surface to-surface',
              )}
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div
                className={cn(
                  'pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full blur-2xl transition',
                  selected
                    ? 'bg-white/20'
                    : isAccent
                      ? 'bg-accent/25 group-hover:bg-accent/35'
                      : 'bg-foreground/10 group-hover:bg-foreground/15',
                )}
                aria-hidden
              />

              <div className="relative flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em]',
                      selected
                        ? 'bg-white/15 text-white'
                        : isAccent
                          ? 'bg-accent/15 text-accent-dark'
                          : 'bg-foreground/10 text-foreground',
                    )}
                  >
                    {badge}
                  </span>
                  <span
                    className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-2xl transition',
                      selected
                        ? 'bg-white/15 text-white'
                        : isAccent
                          ? 'bg-accent text-white'
                          : 'bg-foreground text-white',
                    )}
                  >
                    <Icon aria-hidden className="h-6 w-6" />
                  </span>
                </div>

                <h3
                  className={cn(
                    'mt-5 font-semibold tracking-tight',
                    compact ? 'text-xl' : 'text-2xl sm:text-3xl',
                  )}
                  style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
                >
                  {title}
                </h3>
                <p
                  className={cn(
                    'mt-2 text-sm leading-relaxed',
                    selected ? 'text-white/85' : 'text-muted',
                    compact && 'line-clamp-2',
                  )}
                >
                  {description}
                </p>

                {!compact ? (
                  <ul className="mt-5 space-y-2">
                    {points.map((point) => (
                      <li
                        key={point}
                        className={cn(
                          'flex items-center gap-2 text-sm font-medium',
                          selected ? 'text-white' : 'text-foreground',
                        )}
                      >
                        <Check
                          aria-hidden
                          className={cn(
                            'h-4 w-4 shrink-0',
                            selected ? 'text-white' : isAccent ? 'text-accent-dark' : 'text-foreground',
                          )}
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <span
                  className={cn(
                    'mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold',
                    selected ? 'text-white' : isAccent ? 'text-accent-dark' : 'text-foreground',
                  )}
                >
                  {selected ? 'Seleccionado' : 'Elegir'}
                  <ArrowRight
                    aria-hidden
                    className="h-4 w-4 transition group-hover:translate-x-0.5"
                  />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function RegisterPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-md space-y-5 py-4 sm:py-8">
      <header className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-dark">OficiosYa</p>
        <h1
          className="text-3xl font-semibold tracking-tight"
          style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
        >
          {title}
        </h1>
        <p className="text-muted">{description}</p>
      </header>
      <div className="rounded-3xl border border-border bg-surface p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] sm:p-6">
        {children}
      </div>
    </section>
  );
}

export function RegisterForm({ initialMode = null }: RegisterFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [role, setRole] = useState<RegisterRole | null>(initialMode);
  const [verification, setVerification] = useState<PhoneVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const zones = useZones();

  const {
    register,
    handleSubmit,
    control,
    setValue,
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
      startAsWorker: initialMode === 'WORKER',
    },
  });

  useEffect(() => {
    if (role) {
      setValue('startAsWorker', role === 'WORKER');
    }
  }, [role, setValue]);

  if (!role) {
    return (
      <section className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 -mt-6 overflow-hidden">
        <div className="absolute inset-0 bg-foreground" aria-hidden />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_15%_20%,rgba(30,58,95,0.4),transparent_42%),radial-gradient(ellipse_at_85%_10%,rgba(255,255,255,0.1),transparent_40%)]"
          aria-hidden
        />
        <div
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/40 to-transparent"
          aria-hidden
        />

        <div className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="max-w-xl animate-[home-fade-up_0.65s_ease-out_both]">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">El Asintal</p>
            <h1
              className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-white sm:text-5xl"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              Cree su cuenta en OficiosYa
            </h1>
            <p className="mt-3 max-w-md text-base text-white/75 sm:text-lg">
              Elija cómo usará la app. Después verificará su teléfono en un minuto.
            </p>
          </div>

          <div className="mt-8 sm:mt-10">
            <RolePicker value={role} onChange={setRole} />
          </div>

          <p className="mt-8 text-center text-sm text-white/65 sm:text-left">
            {UI_COPY.alreadyHaveAccount}{' '}
            <Link href="/ingresar" className="font-semibold text-white underline underline-offset-4">
              {UI_COPY.login}
            </Link>
          </p>
        </div>
      </section>
    );
  }

  if (!verification) {
    return (
      <RegisterPanel
        title="Verifique su teléfono"
        description={`Se registrará como ${role === 'WORKER' ? 'trabajador' : 'cliente'}. Le enviamos un código por SMS.`}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-brand-soft/70 px-3 py-2.5 text-sm">
          <span>
            Modo:{' '}
            <strong className={role === 'WORKER' ? 'text-accent-dark' : ''}>
              {role === 'WORKER' ? 'Trabajador' : 'Cliente'}
            </strong>
          </span>
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            onClick={() => setRole(null)}
          >
            Cambiar
          </button>
        </div>
        <PhoneOtpFlow onVerified={setVerification} />
      </RegisterPanel>
    );
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
      router.replace(user.activeMode === 'WORKER' ? '/panel' : '/');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  });

  return (
    <RegisterPanel
      title="Complete su perfil"
      description="Ya verificó el teléfono. Ahora creamos su cuenta."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <FormMessage tone="success">
          Teléfono verificado: <strong>{formatPhoneDisplay(verification.phone)}</strong>
        </FormMessage>

        <Controller
          name="startAsWorker"
          control={control}
          render={({ field }) => (
            <RolePicker
              compact
              value={field.value ? 'WORKER' : 'CLIENT'}
              onChange={(next) => {
                setRole(next);
                field.onChange(next === 'WORKER');
              }}
            />
          )}
        />

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
            <Input
              {...aria}
              type="password"
              autoComplete="new-password"
              {...register('password')}
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

        <FormField
          id="zoneId"
          label="Zona donde vive"
          hint="Aldea, cantón o caserío de El Asintal."
          error={
            errors.zoneId?.message ??
            (zones.isError ? 'No se pudieron cargar las zonas.' : undefined)
          }
        >
          {(aria) => (
            <Select {...aria} {...register('zoneId')} disabled={zones.isLoading}>
              <option value="">{zones.isLoading ? 'Cargando zonas…' : 'Seleccione su zona'}</option>
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

        {error ? <FormMessage tone="error">{error}</FormMessage> : null}

        <Button
          type="submit"
          className="w-full"
          variant={role === 'WORKER' ? 'accent' : 'default'}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Creando cuenta…'
            : role === 'WORKER'
              ? 'Crear cuenta de trabajador'
              : 'Crear cuenta de cliente'}
        </Button>

        <p className="text-center text-sm text-muted">
          {UI_COPY.alreadyHaveAccount}{' '}
          <Link
            href="/ingresar"
            className="font-medium text-brand underline-offset-4 hover:underline"
          >
            {UI_COPY.login}
          </Link>
        </p>
      </form>
    </RegisterPanel>
  );
}
