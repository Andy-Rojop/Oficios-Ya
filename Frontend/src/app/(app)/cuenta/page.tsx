import type { Metadata } from 'next';
import { AccountPanel } from '@/components/forms/account-panel';

export const metadata: Metadata = { title: 'Mi cuenta' };

export default function CuentaPage() {
  return (
    <section className="mx-auto w-full max-w-2xl space-y-5">
      <h1
        className="text-3xl font-semibold tracking-tight"
        style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
      >
        Mi cuenta
      </h1>
      <AccountPanel />
    </section>
  );
}
