'use client';

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { RequestFormDialog } from '@/components/requests/request-form-dialog';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import { getErrorMessage, isUnauthorized, useMe } from '@/lib/auth';
import {
  CHAT_QUERY_KEYS,
  chatApi,
  formatDayLabel,
  isSameDay,
  MESSAGE_MAX_LENGTH,
  type ChatMessage,
  type ConversationSummary,
  type MessageReadReceipt,
  type MessagesPage,
  type SendMessageInput,
} from '@/lib/chat';
import { CHAT_EVENTS, emitWithAck, getChatSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';
import { AddressShareDialog, type AddressPayload } from './address-share-dialog';
import { MessageBubble } from './message-bubble';
import { ReportDialog } from './report-dialog';
import { useChatEvent, useChatSocket } from './use-chat-socket';

type MessagesData = InfiniteData<MessagesPage, string | undefined>;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function ThreadView({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const me = useMe();
  const meId = me.data?.id;
  const { connected } = useChatSocket();

  const conversationKey = CHAT_QUERY_KEYS.conversation(conversationId);
  const messagesKey = CHAT_QUERY_KEYS.messages(conversationId);

  const conversation = useQuery<ConversationSummary, Error>({
    queryKey: conversationKey,
    queryFn: () => chatApi.getConversation(conversationId),
    refetchOnMount: 'always',
    retry: false,
  });

  const messagesQuery = useInfiniteQuery<
    MessagesPage,
    Error,
    MessagesData,
    readonly unknown[],
    string | undefined
  >({
    queryKey: messagesKey,
    queryFn: ({ pageParam }) => chatApi.listMessages(conversationId, pageParam),
    initialPageParam: undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    refetchOnMount: 'always',
    retry: false,
  });

  /** Mensajes en orden cronológico (los más antiguos arriba). */
  const messages = useMemo(
    () => (messagesQuery.data?.pages.flatMap((page) => page.items) ?? []).slice().reverse(),
    [messagesQuery.data],
  );

  const lastOwnReadId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const message = messages[i];
      if (message && message.senderId === meId) return message.readAt ? message.id : null;
    }
    return null;
  }, [messages, meId]);

  // --- Caché local ------------------------------------------------------------------------

  const addMessage = useCallback(
    (message: ChatMessage) => {
      queryClient.setQueryData<MessagesData>(messagesKey, (data) => {
        if (!data || data.pages.length === 0) return data;
        if (data.pages.some((page) => page.items.some((item) => item.id === message.id)))
          return data;
        const [first, ...rest] = data.pages;
        if (!first) return data;
        return { ...data, pages: [{ ...first, items: [message, ...first.items] }, ...rest] };
      });
    },
    [queryClient, messagesKey],
  );

  const markReadOnServer = useCallback(() => {
    emitWithAck(getChatSocket(), CHAT_EVENTS.READ, { conversationId }).catch(() => undefined);
  }, [conversationId]);

  // --- Tiempo real ------------------------------------------------------------------------

  useChatEvent<ChatMessage>(CHAT_EVENTS.MESSAGE_NEW, (message) => {
    if (message.conversationId !== conversationId) return;
    addMessage(message);
    if (message.senderId !== meId) markReadOnServer();
  });

  useChatEvent<MessageReadReceipt>(CHAT_EVENTS.MESSAGE_READ, (receipt) => {
    if (receipt.conversationId !== conversationId || receipt.readerId === meId) return;
    queryClient.setQueryData<MessagesData>(messagesKey, (data) =>
      data
        ? {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.map((item) =>
                item.senderId === meId && !item.readAt ? { ...item, readAt: receipt.readAt } : item,
              ),
            })),
          }
        : data,
    );
  });

  useChatEvent<ConversationSummary>(CHAT_EVENTS.CONVERSATION_UPDATED, (summary) => {
    if (summary.id === conversationId) queryClient.setQueryData(conversationKey, summary);
  });

  // Al conectar (o reconectar): entra a la conversación, marca como leído y recupera lo perdido.
  const firstConnect = useRef(true);
  useEffect(() => {
    if (!connected) return;
    const socket = getChatSocket();
    emitWithAck(socket, CHAT_EVENTS.JOIN, { conversationId })
      .then(() => emitWithAck(socket, CHAT_EVENTS.READ, { conversationId }))
      .catch(() => undefined);
    if (firstConnect.current) {
      firstConnect.current = false;
    } else {
      void queryClient.invalidateQueries({ queryKey: messagesKey });
      void queryClient.invalidateQueries({ queryKey: conversationKey });
    }
  }, [connected, conversationId, queryClient, messagesKey, conversationKey]);

  // Si al cargar el historial hay mensajes sin leer y el socket ya está listo, se marcan.
  const unreadCount = conversation.data?.unreadCount ?? 0;
  useEffect(() => {
    if (connected && unreadCount > 0) markReadOnServer();
  }, [connected, unreadCount, markReadOnServer]);

  useEffect(() => {
    if (isUnauthorized(me.error) || isUnauthorized(conversation.error)) {
      router.replace(`/ingresar?next=/mensajes/${conversationId}`);
    }
  }, [me.error, conversation.error, router, conversationId]);

  // --- Scroll -----------------------------------------------------------------------------

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const previousScrollHeight = useRef<number | null>(null);

  useLayoutEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    if (previousScrollHeight.current !== null) {
      // Se cargaron mensajes anteriores: mantiene la posición de lectura.
      element.scrollTop = element.scrollHeight - previousScrollHeight.current;
      previousScrollHeight.current = null;
    } else if (stickToBottom.current) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages]);

  function onScroll() {
    const element = scrollRef.current;
    if (!element) return;
    stickToBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
  }

  function loadOlder() {
    previousScrollHeight.current = scrollRef.current?.scrollHeight ?? null;
    void messagesQuery.fetchNextPage();
  }

  // --- Envío ------------------------------------------------------------------------------

  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'text' | 'image' | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [addressOpen, setAddressOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const deliver = useCallback(
    async (input: Omit<SendMessageInput, 'conversationId'>) => {
      const message = await emitWithAck<ChatMessage>(getChatSocket(), CHAT_EVENTS.SEND, {
        conversationId,
        ...input,
      });
      stickToBottom.current = true;
      addMessage(message);
    },
    [conversationId, addMessage],
  );

  async function sendText() {
    const content = text.trim();
    if (!content || busy) return;
    setBusy('text');
    setSendError(null);
    try {
      await deliver({ type: 'TEXT', content });
      setText('');
    } catch (error) {
      setSendError(getErrorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function sendImage(file: File) {
    if (!file.type.startsWith('image/')) {
      setSendError('Elige un archivo de imagen (JPG, PNG o WebP).');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setSendError('La imagen supera el tamaño máximo de 5 MB.');
      return;
    }
    setBusy('image');
    setSendError(null);
    try {
      const { imagePath } = await chatApi.uploadImage(conversationId, file);
      await deliver({ type: 'IMAGE', imagePath });
    } catch (error) {
      setSendError(getErrorMessage(error));
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function sendAddress(payload: AddressPayload) {
    await deliver({ type: 'ADDRESS', ...payload });
  }

  // --- Bloqueo ----------------------------------------------------------------------------

  const toggleBlock = useMutation({
    mutationFn: (block: boolean) =>
      block ? chatApi.block(conversationId) : chatApi.unblock(conversationId),
    onSuccess: (summary) => {
      queryClient.setQueryData(conversationKey, summary);
      void queryClient.invalidateQueries({ queryKey: CHAT_QUERY_KEYS.conversations });
    },
  });

  // --- Render -----------------------------------------------------------------------------

  if (conversation.isError) {
    const notFound =
      conversation.error instanceof ApiError && conversation.error.statusCode === 404;
    if (isUnauthorized(conversation.error)) return null;
    return (
      <section className="mx-auto w-full max-w-2xl space-y-3 text-center">
        <p role="alert" className="font-semibold">
          {notFound ? 'No encontramos esta conversación.' : getErrorMessage(conversation.error)}
        </p>
        <Link href="/mensajes" className="text-sm font-semibold text-brand underline">
          Volver a mis mensajes
        </Link>
      </section>
    );
  }

  const summary = conversation.data;
  const canSend = summary?.canSend ?? false;

  return (
    <section className="mx-auto flex h-[calc(100dvh-8.5rem)] min-h-[26rem] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <header className="relative flex items-center gap-2 border-b border-border bg-surface px-3 py-2.5">
        <Link
          href="/mensajes"
          aria-label="Volver a mis mensajes"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-brand hover:bg-brand-soft"
        >
          ←
        </Link>
        <div className="min-w-0 flex-1">
          {summary ? (
            <>
              <p className="truncate font-semibold leading-tight">
                {summary.peer.workerProfileId ? (
                  <Link
                    href={`/trabajador/${summary.peer.workerProfileId}`}
                    className="hover:underline"
                  >
                    {summary.peer.name}
                  </Link>
                ) : (
                  summary.peer.name
                )}
              </p>
              <p className="truncate text-xs text-brand-dark">
                {summary.peer.headline ?? (connected ? 'En línea' : 'Conectando…')}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">Cargando…</p>
          )}
        </div>
        {summary ? (
          <div className="relative">
            <button
              type="button"
              aria-label="Más opciones"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-muted hover:bg-brand-soft"
            >
              ⋮
            </button>
            {menuOpen ? (
              <ul className="absolute right-0 top-11 z-20 w-48 overflow-hidden rounded-xl border border-border bg-surface text-sm shadow-lg">
                {summary.peer.workerProfileId ? (
                  <li>
                    <button
                      type="button"
                      className="block w-full px-4 py-3 text-left font-semibold text-brand hover:bg-brand-soft"
                      onClick={() => {
                        setMenuOpen(false);
                        setRequestOpen(true);
                      }}
                    >
                      Solicitar servicio
                    </button>
                  </li>
                ) : null}
                <li>
                  <button
                    type="button"
                    className="block w-full px-4 py-3 text-left hover:bg-brand-soft"
                    disabled={toggleBlock.isPending}
                    onClick={() => {
                      setMenuOpen(false);
                      if (summary.blockedByMe) {
                        toggleBlock.mutate(false);
                      } else if (
                        window.confirm(
                          `¿Bloquear a ${summary.peer.name}? Ninguno de los dos podrá enviar mensajes en esta conversación.`,
                        )
                      ) {
                        toggleBlock.mutate(true);
                      }
                    }}
                  >
                    {summary.blockedByMe ? 'Desbloquear' : 'Bloquear'}
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="block w-full px-4 py-3 text-left text-red-700 hover:bg-red-50"
                    onClick={() => {
                      setMenuOpen(false);
                      setReportOpen(true);
                    }}
                  >
                    Reportar
                  </button>
                </li>
              </ul>
            ) : null}
          </div>
        ) : null}
      </header>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 space-y-2 overflow-y-auto bg-background/60 px-3 py-4"
        aria-live="polite"
      >
        {messagesQuery.hasNextPage ? (
          <div className="flex justify-center pb-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadOlder}
              disabled={messagesQuery.isFetchingNextPage}
            >
              {messagesQuery.isFetchingNextPage ? 'Cargando…' : 'Ver mensajes anteriores'}
            </Button>
          </div>
        ) : null}

        {messagesQuery.isLoading ? (
          <p className="text-center text-sm text-muted">Cargando mensajes…</p>
        ) : null}
        {messagesQuery.isError ? (
          <p role="alert" className="text-center text-sm font-medium text-red-700">
            {getErrorMessage(messagesQuery.error)}
          </p>
        ) : null}
        {!messagesQuery.isLoading && !messagesQuery.isError && messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            Escriba su primer mensaje{summary ? ` a ${summary.peer.name}` : ''}. Describa qué
            necesita y cuándo.
          </p>
        ) : null}

        {meId
          ? messages.map((message, index) => {
              const previous = messages[index - 1];
              const newDay = !previous || !isSameDay(previous.createdAt, message.createdAt);
              return (
                <div key={message.id} className="space-y-2">
                  {newDay ? (
                    <p className="py-1 text-center text-xs font-semibold uppercase tracking-wide text-muted">
                      {formatDayLabel(message.createdAt)}
                    </p>
                  ) : null}
                  <MessageBubble
                    message={message}
                    mine={message.senderId === meId}
                    showRead={message.id === lastOwnReadId}
                  />
                </div>
              );
            })
          : null}
      </div>

      <footer className="border-t border-border bg-surface px-3 py-2.5">
        {summary && !canSend ? (
          <div className="flex flex-wrap items-center justify-between gap-2 py-1 text-sm">
            <p className="text-muted">
              {summary.blockedByMe
                ? 'Bloqueó a esta persona. Desbloquéela para volver a escribir.'
                : 'No puede enviar mensajes en esta conversación.'}
            </p>
            {summary.blockedByMe ? (
              <Button
                size="sm"
                variant="outline"
                disabled={toggleBlock.isPending}
                onClick={() => toggleBlock.mutate(false)}
              >
                Desbloquear
              </Button>
            ) : null}
          </div>
        ) : (
          <form
            className="flex items-end gap-1.5"
            onSubmit={(event) => {
              event.preventDefault();
              void sendText();
            }}
          >
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Elegir una foto para enviar"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void sendImage(file);
              }}
            />
            <ComposerIconButton
              label="Enviar una foto"
              disabled={!summary || busy !== null}
              onClick={() => fileInput.current?.click()}
            >
              <PhotoIcon />
            </ComposerIconButton>
            <ComposerIconButton
              label="Compartir mi dirección"
              disabled={!summary || busy !== null}
              onClick={() => setAddressOpen(true)}
            >
              <PinIcon />
            </ComposerIconButton>
            <textarea
              value={text}
              rows={1}
              maxLength={MESSAGE_MAX_LENGTH}
              aria-label="Escriba un mensaje"
              placeholder={busy === 'image' ? 'Enviando foto…' : 'Escriba un mensaje'}
              disabled={!summary}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                // En escritorio Enter envía; en móvil Enter agrega una línea (se envía con el botón).
                const finePointer = window.matchMedia('(pointer: fine)').matches;
                if (
                  event.key === 'Enter' &&
                  !event.shiftKey &&
                  finePointer &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  void sendText();
                }
              }}
              className="max-h-32 min-h-11 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-base leading-snug placeholder:text-muted/70 focus-visible:border-ring"
            />
            <Button
              type="submit"
              className="h-11 shrink-0 rounded-full px-5"
              disabled={!summary || !text.trim() || busy !== null}
            >
              {busy === 'text' ? '…' : 'Enviar'}
            </Button>
          </form>
        )}
        {sendError ? (
          <p role="alert" className={cn('pt-1.5 text-sm font-medium text-red-700')}>
            {sendError}
          </p>
        ) : null}
        {toggleBlock.isError ? (
          <p role="alert" className="pt-1.5 text-sm font-medium text-red-700">
            {getErrorMessage(toggleBlock.error)}
          </p>
        ) : null}
      </footer>

      {addressOpen && summary ? (
        <AddressShareDialog
          peerName={summary.peer.name}
          onClose={() => setAddressOpen(false)}
          onSend={sendAddress}
        />
      ) : null}
      {reportOpen ? (
        <ReportDialog conversationId={conversationId} onClose={() => setReportOpen(false)} />
      ) : null}
      {requestOpen && summary?.peer.workerProfileId ? (
        <RequestFormDialog
          workerProfileId={summary.peer.workerProfileId}
          workerName={summary.peer.name}
          onClose={() => setRequestOpen(false)}
          onUnauthorized={() => router.replace(`/ingresar?next=/mensajes/${conversationId}`)}
        />
      ) : null}
    </section>
  );
}

function ComposerIconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-brand transition-colors hover:bg-brand-soft disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function PhotoIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m21 16-5-5-8 9" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}
