import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/admin-shell';
import { ReportsPage } from '@/components/admin/reports-page';

export const metadata: Metadata = { title: 'Reportes' };

export default function Page() {
  return (
    <AdminShell>
      <ReportsPage />
    </AdminShell>
  );
}
