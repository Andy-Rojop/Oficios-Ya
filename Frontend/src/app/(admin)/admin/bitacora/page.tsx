import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/admin-shell';
import { AuditPage } from '@/components/admin/audit-page';

export const metadata: Metadata = { title: 'Bitácora' };

export default function Page() {
  return (
    <AdminShell>
      <AuditPage />
    </AdminShell>
  );
}
