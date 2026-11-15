import { AdminShell } from '@/components/admin/admin-shell';
import { ModerationExtrasPage } from '@/components/admin/moderation-extras-page';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Aprobaciones' };

export default function AdminAprobacionesPage() {
  return (
    <AdminShell>
      <ModerationExtrasPage />
    </AdminShell>
  );
}
