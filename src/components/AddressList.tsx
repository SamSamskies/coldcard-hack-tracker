import { LinkedNote } from './LinkedNote';
import {
  CLUSTER_BY_ID,
  CLUSTERS,
  CONSOLIDATED_BTC,
  EARLY_AUG2_WAVE,
  EVENING_WAVE,
  GALAXY,
  HOLDING_ADDRESSES,
  INCIDENT,
  MORNING_WAVE,
  ORIGINAL_STOLEN_BTC,
  P2TR_WAVE,
  WAVE2_FINGERPRINT,
  WAVE3_FINGERPRINT,
  WAVE4_WAVE,
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

/** Shared Galaxy Research markers: Scope / Blocks / Fee, plus wave-specific rows. */
function GalaxyWave1Meta() {
  const wave = CLUSTER_BY_ID['galaxy-july30'];
  return (
    <dl className="cluster-meta">
      <div>
        <dt>Scope</dt>
        <dd>
          <span className="meta-primary">
            {formatBtc(wave.stolenBtc)} BTC ·{' '}
            {INCIDENT.victimAddresses.toLocaleString()} addresses
          </span>
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
        <dt>Fee</dt>
        <dd>
          <span className="meta-primary">
            {INCIDENT.feeSatPerVb.toFixed(0)} sat/vB · no change
          </span>
          <span className="meta-sub">{INCIDENT.feeOverpayNote}</span>
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
        <dt>Paths</dt>
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

function GalaxyWave2Meta() {
  const wave = CLUSTER_BY_ID['galaxy-july31'];
  const fp = WAVE2_FINGERPRINT;
  return (
    <dl className="cluster-meta">
      <div>
        <dt>Scope</dt>
        <dd>
          <span className="meta-primary">
            {formatBtc(wave.stolenBtc)} BTC ·{' '}
            {fp.victimAddresses.toLocaleString()} addresses
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
        <dt>Fee</dt>
        <dd>
          <span className="meta-primary">
            {fp.feeSatPerVb[0]} and {fp.feeSatPerVb[1]} sat/vB
          </span>
        </dd>
      </div>
    </dl>
  );
}

function GalaxyWave3Meta() {
  const wave = CLUSTER_BY_ID['galaxy-wave3'];
  const fp = WAVE3_FINGERPRINT;
  return (
    <dl className="cluster-meta">
      <div>
        <dt>Scope</dt>
        <dd>
          <span className="meta-primary">
            {formatBtc(wave.stolenBtc)} BTC · ~
            {fp.victimAddresses.toLocaleString()} addresses
          </span>
          <span className="meta-sub">
            Galaxy ~{fp.galaxyVaults} vaults / ~
            {formatBtc(fp.galaxyHeldBtc)} BTC
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
        <dt>Fee</dt>
        <dd>
          <span className="meta-primary">
            {fp.feeSatPerVbMin}–{fp.feeSatPerVbMax} sat/vB
          </span>
          <span className="meta-sub">Galaxy: ~200 sat/vB</span>
        </dd>
      </div>
      <div>
        <dt>Watched</dt>
        <dd>
          <span className="meta-primary">
            {fp.matchedVaults.toLocaleString()} P2WSH ·{' '}
            {formatBtc(fp.matchedHeldBtc)} BTC
          </span>
          <span className="meta-sub">
            ≥ {formatBtc(fp.minWatchBtc)} BTC each
          </span>
        </dd>
      </div>
      <div>
        <dt>Pattern</dt>
        <dd>
          <span className="meta-primary">park → P2WSH</span>
          <span className="meta-sub">RNG map cross-check</span>
        </dd>
      </div>
    </dl>
  );
}

function EveningWaveMeta() {
  const wave = CLUSTER_BY_ID['evening-july31'];
  const ev = EVENING_WAVE;
  return (
    <dl className="cluster-meta">
      <div>
        <dt>Scope</dt>
        <dd>
          <span className="meta-primary">
            {formatBtc(wave.stolenBtc)} BTC watched
          </span>
          <span className="meta-sub">emptied Aug 1–2</span>
        </dd>
      </div>
      <div>
        <dt>Fee</dt>
        <dd>
          <span className="meta-primary">
            ~{ev.feeSatPerVbMin}–{ev.feeSatPerVbMax} sat/vB
          </span>
        </dd>
      </div>
    </dl>
  );
}

function MorningWaveMeta() {
  const wave = CLUSTER_BY_ID['morning-aug1'];
  const m = MORNING_WAVE;
  return (
    <dl className="cluster-meta">
      <div>
        <dt>Scope</dt>
        <dd>
          <span className="meta-primary">
            {formatBtc(wave.stolenBtc)} BTC
          </span>
        </dd>
      </div>
      <div>
        <dt>Blocks</dt>
        <dd>
          <span className="meta-primary">
            {m.blockStart.toLocaleString()}–{m.blockEnd.toLocaleString()}
          </span>
        </dd>
      </div>
      <div>
        <dt>Fee</dt>
        <dd>
          <span className="meta-primary">
            ~{m.feeSatPerVbMin}–{m.feeSatPerVbMax} sat/vB
          </span>
        </dd>
      </div>
      <div>
        <dt>Pattern</dt>
        <dd>
          <span className="meta-primary">direct victim → vault</span>
        </dd>
      </div>
    </dl>
  );
}

function EarlyAug2Meta() {
  const wave = CLUSTER_BY_ID['early-aug2'];
  const a = EARLY_AUG2_WAVE;
  return (
    <dl className="cluster-meta">
      <div>
        <dt>Scope</dt>
        <dd>
          <span className="meta-primary">
            {formatBtc(wave.stolenBtc)} BTC ·{' '}
            {a.inputCount.toLocaleString()} inputs
          </span>
          <span className="meta-sub">
            {a.addressCount.toLocaleString()} addresses
          </span>
        </dd>
      </div>
      <div>
        <dt>Blocks</dt>
        <dd>
          <span className="meta-primary">{a.block.toLocaleString()}</span>
        </dd>
      </div>
      <div>
        <dt>Fee</dt>
        <dd>
          <span className="meta-primary">~{a.feeSatPerVb} sat/vB</span>
        </dd>
      </div>
      <div>
        <dt>Window</dt>
        <dd>
          <span className="meta-primary">{a.windowUtc}</span>
        </dd>
      </div>
      <div>
        <dt>Pattern</dt>
        <dd>
          <span className="meta-primary">multi-path → one P2WPKH</span>
        </dd>
      </div>
    </dl>
  );
}

function P2trWaveMeta() {
  const wave = CLUSTER_BY_ID['p2tr-aug1'];
  const p = P2TR_WAVE;
  return (
    <dl className="cluster-meta">
      <div>
        <dt>Scope</dt>
        <dd>
          <span className="meta-primary">
            {formatBtc(wave.stolenBtc)} BTC watched
          </span>
          <span className="meta-sub">3 Kelbie P2TR sinks</span>
        </dd>
      </div>
      <div>
        <dt>Blocks</dt>
        <dd>
          <span className="meta-primary">
            {p.blockStart.toLocaleString()}–{p.blockEnd.toLocaleString()}
          </span>
        </dd>
      </div>
      <div>
        <dt>Fee</dt>
        <dd>
          <span className="meta-primary">~{p.feeSatPerVbPrimary} sat/vB</span>
          <span className="meta-sub">
            later also ~{p.feeSatPerVbSecondaryMin}–
            {p.feeSatPerVbSecondaryMax}
          </span>
        </dd>
      </div>
      <div>
        <dt>Pattern</dt>
        <dd>
          <span className="meta-primary">1-vout → P2TR</span>
          <span className="meta-sub">
            <a
              href={p.chainabuseReportUrl}
              target="_blank"
              rel="noreferrer"
              className="note-link"
            >
              Chainabuse victim
            </a>
          </span>
        </dd>
      </div>
    </dl>
  );
}

function Wave4Meta() {
  const wave = CLUSTER_BY_ID['wave4-aug3'];
  const w = WAVE4_WAVE;
  return (
    <dl className="cluster-meta">
      <div>
        <dt>Scope</dt>
        <dd>
          <span className="meta-primary">
            {formatBtc(wave.stolenBtc)} BTC ·{' '}
            {w.filteredAddresses.toLocaleString()} addrs
          </span>
        </dd>
      </div>
      <div>
        <dt>Blocks</dt>
        <dd>
          <span className="meta-primary">
            {w.blockStart.toLocaleString()}–{w.blockEnd.toLocaleString()}
          </span>
        </dd>
      </div>
      <div>
        <dt>Fee</dt>
        <dd>
          <span className="meta-primary">
            ~{w.feeSatPerVbMin}–{w.feeSatPerVbMax} sat/vB
          </span>
          <span className="meta-sub">RBF opt-in</span>
        </dd>
      </div>
      <div>
        <dt>Pattern</dt>
        <dd>
          <span className="meta-primary">1:1 victim → fresh dest</span>
          <span className="meta-sub">
            likely only — no victim report yet
          </span>
        </dd>
      </div>
      <div>
        <dt>Full lists</dt>
        <dd>
          <span className="meta-primary">
            <a
              href={w.pastebinConfirmedUrl}
              target="_blank"
              rel="noreferrer"
              className="note-link"
            >
              Confirmed addresses
            </a>
          </span>
          <span className="meta-sub">
            <a
              href={w.pastebinMempoolUrl}
              target="_blank"
              rel="noreferrer"
              className="note-link"
            >
              Mempool / RBF list
            </a>{' '}
            — unfiltered originals
          </span>
        </dd>
      </div>
    </dl>
  );
}

const WAVE4_DUAL_SWEEP_PARK =
  '1N8knQCfjqUeJQwjkZZavbboXXL6WVqfDo';

function Wave4DualSweepPeels() {
  return (
    <ul className="addr-peels">
      <li>
        <span className="addr-peel-amt">~2.79</span>
        <span className="cashout-arrow" aria-hidden="true">
          →
        </span>
        <a
          className="note-link"
          href="https://arkm.com/explorer/address/3CTpBmp8uWTcHJBjmyVe8VPPyCHTzj2hBH"
          target="_blank"
          rel="noreferrer"
        >
          Bullish.com
        </a>
        <span> · 960793</span>
      </li>
      <li>
        <span className="addr-peel-amt">~2.82</span>
        <span className="cashout-arrow" aria-hidden="true">
          →
        </span>
        <a
          className="note-link"
          href="https://arkm.com/explorer/address/bc1qdj58duywm3ng0twrxk5kykup9q6jmmj72n60ms"
          target="_blank"
          rel="noreferrer"
        >
          Coinbase Prime
        </a>
        <span>
          {' '}
          · 960818 · same cluster as{' '}
          <a
            className="mono note-link"
            href={explorerAddressUrl(
              'bc1qactqjuk4kghfgaqqt454hzzzs5lsaysunf80gh',
            )}
            target="_blank"
            rel="noreferrer"
          >
            bc1qactq…
          </a>
        </span>
      </li>
    </ul>
  );
}

function EveningCashoutFlow() {
  return (
    <div className="cashout-flow">
      <p className="cashout-flow-label">Aug 2–3 cash-out · three rails</p>
      <dl className="cashout-rails">
        <div className="cashout-rail">
          <dt>BTC · ~0.69</dt>
          <dd>
            <a
              className="note-link"
              href={explorerAddressUrl(
                'bc1qayw8nrec0vsa5vj4xee4dqhfgztx2gqq7w2u0s',
              )}
              target="_blank"
              rel="noreferrer"
            >
              Aug 1 hop vault
            </a>
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
            <span className="cashout-note">
              {' '}
              · likely custodial/swap deposit — hops already mixed out;
              stolen BTC effectively gone from watchable stack
            </span>
          </dd>
        </div>
        <div className="cashout-rail">
          <dt>ETH · ~11.7</dt>
          <dd>
            <a
              className="note-link"
              href={explorerAddressUrl(
                'bc1q7rmsw0ra7zrphe66wwa9960ffm69cp8dlrrcgf',
              )}
              target="_blank"
              rel="noreferrer"
            >
              Evening vault
            </a>
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
            <span className="cashout-arrow" aria-hidden="true">
              →
            </span>
            vanity hops
            <span className="cashout-arrow" aria-hidden="true">
              →
            </span>
            <a
              className="mono note-link"
              href="https://etherscan.io/address/0x45300136662dD4e58fc0DF61E6290DFfD992B785"
              target="_blank"
              rel="noreferrer"
            >
              KuCoin 17
            </a>
            <span className="cashout-note">
              {' '}
              · emptied Aug 2 20:29 UTC (~11.70 ETH); consolidated with ~11.08
              ETH from a parallel stack into a 23 ETH deposit; also funded via{' '}
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
          </dd>
        </div>
        <div className="cashout-rail">
          <dt>BTC · ~0.27</dt>
          <dd>
            <a
              className="note-link"
              href={explorerAddressUrl(
                'bc1q7rmsw0ra7zrphe66wwa9960ffm69cp8dlrrcgf',
              )}
              target="_blank"
              rel="noreferrer"
            >
              Evening vault
            </a>
            <span className="cashout-arrow" aria-hidden="true">
              →
            </span>
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
            <span className="cashout-arrow" aria-hidden="true">
              →
            </span>
            <a
              className="mono note-link"
              href={explorerAddressUrl(
                'bc1qs86u5g39288nxpe59xxul92kvvps6j747k320w',
              )}
              target="_blank"
              rel="noreferrer"
            >
              bc1qs86u… consol.
            </a>
            <span className="cashout-arrow" aria-hidden="true">
              →
            </span>
            <a
              className="mono note-link"
              href="https://arkm.com/explorer/address/328GxewqTzMxLPvLemaKS7Q5Wi1io8EEYD"
              target="_blank"
              rel="noreferrer"
            >
              KuCoin 328Gx…
            </a>
            {' · '}
            <a
              className="mono note-link"
              href="https://arkm.com/explorer/address/3JEQJdb1Cwbzvevzj1ECAoiMbvb2yckvCe"
              target="_blank"
              rel="noreferrer"
            >
              KuCoin 3JEQ…
            </a>
            <span className="cashout-note">
              {' '}
              · emptied Aug 3 01:22 UTC; ~0.27 mixed into a 1.54 BTC multi-input
              stack (block 960800), then peeled to two KuCoin deposits (~0.70 +
              ~0.84)
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
  const isDualSweep = a.address === WAVE4_DUAL_SWEEP_PARK;

  return (
    <tr className={`status-${a.status}${a.flash ? ' flash' : ''}`}>
      <td>
        <span className="addr-label">{a.label}</span>
        {a.note ? (
          <LinkedNote as="span" className="addr-note" text={a.note} />
        ) : null}
        {isDualSweep ? <Wave4DualSweepPeels /> : null}
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
          {formatBtc(CONSOLIDATED_BTC)} BTC is in watched holdings. The
          remaining ~{formatBtc(watchedGap)} BTC is mostly unwatched Wave 4
          destinations (sparse still-held sample), plus smaller/unmatched
          Wave 3 vaults and fees. Community waves (evening, morning, early
          Aug 2, P2TR, Wave 4) may be different operators.
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
                {clusterId === 'galaxy-july31' ? <GalaxyWave2Meta /> : null}
                {isWave3 ? <GalaxyWave3Meta /> : null}
                {clusterId === 'evening-july31' ? (
                  <>
                    <EveningWaveMeta />
                    <EveningCashoutFlow />
                  </>
                ) : null}
                {clusterId === 'morning-aug1' ? <MorningWaveMeta /> : null}
                {clusterId === 'early-aug2' ? <EarlyAug2Meta /> : null}
                {clusterId === 'p2tr-aug1' ? <P2trWaveMeta /> : null}
                {clusterId === 'wave4-aug3' ? <Wave4Meta /> : null}
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
