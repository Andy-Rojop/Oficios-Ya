import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/admin-shell';
import { CatalogsPage } from '@/components/admin/catalogs-page';

export const metadata: Metadata = { title: 'Catálogos' };

export default function Page() {
  return (
    <AdminShell>
      <CatalogsPage />
    </AdminShell>
  );
}
