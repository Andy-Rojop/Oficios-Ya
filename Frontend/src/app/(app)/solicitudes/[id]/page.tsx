import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { RequestDetailView } from '@/components/requests/request-detail-view';

export const metadata: Metadata = { title: 'Solicitud' };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SolicitudDetallePage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    notFound();
  }
  return <RequestDetailView requestId={id} />;
}
