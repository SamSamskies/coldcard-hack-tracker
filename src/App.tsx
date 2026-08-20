import { AddressList } from './components/AddressList';
import { IncidentHeader } from './components/IncidentHeader';
import { KpiRow } from './components/KpiRow';
import { MovementFeed } from './components/MovementFeed';
import { RiskChecklist } from './components/RiskChecklist';
import { SourcesStrip } from './components/SourcesStrip';
import { useMovementAlerts } from './hooks/useMovementAlerts';
import { useTrackerData } from './hooks/useTrackerData';
import { formatRelativeTime } from './lib/format';

export default function App() {
  const data = useTrackerData();
  const hasData = data.addresses.length > 0;
  const alerts = useMovementAlerts(data.movements, hasData);
  const snapshotAge = data.snapshotUpdatedAt
    ? formatRelativeTime(new Date(data.snapshotUpdatedAt))
    : null;

  return (
    <div className="app-shell">
      <div className="atmosphere" aria-hidden="true" />
      <main className="dashboard">
        <IncidentHeader
          alertsEnabled={alerts.enabled}
          alertsPreference={alerts.preference}
          alertsSupported={alerts.supported}
          alertsPermission={alerts.permission}
          armNotice={alerts.armNotice}
          onToggleAlerts={() => {
            void alerts.toggle();
          }}
          onDismissArmNotice={alerts.dismissArmNotice}
          usdPrice={data.usdPrice}
        />

        {data.error ? (
          <div className="error-banner" role="alert">
            <div>
              <strong>Could not load the balance snapshot.</strong>{' '}
              <span className="muted">
                The dashboard reads /snapshot.json (refreshed about twice a
                day). Check your connection, then retry.
              </span>
              <span className="error-detail mono">{data.error}</span>
            </div>
            <button type="button" className="refresh-btn" onClick={data.refresh}>
              Retry
            </button>
          </div>
        ) : null}

        <KpiRow
          heldBtc={data.heldBtc}
          movedBtc={data.movedBtc}
          heldPct={data.heldPct}
          usdPrice={data.usdPrice}
          lastMovement={data.lastMovement}
          loading={data.loading && !hasData}
          hasData={hasData}
        />

        <AddressList
          addresses={data.addresses}
          usdPrice={data.usdPrice}
          loading={data.loading}
        />

        <MovementFeed movements={data.movements} loading={data.loading} />

        <RiskChecklist />

        <SourcesStrip />

        <footer className="site-footer">
          <p>Not affiliated with Coinkite or Coldcard.</p>
          <p>
            Balances from the ~12h snapshot
            {snapshotAge ? ` · last updated ${snapshotAge}` : ''}.
          </p>
        </footer>
      </main>
    </div>
  );
}
