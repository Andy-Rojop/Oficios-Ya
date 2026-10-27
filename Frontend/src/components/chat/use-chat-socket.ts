'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { connectChatSocket, getChatSocket } from '@/lib/socket';

function subscribeConnection(onChange: () => void): () => void {
  const socket = getChatSocket();
  socket.on('connect', onChange);
  socket.on('disconnect', onChange);
  socket.on('connect_error', onChange);
  return () => {
    socket.off('connect', onChange);
    socket.off('disconnect', onChange);
    socket.off('connect_error', onChange);
  };
}

/** Conecta el socket del chat mientras el componente está montado y expone si hay conexión. */
export function useChatSocket(): { connected: boolean; statusLabel: string } {
  const connected = useSyncExternalStore(
    subscribeConnection,
    () => getChatSocket().connected,
    () => false,
  );
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    connectChatSocket();
  }, []);

  useEffect(() => {
    if (connected) {
      setTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setTimedOut(true), 8_000);
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
