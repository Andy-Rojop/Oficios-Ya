'use client';

import {
  Briefcase,
  ClipboardList,
  ImageIcon,
  MapPin,
  MessageSquare,
  Shield,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';

const SECTIONS = [
  {
    title: 'Disponibilidad y perfil',
    hint: 'El trabajador activa su oferta, escribe titular y descripción.',
    Icon: Briefcase,
  },
  {
    title: 'Zonas de cobertura',
    hint: 'Elige en qué zonas de El Asintal atiende.',
    Icon: MapPin,
  },
  {
    title: 'Servicios y oficios',
    hint: 'Publica categorías; las nuevas pasan por Aprobaciones.',
    Icon: Wrench,
  },
  {
    title: 'Portafolio',
    hint: 'Fotos de trabajos; usted las modera en Aprobaciones si aplica.',
    Icon: ImageIcon,
  },
  {
    title: 'Solicitudes y mensajes',
    hint: 'Pedidos de clientes y chat viven en esas pantallas del trabajador.',
    Icon: ClipboardList,
  },
] as const;

/** Vista de consulta: cómo se ve el panel de trabajadores (sin cuenta propia). */
export function StaffWorkerPreview() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-brand px-5 py-7 text-white sm:px-7 sm:py-8">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_20%,rgba(30,58,95,0.45),transparent_42%),radial-gradient(ellipse_at_90%_0%,rgba(255,255,255,0.08),transparent_40%)]"
          aria-hidden
        />
        <div className="relative space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white">
            Panel de trabajadores
          </p>
          <h1
            className="text-3xl font-semibold tracking-tight sm:text-4xl"
            style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
          >
            Vista de administración
          </h1>
          <p className="max-w-xl text-sm text-white/75 sm:text-base">
            Así gestiona cada trabajador su oficio. Su cuenta admin no publica servicios; use el
            panel de administración para aprobar, suspender o revisar.
          </p>
        </div>

        <ul className="relative mt-6 grid gap-2 sm:grid-cols-3">
          <li>
            <Link
              href="/admin/aprobaciones"
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-3 transition hover:bg-white/15"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Shield aria-hidden className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">Aprobaciones</span>
                <span className="block text-xs text-white/65">Fotos y oficios</span>
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/admin/usuarios"
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-3 transition hover:bg-white/15"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <Briefcase aria-hidden className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">Usuarios</span>
                <span className="block text-xs text-white/65">Suspender o banear</span>
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/buscar"
              className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-3 transition hover:bg-white/15"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <MessageSquare aria-hidden className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">App clientes</span>
                <span className="block text-xs text-white/65">Cómo buscan oficios</span>
              </span>
            </Link>
          </li>
        </ul>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map(({ title, hint, Icon }) => (
          <Card key={title} className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon aria-hidden className="h-4 w-4 text-brand" />
              {title}
            </CardTitle>
            <CardDescription>{hint}</CardDescription>
          </Card>
        ))}
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Volver al panel admin</CardTitle>
          <CardDescription>Aprobaciones, verificaciones, reportes y catálogos.</CardDescription>
        </div>
        <Link
          href="/admin"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Abrir administración
        </Link>
      </Card>
    </div>
  );
}
