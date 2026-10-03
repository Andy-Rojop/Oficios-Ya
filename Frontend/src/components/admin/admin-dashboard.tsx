'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { ADMIN_QUERY_KEYS, adminApi } from '@/lib/admin';
import { getErrorMessage } from '@/lib/auth';

const LINKS = [
  { href: '/admin/verificaciones', label: 'Verificaciones', hint: 'Identidades pendientes' },
  { href: '/admin/reportes', label: 'Reportes', hint: 'Moderación de chat y reseñas' },
  { href: '/admin/catalogos', label: 'Catálogos', hint: 'Categorías y zonas' },
  { href: '/admin/usuarios', label: 'Usuarios', hint: 'Suspender o reactivar' },
  { href: '/admin/bitacora', label: 'Bitácora', hint: 'Auditoría de acciones' },
];

export function AdminDashboard() {
  const stats = useQuery({ queryKey: ADMIN_QUERY_KEYS.stats, queryFn: adminApi.stats });

  return (
    <section className="space-y-4">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
        >
          Administración
        </h1>
        <p className="text-sm text-muted">Panel de moderación y catálogos de OficiosYa.</p>
      </div>

      {stats.isLoading ? (
        <p className="text-muted">Cargando estadísticas…</p>
      ) : stats.isError ? (
        <Card>
          <p role="alert" className="text-sm text-red-700">
            {getErrorMessage(stats.error)}
          </p>
        </Card>
      ) : stats.data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Usuarios" value={stats.data.users} />
          <StatCard label="Trabajadores" value={stats.data.workers} />
          <StatCard label="Reportes abiertos" value={stats.data.openReports} />
        </div>
      ) : null}

      {stats.data ? (
        <Card className="space-y-2">
          <h2 className="text-sm font-semibold">Solicitudes por estado</h2>
          <ul className="grid gap-1 text-sm sm:grid-cols-3">
            {Object.entries(stats.data.requestsByStatus).map(([status, count]) => (
              <li key={status} className="flex justify-between rounded-md bg-border/40 px-2 py-1">
                <span className="text-muted">{status}</span>
                <span className="font-semibold">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-2xl border border-border bg-surface p-4 shadow-sm transition hover:bg-brand-soft/50"
          >
            <p className="font-semibold">{link.label}</p>
            <p className="text-sm text-muted">{link.hint}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
    </Card>
  );
}
