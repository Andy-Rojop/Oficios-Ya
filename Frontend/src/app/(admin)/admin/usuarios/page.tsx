import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/admin-shell';
import { UsersPage } from '@/components/admin/users-page';

export const metadata: Metadata = { title: 'Usuarios' };

export default function Page() {
  return (
    <AdminShell>
      <UsersPage />
    </AdminShell>
  );
}
