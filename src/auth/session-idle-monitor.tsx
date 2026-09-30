import { useEffect, useRef, useState } from 'react';
import { useRouterState } from '@tanstack/react-router';
import { AlertDialog, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { logoutFn } from '@backend/server/auth/auth.functions';
import {
  TECHNICIAN_SESSION_KEY,
  USER_SESSION_KEY,
  publishClientSessionEvent,
  subscribeClientSessionEvents,
} from '@shared/lib/auth-session';
import {
  SESSION_ACTIVITY_THROTTLE_MS,
  SESSION_REVOKED_CODE,
  SESSION_TIMEOUT_CODE,
  formatIdleCountdown,
  type SessionPingPayload,
} from '@shared/lib/session-policy';

type Clock = {
  lastActivityAt: number;
  absoluteEndsAt: number;
  idleTimeoutMs: number;
  warningLeadMs: number;
};

let ending = false;

function hasLocalSession(): boolean {
  return (
    sessionStorage.getItem(TECHNICIAN_SESSION_KEY) != null ||
    sessionStorage.getItem(USER_SESSION_KEY) != null
  );
}

function clearLocalSession(): void {
  sessionStorage.removeItem(TECHNICIAN_SESSION_KEY);
  sessionStorage.removeItem(USER_SESSION_KEY);
}

async function endWebSession(reason: 'timeout' | 'revoked'): Promise<void> {
  if (ending) return;
  clearLocalSession();
  if (window.location.pathname === '/login') return;
  ending = true;
  publishClientSessionEvent({ type: 'logout', reason: reason === 'timeout' ? 'timeout' : 'manual' });
  try {
    await logoutFn();
  } catch {
    // no-op
  }
  window.location.replace(reason === 'timeout' ? '/login?reason=timeout' : '/login');
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export function SessionIdleMonitor() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [remainingMs, setRemainingMs] = useState<number | null>(null);
  const clockRef = useRef<Clock | null>(null);
  const warningRef = useRef(false);
  const stayingRef = useRef(false);
  const lastPingRef = useRef(0);
  const pingingRef = useRef(false);
  const mountedRef = useRef(true);

  const applyPing = (payload: SessionPingPayload) => {
    const offset = payload.serverNow - Date.now();
    clockRef.current = {
      lastActivityAt: payload.lastActivityAt - offset,
      absoluteEndsAt: payload.issuedAt + payload.absoluteTimeoutMs - offset,
      idleTimeoutMs: payload.idleTimeoutMs,
      warningLeadMs: payload.warningLeadMs,
    };
    lastPingRef.current = Date.now();
    const idleRemaining = payload.idleTimeoutMs - (Date.now() - (payload.lastActivityAt - offset));
    if (idleRemaining > payload.warningLeadMs) {
      warningRef.current = false;
      if (mountedRef.current) setRemainingMs(null);
    }
  };

  const ping = async (stay: boolean) => {
    const response = await fetch(stay ? '/api/auth/session/ping?stay=1' : '/api/auth/session/ping', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (!response.ok) return;
    const payload = (await response.json()) as SessionPingPayload;
    if (payload.ok) applyPing(payload);
  };

  useEffect(() => {
    mountedRef.current = true;
    const original = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const response = await original(input, init);
      const url = requestUrl(input);
      if (url.includes('/api/v1/')) return response;
      if (response.status !== 401 && response.status !== 500) return response;
      const text = await response.clone().text().catch(() => '');
      if (text.includes(SESSION_TIMEOUT_CODE)) void endWebSession('timeout');
      else if (text.includes(SESSION_REVOKED_CODE)) void endWebSession('revoked');
      return response;
    };
    return () => {
      mountedRef.current = false;
      window.fetch = original;
    };
  }, []);

  useEffect(() => {
    if (!hasLocalSession()) {
      clockRef.current = null;
      warningRef.current = false;
      setRemainingMs(null);
      return;
    }

    const markActivity = () => {
      const clock = clockRef.current;
      if (!clock || warningRef.current || stayingRef.current) return;
      const now = Date.now();
      if (now - clock.lastActivityAt < 1000) return;
      clock.lastActivityAt = now;
      publishClientSessionEvent({ type: 'activity', at: now });
      if (pingingRef.current || now - lastPingRef.current < SESSION_ACTIVITY_THROTTLE_MS) return;
      pingingRef.current = true;
      void ping(false).finally(() => {
        pingingRef.current = false;
      });
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;
    for (const eventName of events) {
      window.addEventListener(eventName, markActivity, { capture: true, passive: true });
    }

    const unsubscribe = subscribeClientSessionEvents((event) => {
      if (event.type === 'logout') {
        clearLocalSession();
        if (ending || window.location.pathname === '/login') return;
        ending = true;
        window.location.replace(event.reason === 'timeout' ? '/login?reason=timeout' : '/');
        return;
      }
      const clock = clockRef.current;
      if (!clock || event.at <= clock.lastActivityAt) return;
      clock.lastActivityAt = event.at;
      warningRef.current = false;
      setRemainingMs(null);
    });

    void ping(false);

    const timer = window.setInterval(() => {
      const clock = clockRef.current;
      if (!clock || stayingRef.current) return;
      const now = Date.now();
      const idleRemaining = clock.idleTimeoutMs - (now - clock.lastActivityAt);
      const absoluteRemaining = clock.absoluteEndsAt - now;
      if (idleRemaining <= 0 || absoluteRemaining <= 0) {
        void endWebSession('timeout');
        return;
      }
      if (idleRemaining <= clock.warningLeadMs) {
        warningRef.current = true;
        setRemainingMs(idleRemaining);
        return;
      }
      if (warningRef.current) {
        warningRef.current = false;
        setRemainingMs(null);
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
      unsubscribe();
      for (const eventName of events) {
        window.removeEventListener(eventName, markActivity, { capture: true });
      }
    };
  }, [pathname]);

  const staySignedIn = async () => {
    stayingRef.current = true;
    try {
      await ping(true);
      const now = Date.now();
      publishClientSessionEvent({ type: 'activity', at: now });
      warningRef.current = false;
      setRemainingMs(null);
    } finally {
      stayingRef.current = false;
    }
  };

  return (
    <AlertDialog open={remainingMs !== null} onOpenChange={() => {}}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            You'll be signed out in {formatIdleCountdown(remainingMs ?? 0)} due to inactivity
          </AlertDialogTitle>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button type="button" onClick={() => void staySignedIn()}>
            Stay signed in
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
