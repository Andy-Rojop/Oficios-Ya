import type { Metadata } from 'next';
import { RequestsView } from '@/components/requests/requests-view';

export const metadata: Metadata = { title: 'Solicitudes' };

export default function SolicitudesPage() {
  return <RequestsView />;
}
