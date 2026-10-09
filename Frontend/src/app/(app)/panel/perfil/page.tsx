import type { Metadata } from 'next';
import { PanelProfileEditor } from '@/components/worker/panel-profile-editor';

export const metadata: Metadata = { title: 'Editar perfil' };

export default function PanelPerfilPage() {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <PanelProfileEditor />
    </section>
  );
}
