import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ThreadView } from '@/components/chat/thread-view';

export const metadata: Metadata = { title: 'Conversación' };

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConversacionPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID_REGEX.test(id)) {
    notFound();
  }
  return <ThreadView conversationId={id} />;
}
