import { formatBtc, truncateAddress } from '../lib/format';
import { explorerAddressUrl, explorerTxUrl } from '../lib/mempool';
import type { LaterFlow } from '../hooks/useTrackerData';

type Props = {
  flows: LaterFlow[];
};

export function LaterFlowNotice({ flows }: Props) {
  if (flows.length === 0) return null;

  return (
    <section className="later-flow" aria-label="Later deposits through vaults">
      {flows.map((f) => (
        <article key={f.address} className="later-flow-card">
          <p className="later-flow-kicker">What happened · {f.label}</p>
          <p className="later-flow-body">
            After the reported{' '}
            <span className="mono">{formatBtc(f.reportBtc)} BTC</span>{' '}
            consolidation, about{' '}
            <span className="mono">{formatBtc(f.laterInBtc)} BTC</span> more was
            sent into this same vault
            {f.laterOutBtc > 0.001 ? (
              <>
                , then about{' '}
                <span className="mono">{formatBtc(f.laterOutBtc)} BTC</span> left
                {f.destinations[0] ? (
                  <>
                    {' '}
                    to{' '}
                    <a
                      className="mono"
                      href={explorerAddressUrl(f.destinations[0])}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {truncateAddress(f.destinations[0], 8, 4)}
                    </a>
                  </>
                ) : null}
              </>
            ) : null}
            . The original reported balance is still on the address — that is why
            report shortfall stays 0.
          </p>
          <p className="later-flow-meta muted">
            <a href={explorerTxUrl(f.txid)} target="_blank" rel="noreferrer">
              View outbound tx
            </a>
            {' · '}
            <a
              href={explorerAddressUrl(f.address)}
              target="_blank"
              rel="noreferrer"
            >
              Vault address
            </a>
          </p>
        </article>
      ))}
    </section>
  );
}
