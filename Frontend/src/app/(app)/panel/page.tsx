import type { Metadata } from 'next';
import { WorkerDashboard } from '@/components/worker/worker-dashboard';

export const metadata: Metadata = { title: 'Mi panel' };

export default function PanelPage() {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <WorkerDashboard />
    </section>
  );
}
