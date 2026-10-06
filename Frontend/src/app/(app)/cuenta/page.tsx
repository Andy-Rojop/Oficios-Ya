import type { Metadata } from 'next';
import { AccountPanel } from '@/components/forms/account-panel';

export const metadata: Metadata = { title: 'Mi cuenta' };

export default function CuentaPage() {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <AccountPanel />
    </section>
  );
}
