import { APP_NAME } from '../data/incident';
import { StolenTimeline } from './StolenTimeline';

type Props = {
  alertsEnabled: boolean;
  alertsPreference: boolean;
  alertsSupported: boolean;
  alertsPermission: string;
  onToggleAlerts: () => void;
  usdPrice: number | null;
};

export function IncidentHeader({
  alertsEnabled,
  alertsPreference,
  alertsSupported,
  alertsPermission,
  onToggleAlerts,
  usdPrice,
}: Props) {
  const alertsDisabled = alertsPermission === 'denied';
  const awaitingPermission =
    !alertsEnabled && alertsPermission === 'default';
  const alertsTitle =
    alertsPermission === 'denied'
      ? 'Notifications are blocked in browser settings'
      : alertsEnabled
        ? 'Browser notification when holdings or followed hops spend. Toggle off and on to send a test notification.'
        : awaitingPermission
          ? 'Click to grant browser permission for movement alerts'
          : 'Click to allow notifications when holdings or hops spend (sends a test notification)';
  const alertsStatus =
    alertsPermission === 'denied'
      ? 'Blocked'
      : alertsEnabled
        ? 'On'
        : awaitingPermission && alertsPreference
          ? 'Allow'
          : 'Off';

  return (
    <header className="incident-header">
      <div className="brand-row">
        <div className="brand-block">
          <p className="eyebrow">Live chain monitor</p>
          <h1 className="brand">{APP_NAME}</h1>
          <p className="subtitle">Seed-entropy sweeps since July 2026</p>
        </div>

        {alertsSupported ? (
          <label
            className={`alerts-toggle${alertsDisabled ? ' is-disabled' : ''}`}
            title={alertsTitle}
          >
            <span className="alerts-toggle-text">
              Alerts
              <span className="alerts-toggle-state">{alertsStatus}</span>
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
        ) : null}
      </div>

      <StolenTimeline usdPrice={usdPrice} />
    </header>
  );
}
