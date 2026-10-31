'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useSessionIdle } from '@/hooks/use-session-idle';
import { apiFetch } from '@/lib/api-client';
import { useLogout, useMe } from '@/lib/auth';
import { SESSION_IDLE_WARN_MS } from '@/lib/session-idle';

function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Aviso de inactividad (15 min) y cierre de sesión (18 min) si no confirma.
 */
export function SessionIdleGuard() {
  const { data: user } = useMe();
  const logout = useLogout();
  const enabled = Boolean(user);
  const { phase, secondsLeft, keepAlive } = useSessionIdle(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expiredHandled = useRef(false);
  const keepAliveBtnRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);
  const keepAliveActionRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    if (phase !== 'expired' || !enabled || expiredHandled.current) return;
    expiredHandled.current = true;
    logout.mutate();
  }, [phase, enabled, logout]);

  useEffect(() => {
    if (phase === 'active') {
      expiredHandled.current = false;
      setError(null);
      setBusy(false);
      busyRef.current = false;
    }
  }, [phase]);

  keepAliveActionRef.current = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/auth/refresh', { method: 'POST' });
      keepAlive();
    } catch {
      setError('No se pudo renovar la sesión. Intente de nuevo o vuelva a iniciar sesión.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  useEffect(() => {
    if (phase !== 'warning') return;
    keepAliveBtnRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        void keepAliveActionRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [phase]);

  if (!enabled || phase !== 'warning') return null;

  const warnMinutes = Math.round(SESSION_IDLE_WARN_MS / 60_000);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/45 p-4 sm:items-center"
      role="presentation"
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-idle-title"
        aria-describedby="session-idle-desc"
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl sm:p-6"
      >
        <h2 id="session-idle-title" className="text-lg font-semibold text-foreground">
          ¿Sigue ahí?
        </h2>
        <p id="session-idle-desc" className="mt-2 text-sm text-muted">
          Lleva {warnMinutes} minutos sin actividad. Su sesión se cerrará en{' '}
          <span className="font-semibold tabular-nums text-foreground">
            {formatCountdown(secondsLeft)}
          </span>{' '}
          si no la mantiene activa.
        </p>
        {error ? (
          <p role="alert" className="mt-3 text-sm font-medium text-red-700">
            {error}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={busy || logout.isPending}
            onClick={() => logout.mutate()}
          >
            Cerrar sesión
          </Button>
          <Button
            ref={keepAliveBtnRef}
            type="button"
            disabled={busy || logout.isPending}
            onClick={() => void keepAliveActionRef.current()}
          >
            {busy ? 'Renovando…' : 'Mantener sesión activa'}
          </Button>
        </div>
      </div>
    </div>
  );
}
