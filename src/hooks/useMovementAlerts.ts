import { useCallback, useEffect, useRef, useState } from 'react';
import { APP_NAME } from '../data/incident';
import { formatBtc } from '../lib/format';
import type { Movement } from '../lib/tracker';
import {
  advanceAlertWatch,
  createAlertWatchState,
  movementKey,
  type AlertWatchState,
} from '../lib/movementAlerts';

const STORAGE_KEY = 'coldcard-hack-tracker:alerts';

export type AlertPermission = NotificationPermission | 'unsupported';

export type MovementAlerts = {
  /** Alerts are armed and the browser has granted notification permission. */
  enabled: boolean;
  /** Stored opt-in preference (may be true while permission is still pending). */
  preference: boolean;
  permission: AlertPermission;
  supported: boolean;
  toggle: () => Promise<void>;
};

function readPreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writePreference(enabled: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Ignore private-mode / blocked storage.
  }
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
 *
 * @param ready - True once the tracker has completed at least one poll so the
 *   initial feed can be baselined without treating it as brand-new movement.
 */
export function useMovementAlerts(
  movements: Movement[],
  ready: boolean,
): MovementAlerts {
  const supported =
    typeof window !== 'undefined' && 'Notification' in window;

  const [preference, setPreference] = useState(false);
  const [permission, setPermission] = useState<AlertPermission>(() =>
    supported ? Notification.permission : 'unsupported',
  );

  const watchRef = useRef<AlertWatchState>(createAlertWatchState());

  const enabled =
    preference && supported && permission === 'granted';

  useEffect(() => {
    if (!supported) return;
    setPreference(readPreference());
    setPermission(Notification.permission);
  }, [supported]);

  useEffect(() => {
    if (!supported) return;

    const result = advanceAlertWatch(watchRef.current, movements, {
      enabled,
      ready,
    });
    watchRef.current = result.state;
    if (!enabled || Notification.permission !== 'granted') return;
    for (const m of result.toNotify) {
      notifyMovement(m);
    }
  }, [movements, enabled, supported, ready]);

  const toggle = useCallback(async () => {
    if (!supported) return;

    if (preference && permission === 'granted') {
      writePreference(false);
      setPreference(false);
      watchRef.current = createAlertWatchState();
      return;
    }

    let next = Notification.permission;
    if (next === 'default') {
      next = await Notification.requestPermission();
    }
    setPermission(next);

    if (next !== 'granted') {
      // Keep preference off so a dismissed prompt does not look "stuck on".
      writePreference(false);
      setPreference(false);
      watchRef.current = createAlertWatchState();
      return;
    }

    writePreference(true);
    watchRef.current = createAlertWatchState();
    setPreference(true);
  }, [preference, permission, supported]);

  return {
    enabled,
    preference,
    permission: supported ? permission : 'unsupported',
    supported,
    toggle,
  };
}
