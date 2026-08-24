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
import { formatBtc, formatUsd, truncateAddress, truncateTxid } from '../lib/format';
import { explorerAddressUrl, explorerTxUrl } from '../lib/mempool';
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

const P2TR_LATER_VAULT =
  'bc1p0l0xs2a0ffn2d9pek28k3vm9rjr2p0c5hvdlu03gpdwgzdgpscnq6qlk0h';

/** Aug 4 empty of Kelbie later P2TR vault — vault peels then Binance rail. */
const P2TR_LATER_CASHOUT = [
  {
    amt: '~0.01',
    block: 961019,
    txid: '780ea04371adee7490a2409484693cdf49f6ac4efc36ded59f53788c2fcf0326',
    destLabel: 'OP_RETURN messenger hub',
    dest: 'bc1qqa7p9qj89f6vg3yhuejhylty8l6626emj736pr',
  },
  {
    amt: '~1.00',
    block: 961021,
    txid: '064eb61de80cff3e74408a99de840a6e469bca5c79faa4f54dc718e75d7ddd4f',
    destLabel: 'OP_RETURN messenger hub',
    dest: 'bc1qqa7p9qj89f6vg3yhuejhylty8l6626emj736pr',
  },
  {
    amt: '~2.00',
    block: 961026,
    txid: '1a454301c7f9cb41193b63e82d05c88903fd4e356467b231b9b2e095aac772c2',
    destLabel: 'OP_RETURN messenger hub',
    dest: 'bc1q2nfxrvvg67nhey0gk0cc8ke2ea4akge8kskyyq',
  },
  {
    amt: '~1.00',
    block: 961032,
    txid: '2c7075a3388b88c29d976d862919f11a239c72e31b19ac459469586b815012cc',
    destLabel: 'OP_RETURN messenger hub',
    dest: 'bc1qqa7p9qj89f6vg3yhuejhylty8l6626emj736pr',
  },
  {
    amt: '~2.00',
    block: 961037,
    txid: '927183853a12d34241fb61bbfb3e8f64e29d75768e2bf058497d5399e1cac6b9',
    destLabel: 'OP_RETURN messenger hub',
    dest: 'bc1q2nfxrvvg67nhey0gk0cc8ke2ea4akge8kskyyq',
  },
  {
    amt: '~4.44',
    block: 961048,
    txid: 'd969fd1c2a1558c000c8e5e15b069dbd383f4e63a0427fa0ba7f58d41e7e16ef',
    destLabel: 'Taproot park (still held)',
    dest: 'bc1prjnvz77lhd3t6kdxt34x4yzgwu4qfdgyges8h6qhwldj60z5mcqs7pprpr',
  },
] as const;

const P2TR_HOP_HUB = 'bc1q2nfxrvvg67nhey0gk0cc8ke2ea4akge8kskyyq';
const P2TR_BINANCE_DEPOSIT = '13i9ZaXBYJ74qPuK7JrJ6Znws5uTa37vQt';

const P2TR_LATER_BINANCE = [
  {
    amt: '~5.33',
    block: 961034,
    note: `8 peels from [bc1q2nfx…](address:${P2TR_HOP_HUB}) (commingled hub)`,
    txid: '0c60a619c66e38bc508832a524415eaedaec88bde9477c9796bc041cce5b6850',
    destLabel: 'Binance deposit',
    dest: P2TR_BINANCE_DEPOSIT,
    arkm: true,
  },
  {
    amt: '~2.43',
    block: 961046,
    note: `from [bc1q2nfx…](address:${P2TR_HOP_HUB}) change chain`,
    txid: '57a9d5f2764153e9accc8f0207d5e33af68db73356c13e22b1aebd32247c90bc',
    destLabel: 'Binance deposit',
    dest: '14ajEkhPAgEoow6BHw8b42Dj6JjZSWtsxR',
    arkm: true,
  },
  {
    amt: '~1.81',
    block: 961046,
    note: 'includes vault UTXO taint via prior consolidate',
    txid: '1c09bf59f1c39d8c698b5ec10fe51a70976646937bf99d6f971eac116aaf961f',
    destLabel: 'Binance deposit',
    dest: '199JVFuJgimybw4RXBmftLAVufPeyP2GwG',
    arkm: true,
  },
  {
    amt: '~5.33',
    block: 961043,
    note: `[13i9Za…](address:${P2TR_BINANCE_DEPOSIT}) sweep`,
    txid: 'e8c70a9d91edbad984efc690c53c8c0f105b01a97c08e05b44dfda822415ce29',
    destLabel: 'Binance hot',
    dest: 'bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h',
    arkm: true,
  },
] as const;

function P2trLaterVaultCashout() {
  return (
    <div className="cashout-flow">
      <p className="cashout-flow-label">
        Aug 4 cash-out · later P2TR vault (~10.45)
      </p>
      <ul className="addr-peels">
        {P2TR_LATER_CASHOUT.map((step) => (
          <li key={step.txid}>
            <span className="addr-peel-amt">{step.amt}</span>
            <span className="cashout-arrow" aria-hidden="true">
              →
            </span>
            <a
              className="note-link"
              href={explorerAddressUrl(step.dest)}
              target="_blank"
              rel="noreferrer"
            >
              {step.destLabel}
            </a>
            <span>
              {' '}
              · {step.block} ·{' '}
              <a
                className="mono note-link"
                href={explorerTxUrl(step.txid)}
                target="_blank"
                rel="noreferrer"
              >
                {truncateTxid(step.txid)}
              </a>
            </span>
          </li>
        ))}
      </ul>
      <p className="cashout-flow-sublabel">
        Then via hop hubs (commingled) → Binance
      </p>
      <ul className="addr-peels">
        {P2TR_LATER_BINANCE.map((step) => (
          <li key={step.txid}>
            <span className="addr-peel-amt">{step.amt}</span>
            <span className="cashout-arrow" aria-hidden="true">
              →
            </span>
            <a
              className="note-link"
              href={
                step.arkm
                  ? `https://arkm.com/explorer/address/${step.dest}`
                  : explorerAddressUrl(step.dest)
              }
              target="_blank"
              rel="noreferrer"
            >
              {step.destLabel}
            </a>
            <span>
              {' '}
              · {step.block}
              {step.note ? (
                <>
                  {' · '}
                  <LinkedNote as="span" text={step.note} />
                </>
              ) : null}{' '}
              ·{' '}
              <a
                className="mono note-link"
                href={explorerTxUrl(step.txid)}
                target="_blank"
                rel="noreferrer"
              >
                {truncateTxid(step.txid)}
              </a>
            </span>
          </li>
        ))}
      </ul>
      <p className="cashout-flow-sublabel">
        Parallel ETH rail (
        <a
          className="note-link"
          href="https://x.com/osint_based/status/2084913457921429800"
          target="_blank"
          rel="noreferrer"
        >
          @osint_based
        </a>
        ) · Aug 4 — BTC→THOR hop soft
      </p>
      <ul className="addr-peels">
        <li>
          <span className="addr-peel-amt">~205 ETH</span>
          <span className="cashout-arrow" aria-hidden="true">
            →
          </span>
          <a
            className="note-link"
            href="https://etherscan.io/address/0x41B7529a411EeA979a8d468bdEBd36b0ad703268"
            target="_blank"
            rel="noreferrer"
          >
            0x41B752… (via THORChain)
          </a>
        </li>
        <li>
          <span className="addr-peel-amt">200 ETH</span>
          <span className="cashout-arrow" aria-hidden="true">
            →
          </span>
          <a
            className="note-link"
            href="https://etherscan.io/address/0xd90e2f925DA726b50C4Ed8D0Fb90Ad053324F31b"
            target="_blank"
            rel="noreferrer"
          >
            Tornado.Cash Router
          </a>
          <span> · 2×100</span>
        </li>
      </ul>
    </div>
  );
}

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

const AUG2_VAULT = 'bc1q0rvn88w08j75k4h48lf9fvhan7unjp7vjf5q6m';
const AUG2_TAPROOT_HOP =
  'bc1pynd6vswmxkghw6k5463xwcj7el7u4tpl2t2pnh0s8llmc2wgzfqsdu7h92';
const AUG2_CJ1_RESIDUAL = 'bc1qajcrhj3s2x0yfcj54emjukghv93su80svp2d3t';
const AUG2_CJ2_RESIDUAL = 'bc1qq6s7wsmf6an78xyjkst707x32nyakj3u4jy2fr';
const AUG2_CJ3_LIVE = [
  'bc1qf35ycfp32ra49n3j8hp9gk7r8z52vhvgpuad8k',
  'bc1qs3lj4x5whcfyz2akafaay4fs9xskd68wy9v9ze',
] as const;

function EarlyAug2CoinJoinTrail() {
  return (
    <div className="cashout-flow">
      <p className="cashout-flow-label">Aug 4–5 mix · Wasabi-style cascade</p>
      <dl className="cashout-rails">
        <div className="cashout-rail">
          <dt>1 · Empty</dt>
          <dd>
            <a
              className="note-link"
              href={explorerAddressUrl(AUG2_VAULT)}
              target="_blank"
              rel="noreferrer"
            >
              Aug 2 vault
            </a>
            <span className="cashout-arrow" aria-hidden="true">
              →
            </span>
            <a
              className="note-link"
              href={explorerAddressUrl(AUG2_TAPROOT_HOP)}
              target="_blank"
              rel="noreferrer"
            >
              Taproot hop
            </a>
            <span className="cashout-note">
              {' '}
              · ~64.90 BTC · blk 961065 · ~5 sat/vB ·{' '}
              <a
                className="mono note-link"
                href={explorerTxUrl(
                  'e3274a1b87096938d014e1edaa01b06c3dd16e72a48f66ead95c79f83f2b3ddf',
                )}
                target="_blank"
                rel="noreferrer"
              >
                {truncateTxid(
                  'e3274a1b87096938d014e1edaa01b06c3dd16e72a48f66ead95c79f83f2b3ddf',
                )}
              </a>
            </span>
          </dd>
        </div>
        <div className="cashout-rail">
          <dt>2 · CJ1</dt>
          <dd>
            residual ~54.32 @{' '}
            <a
              className="mono note-link"
              href={explorerAddressUrl(AUG2_CJ1_RESIDUAL)}
              target="_blank"
              rel="noreferrer"
            >
              {truncateAddress(AUG2_CJ1_RESIDUAL)}
            </a>
            <span className="cashout-note">
              {' '}
              · plus 20× ~1.2914 · blk 961069 · ~2 sat/vB · 324→382 ·{' '}
              <a
                className="mono note-link"
                href={explorerTxUrl(
                  'f3ee6e61129b90b4746275a2ea17b08ac53769556d61994c94f03db9bcc37b24',
                )}
                target="_blank"
                rel="noreferrer"
              >
                {truncateTxid(
                  'f3ee6e61129b90b4746275a2ea17b08ac53769556d61994c94f03db9bcc37b24',
                )}
              </a>
            </span>
          </dd>
        </div>
        <div className="cashout-rail">
          <dt>3 · CJ2</dt>
          <dd>
            residual ~47.12 @{' '}
            <a
              className="mono note-link"
              href={explorerAddressUrl(AUG2_CJ2_RESIDUAL)}
              target="_blank"
              rel="noreferrer"
            >
              {truncateAddress(AUG2_CJ2_RESIDUAL)}
            </a>
            <span className="cashout-note">
              {' '}
              · equal denoms · blk 961082 · ~2 sat/vB · 320→374 ·{' '}
              <a
                className="mono note-link"
                href={explorerTxUrl(
                  '3bdac8ed822fc4cb123bc78689da3179ea8321d6daa5034c2170100399cdf935',
                )}
                target="_blank"
                rel="noreferrer"
              >
                {truncateTxid(
                  '3bdac8ed822fc4cb123bc78689da3179ea8321d6daa5034c2170100399cdf935',
                )}
              </a>
            </span>
          </dd>
        </div>
        <div className="cashout-rail">
          <dt>4 · CJ3</dt>
          <dd>
            residual ends · 7× ~7.7484 (anonymity set) · 2 still live:{' '}
            <a
              className="mono note-link"
              href={explorerAddressUrl(AUG2_CJ3_LIVE[0])}
              target="_blank"
              rel="noreferrer"
            >
              {truncateAddress(AUG2_CJ3_LIVE[0])}
            </a>
            {', '}
            <a
              className="mono note-link"
              href={explorerAddressUrl(AUG2_CJ3_LIVE[1])}
              target="_blank"
              rel="noreferrer"
            >
              {truncateAddress(AUG2_CJ3_LIVE[1])}
            </a>
            <span className="cashout-note">
              {' '}
              · also 2× ~3.8742 · blk 961093 · ~1 sat/vB · 454→502 ·{' '}
              <a
                className="mono note-link"
                href={explorerTxUrl(
                  '80f11c778a2f486ffc55b4e8665a94971ae9c350ac53969e9efcbf90478cbf90',
                )}
                target="_blank"
                rel="noreferrer"
              >
                {truncateTxid(
                  '80f11c778a2f486ffc55b4e8665a94971ae9c350ac53969e9efcbf90478cbf90',
                )}
              </a>
            </span>
          </dd>
        </div>
        <div className="cashout-rail">
          <dt>5 · Remix</dt>
          <dd>
            other large outs remixed in further CJs (blks 961102–961160)
            <span className="cashout-note">
              {' '}
              · some equal-denom peels (anonymity set — not proven same
              operator) hit{' '}
              <a
                className="note-link"
                href="https://arkm.com/explorer/address/bc1pdwu79dady576y3fupmm82m3g7p2p9f6hgyeqy0tdg7ztxg7xrayqlkl8j9"
                target="_blank"
                rel="noreferrer"
              >
                Hyperunit
              </a>
              ; no labeled CEX on the unique-residual path. Still watching 2×
              ~7.75 + unique ~3.40 residual
            </span>
          </dd>
        </div>
      </dl>
    </div>
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
  const isP2trLater = a.address === P2TR_LATER_VAULT;

  return (
    <tr className={`status-${a.status}${a.flash ? ' flash' : ''}`}>
      <td>
        <span className="addr-label">{a.label}</span>
        {a.note ? (
          <LinkedNote as="span" className="addr-note" text={a.note} />
        ) : null}
        {isDualSweep ? <Wave4DualSweepPeels /> : null}
        {isP2trLater ? <P2trLaterVaultCashout /> : null}
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
          About {formatBtc(ORIGINAL_STOLEN_BTC)} BTC drained across known
          waves. Galaxy’s Waves 1–3 same-operator total is{' '}
          {formatBtc(GALAXY.totalStolenBtc)} BTC across{' '}
          {GALAXY.victimAddresses.toLocaleString()} addresses; their Aug 24
          high-confidence headline is {formatBtc(GALAXY.highConfidenceBtc)} BTC
          across{' '}
          {GALAXY.highConfidenceVictimAddresses.toLocaleString()} addresses
          (Waves 1–3 + owner-confirmed footprints; ~$114.7M at theft-time
          prices), or up to{' '}
          {formatBtc(GALAXY.withCandidateWave4Btc)} BTC if outstanding
          candidates are promoted.{' '}
          {formatBtc(CONSOLIDATED_BTC)} BTC is in watched holdings. The
          remaining ~{formatBtc(watchedGap)} BTC is mostly unwatched Wave 4
          destinations (sparse still-held sample), plus smaller/unmatched
          Wave 3 vaults, untracked lettered footprints, and fees. Community
          waves (evening, morning, early Aug 2, P2TR, Wave 4) may be different
          operators — Galaxy now tracks {GALAXY.additionalFootprints}+
          footprints beyond Waves 1–3. No confirmed attack after Aug 6.
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
                {clusterId === 'early-aug2' ? (
                  <>
                    <EarlyAug2Meta />
                    <EarlyAug2CoinJoinTrail />
                  </>
                ) : null}
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
