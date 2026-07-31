import { useEffect, useState } from 'react';
import { APP_NAME, INCIDENT, ORIGINAL_STOLEN_BTC } from '../data/incident';
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
            <dd>{INCIDENT.feeSatPerVb.toFixed(1)} sat/vB · no change</dd>
          </div>
          <div>
            <dt>Source</dt>
            <dd>
              <a href={INCIDENT.sourceUrl} target="_blank" rel="noreferrer">
                {INCIDENT.sourceLabel}
              </a>
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
