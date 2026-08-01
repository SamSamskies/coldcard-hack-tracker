import { useEffect, useState } from 'react';
import { APP_NAME } from '../data/incident';
import { formatRelativeTime } from '../lib/format';
import { StolenTimeline } from './StolenTimeline';

type Props = {
  lastUpdated: Date | null;
  loading: boolean;
  onRefresh: () => void;
  alertsEnabled: boolean;
  alertsPreference: boolean;
  alertsSupported: boolean;
  alertsPermission: string;
  onToggleAlerts: () => void;
  usdPrice: number | null;
};

export function IncidentHeader({
  lastUpdated,
  loading,
  onRefresh,
  alertsEnabled,
  alertsPreference,
  alertsSupported,
  alertsPermission,
  onToggleAlerts,
  usdPrice,
}: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!lastUpdated) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [lastUpdated]);

  const alertsDisabled =
    !alertsSupported || alertsPermission === 'denied';
  const awaitingPermission =
    alertsSupported &&
    !alertsEnabled &&
    alertsPermission === 'default';
  const alertsTitle = !alertsSupported
    ? 'Browser notifications are not available here'
    : alertsPermission === 'denied'
      ? 'Notifications are blocked in browser settings'
      : alertsEnabled
        ? 'Browser notification when holdings or followed hops spend'
        : 'Click to allow notifications when holdings or hops spend';
  const alertsStatus = !alertsSupported
    ? 'Unavailable'
    : alertsPermission === 'denied'
      ? 'Blocked'
      : alertsEnabled
        ? 'On'
        : awaitingPermission && alertsPreference
          ? 'Allow'
          : 'Off';
  const alertsHint = alertsDisabled
    ? null
    : alertsEnabled
      ? 'Notify when holdings or followed hops spend'
      : awaitingPermission
        ? 'Click to grant browser permission'
        : 'Notify when holdings or followed hops spend';

  return (
    <header className="incident-header">
      <div className="brand-block">
        <p className="eyebrow">Live chain monitor</p>
        <h1 className="brand">{APP_NAME}</h1>
        <p className="subtitle">Seed-entropy sweeps since July 2026</p>
      </div>

      <StolenTimeline usdPrice={usdPrice} />

      <div className="header-controls">
        <label
          className={`alerts-toggle${alertsDisabled ? ' is-disabled' : ''}`}
          title={alertsTitle}
        >
          <span className="alerts-toggle-copy">
            <span className="alerts-toggle-text">
              Alerts
              <span className="alerts-toggle-state">{alertsStatus}</span>
            </span>
            {alertsHint ? (
              <span className="alerts-toggle-hint">{alertsHint}</span>
            ) : null}
          </span>
          <button
            type="button"
            className="alerts-switch"
            role="switch"
            aria-checked={alertsEnabled}
            aria-label="Movement alerts"
            disabled={alertsDisabled}
            onClick={onToggleAlerts}
          >
            <span className="alerts-switch-thumb" aria-hidden="true" />
          </button>
        </label>
        <div className="refresh-row">
          <span className="updated" aria-live="polite">
            {lastUpdated
              ? `Updated ${formatRelativeTime(lastUpdated, now)}`
              : loading
                ? 'Loading…'
                : 'Not yet updated'}
          </span>
          <button
            type="button"
            className="refresh-btn"
            onClick={onRefresh}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
}
