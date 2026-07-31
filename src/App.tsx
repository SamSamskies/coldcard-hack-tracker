import { AddressList } from './components/AddressList';
import { IncidentHeader } from './components/IncidentHeader';
import { KpiRow } from './components/KpiRow';
import { MovementFeed } from './components/MovementFeed';
import { SourcesStrip } from './components/SourcesStrip';
import { useTrackerData } from './hooks/useTrackerData';

export default function App() {
  const data = useTrackerData();
  const hasData = data.addresses.length > 0;

  return (
    <div className="app-shell">
      <div className="atmosphere" aria-hidden="true" />
      <main className="dashboard">
        <IncidentHeader
          lastUpdated={data.lastUpdated}
          loading={data.loading}
          onRefresh={data.refresh}
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

        <AddressList
          addresses={data.addresses}
          usdPrice={data.usdPrice}
          loading={data.loading}
        />

        <MovementFeed movements={data.movements} loading={data.loading} />

        <SourcesStrip />

        <footer className="site-footer">
          <p>
            Balances and transactions via{' '}
            <span className="mono">{data.source ?? 'mempool.space'}</span>
            {data.source && data.source !== 'mempool.space'
              ? ' (fallback mirror)'
              : ''}
            . Incident facts from Galaxy Research. Not affiliated with Coinkite
            or Coldcard.
          </p>
        </footer>
      </main>
    </div>
  );
}
