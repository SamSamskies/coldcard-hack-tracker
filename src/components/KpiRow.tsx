import { CONSOLIDATED_BTC } from '../data/incident';
import {
  formatBtc,
  formatBlockTime,
  formatHeldPercent,
  formatUsd,
} from '../lib/format';
import type { Movement } from '../hooks/useTrackerData';

type Props = {
  heldBtc: number;
  movedBtc: number;
  heldPct: number;
  usdPrice: number | null;
  lastMovement: Movement | null;
  loading: boolean;
  hasData: boolean;
};

const PENDING = '—';

export function KpiRow({
  heldBtc,
  movedBtc,
  heldPct,
  usdPrice,
  lastMovement,
  loading,
  hasData,
}: Props) {
  const usdValue = usdPrice != null ? heldBtc * usdPrice : null;
  // Holding amounts are reported to 2 decimals, so ignore sub-cent residue.
  const fullyHeld = movedBtc < 0.005;
  const alert = hasData && !fullyHeld;

  return (
    <section className="kpi-row" aria-label="Fund status">
      <article
        className={`kpi kpi-hero ${alert ? 'kpi-alert' : hasData ? 'kpi-held' : ''}`}
      >
        <p className="kpi-label">Still held</p>
        <p className={`kpi-value ${loading ? 'is-loading' : 'settle'}`}>
          {hasData ? formatHeldPercent(heldPct, fullyHeld) : PENDING}
        </p>
        <p className="kpi-detail">
          of {formatBtc(CONSOLIDATED_BTC)} BTC consolidated
        </p>
      </article>

      <article className="kpi">
        <p className="kpi-label">Balance on watch</p>
        <p className={`kpi-value mono ${loading ? 'is-loading' : 'settle'}`}>
          {hasData ? (
            <>
              {formatBtc(heldBtc)} <span className="unit">BTC</span>
            </>
          ) : (
            PENDING
          )}
        </p>
        <p className="kpi-detail">
          {hasData && usdValue != null ? formatUsd(usdValue) : 'USD pending'}
          {usdPrice != null ? (
            <span className="meta-sub">{formatUsd(usdPrice)}/BTC</span>
          ) : null}
        </p>
      </article>

      <article className={`kpi ${alert ? 'kpi-alert' : ''}`}>
        <p className="kpi-label">Moved</p>
        <p className={`kpi-value mono ${loading ? 'is-loading' : 'settle'}`}>
          {hasData ? (
            <>
              {formatBtc(movedBtc)} <span className="unit">BTC</span>
            </>
          ) : (
            PENDING
          )}
        </p>
        <p className="kpi-detail">
          {!hasData
            ? 'Waiting for chain data'
            : alert
              ? 'Funds have left the holding addresses'
              : 'Nothing has left the holding addresses'}
        </p>
      </article>

      <article className="kpi">
        <p className="kpi-label">Last movement</p>
        <p className={`kpi-value text ${loading ? 'is-loading' : 'settle'}`}>
          {!hasData
            ? PENDING
            : lastMovement
              ? lastMovement.blockTime
                ? formatBlockTime(lastMovement.blockTime)
                : 'Unconfirmed'
              : 'Unmoved'}
        </p>
        <p className="kpi-detail">
          {!hasData
            ? 'Waiting for chain data'
            : lastMovement
              ? `${formatBtc(lastMovement.amountBtc)} BTC from ${lastMovement.fromLabel}`
              : 'All watched holdings still holding'}
        </p>
      </article>
    </section>
  );
}
