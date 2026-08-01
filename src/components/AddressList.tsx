import {
  CLUSTER_BY_ID,
  CLUSTERS,
  CONSOLIDATED_BTC,
  HOLDING_ADDRESSES,
  INCIDENT,
  ORIGINAL_STOLEN_BTC,
  type ClusterId,
} from '../data/incident';
import { formatBtc, formatUsd, truncateAddress } from '../lib/format';
import { explorerAddressUrl } from '../lib/mempool';
import type { LiveAddress } from '../hooks/useTrackerData';

type Props = {
  addresses: LiveAddress[];
  usdPrice: number | null;
  loading: boolean;
};

const STATUS_LABEL: Record<LiveAddress['status'], string> = {
  held: 'Held',
  partial: 'Partial',
  emptied: 'Emptied',
};

function groupByCluster(addresses: LiveAddress[]): {
  clusterId: ClusterId;
  rows: LiveAddress[];
}[] {
  return CLUSTERS.map((cluster) => ({
    clusterId: cluster.id,
    rows: addresses.filter((a) => a.clusterId === cluster.id),
  })).filter((g) => g.rows.length > 0);
}

function GalaxyClusterMeta() {
  return (
    <dl className="cluster-meta">
      <div>
        <dt>Scope</dt>
        <dd>
          <span className="meta-primary">
            {formatBtc(CLUSTER_BY_ID['galaxy-july30'].stolenBtc)} BTC ·{' '}
            {INCIDENT.victimAddresses.toLocaleString()} addresses
          </span>
        </dd>
      </div>
      <div>
        <dt>Window</dt>
        <dd>
          <span className="meta-primary">{INCIDENT.dateLabel}</span>
          <span className="meta-sub">{INCIDENT.windowUtc}</span>
        </dd>
      </div>
      <div>
        <dt>Blocks</dt>
        <dd>
          <span className="meta-primary">
            {INCIDENT.blockStart.toLocaleString()}–
            {INCIDENT.blockEnd.toLocaleString()}
          </span>
        </dd>
      </div>
      <div>
        <dt>Fee signature</dt>
        <dd>
          <span className="meta-primary">
            {INCIDENT.feeSatPerVb.toFixed(1)} sat/vB · no change
          </span>
          <span className="meta-sub">{INCIDENT.feeOverpayNote}</span>
        </dd>
      </div>
      <div>
        <dt>Victim paths</dt>
        <dd>
          <span className="meta-primary">
            {INCIDENT.victimsByPath.bip84.toLocaleString()} BIP-84
          </span>
          <span className="meta-sub">
            {INCIDENT.victimsByPath.bip49} BIP-49 ·{' '}
            {INCIDENT.victimsByPath.bip44} BIP-44
          </span>
        </dd>
      </div>
    </dl>
  );
}

function AddressRow({
  address: a,
  usdPrice,
}: {
  address: LiveAddress;
  usdPrice: number | null;
}) {
  const usd = usdPrice != null ? a.balanceBtc * usdPrice : null;

  return (
    <tr className={`status-${a.status}${a.flash ? ' flash' : ''}`}>
      <td>
        <span className="addr-label">{a.label}</span>
        {a.note ? <span className="addr-note">{a.note}</span> : null}
      </td>
      <td className="mono">
        <a
          href={explorerAddressUrl(a.address)}
          target="_blank"
          rel="noreferrer"
          title={a.address}
        >
          {truncateAddress(a.address)}
        </a>
      </td>
      <td className="mono num">
        {formatBtc(a.balanceBtc)} BTC
        {usd != null ? <span className="meta-sub">{formatUsd(usd)}</span> : null}
      </td>
      <td className="mono num muted">{formatBtc(a.reportBtc)} BTC</td>
      <td className="mono num">{a.utxoCount}</td>
      <td>
        <span className={`status-pill status-${a.status}`}>
          {STATUS_LABEL[a.status]}
        </span>
      </td>
    </tr>
  );
}

function TableHead() {
  return (
    <thead>
      <tr>
        <th scope="col">Label</th>
        <th scope="col">Address</th>
        <th scope="col">Balance</th>
        <th scope="col">Report</th>
        <th scope="col">UTXOs</th>
        <th scope="col">Status</th>
      </tr>
    </thead>
  );
}

export function AddressList({ addresses, usdPrice, loading }: Props) {
  const groups = groupByCluster(addresses);

  return (
    <section className="panel" aria-labelledby="addresses-heading">
      <div className="panel-head">
        <h2 id="addresses-heading">Watched holdings</h2>
        <p>
          About {formatBtc(ORIGINAL_STOLEN_BTC)} BTC drained across tracked
          clusters, of which {formatBtc(CONSOLIDATED_BTC)} BTC reached these
          vaults (gap is mostly fees). Clusters may be different operators —
          attribution is fingerprint / community report.
        </p>
      </div>

      {loading && addresses.length === 0 ? (
        <div className="address-table-wrap">
          <table className="address-table">
            <TableHead />
            <tbody>
              {Array.from({ length: HOLDING_ADDRESSES.length }, (_, i) => (
                <tr key={i} className="skeleton-row">
                  <td colSpan={6}>Loading address…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        groups.map(({ clusterId, rows }) => {
          const cluster = CLUSTER_BY_ID[clusterId];
          const headingId = `cluster-${clusterId}`;

          return (
            <article
              className="cluster-group"
              key={clusterId}
              aria-labelledby={headingId}
            >
              <header className="cluster-head">
                <div className="cluster-head-top">
                  <h3 className="cluster-label" id={headingId}>
                    {cluster.label}
                  </h3>
                  {cluster.sourceUrl ? (
                    <a
                      href={cluster.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="cluster-source"
                    >
                      Source
                    </a>
                  ) : null}
                </div>
                <p className="cluster-note">{cluster.note}</p>
                {clusterId === 'galaxy-july30' ? <GalaxyClusterMeta /> : null}
              </header>

              <div className="address-table-wrap">
                <table className="address-table">
                  <TableHead />
                  <tbody>
                    {rows.map((a) => (
                      <AddressRow
                        key={a.address}
                        address={a}
                        usdPrice={usdPrice}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </article>
          );
        })
      )}
    </section>
  );
}
