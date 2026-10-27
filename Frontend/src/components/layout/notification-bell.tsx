'use client';

import Link from 'next/link';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import {
  NOTIFICATION_QUERY_KEY,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/lib/notifications';
import { CHAT_EVENTS, connectChatSocket, getChatSocket } from '@/lib/socket';
import { cn } from '@/lib/utils';

/** Panel de avisos vía portal: en móvil hoja centrada; en desktop bajo el botón. */
export function NotificationBell({
  enabled,
  workerChrome = false,
}: {
  enabled: boolean;
  workerChrome?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [desktopPos, setDesktopPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const queryClient = useQueryClient();
  const { data, isLoading } = useNotifications(enabled);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const socket = connectChatSocket();
    const onNew = () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATION_QUERY_KEY });
    };
    socket.on(CHAT_EVENTS.NOTIFICATION_NEW, onNew);
    return () => {
      getChatSocket().off(CHAT_EVENTS.NOTIFICATION_NEW, onNew);
    };
  }, [enabled, queryClient]);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;

    function place() {
      const button = buttonRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const isDesktop = window.matchMedia('(min-width: 640px)').matches;
      if (isDesktop) {
        setDesktopPos({
          top: rect.bottom + 8,
          right: Math.max(8, window.innerWidth - rect.right),
        });
      } else {
        setDesktopPos(null);
      }
    }

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!enabled) return null;

  const unread = data?.unreadCount ?? 0;

  const panel =
    open && mounted
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Cerrar notificaciones"
              className="fixed inset-0 z-[60] bg-black/40 sm:bg-transparent"
              onClick={() => setOpen(false)}
            />
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              style={
                desktopPos
                  ? { top: desktopPos.top, right: desktopPos.right, left: 'auto' }
                  : undefined
              }
              className={cn(
                'fixed z-[70] flex max-h-[min(70vh,28rem)] w-[min(100vw-1.5rem,24rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl',
                // Móvil: centrado bajo el header.
                !desktopPos &&
                  'left-1/2 top-[max(4.5rem,calc(var(--safe-top)+3.75rem))] -translate-x-1/2',
                // Desktop: posición por style (top/right).
                desktopPos && 'w-80 max-w-[calc(100vw-2rem)] translate-x-0 rounded-xl',
              )}
            >
              <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
                <p id={titleId} className="text-sm font-semibold">
                  Notificaciones
                </p>
                <div className="flex items-center gap-1">
                  {unread > 0 ? (
                    <button
                      type="button"
                      className="min-h-9 rounded-lg px-2 text-xs font-semibold text-brand"
                      onClick={() => markAll.mutate()}
                      disabled={markAll.isPending}
                    >
                      Marcar todas
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-lg leading-none text-muted hover:bg-brand-soft sm:hidden"
                    aria-label="Cerrar"
                    onClick={() => setOpen(false)}
                  >
                    ×
                  </button>
                </div>
              </div>
              <ul className="flex-1 overflow-y-auto overscroll-contain">
                {isLoading ? (
                  <li className="px-3 py-4 text-sm text-muted">Cargando…</li>
                ) : !data?.items.length ? (
                  <li className="px-3 py-4 text-sm text-muted">No tiene notificaciones.</li>
                ) : (
                  data.items.map((item) => {
                    const content = (
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="text-xs text-muted">{item.body}</p>
                        <p className="text-[11px] text-muted">
                          {format(new Date(item.createdAt), 'd MMM yyyy · HH:mm', {
                            locale: es,
                          })}
                        </p>
                      </div>
                    );
                    return (
                      <li
                        key={item.id}
                        className={cn(
                          'border-b border-border last:border-0',
                          !item.readAt && 'bg-brand-soft/40',
                        )}
                      >
                        {item.link ? (
                          <Link
                            href={item.link}
                            className="block px-3 py-3 hover:bg-brand-soft/60"
                            onClick={() => {
                              if (!item.readAt) markRead.mutate(item.id);
                              setOpen(false);
                            }}
                          >
                            {content}
                          </Link>
                        ) : (
                          <button
                            type="button"
                            className="block w-full px-3 py-3 text-left hover:bg-brand-soft/60"
                            onClick={() => {
                              if (!item.readAt) markRead.mutate(item.id);
                            }}
                          >
                            {content}
                          </button>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={unread > 0 ? `${unread} notificaciones sin leer` : 'Notificaciones'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'relative inline-flex min-h-11 items-center rounded-full px-3 py-2 text-sm font-medium transition sm:px-3.5',
          workerChrome
            ? open
              ? 'bg-white text-[#1e3a5f]'
              : 'text-white/80 hover:bg-white/10 hover:text-white'
            : open
              ? 'bg-brand-soft text-brand-dark'
              : 'text-muted hover:bg-brand-soft hover:text-foreground',
        )}
      >
        Avisos
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
      {panel}
    </div>
  );
}
