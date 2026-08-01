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

const IMPACT_EXTRA = {
  label: 'Extra',
  title:
    'Later deposits left this address; the reported consolidation balance is still present',
} as const;

export function MovementFeed({ movements, loading }: Props) {
  return (
    <section className="panel" aria-labelledby="movement-heading">
      <div className="panel-head">
        <h2 id="movement-heading">Movement feed</h2>
        <p>
          Outbound spends after the watch cutoff from holdings and followed
          destinations (up to hop {MAX_HOP_DEPTH}). Tagged{' '}
          <span className="impact-inline">Extra</span> when a vault still holds
          its reported stack — that spend does not raise report shortfall.
        </p>
      </div>

      {loading && movements.length === 0 ? (
        <p className="empty muted">Scanning recent transactions…</p>
      ) : movements.length === 0 ? (
        <div className="empty-state">
          <p className="empty-title">No outbound spends</p>
          <p className="muted">
            No post-watch spends from watched holdings or followed hops.
          </p>
        </div>
      ) : (
        <ul className="movement-list">
          {movements.slice(0, 40).map((m) => {
            const badge =
              m.impact === 'extra'
                ? IMPACT_EXTRA
                : m.impact === 'hop'
                  ? {
                      label: `Hop ${m.hop}`,
                      title:
                        'Spend from a followed destination after funds left a holding',
                    }
                  : null;

            return (
              <li
                key={`${m.txid}-${m.fromAddress}`}
                className={`movement-item${m.impact === 'extra' ? ' movement-extra' : ''}`}
              >
                <div className="movement-main">
                  <span className="movement-txid-row">
                    {badge ? (
                      <span className="hop-badge" title={badge.title}>
                        {badge.label}
                      </span>
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
                  <span
                    className={`movement-amt mono${m.impact === 'extra' ? ' movement-amt-extra' : ''}`}
                  >
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
                {m.impact === 'extra' ? (
                  <p className="movement-note muted">
                    Does not reduce report shortfall — vault still holds its
                    reported balance.
                  </p>
                ) : null}
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
            );
          })}
        </ul>
      )}
    </section>
  );
}
