'use client';

import { ExternalLink, MapPin, Navigation } from 'lucide-react';
import { formatMessageTime, googleMapsLink, mapLink, type ChatMessage } from '@/lib/chat';
import { cn } from '@/lib/utils';
import { LocationBubbleMap } from './location-bubble-map';

interface MessageBubbleProps {
  message: ChatMessage;
  mine: boolean;
  /** Muestra "Leído" (solo en mi último mensaje ya leído). */
  showRead: boolean;
}

export function MessageBubble({ message, mine, showRead }: MessageBubbleProps) {
  const hasCoords = message.latitude !== null && message.longitude !== null;
  const isDefaultLocationLabel =
    !message.content || message.content.trim().toLowerCase() === 'ubicación compartida';

  return (
    <div className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[85%] space-y-1.5 rounded-xl px-2.5 py-2 text-[0.95rem] leading-snug shadow-sm sm:max-w-[70%]',
          mine
            ? 'rounded-br-none bg-[#d9fdd3] text-foreground'
            : 'rounded-bl-none bg-white text-foreground',
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
          <div className="w-64 max-w-full space-y-2 sm:w-72">
            {hasCoords ? (
              <div className="relative h-36 w-full overflow-hidden rounded-lg border border-black/10">
                <LocationBubbleMap
                  latitude={message.latitude as number}
                  longitude={message.longitude as number}
                />
                <a
                  href={googleMapsLink(message.latitude as number, message.longitude as number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Abrir ubicación en Google Maps"
                  className="absolute inset-0 z-10"
                />
              </div>
            ) : null}

            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#1f6b4a]/15 text-[#1f6b4a]">
                <MapPin aria-hidden className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[#1f6b4a]">Ubicación compartida</p>
                {!isDefaultLocationLabel && message.content ? (
                  <p className="whitespace-pre-wrap break-words text-sm text-foreground">
                    {message.content}
                  </p>
                ) : null}
                {hasCoords ? (
                  <p className="text-[11px] text-muted">
                    {(message.latitude as number).toFixed(5)},{' '}
                    {(message.longitude as number).toFixed(5)}
                  </p>
                ) : null}
              </div>
            </div>

            {hasCoords ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-black/10 pt-1.5 text-xs font-semibold">
                <a
                  href={googleMapsLink(message.latitude as number, message.longitude as number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[#1f6b4a] hover:underline"
                >
                  <Navigation aria-hidden className="size-3.5" />
                  Abrir en Google Maps
                </a>
                <span aria-hidden className="text-muted">
                  ·
                </span>
                <a
                  href={mapLink(message.latitude as number, message.longitude as number)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand hover:underline"
                >
                  <ExternalLink aria-hidden className="size-3" />
                  OpenStreetMap
                </a>
              </div>
            ) : null}
          </div>
        ) : message.content ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : null}

        <p className="flex items-center justify-end gap-1 text-[11px] text-[#667781]">
          <span>{formatMessageTime(message.createdAt)}</span>
          {mine && showRead ? <span aria-label="Leído">✓✓</span> : null}
        </p>
      </div>
    </div>
  );
}
