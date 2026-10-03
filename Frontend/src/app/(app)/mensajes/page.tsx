import type { Metadata } from 'next';
import { InboxView } from '@/components/chat/inbox-view';

export const metadata: Metadata = { title: 'Mensajes' };

export default function MensajesPage() {
  return <InboxView />;
}
