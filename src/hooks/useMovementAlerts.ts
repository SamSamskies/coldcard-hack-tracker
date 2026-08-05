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
  /** Set briefly after a successful arm so the UI can confirm delivery. */
  armNotice: string | null;
  toggle: () => Promise<void>;
  dismissArmNotice: () => void;
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

function showNotification(title: string, body: string, tag: string): boolean {
  if (Notification.permission !== 'granted') return false;
  try {
    const n = new Notification(title, {
      body,
      tag,
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return true;
  } catch {
    return false;
  }
}

function notifyMovement(m: Movement) {
  const hop = m.hop > 0 ? ` (hop ${m.hop})` : '';
  const body = `${formatBtc(m.amountBtc)} BTC left ${m.fromLabel}${hop}`;
  showNotification(APP_NAME, body, movementKey(m));
}

function notifyAlertsArmed(): boolean {
  return showNotification(
    APP_NAME,
    'Movement alerts on — holdings and hop-1 spends only (not terminal hop remixes).',
    `alerts-armed-${Date.now()}`,
  );
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

  // Read preference synchronously so the first watch pass is not run with
  // enabled=false (which resets priming and can swallow the next real spend).
  const [preference, setPreference] = useState(() =>
    supported ? readPreference() : false,
  );
  const [permission, setPermission] = useState<AlertPermission>(() =>
    supported ? Notification.permission : 'unsupported',
  );
  const [armNotice, setArmNotice] = useState<string | null>(null);

  const watchRef = useRef<AlertWatchState>(createAlertWatchState());
  const armNoticeTimer = useRef<number | null>(null);

  const enabled =
    preference && supported && permission === 'granted';

  const dismissArmNotice = useCallback(() => {
    if (armNoticeTimer.current != null) {
      window.clearTimeout(armNoticeTimer.current);
      armNoticeTimer.current = null;
    }
    setArmNotice(null);
  }, []);

  const showArmNotice = useCallback(
    (message: string) => {
      dismissArmNotice();
      setArmNotice(message);
      armNoticeTimer.current = window.setTimeout(() => {
        setArmNotice(null);
        armNoticeTimer.current = null;
      }, 12_000);
    },
    [dismissArmNotice],
  );

  useEffect(() => {
    if (!supported) return;
    setPermission(Notification.permission);
  }, [supported]);

  useEffect(() => {
    return () => {
      if (armNoticeTimer.current != null) {
        window.clearTimeout(armNoticeTimer.current);
      }
    };
  }, []);

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
      dismissArmNotice();
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
      showArmNotice(
        next === 'denied'
          ? 'Notifications are blocked for this site in browser settings.'
          : 'Notification permission was not granted.',
      );
      return;
    }

    writePreference(true);
    watchRef.current = createAlertWatchState();
    setPreference(true);
    const delivered = notifyAlertsArmed();
    showArmNotice(
      delivered
        ? 'Alerts on. No system banner? Enable Chrome in macOS Settings → Notifications.'
        : 'Alerts on, but the browser could not create a system notification. Check site and OS permissions.',
    );
  }, [preference, permission, supported, dismissArmNotice, showArmNotice]);

  return {
    enabled,
    preference,
    permission: supported ? permission : 'unsupported',
    supported,
    armNotice,
    toggle,
    dismissArmNotice,
  };
}
