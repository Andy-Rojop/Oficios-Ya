import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/admin-shell';
import { AdminDashboard } from '@/components/admin/admin-dashboard';

export const metadata: Metadata = { title: 'Administración' };

export default function AdminPage() {
  return (
    <AdminShell>
      <AdminDashboard />
    </AdminShell>
  );
}
