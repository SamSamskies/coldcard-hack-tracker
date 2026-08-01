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

function lastMovementDetail(m: Movement): string {
  const base = `${formatBtc(m.amountBtc)} BTC from ${m.fromLabel}`;
  if (m.impact === 'extra') {
    return `${base} · more coins in, then out (report still held)`;
  }
  if (m.impact === 'hop') {
    return `${base} · followed hop`;
  }
  return `${base} · reported stack`;
}

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
        <p className="kpi-label">Report shortfall</p>
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
              ? 'Reported consolidation missing from holdings'
              : 'Reported consolidation still on holdings'}
        </p>
      </article>

      <article className="kpi">
        <p className="kpi-label">Last outbound</p>
        <p className={`kpi-value text ${loading ? 'is-loading' : 'settle'}`}>
          {!hasData
            ? PENDING
            : lastMovement
              ? lastMovement.blockTime
                ? formatBlockTime(lastMovement.blockTime)
                : 'Unconfirmed'
              : 'None'}
        </p>
        <p className="kpi-detail">
          {!hasData
            ? 'Waiting for chain data'
            : lastMovement
              ? lastMovementDetail(lastMovement)
              : 'No post-watch spends from watched addresses'}
        </p>
      </article>
    </section>
  );
}
