'use client';

import { formatMessageTime, mapLink, type ChatMessage } from '@/lib/chat';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: ChatMessage;
  mine: boolean;
  /** Muestra "Leído" (solo en mi último mensaje ya leído). */
  showRead: boolean;
}

export function MessageBubble({ message, mine, showRead }: MessageBubbleProps) {
  const hasCoords = message.latitude !== null && message.longitude !== null;

  return (
    <div className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] space-y-1.5 rounded-2xl px-3.5 py-2 text-[0.95rem] leading-snug shadow-sm sm:max-w-[70%]',
          mine
            ? 'rounded-br-md bg-brand text-white'
            : 'rounded-bl-md border border-border bg-surface text-foreground',
        )}
      >
        {message.type === 'IMAGE' ? (
          message.imageUrl ? (
            <a href={message.imageUrl} target="_blank" rel="noopener noreferrer" className="block">
              {/* URL firmada del bucket privado (caduca): no pasa por next/image. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.imageUrl}
                alt="Foto enviada en el chat"
                loading="lazy"
                className="max-h-72 w-full rounded-xl object-cover"
              />
            </a>
          ) : (
            <p className="italic opacity-80">Foto no disponible</p>
          )
        ) : null}

        {message.type === 'ADDRESS' ? (
          <p
            className={cn(
              'text-xs font-semibold uppercase tracking-wide',
              mine ? 'text-white/80' : 'text-brand-dark',
            )}
          >
            Dirección compartida
          </p>
        ) : null}

        {message.content ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : null}

        {message.type === 'ADDRESS' && hasCoords ? (
          <a
            href={mapLink(message.latitude as number, message.longitude as number)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-block text-sm font-semibold underline',
              mine ? 'text-white' : 'text-brand',
            )}
          >
            Ver en el mapa
          </a>
        ) : null}

        <p className={cn('text-right text-[0.7rem]', mine ? 'text-white/70' : 'text-muted')}>
          {formatMessageTime(message.createdAt)}
        </p>
      </div>
      {mine && showRead ? (
        <span className="mt-0.5 px-1 text-[0.7rem] text-muted">Leído</span>
      ) : null}
    </div>
  );
}
