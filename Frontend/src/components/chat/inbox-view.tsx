'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Search, Wifi, WifiOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChatAvatar } from './chat-avatar';
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
  const [query, setQuery] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const needle = query.trim().toLowerCase();
  const visible = list.filter((conversation) => {
    if (onlyUnread && conversation.unreadCount === 0) return false;
    if (!needle) return true;
    const preview = conversation.lastMessage?.preview ?? '';
    const haystack = `${conversation.peer.name} ${conversation.peer.headline ?? ''} ${preview}`.toLowerCase();
    return haystack.includes(needle);
  });

  const isWorkerMode = me.data?.activeMode === 'WORKER';
  const searchPlaceholder = onlyUnread
    ? 'Buscar en mensajes no leídos…'
    : isWorkerMode
      ? 'Buscar cliente o mensaje…'
      : 'Buscar trabajador, oficio o mensaje…';

  const contextualPeerSuggestions = (() => {
    const base = onlyUnread ? list.filter((c) => c.unreadCount > 0) : list;
    return base
      .filter((c) => {
        if (!needle) return true;
        const text = `${c.peer.name} ${c.peer.headline ?? ''}`.toLowerCase();
        return text.includes(needle) && c.peer.name.toLowerCase() !== needle;
      })
      .slice(0, 5);
  })();

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <header className="border-b border-border px-4 pb-3 pt-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[1.65rem] font-semibold tracking-tight">Mensajes</h1>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 text-xs font-medium',
              connected ? 'text-[#1f6b4a]' : 'text-muted',
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
        <div className="relative mt-3">
          <label className="flex items-center gap-2 rounded-full bg-background px-3 py-2">
            <Search aria-hidden className="h-4 w-4 shrink-0 text-muted" />
            <input
              value={query}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </label>
          {searchFocused && contextualPeerSuggestions.length > 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Sugerencias:
              </span>
              {contextualPeerSuggestions.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setQuery(conv.peer.name);
                    setSearchFocused(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition hover:border-accent hover:bg-accent-soft"
                >
                  <span>{conv.peer.name}</span>
                  {conv.peer.headline ? (
                    <span className="text-muted">· {conv.peer.headline}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mt-3 flex gap-2">
          <FilterChip active={!onlyUnread} onClick={() => setOnlyUnread(false)}>
            Todas
          </FilterChip>
          <FilterChip active={onlyUnread} onClick={() => setOnlyUnread(true)}>
            No leídas{unreadTotal > 0 ? ` ${unreadTotal}` : ''}
          </FilterChip>
        </div>
      </header>

      <div>
        {conversations.isLoading ? (
          <p className="px-4 py-8 text-sm text-muted">Cargando sus conversaciones…</p>
        ) : conversations.isError && !isUnauthorized(conversations.error) ? (
          <div className="space-y-3 px-4 py-8">
            <p role="alert" className="text-sm font-medium text-red-700">
              {getErrorMessage(conversations.error)}
            </p>
            <Button variant="outline" size="sm" onClick={() => conversations.refetch()}>
              Reintentar
            </Button>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white">
              <MessageSquare aria-hidden className="h-7 w-7" />
            </span>
            <div className="space-y-1">
              <p className="text-lg font-semibold">Aún no tiene conversaciones</p>
              <p className="mx-auto max-w-sm text-sm text-muted">
                Busque un trabajador y toque «Contactar» en su perfil para escribirle.
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
                Cuando un cliente lo contacte, la conversación aparecerá aquí.
              </p>
            )}
          </div>
        ) : visible.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">
            Ninguna conversación coincide con esa búsqueda.
          </p>
        ) : (
          <ul>
            {visible.map((conversation) => (
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
  const prefix = lastMessage && lastMessage.senderId === meId ? 'Yo: ' : '';
  const preview = lastMessage
    ? `${prefix}${lastMessage.preview}`
    : peer.headline || 'Aún no hay mensajes';

  return (
    <li className="group">
      <Link
        href={`/mensajes/${conversation.id}`}
        className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-black/[0.04] sm:px-4"
      >
        <ChatAvatar name={peer.name} className="h-12 w-12 text-lg" />
        <span className="min-w-0 flex-1 border-b border-border/80 py-1 group-last:border-b-0">
          <span className="flex items-baseline justify-between gap-3">
            <span className={cn('truncate text-[16px]', unread ? 'font-bold' : 'font-medium')}>
              {peer.name}
            </span>
            <time
              className={cn(
                'shrink-0 text-xs',
                unread ? 'font-semibold text-[#1f6b4a]' : 'text-muted',
              )}
              dateTime={conversation.updatedAt}
            >
              {lastMessage ? formatInboxTime(conversation.updatedAt) : ''}
            </time>
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-3">
            <span className={cn('truncate text-sm', unread ? 'text-foreground' : 'text-muted')}>
              {preview}
            </span>
            {unread ? (
              <span
                className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#1f6b4a] px-1.5 text-[11px] font-bold text-white"
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

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-1 text-sm font-medium transition-colors',
        active ? 'bg-brand text-white' : 'bg-background text-foreground hover:bg-brand-soft',
      )}
    >
      {children}
    </button>
  );
}
