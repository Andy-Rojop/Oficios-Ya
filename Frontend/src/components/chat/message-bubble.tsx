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
          'max-w-[85%] space-y-1 rounded-lg px-2.5 py-1.5 text-[0.95rem] leading-snug shadow-sm sm:max-w-[70%]',
          mine ? 'rounded-br-none bg-[#d9fdd3] text-foreground' : 'rounded-bl-none bg-white text-foreground',
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
          <p className="text-xs font-semibold text-[#1f6b4a]">Dirección compartida</p>
        ) : null}

        {message.content ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : null}

        {message.type === 'ADDRESS' && hasCoords ? (
          <a
            href={mapLink(message.latitude as number, message.longitude as number)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-semibold text-brand underline"
          >
            Ver en el mapa
          </a>
        ) : null}

        <p className="flex items-center justify-end gap-1 text-[11px] text-[#667781]">
          <span>{formatMessageTime(message.createdAt)}</span>
          {mine && showRead ? <span aria-label="Leído">✓✓</span> : null}
        </p>
      </div>
    </div>
  );
}
