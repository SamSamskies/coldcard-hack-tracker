import {
  formatBlockHeight,
  formatBtc,
  truncateAddress,
  truncateTxid,
} from '../lib/format';
import { explorerAddressUrl, explorerTxUrl } from '../lib/mempool';
import { KNOWN_ADDRESS_LABELS, MAX_HOP_DEPTH } from '../data/incident';
import type { Movement } from '../hooks/useTrackerData';

type Props = {
  movements: Movement[];
  loading: boolean;
};

function destinationLabel(address: string): string | undefined {
  return KNOWN_ADDRESS_LABELS[address];
}

export function MovementFeed({ movements, loading }: Props) {
  return (
    <section className="panel" aria-labelledby="movement-heading">
      <div className="panel-head">
        <h2 id="movement-heading">Movement feed</h2>
        <p>
          Outbound spends of the reported consolidation from watched holdings,
          then followed destinations (up to hop {MAX_HOP_DEPTH}). Stops at known
          exchange, bridge, and service-hub exits — later custodian churn is not
          listed. Surplus through a vault that still holds its reported balance,
          and later peels through a hop after it already cashed out to a known
          exit, are ignored.
        </p>
      </div>

      {loading && movements.length === 0 ? (
        <p className="empty muted">Scanning recent transactions…</p>
      ) : movements.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No outbound spends</p>
          <p className="muted">
            Reported consolidation balances have not left the holding addresses.
          </p>
        </div>
      ) : (
        <div className="movement-list-wrap">
          <ul className="movement-list">
            {movements.slice(0, 40).map((m) => (
              <li key={`${m.txid}-${m.fromAddress}`} className="movement-item">
                <div className="movement-main">
                  <span className="movement-txid-row">
                    {m.hop > 0 ? (
                      <span className="hop-badge">Hop {m.hop}</span>
                    ) : null}
                    <a
                      className="mono"
                      href={explorerTxUrl(m.txid)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {truncateTxid(m.txid)}
                    </a>
                  </span>
                  <span className="movement-amt mono">
                    −{formatBtc(m.amountBtc)} BTC
                  </span>
                </div>
                <div className="movement-meta">
                  <span>
                    From {m.fromLabel}{' '}
                    <span className="mono muted">
                      {truncateAddress(m.fromAddress, 8, 4)}
                    </span>
                  </span>
                  <span>
                    {m.confirmed
                      ? m.blockHeight != null
                        ? formatBlockHeight(m.blockHeight)
                        : 'Confirmed'
                      : 'Unconfirmed'}
                  </span>
                </div>
                {m.destinations.length > 0 ? (
                  <p className="movement-dest muted">
                    To{' '}
                    {m.destinations.slice(0, 3).map((d, i) => {
                      const known = destinationLabel(d);
                      return (
                        <span key={d}>
                          {i > 0 ? ', ' : ''}
                          {known ? <span>{known} </span> : null}
                          <a
                            className="mono"
                            href={explorerAddressUrl(d)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {truncateAddress(d, 8, 4)}
                          </a>
                        </span>
                      );
                    })}
                    {m.destinations.length > 3
                      ? ` +${m.destinations.length - 3} more`
                      : ''}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
