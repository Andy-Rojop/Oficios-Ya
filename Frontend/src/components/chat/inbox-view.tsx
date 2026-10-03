'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { getErrorMessage, isUnauthorized, useMe } from '@/lib/auth';
import {
  CHAT_QUERY_KEYS,
  chatApi,
  formatInboxTime,
  upsertConversation,
  type ConversationSummary,
} from '@/lib/chat';
import { CHAT_EVENTS } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { useChatEvent, useChatSocket } from './use-chat-socket';

export function InboxView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useMe();
  const { connected } = useChatSocket();

  const conversations = useQuery<ConversationSummary[], Error>({
    queryKey: CHAT_QUERY_KEYS.conversations,
    queryFn: chatApi.listConversations,
    refetchOnMount: 'always',
  });

  // Mensajes nuevos de cualquier conversación: actualiza la bandeja en vivo.
  useChatEvent<ConversationSummary>(CHAT_EVENTS.CONVERSATION_UPDATED, (summary) => {
    queryClient.setQueryData<ConversationSummary[]>(CHAT_QUERY_KEYS.conversations, (current) =>
      upsertConversation(current, summary),
    );
  });

  // Al (re)conectar se recupera lo que pudo llegar mientras no había conexión.
  useEffect(() => {
    if (connected) {
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations });
    }
  }, [connected, queryClient]);

  useEffect(() => {
    if (isUnauthorized(me.error) || isUnauthorized(conversations.error)) {
      router.replace('/ingresar?next=/mensajes');
    }
  }, [me.error, conversations.error, router]);

  const list = conversations.data ?? [];

  return (
    <section className="mx-auto w-full max-w-2xl space-y-4">
      <header className="flex items-center justify-between gap-3">
        <h1
          className="text-2xl font-semibold"
          style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
        >
          Mensajes
        </h1>
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-semibold',
            connected ? 'bg-brand-soft text-brand-dark' : 'bg-border text-muted',
          )}
          aria-live="polite"
        >
          {connected ? 'En línea' : 'Conectando…'}
        </span>
      </header>

      {conversations.isLoading ? (
        <p className="text-muted">Cargando tus conversaciones…</p>
      ) : conversations.isError && !isUnauthorized(conversations.error) ? (
        <Card className="space-y-3">
          <p role="alert" className="text-sm font-medium text-red-700">
            {getErrorMessage(conversations.error)}
          </p>
          <button
            className="text-sm font-semibold text-brand underline"
            onClick={() => conversations.refetch()}
          >
            Reintentar
          </button>
        </Card>
      ) : list.length === 0 ? (
        <Card className="space-y-2 text-center">
          <p className="font-semibold">Aún no tienes conversaciones</p>
          <p className="text-sm text-muted">
            Busca un trabajador y toca «Contactar» en su perfil para escribirle.
          </p>
          <Link href="/buscar" className="inline-block text-sm font-semibold text-brand underline">
            Buscar trabajadores
          </Link>
        </Card>
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
          {list.map((conversation) => (
            <ConversationRow key={conversation.id} conversation={conversation} meId={me.data?.id} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ConversationRow({
  conversation,
  meId,
}: {
  conversation: ConversationSummary;
  meId?: string;
}) {
  const { peer, lastMessage, unreadCount } = conversation;
  const unread = unreadCount > 0;
  const prefix = lastMessage && lastMessage.senderId === meId ? 'Tú: ' : '';

  return (
    <li className="border-b border-border/70 last:border-0">
      <Link
        href={`/mensajes/${conversation.id}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-brand-soft/60"
      >
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-lg font-semibold text-brand-dark"
        >
          {peer.name.trim().charAt(0).toUpperCase() || '?'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={cn('truncate', unread ? 'font-bold' : 'font-semibold')}>
              {peer.name}
            </span>
            <time className="shrink-0 text-xs text-muted" dateTime={conversation.updatedAt}>
              {lastMessage ? formatInboxTime(conversation.updatedAt) : ''}
            </time>
          </span>
          {peer.headline ? (
            <span className="block truncate text-xs text-brand-dark">{peer.headline}</span>
          ) : null}
          <span className="flex items-center justify-between gap-2">
            <span
              className={cn(
                'truncate text-sm',
                unread ? 'font-semibold text-foreground' : 'text-muted',
              )}
            >
              {lastMessage ? `${prefix}${lastMessage.preview}` : 'Aún no hay mensajes'}
            </span>
            {unread ? (
              <span
                className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand px-1.5 text-xs font-bold text-white"
                aria-label={`${unreadCount} sin leer`}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            ) : null}
          </span>
        </span>
      </Link>
    </li>
  );
}
