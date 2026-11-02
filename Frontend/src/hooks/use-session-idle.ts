'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  SESSION_IDLE_LOGOUT_MS,
  SESSION_IDLE_STORAGE_KEY,
  SESSION_IDLE_WARN_MS,
} from '@/lib/session-idle';

type IdlePhase = 'active' | 'warning' | 'expired';

// Sin scroll/wheel: en Safari iOS disparan en ráfaga con el rubber-band y traban la UI.
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'click'] as const;
const ACTIVITY_THROTTLE_MS = 1000;

function readSharedActivity(): number {
  try {
    const raw = localStorage.getItem(SESSION_IDLE_STORAGE_KEY);
    const value = raw ? Number(raw) : NaN;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
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
  const lastActivityRef = useRef(0);
  const lastWriteRef = useRef(0);
  const phaseRef = useRef<IdlePhase>('active');

  const syncPhase = useCallback((next: IdlePhase, remainingMs: number) => {
    phaseRef.current = next;
    setPhase(next);
    setSecondsLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
  }, []);

  const markActivity = useCallback(
    (force = false) => {
      const at = Date.now();
      lastActivityRef.current = at;
      if (force || at - lastWriteRef.current >= ACTIVITY_THROTTLE_MS) {
        lastWriteRef.current = at;
        writeSharedActivity(at);
      }
      if (phaseRef.current !== 'active') {
        syncPhase('active', SESSION_IDLE_LOGOUT_MS);
      }
    },
    [syncPhase],
  );

  useEffect(() => {
    if (!enabled) {
      phaseRef.current = 'active';
      const resetId = window.setTimeout(() => {
        setPhase('active');
        setSecondsLeft(0);
      }, 0);
      return () => window.clearTimeout(resetId);
    }

    const now = Date.now();
    lastActivityRef.current = now;
    lastWriteRef.current = now;
    writeSharedActivity(now);
    phaseRef.current = 'active';
    const bootId = window.setTimeout(() => setPhase('active'), 0);

    const onActivity = () => {
      if (phaseRef.current !== 'active') return;
      markActivity(false);
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

    const tick = () => {
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
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    const intervalId = window.setInterval(tick, 1000);
    tick();

    return () => {
      window.clearTimeout(bootId);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, onActivity, { capture: true });
      }
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(intervalId);
    };
  }, [enabled, markActivity, syncPhase]);

  return {
    phase,
    secondsLeft,
    keepAlive: () => markActivity(true),
  };
}
