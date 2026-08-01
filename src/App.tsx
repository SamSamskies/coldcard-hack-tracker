import { AddressList } from './components/AddressList';
import { IncidentHeader } from './components/IncidentHeader';
import { KpiRow } from './components/KpiRow';
import { LaterFlowNotice } from './components/LaterFlowNotice';
import { MovementFeed } from './components/MovementFeed';
import { RiskChecklist } from './components/RiskChecklist';
import { SourcesStrip } from './components/SourcesStrip';
import { useMovementAlerts } from './hooks/useMovementAlerts';
import { useTrackerData } from './hooks/useTrackerData';

export default function App() {
  const data = useTrackerData();
  const alerts = useMovementAlerts(data.movements);
  const hasData = data.addresses.length > 0;

  return (
    <div className="app-shell">
      <div className="atmosphere" aria-hidden="true" />
      <main className="dashboard">
        <IncidentHeader
          lastUpdated={data.lastUpdated}
          loading={data.loading}
          onRefresh={data.refresh}
          alertsEnabled={alerts.enabled}
          alertsSupported={alerts.supported}
          alertsPermission={alerts.permission}
          onToggleAlerts={() => {
            void alerts.toggle();
          }}
        />

        {data.error ? (
          <div className="error-banner" role="alert">
            <div>
              <strong>Could not reach a Bitcoin explorer.</strong>{' '}
              <span className="muted">
                Some networks and DNS providers block explorer domains. Check
                your connection, VPN, or DNS filter, then retry.
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

        <LaterFlowNotice flows={data.laterFlows} />

        <AddressList
          addresses={data.addresses}
          usdPrice={data.usdPrice}
          loading={data.loading}
        />

        <MovementFeed movements={data.movements} loading={data.loading} />

        <RiskChecklist />

        <SourcesStrip />

        <footer className="site-footer">
          <p>
            Balances and transactions via{' '}
            <span className="mono">{data.source ?? 'mempool.space'}</span>
            {data.source && data.source !== 'mempool.space'
              ? ' (fallback mirror)'
              : ''}
            . Incident facts from Galaxy Research and community cluster reports.
            Not affiliated with Coinkite or Coldcard.
          </p>
        </footer>
      </main>
    </div>
  );
}
