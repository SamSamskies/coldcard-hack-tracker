import {
  formatBlockTime,
  formatBtc,
  truncateAddress,
  truncateTxid,
} from '../lib/format';
import { explorerAddressUrl, explorerTxUrl } from '../lib/mempool';
import { MAX_HOP_DEPTH } from '../data/incident';
import type { Movement } from '../hooks/useTrackerData';

type Props = {
  movements: Movement[];
  loading: boolean;
};

export function MovementFeed({ movements, loading }: Props) {
  return (
    <section className="panel" aria-labelledby="movement-heading">
      <div className="panel-head">
        <h2 id="movement-heading">Movement feed</h2>
        <p>
          Outbound spends from the four holdings, then followed destinations (up
          to hop {MAX_HOP_DEPTH}). Empty means funds have not left consolidation.
        </p>
      </div>

      {loading && movements.length === 0 ? (
        <p className="empty muted">Scanning recent transactions…</p>
      ) : movements.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No outbound spends</p>
          <p className="muted">
            All watched balances still match the post-sweep holding set.
          </p>
        </div>
      ) : (
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
                    ? m.blockTime
                      ? formatBlockTime(m.blockTime)
                      : `Block ${m.blockHeight}`
                    : 'Unconfirmed'}
                </span>
              </div>
              {m.destinations.length > 0 ? (
                <p className="movement-dest muted">
                  To{' '}
                  {m.destinations.slice(0, 3).map((d, i) => (
                    <span key={d}>
                      {i > 0 ? ', ' : ''}
                      <a
                        className="mono"
                        href={explorerAddressUrl(d)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {truncateAddress(d, 8, 4)}
                      </a>
                    </span>
                  ))}
                  {m.destinations.length > 3
                    ? ` +${m.destinations.length - 3} more`
                    : ''}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
