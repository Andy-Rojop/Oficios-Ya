'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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

/** Campana mínima: lista desplegable de notificaciones del usuario. */
export function NotificationBell({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { data, isLoading } = useNotifications(enabled);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  // Socket del namespace /chat también emite notification:new a la sala del usuario.
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

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!enabled) return null;

  const unread = data?.unreadCount ?? 0;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={unread > 0 ? `${unread} notificaciones sin leer` : 'Notificaciones'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'relative rounded-md px-2.5 py-2 text-sm font-medium transition hover:bg-brand-soft hover:text-foreground',
          open ? 'bg-brand-soft text-brand-dark' : 'text-muted',
        )}
      >
        Avisos
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <p className="text-sm font-semibold">Notificaciones</p>
            {unread > 0 ? (
              <button
                type="button"
                className="text-xs font-semibold text-brand"
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
              >
                Marcar todas
              </button>
            ) : null}
          </div>
          <ul className="max-h-80 overflow-y-auto">
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
                      {format(new Date(item.createdAt), 'd MMM yyyy · HH:mm', { locale: es })}
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
                        className="block px-3 py-2.5 hover:bg-brand-soft/60"
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
                        className="block w-full px-3 py-2.5 text-left hover:bg-brand-soft/60"
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
      ) : null}
    </div>
  );
}
