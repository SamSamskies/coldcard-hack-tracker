import { useEffect, useState } from 'react';
import {
  APP_NAME,
  CLUSTERS,
  EARLY_WAVE,
  INCIDENT,
  ORIGINAL_STOLEN_BTC,
} from '../data/incident';
import { formatBtc, formatRelativeTime } from '../lib/format';

type Props = {
  lastUpdated: Date | null;
  loading: boolean;
  onRefresh: () => void;
  alertsEnabled: boolean;
  alertsSupported: boolean;
  alertsPermission: string;
  onToggleAlerts: () => void;
};

export function IncidentHeader({
  lastUpdated,
  loading,
  onRefresh,
  alertsEnabled,
  alertsSupported,
  alertsPermission,
  onToggleAlerts,
}: Props) {
  const [now, setNow] = useState(() => new Date());
  const galaxy = CLUSTERS.find((c) => c.id === 'galaxy-july30')!;
  const laterWave = CLUSTERS.find((c) => c.id === 'kelbie-july31')!;

  useEffect(() => {
    if (!lastUpdated) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [lastUpdated]);

  const alertsDisabled =
    !alertsSupported || alertsPermission === 'denied';
  const alertsTitle = !alertsSupported
    ? 'Browser notifications are not available here'
    : alertsPermission === 'denied'
      ? 'Notifications are blocked in browser settings'
      : 'Browser notification when holdings or followed hops spend';
  const alertsStatus = !alertsSupported
    ? 'Unavailable'
    : alertsPermission === 'denied'
      ? 'Blocked'
      : alertsEnabled
        ? 'On'
        : 'Off';

  return (
    <header className="incident-header">
      <div className="brand-block">
        <p className="eyebrow">Live chain monitor</p>
        <h1 className="brand">{APP_NAME}</h1>
        <p className="subtitle">
          July 2026 seed-entropy sweeps · {formatBtc(ORIGINAL_STOLEN_BTC)} BTC
          tracked across {CLUSTERS.length} clusters
        </p>
        <p className="totals-note">
          <a href={EARLY_WAVE.sourceUrl} target="_blank" rel="noreferrer">
            Early reports
          </a>{' '}
          covered ~{formatBtc(EARLY_WAVE.btc)} BTC across
          ~{EARLY_WAVE.addresses.toLocaleString()} wallets. Galaxy’s fingerprint
          set is {formatBtc(galaxy.stolenBtc)} BTC /{' '}
          {INCIDENT.victimAddresses.toLocaleString()} addresses. Clusters may be
          different operators.
        </p>
        <p className="totals-note">
          Later wave:{' '}
          <a href={laterWave.sourceUrl} target="_blank" rel="noreferrer">
            {formatBtc(laterWave.stolenBtc)} BTC
          </a>{' '}
          past Block’s scan end (block 960230) — {laterWave.note}
        </p>
      </div>

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
            {!alertsDisabled ? (
              <span className="alerts-toggle-hint">
                Notify when holdings or followed hops spend
              </span>
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
