import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/admin-shell';
import { VerificationsPage } from '@/components/admin/verifications-page';

export const metadata: Metadata = { title: 'Verificaciones' };

export default function Page() {
  return (
    <AdminShell>
      <VerificationsPage />
    </AdminShell>
  );
}
