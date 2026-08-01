import { useCallback, useEffect, useRef, useState } from 'react';
import { APP_NAME } from '../data/incident';
import { formatBtc } from '../lib/format';
import type { Movement } from './useTrackerData';

const STORAGE_KEY = 'coldcard-hack-tracker:alerts';

export type AlertPermission = NotificationPermission | 'unsupported';

export type MovementAlerts = {
  enabled: boolean;
  permission: AlertPermission;
  supported: boolean;
  toggle: () => Promise<void>;
};

function readEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeEnabled(enabled: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Ignore private-mode / blocked storage.
  }
}

function movementKey(m: Movement): string {
  return `${m.txid}:${m.fromAddress}`;
}

function notifyMovement(m: Movement) {
  const hop = m.hop > 0 ? ` (hop ${m.hop})` : '';
  const body = `${formatBtc(m.amountBtc)} BTC left ${m.fromLabel}${hop}`;
  try {
    const n = new Notification(APP_NAME, {
      body,
      tag: movementKey(m),
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
  } catch {
    // Some browsers throw if permission flipped mid-session.
  }
}

/**
 * Browser notifications when new outbound spends appear after the first
 * successful poll. Opt-in; preference persisted in localStorage.
 */
export function useMovementAlerts(movements: Movement[]): MovementAlerts {
  const supported =
    typeof window !== 'undefined' && 'Notification' in window;

  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<AlertPermission>(() =>
    supported ? Notification.permission : 'unsupported',
  );

  const seenRef = useRef<Set<string> | null>(null);
  const primedRef = useRef(false);

  useEffect(() => {
    if (!supported) return;
    setEnabled(readEnabled() && Notification.permission === 'granted');
    setPermission(Notification.permission);
  }, [supported]);

  useEffect(() => {
    if (!enabled || !supported || Notification.permission !== 'granted') {
      return;
    }

    const keys = movements.map(movementKey);

    // First snapshot after enable / load: remember without notifying.
    if (!primedRef.current) {
      seenRef.current = new Set(keys);
      primedRef.current = true;
      return;
    }

    const seen = seenRef.current ?? new Set<string>();
    const fresh = movements.filter((m) => !seen.has(movementKey(m)));
    for (const m of fresh) {
      seen.add(movementKey(m));
      notifyMovement(m);
    }
    seenRef.current = seen;
  }, [movements, enabled, supported]);

  const toggle = useCallback(async () => {
    if (!supported) return;

    if (enabled) {
      writeEnabled(false);
      setEnabled(false);
      primedRef.current = false;
      seenRef.current = null;
      return;
    }

    let next = Notification.permission;
    if (next === 'default') {
      next = await Notification.requestPermission();
    }
    setPermission(next);

    if (next !== 'granted') {
      writeEnabled(false);
      setEnabled(false);
      return;
    }

    writeEnabled(true);
    primedRef.current = false;
    seenRef.current = null;
    setEnabled(true);
  }, [enabled, supported]);

  return {
    enabled,
    permission: supported ? permission : 'unsupported',
    supported,
    toggle,
  };
}
