'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  connectChatSocket,
  getChatSocket,
  isChatSocketConnected,
  subscribeChatConnection,
} from '@/lib/socket';

/**
 * Conecta el socket del chat mientras el componente está montado y expone si hay conexión.
 * El estado “Conectando…” no se reinicia en cada intento fallido (evita parpadeo en Safari).
 */
export function useChatSocket(): { connected: boolean; statusLabel: string } {
  const connected = useSyncExternalStore(
    subscribeChatConnection,
    isChatSocketConnected,
    () => false,
  );
  const [timedOut, setTimedOut] = useState(false);
  const sawConnected = useRef(false);

  useEffect(() => {
    connectChatSocket();
  }, []);

  useEffect(() => {
    if (connected) {
      sawConnected.current = true;
      setTimedOut(false);
      return;
    }
    // Si nunca llegó a conectar, tras 8s mostrar “sin conexión” (no quedarse en Conectando…).
    // Si ya estuvo online y se cayó, marcar más rápido.
    const delay = sawConnected.current ? 3_000 : 8_000;
    const timer = window.setTimeout(() => setTimedOut(true), delay);
    return () => window.clearTimeout(timer);
  }, [connected]);

  const statusLabel = connected
    ? 'En línea'
    : timedOut
      ? 'Sin conexión en vivo'
      : 'Conectando…';

  return { connected, statusLabel };
}

/** Suscribe un handler a un evento del servidor (siempre usa la versión más reciente del handler). */
export function useChatEvent<T>(event: string, handler: (payload: T) => void): void {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const socket = getChatSocket();
    const listener = (payload: T) => handlerRef.current(payload);
    socket.on(event, listener);
    return () => {
      socket.off(event, listener);
    };
  }, [event]);
}
