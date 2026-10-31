'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  SESSION_IDLE_LOGOUT_MS,
  SESSION_IDLE_STORAGE_KEY,
  SESSION_IDLE_WARN_MS,
} from '@/lib/session-idle';

type IdlePhase = 'active' | 'warning' | 'expired';

const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel'] as const;
const ACTIVITY_THROTTLE_MS = 1000;

function readSharedActivity(): number {
  try {
    const raw = localStorage.getItem(SESSION_IDLE_STORAGE_KEY);
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) ? value : Date.now();
  } catch {
    return Date.now();
  }
}

function writeSharedActivity(at: number): void {
  try {
    localStorage.setItem(SESSION_IDLE_STORAGE_KEY, String(at));
  } catch {
    // private mode / quota — seguir con el reloj local
  }
}

/**
 * Detecta inactividad en el cliente mientras hay sesión.
 * Durante el aviso, solo «Mantener sesión» reinicia el reloj (no el mouse).
 */
export function useSessionIdle(enabled: boolean) {
  const [phase, setPhase] = useState<IdlePhase>('active');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const lastActivityRef = useRef(Date.now());
  const lastWriteRef = useRef(0);
  const phaseRef = useRef<IdlePhase>('active');

  const syncPhase = useEffectEvent((next: IdlePhase, remainingMs: number) => {
    phaseRef.current = next;
    setPhase(next);
    setSecondsLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
  });

  const markActivity = useEffectEvent((at = Date.now(), force = false) => {
    lastActivityRef.current = at;
    if (force || at - lastWriteRef.current >= ACTIVITY_THROTTLE_MS) {
      lastWriteRef.current = at;
      writeSharedActivity(at);
    }
    if (phaseRef.current !== 'active') {
      syncPhase('active', SESSION_IDLE_LOGOUT_MS);
    }
  });

  const tick = useEffectEvent(() => {
    if (!enabled) return;
    const shared = readSharedActivity();
    if (shared > lastActivityRef.current) {
      lastActivityRef.current = shared;
    }
    const idleFor = Date.now() - lastActivityRef.current;
    if (idleFor >= SESSION_IDLE_LOGOUT_MS) {
      syncPhase('expired', 0);
      return;
    }
    if (idleFor >= SESSION_IDLE_WARN_MS) {
      syncPhase('warning', SESSION_IDLE_LOGOUT_MS - idleFor);
      return;
    }
    if (phaseRef.current !== 'active') {
      syncPhase('active', SESSION_IDLE_LOGOUT_MS - idleFor);
    }
  });

  useEffect(() => {
    if (!enabled) {
      phaseRef.current = 'active';
      setPhase('active');
      setSecondsLeft(0);
      return;
    }

    const now = Date.now();
    lastActivityRef.current = now;
    lastWriteRef.current = now;
    writeSharedActivity(now);
    phaseRef.current = 'active';
    setPhase('active');

    const onActivity = () => {
      // Con el aviso abierto, un toque accidental no debe cerrarlo.
      if (phaseRef.current !== 'active') return;
      markActivity();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, onActivity, { passive: true, capture: true });
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_IDLE_STORAGE_KEY || !event.newValue) return;
      const at = Number(event.newValue);
      if (!Number.isFinite(at)) return;
      lastActivityRef.current = at;
      if (phaseRef.current !== 'active') {
        syncPhase('active', SESSION_IDLE_LOGOUT_MS);
      }
    };
    window.addEventListener('storage', onStorage);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const intervalId = window.setInterval(tick, 1000);
    tick();

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity, { capture: true });
      }
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(intervalId);
    };
  }, [enabled]);

  return {
    phase,
    secondsLeft,
    keepAlive: () => markActivity(Date.now(), true),
  };
}
