'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Search, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
  const unreadTotal = list.reduce((sum, item) => sum + item.unreadCount, 0);

  return (
    <section className="mx-auto w-full max-w-3xl space-y-5">
      <header className="relative overflow-hidden rounded-3xl bg-brand px-5 py-7 text-white sm:px-7 sm:py-8 animate-[home-fade-up_0.55s_ease-out_both]">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_20%,rgba(30,58,95,0.55),transparent_45%),radial-gradient(ellipse_at_90%_0%,rgba(255,255,255,0.08),transparent_40%)]"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/90">Bandeja</p>
            <h1
              className="text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ fontFamily: 'var(--font-display), Georgia, serif' }}
            >
              Mensajes
            </h1>
            <p className="text-sm text-white/75 sm:text-base">
              {list.length === 0
                ? 'Tus conversaciones con clientes y trabajadores aparecen aquí.'
                : unreadTotal > 0
                  ? `${unreadTotal} sin leer · ${list.length} conversación${list.length === 1 ? '' : 'es'}`
                  : `${list.length} conversación${list.length === 1 ? '' : 'es'}`}
            </p>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]',
              connected ? 'bg-accent text-white' : 'bg-white/15 text-white/80',
            )}
            aria-live="polite"
          >
            {connected ? (
              <Wifi aria-hidden className="h-3.5 w-3.5" />
            ) : (
              <WifiOff aria-hidden className="h-3.5 w-3.5" />
            )}
            {connected ? 'En línea' : 'Conectando…'}
          </span>
        </div>
      </header>

      <div className="animate-[home-fade-up_0.55s_ease-out_0.08s_both]">
        {conversations.isLoading ? (
          <Card className="rounded-3xl shadow-[0_8px_28px_rgba(26,35,50,0.05)]">
            <p className="text-muted">Cargando tus conversaciones…</p>
          </Card>
        ) : conversations.isError && !isUnauthorized(conversations.error) ? (
          <Card className="space-y-3 rounded-3xl shadow-[0_8px_28px_rgba(26,35,50,0.05)]">
            <p role="alert" className="text-sm font-medium text-red-700">
              {getErrorMessage(conversations.error)}
            </p>
            <Button variant="outline" size="sm" onClick={() => conversations.refetch()}>
              Reintentar
            </Button>
          </Card>
        ) : list.length === 0 ? (
          <Card className="flex flex-col items-center gap-4 rounded-3xl px-6 py-10 text-center shadow-[0_8px_28px_rgba(26,35,50,0.05)]">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white">
              <MessageSquare aria-hidden className="h-7 w-7" />
            </span>
            <div className="space-y-1">
              <p className="text-lg font-semibold">Aún no tienes conversaciones</p>
              <p className="mx-auto max-w-sm text-sm text-muted">
                Buscá un trabajador y tocá «Contactar» en su perfil para escribirle.
              </p>
            </div>
            {me.data?.activeMode !== 'WORKER' ? (
              <Link
                href="/buscar"
                className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                <Search aria-hidden className="h-4 w-4" />
                Buscar trabajadores
              </Link>
            ) : (
              <p className="text-sm text-muted">
                Cuando un cliente te contacte, la conversación aparecerá aquí.
              </p>
            )}
          </Card>
        ) : (
          <ul className="overflow-hidden rounded-3xl border border-border bg-surface shadow-[0_8px_28px_rgba(26,35,50,0.05)]">
            {list.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                meId={me.data?.id}
              />
            ))}
          </ul>
        )}
      </div>
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
  const initial = peer.name.trim().charAt(0).toUpperCase() || '?';

  return (
    <li className="border-b border-border/70 last:border-0">
      <Link
        href={`/mensajes/${conversation.id}`}
        className={cn(
          'flex items-center gap-3.5 px-4 py-4 transition-colors sm:px-5',
          unread ? 'bg-accent-soft/50 hover:bg-accent-soft/80' : 'hover:bg-brand-soft/70',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold',
            unread ? 'bg-accent text-white' : 'bg-brand text-white',
          )}
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className={cn('truncate text-[15px]', unread ? 'font-bold' : 'font-semibold')}>
              {peer.name}
            </span>
            <time
              className={cn('shrink-0 text-xs', unread ? 'font-semibold text-accent' : 'text-muted')}
              dateTime={conversation.updatedAt}
            >
              {lastMessage ? formatInboxTime(conversation.updatedAt) : ''}
            </time>
          </span>
          {peer.headline ? (
            <span className="mt-0.5 block truncate text-xs text-muted">{peer.headline}</span>
          ) : null}
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span
              className={cn(
                'truncate text-sm',
                unread ? 'font-medium text-foreground' : 'text-muted',
              )}
            >
              {lastMessage ? `${prefix}${lastMessage.preview}` : 'Aún no hay mensajes'}
            </span>
            {unread ? (
              <span
                className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-white"
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
