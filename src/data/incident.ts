import {
  WAVE3_MIN_WATCH_BTC,
  WAVE3_VAULT_COUNT,
  WAVE3_VAULT_REPORT_BTC,
  WAVE3_VAULTS,
} from './wave3Vaults';

export const APP_NAME = 'Coldcard Hack Tracker';

/** First public wave (Hamilton) before Galaxy’s fuller fingerprint set. */
export const EARLY_WAVE = {
  btc: 594.48,
  addresses: 500,
  sourceLabel: 'Rob Hamilton',
  sourceUrl: 'https://x.com/Rob1Ham/status/2082896614218203616',
} as const;

/**
 * Galaxy’s three-wave same-operator fingerprint (Aug 1 updates).
 * Headline total 1,367.05 BTC across 4,585 victim addresses.
 */
export const GALAXY = {
  totalStolenBtc: 1367.05,
  victimAddresses: 4585,
  /** Galaxy’s reported finals; our live Wave 3 watch list is a partial reconstruct. */
  holdingAddresses: 7 + 293,
  sourceUrl: 'https://x.com/glxyresearch/status/2083623500183421043',
} as const;

/**
 * How we built the Wave 3 watch list. Galaxy did not publish the 293 vault
 * addresses; these were reconstructed from their public fingerprint and
 * cross-checked against the public COLDCARD RNG chain map.
 */
export const WAVE3_FINGERPRINT = {
  blockStart: 960_396,
  blockEnd: 960_471,
  feeSatPerVbMin: 180,
  feeSatPerVbMax: 220,
  /** Galaxy’s Wave 3 victim count from their Aug 1 map. */
  victimAddresses: 1912,
  galaxyVaults: 293,
  galaxyHeldBtc: 207.73,
  matchedVaults: WAVE3_VAULT_COUNT,
  matchedHeldBtc: WAVE3_VAULT_REPORT_BTC,
  minWatchBtc: WAVE3_MIN_WATCH_BTC,
  summary:
    'Not Galaxy’s published address list. Matched their Wave 3 fingerprint (blocks 960396–960471, ~180–220 sat/vB, park → P2WSH vault), cross-checked against the public COLDCARD RNG chain map, then kept only higher-value vaults (≥ 0.5 BTC) so the cron snapshot stays reliable on public explorers. Smaller vaults are omitted on purpose. Partial versus Galaxy’s ~293 vaults / ~207.73 BTC.',
} as const;

/** Galaxy Wave 2 markers from their Aug 1 map. */
export const WAVE2_FINGERPRINT = {
  blockStart: 960_345,
  blockEnd: 960_369,
  victimAddresses: 1478,
  /** Two fee bands in the same wave. */
  feeSatPerVb: [50, 10] as const,
  vaultBtc: 45.90251994,
  collectorBtc: 30.18476329,
} as const;

/** Community evening wave (Evan Schoenberg) — distinct from Galaxy Wave 2. */
export const EVENING_WAVE = {
  feeSatPerVbMin: 1,
  feeSatPerVbMax: 2,
  eveningVaultBtc: 0.50980268,
  hopVaultBtc: 0.69135523,
} as const;

/** Community morning wave (Tomer Strolight honey-pot / duress report). */
export const MORNING_WAVE = {
  blockStart: 960_518,
  blockEnd: 960_523,
  feeSatPerVbMin: 15,
  feeSatPerVbMax: 50,
  victimSweeps: 16,
} as const;

/** Community early Aug 2 consolidation (Marius Offchain + Erik Mk3 corroboration). */
export const EARLY_AUG2_WAVE = {
  block: 960_668,
  windowUtc: '04:03 UTC Aug 2',
  feeSatPerVb: 9,
  inputCount: 902,
  addressCount: 795,
  landedBtc: 64.90373764,
} as const;

/** Primary July 30 window (Galaxy Wave 1) mapped from Block’s fingerprint. */
export const INCIDENT = {
  dateLabel: 'July 30, 2026',
  windowUtc: '01:10:20 – 01:51:26 UTC',
  /** Wave 1 victim count from Galaxy’s first map (path breakdown sums to this). */
  victimAddresses: 1196,
  /** Native segwit / nested segwit / legacy — multi-path key scan signature. */
  victimsByPath: {
    bip84: 1183,
    bip49: 7,
    bip44: 6,
  },
  blockStart: 960_183,
  blockEnd: 960_191,
  feeSatPerVb: 30,
  /** Galaxy: 30–75× the ~0.4–1.0 sat/vB median that week. */
  feeOverpayNote: '30–75× median that week',
} as const;

export type ClusterId =
  | 'galaxy-july30'
  | 'galaxy-july31'
  | 'galaxy-wave3'
  | 'evening-july31'
  | 'morning-aug1'
  | 'early-aug2';

export type Cluster = {
  id: ClusterId;
  label: string;
  /** Estimated BTC drained from victims in this cluster. */
  stolenBtc: number;
  /**
   * UTC day the wave landed, to day granularity only. Intraday timing is not
   * established for every cluster, so the timeline plots by date rather than
   * implying block-level precision the reports do not support.
   */
  date: string;
  note: string;
  sourceUrl?: string;
};

/**
 * Named consolidation clusters. Galaxy Waves 1–3 are attributed to the same
 * operator; evening/morning waves may differ (fingerprint / community report).
 * Early Aug 2 consolidation matches the weak-seed sweep profile but is not a
 * Galaxy-published wave.
 */
export const CLUSTERS: readonly Cluster[] = [
  {
    id: 'galaxy-july30',
    label: 'Galaxy Wave 1 · July 30',
    stolenBtc: 1082.65,
    date: '2026-07-30',
    note: 'Four consolidation holdings. Multi-path key-scan signature (BIP-84/49/44).',
    sourceUrl: 'https://x.com/glxyresearch/status/2083181683067506899',
  },
  {
    id: 'galaxy-july31',
    label: 'Galaxy Wave 2 · July 31',
    stolenBtc: 76.16,
    date: '2026-07-31',
    note: 'Two fee bands into a watched vault plus an unmoved collector.',
    sourceUrl: 'https://x.com/glxyresearch/status/2083560940469981591',
  },
  {
    id: 'galaxy-wave3',
    label: 'Galaxy Wave 3 · Jul 31–Aug 1',
    stolenBtc: 208.24,
    date: '2026-07-31',
    note: `Not Galaxy’s published list — fingerprint-matched + RNG chain map, then ≥ ${WAVE3_MIN_WATCH_BTC} BTC only.`,
    sourceUrl: 'https://x.com/glxyresearch/status/2083623500183421043',
  },
  {
    id: 'evening-july31',
    label: 'Evening wave · July 31',
    /**
     * Live stolen stack on watched addresses: evening vault 0.50980268 + hop vault
     * 0.69135523. Hop grew on Aug 1 when a Jul 31 low-fee victim consolidation
     * (~0.1915 BTC) finally moved in from an intermediate.
     */
    stolenBtc: 1.20115791,
    date: '2026-07-31',
    note: 'Distinct from Galaxy Wave 2. Ocean miner peel later met stolen hops at the same P2SH service hub (same exit venue, not proof of same operator); Ocean sats not counted as stolen.',
    sourceUrl: 'https://x.com/evands/status/2083505832587587945',
  },
  {
    id: 'morning-aug1',
    label: 'Morning wave · Aug 1',
    stolenBtc: 0.33295323,
    date: '2026-08-01',
    note: 'Honey-pot / duress-wallet report. Mk4 claim later withdrawn — seed was Mk3-origin.',
    sourceUrl: 'https://x.com/TomerStrolight/status/2083578868191957292',
  },
  {
    id: 'early-aug2',
    label: 'Early Aug 2 consolidation',
    /**
     * Sum of 902 victim inputs in the consolidation tx. ~0.0057 BTC burned as
     * fees; 64.90373764 BTC landed in the watched vault.
     */
    stolenBtc: 64.90947964,
    date: '2026-08-02',
    note: 'Distinct fee/structure from Galaxy Waves 1–3. Community Mk2 drain report plus a Mk3 testing-device victim in the same consolidation; sampled inputs long-dormant and funded after the March 2021 vuln window.',
    sourceUrl: 'https://x.com/mariusoffchain/status/2083814011859030252',
  },
] as const;

export const CLUSTER_BY_ID: Record<ClusterId, Cluster> = Object.fromEntries(
  CLUSTERS.map((c) => [c.id, c]),
) as Record<ClusterId, Cluster>;

/** Sum of cluster drain estimates across all tracked waves. */
export const ORIGINAL_STOLEN_BTC = CLUSTERS.reduce(
  (sum, c) => sum + c.stolenBtc,
  0,
);

/** Primary public writeups for the sweep and the firmware issue. */
export const SOURCES = [
  {
    label: 'Galaxy Research · Wave 3',
    note: 'Aug 1: third wave (~207.73 BTC into 293 P2WSH vaults). Observed total 1,367.05 BTC across 4,585 addresses.',
    url: 'https://x.com/glxyresearch/status/2083623500183421043',
  },
  {
    label: 'Galaxy Research · Wave 2',
    note: 'Aug 1: second wave attributed to the same operator — 1,158.81 BTC / 2,673 addresses across seven holdings.',
    url: 'https://x.com/glxyresearch/status/2083560940469981591',
  },
  {
    label: 'Galaxy Research · Wave 1',
    note: 'Mapped the July 30 fingerprint set: 1,082.65 BTC across ~1,195 addresses into four holdings.',
    url: 'https://x.com/glxyresearch/status/2083181683067506899',
  },
  {
    label: 'Kevin Kelbie',
    note: 'Independently flagged the ~45.9 BTC July 31 vault (now Galaxy Wave 2) after Block’s scan window; RBF differed from Wave 1.',
    url: 'https://x.com/KevinKelbie/status/2083368025864990857',
  },
  {
    label: 'Evan Schoenberg',
    note: 'Evening July 31 low-fee (~2 sat/vB) sweeps into a separate vault; Aug 1 hop consolidation (incl. delayed ~0.19 BTC) raised the watched cluster to ~1.20 BTC.',
    url: 'https://x.com/evands/status/2083505832587587945',
  },
  {
    label: 'Ocean block 960511',
    note: 'Coinbase of block 960511 (tag OCEAN.XYZ) paid ~0.060 BTC that later touched the Aug 1 hop vault and was peeled off (not counted as stolen). That peel later hit the same P2SH service hub ([3KMmeqPe…](address:3KMmeqPeQcngyTehdfSwsGqvxfU7J7qtc8)) as the stolen evening-wave hops — same exit venue, not proof of same operator.',
    url: 'https://mempool.space/block/960511',
  },
  {
    label: 'Tomer Strolight',
    note: 'Aug 1 morning wave: duress-wallet honey pot swept into a ~0.33 BTC vault; Mk4 attribution later corrected to Mk3-origin seed.',
    url: 'https://x.com/TomerStrolight/status/2083578868191957292',
  },
  {
    label: 'Marius Offchain',
    note: 'Early Aug 2 consolidation (04:03 UTC): ~65 BTC from ~795 addresses into one vault (community Mk2 drain report); not a Galaxy-published wave.',
    url: 'https://x.com/mariusoffchain/status/2083814011859030252',
  },
  {
    label: 'Erik',
    note: 'Mk3 testing-device victim (~9k sats, native segwit) swept in the Early Aug 2 consolidation — same tx / vault as the Marius report.',
    url: 'https://x.com/eriklocalhost/status/2083875886458171626',
  },
  {
    label: 'Coinkite advisory',
    note: 'Official guidance (updated Aug 1): who is exposed, fixed firmware versions, and migration steps.',
    url: 'https://blog.coinkite.com/coldcard-mk3-seed-generation-warning/',
  },
  {
    label: 'Block Engineering',
    note: 'Root-cause writeup on the RNG fallback, 32-bit reseed, and blast radius beyond BIP-39 seeds.',
    url: 'https://engineering.block.xyz/blog/predictable-rng-fallback-and-32-bit-reseed-in-coldcard-firmware',
  },
  {
    label: 'WizardSardine',
    note: 'Aug 1 deep dive: who is affected (including Mk3 5.0.x), advanced features still broken with dice seeds, and migration guidance.',
    url: 'https://wizardsardine.com/blog/coldcard-rng-vulnerability/',
  },
  {
    label: 'Kevin Loaec',
    note: 'Announcement thread for the WizardSardine writeup.',
    url: 'https://x.com/KLoaec/status/2083579776887922865',
  },
  {
    label: 'CoinDesk',
    note: 'Aug 1 reporting on Galaxy’s expanded totals and why further waves remain possible.',
    url: 'https://www.coindesk.com/tech/2026/08/01/how-bitcoin-cold-wallets-lost-usd70-million-in-an-attack-that-never-touched-the-devices',
  },
  {
    label: 'Clay Garrett',
    note: 'July 30 operator used a paid blockchain-data account during the sweeps; findings shared with authorities.',
    url: 'https://x.com/clay_garrett/status/2083247006139503065',
  },
] as const;

export type HoldingAddress = {
  address: string;
  label: string;
  reportBtc: number;
  clusterId: ClusterId;
  note?: string;
};

/** Wave 1/2 + community vaults — live-polled in the browser. */
export const CORE_HOLDING_ADDRESSES: readonly HoldingAddress[] = [
  {
    address: 'bc1qq85v2c926eg6pgxhwp6q7lf6cnsz80qs3fcu9r',
    label: 'Holding 1',
    reportBtc: 562.02021083,
    clusterId: 'galaxy-july30',
  },
  {
    address: 'bc1qx76cae2706qd5q576feh7xq8rfcsjpf2htfhe3',
    label: 'Holding 2',
    reportBtc: 398.47575357,
    clusterId: 'galaxy-july30',
  },
  {
    address: 'bc1q8jy96fe5lf8vfugydnte3cguk92gpev7kwtp3q',
    label: 'Holding 3',
    reportBtc: 89.6232789,
    clusterId: 'galaxy-july30',
  },
  {
    address: 'bc1qnk4zh9qcnap2mycp56qjrgza3cc8ylrh8fecp0',
    label: 'Holding 4',
    reportBtc: 32.4505632,
    clusterId: 'galaxy-july30',
    note: 'Unmoved collector remainder',
  },
  {
    address: 'bc1qtfrwa4j6rmj9rsgspv6a0yjumkg39js2numu75',
    label: 'Wave 2 vault',
    reportBtc: 45.90251994,
    clusterId: 'galaxy-july31',
    note: 'Consolidated from 1,216 sweeps (via bc1qsjrf5ze…)',
  },
  {
    address: 'bc1qmd5m5ktv7m5ffujxv4248fxv36myvdx79n8jp6',
    label: 'Wave 2 collector',
    reportBtc: 30.18476329,
    clusterId: 'galaxy-july31',
    note: 'Unmoved collector from 93 sweeps at ~10 sat/vB',
  },
  {
    address: 'bc1q7rmsw0ra7zrphe66wwa9960ffm69cp8dlrrcgf',
    label: 'Evening vault',
    reportBtc: 0.50980268,
    clusterId: 'evening-july31',
    note: 'Jul 31 consolidation (~0.51 BTC). Emptied Aug 2 — see ETH rail in flow above',
  },
  {
    address: 'bc1qayw8nrec0vsa5vj4xee4dqhfgztx2gqq7w2u0s',
    label: 'Aug 1 hop vault',
    reportBtc: 0.69135523,
    clusterId: 'evening-july31',
    note: '0.4998 + 0.1915 BTC stack. Emptied Aug 2 into likely custodial/swap P2SH hub — hops mixed out; see BTC rail above. Ocean peel also met there (not in report balance)',
  },
  {
    address: 'bc1qzm5pauxyv7t7vqstzpumqcn066wfjsmev34mf3',
    label: 'Aug 1 vault',
    reportBtc: 0.33203236,
    clusterId: 'morning-aug1',
  },
  {
    address: 'bc1q0rvn88w08j75k4h48lf9fvhan7unjp7vjf5q6m',
    label: 'Aug 2 vault',
    reportBtc: 64.90373764,
    clusterId: 'early-aug2',
  },
];

const WAVE3_HOLDING_ADDRESSES: readonly HoldingAddress[] = WAVE3_VAULTS.map(
  (v) => ({
    address: v.address,
    label: v.label,
    reportBtc: v.reportBtc,
    clusterId: 'galaxy-wave3' as const,
  }),
);

export const HOLDING_ADDRESSES: readonly HoldingAddress[] = [
  ...CORE_HOLDING_ADDRESSES,
  ...WAVE3_HOLDING_ADDRESSES,
];

/**
 * What actually landed in watched holding addresses. Lower than
 * ORIGINAL_STOLEN_BTC because sweep/consolidation fees burned sats and because
 * the Wave 3 watch list is a partial fingerprint reconstruct, so this is the
 * baseline for "is the watched stack still there".
 */
export const CONSOLIDATED_BTC = HOLDING_ADDRESSES.reduce(
  (sum, h) => sum + h.reportBtc,
  0,
);

/** Cap parallel mempool address polls for live core holdings. */
export const ADDRESS_FETCH_CONCURRENCY = 4;

/**
 * Some networks and DNS resolvers block mempool.space, so fall through to
 * community instances that serve the same API.
 */
export const MEMPOOL_HOSTS = [
  'https://mempool.space',
  'https://mempool.emzy.de',
  'https://mempool.bitaroo.net',
] as const;

export const REQUEST_TIMEOUT_MS = 8_000;
/** Live refresh for core holdings (Wave 3 uses /snapshot.json from cron). */
export const REFRESH_INTERVAL_MS = 60_000;
/** How often to re-fetch the cron snapshot for Wave 3 balances. */
export const SNAPSHOT_REFRESH_INTERVAL_MS = 5 * 60_000;
export const SATS_PER_BTC = 100_000_000;
/** Primary wave funds reported unspent at this block; later spends count as movement. */
export const WATCH_AFTER_BLOCK = 960_400;

/**
 * Known cash-out / infrastructure addresses that may appear in the movement
 * feed. Labels help trackers spot exits the hop follower may not reach.
 */
export const KNOWN_ADDRESS_LABELS: Readonly<Record<string, string>> = {
  bc1qp6yzmq5kjr8yvyw7453gxvq4z3tvkdyadqm794: 'THORChain BTC vault',
  '3KMmeqPeQcngyTehdfSwsGqvxfU7J7qtc8': 'P2SH service hub',
};

/** Hop 0 = watched holdings; hop 1+ = destinations of those spends. */
export const MAX_HOP_DEPTH = 2;
/** Cap fan-out per spend so public mempool polling stays cheap. */
export const MAX_DESTINATIONS_PER_SPEND = 3;
/** Ignore dust-sized hop destinations. */
export const MIN_HOP_FOLLOW_SATS = 1_000_000; // 0.01 BTC
/** Hard cap on extra addresses watched beyond the seed holdings. */
export const MAX_HOP_WATCH_ADDRESSES = 16;
