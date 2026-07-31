import { useEffect, useState } from 'react';
import { APP_NAME, EARLY_WAVE, INCIDENT, ORIGINAL_STOLEN_BTC } from '../data/incident';
import { formatBtc, formatRelativeTime } from '../lib/format';

type Props = {
  lastUpdated: Date | null;
  loading: boolean;
  onRefresh: () => void;
};

export function IncidentHeader({ lastUpdated, loading, onRefresh }: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!lastUpdated) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [lastUpdated]);

  return (
    <header className="incident-header">
      <div className="brand-block">
        <p className="eyebrow">Live chain monitor</p>
        <h1 className="brand">{APP_NAME}</h1>
        <p className="subtitle">
          July 2026 seed-entropy sweep · {formatBtc(ORIGINAL_STOLEN_BTC)} BTC
          drained from {INCIDENT.victimAddresses.toLocaleString()} addresses in
          41 minutes
        </p>
        <p className="totals-note">
          <a href={EARLY_WAVE.sourceUrl} target="_blank" rel="noreferrer">
            Early reports
          </a>{' '}
          covered ~{formatBtc(EARLY_WAVE.btc)} BTC across
          ~{EARLY_WAVE.addresses.toLocaleString()} wallets. Galaxy’s fuller
          fingerprint set is the {formatBtc(ORIGINAL_STOLEN_BTC)} BTC /{' '}
          {INCIDENT.victimAddresses.toLocaleString()} figure tracked here.
        </p>
      </div>

      <div className="meta-block">
        <dl className="meta-grid">
          <div>
            <dt>Window</dt>
            <dd>
              {INCIDENT.dateLabel}
              <span className="meta-sub">{INCIDENT.windowUtc}</span>
            </dd>
          </div>
          <div>
            <dt>Blocks</dt>
            <dd>
              {INCIDENT.blockStart.toLocaleString()}–
              {INCIDENT.blockEnd.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt>Fee signature</dt>
            <dd>
              {INCIDENT.feeSatPerVb.toFixed(1)} sat/vB · no change
              <span className="meta-sub">{INCIDENT.feeOverpayNote}</span>
            </dd>
          </div>
          <div>
            <dt>Victim paths</dt>
            <dd>
              {INCIDENT.victimsByPath.bip84.toLocaleString()} BIP-84
              <span className="meta-sub">
                {INCIDENT.victimsByPath.bip49} BIP-49 ·{' '}
                {INCIDENT.victimsByPath.bip44} BIP-44
              </span>
            </dd>
          </div>
        </dl>

        <div className="refresh-row">
          <button
            type="button"
            className="refresh-btn"
            onClick={onRefresh}
            disabled={loading}
          >
            Refresh
          </button>
          <span className="updated" aria-live="polite">
            {lastUpdated
              ? `Updated ${formatRelativeTime(lastUpdated, now)}`
              : loading
                ? 'Loading…'
                : 'Not yet updated'}
          </span>
        </div>
      </div>
    </header>
  );
}
