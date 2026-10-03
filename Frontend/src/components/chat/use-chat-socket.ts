'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { connectChatSocket, getChatSocket } from '@/lib/socket';

function subscribeConnection(onChange: () => void): () => void {
  const socket = getChatSocket();
  socket.on('connect', onChange);
  socket.on('disconnect', onChange);
  return () => {
    socket.off('connect', onChange);
    socket.off('disconnect', onChange);
  };
}

/** Conecta el socket del chat mientras el componente está montado y expone si hay conexión. */
export function useChatSocket(): { connected: boolean } {
  const connected = useSyncExternalStore(
    subscribeConnection,
    () => getChatSocket().connected,
    () => false,
  );

  useEffect(() => {
    connectChatSocket();
  }, []);

  return { connected };
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
