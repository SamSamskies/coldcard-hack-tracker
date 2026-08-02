import { LinkedNote } from './LinkedNote';
import {
  CLUSTER_BY_ID,
  CLUSTERS,
  CONSOLIDATED_BTC,
  GALAXY,
  HOLDING_ADDRESSES,
  INCIDENT,
  ORIGINAL_STOLEN_BTC,
  WAVE3_FINGERPRINT,
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
  }));
}

function GalaxyWave1Meta() {
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

function GalaxyWave3Meta() {
  const fp = WAVE3_FINGERPRINT;
  return (
    <div className="fingerprint-callout">
      <p className="fingerprint-title">Why these look like stolen Wave 3 funds</p>
      <p className="fingerprint-body">{fp.summary}</p>
      <dl className="cluster-meta">
        <div>
          <dt>Watched</dt>
          <dd>
            <span className="meta-primary">
              {fp.matchedVaults.toLocaleString()} P2WSH vaults ·{' '}
              {formatBtc(fp.matchedHeldBtc)} BTC
            </span>
            <span className="meta-sub">
              ≥ {formatBtc(fp.minWatchBtc)} BTC each · snapshot · Galaxy ~
              {fp.galaxyVaults} / ~{formatBtc(fp.galaxyHeldBtc)} BTC
            </span>
          </dd>
        </div>
        <div>
          <dt>Blocks</dt>
          <dd>
            <span className="meta-primary">
              {fp.blockStart.toLocaleString()}–{fp.blockEnd.toLocaleString()}
            </span>
          </dd>
        </div>
        <div>
          <dt>Fee window</dt>
          <dd>
            <span className="meta-primary">
              {fp.feeSatPerVbMin}–{fp.feeSatPerVbMax} sat/vB · no change
            </span>
            <span className="meta-sub">Galaxy: ~200 sat/vB</span>
          </dd>
        </div>
        <div>
          <dt>Pattern</dt>
          <dd>
            <span className="meta-primary">park → P2WSH vault</span>
            <span className="meta-sub">still funded at match time</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}

function EveningCashoutFlow() {
  return (
    <div className="cashout-flow">
      <p className="cashout-flow-label">Aug 2 cash-out · two rails</p>
      <dl className="cashout-rails">
        <div className="cashout-rail">
          <dt>BTC · ~0.69</dt>
          <dd>
            Aug 1 hop vault
            <span className="cashout-arrow" aria-hidden="true">
              →
            </span>
            <a
              className="mono note-link"
              href={explorerAddressUrl(
                '3KMmeqPeQcngyTehdfSwsGqvxfU7J7qtc8',
              )}
              target="_blank"
              rel="noreferrer"
            >
              3KMmeqPe… hub
            </a>
          </dd>
        </div>
        <div className="cashout-rail">
          <dt>ETH · ~0.24</dt>
          <dd>
            Evening vault
            <span className="cashout-arrow" aria-hidden="true">
              →
            </span>
            <a
              className="mono note-link"
              href={explorerAddressUrl(
                'bc1qp6yzmq5kjr8yvyw7453gxvq4z3tvkdyadqm794',
              )}
              target="_blank"
              rel="noreferrer"
            >
              THOR
            </a>
            <span className="cashout-arrow" aria-hidden="true">
              →
            </span>
            <a
              className="mono note-link"
              href="https://etherscan.io/address/0x6A08B5B20F23FcFE09f5da506Be59CAD1eC0df06"
              target="_blank"
              rel="noreferrer"
            >
              0x6A08…
            </a>
            <span className="cashout-arrow" aria-hidden="true">
              →
            </span>
            <a
              className="mono note-link"
              href="https://etherscan.io/address/0xC61F8Df65aCED169C8E2bFb8119FDeAf149B20f1"
              target="_blank"
              rel="noreferrer"
            >
              0xC61F…
            </a>
            <span className="cashout-note">
              {' '}
              · also ~3.6 ETH via{' '}
              <a
                className="mono note-link"
                href="https://etherscan.io/address/0x3bDB03ad7363152DFBc185Ee23eBC93F0CF93fd1"
                target="_blank"
                rel="noreferrer"
              >
                Orbiter Bridge 3
              </a>{' '}
              peels
            </span>
            <span className="cashout-parked">
              Sibling ~0.27 BTC still at{' '}
              <a
                className="mono note-link"
                href={explorerAddressUrl(
                  'bc1qdt6cswq9pld5e96el8ljhk4zfqmv423atgsrqw',
                )}
                target="_blank"
                rel="noreferrer"
              >
                bc1qdt6c…
              </a>
            </span>
          </dd>
        </div>
      </dl>
    </div>
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
        {a.note ? (
          <LinkedNote as="span" className="addr-note" text={a.note} />
        ) : null}
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
  const watchedGap = ORIGINAL_STOLEN_BTC - CONSOLIDATED_BTC;

  return (
    <section className="panel" aria-labelledby="addresses-heading">
      <div className="panel-head">
        <h2 id="addresses-heading">Watched holdings</h2>
        <p>
          About {formatBtc(ORIGINAL_STOLEN_BTC)} BTC drained across tracked
          clusters. Galaxy’s same-operator total is{' '}
          {formatBtc(GALAXY.totalStolenBtc)} BTC across{' '}
          {GALAXY.victimAddresses.toLocaleString()} addresses.{' '}
          {formatBtc(CONSOLIDATED_BTC)} BTC is in watched holdings (core vaults
          live-polled; {WAVE3_FINGERPRINT.matchedVaults} higher-value Wave 3
          vaults ≥ {formatBtc(WAVE3_FINGERPRINT.minWatchBtc)} BTC from the cron
          snapshot). The remaining ~{formatBtc(watchedGap)} BTC is mostly
          smaller/unmatched Wave 3 vaults plus fees. Evening/morning waves may
          be different operators.
        </p>
      </div>

      {loading && addresses.length === 0 ? (
        <div className="address-table-wrap">
          <table className="address-table">
            <TableHead />
            <tbody>
              {Array.from({ length: Math.min(HOLDING_ADDRESSES.length, 12) }, (_, i) => (
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
          const isWave3 = clusterId === 'galaxy-wave3';

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
                    {isWave3 && rows.length > 0 ? (
                      <span className="cluster-count">
                        {' '}
                        · {rows.length} vaults
                      </span>
                    ) : null}
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
                <LinkedNote className="cluster-note" text={cluster.note} />
                {clusterId === 'galaxy-july30' ? <GalaxyWave1Meta /> : null}
                {clusterId === 'evening-july31' ? <EveningCashoutFlow /> : null}
                {isWave3 ? <GalaxyWave3Meta /> : null}
              </header>

              {rows.length === 0 ? (
                <p className="cluster-unwatched">
                  No individual addresses watched for this wave (
                  {formatBtc(cluster.stolenBtc)} BTC in Galaxy’s total).
                </p>
              ) : (
                <div
                  className={`address-table-wrap${isWave3 ? ' is-scrollable' : ''}`}
                >
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
              )}
            </article>
          );
        })
      )}
    </section>
  );
}
