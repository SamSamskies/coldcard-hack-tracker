export const APP_NAME = 'Coldcard Hack Tracker';

/** First public wave (Hamilton) before Galaxy’s fuller fingerprint set. */
export const EARLY_WAVE = {
  btc: 594.48,
  addresses: 500,
  sourceLabel: 'Rob Hamilton',
  sourceUrl: 'https://x.com/Rob1Ham/status/2082896614218203616',
} as const;

/** Primary July 30 window mapped by Galaxy from Block’s fingerprint. */
export const INCIDENT = {
  dateLabel: 'July 30, 2026',
  windowUtc: '01:10:20 – 01:51:26 UTC',
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
  | 'kelbie-july31'
  | 'evening-july31'
  | 'morning-aug1';

export type Cluster = {
  id: ClusterId;
  label: string;
  /** Estimated BTC drained from victims in this cluster. */
  stolenBtc: number;
  note: string;
  sourceUrl?: string;
};

/**
 * Named consolidation clusters. Operators may differ; attribution is
 * fingerprint / community report, not proven same attacker.
 */
export const CLUSTERS: readonly Cluster[] = [
  {
    id: 'galaxy-july30',
    label: 'Galaxy fingerprint · July 30',
    stolenBtc: 1082.65,
    note: 'Block/Galaxy on-chain fingerprint; four consolidation holdings.',
    sourceUrl: 'https://x.com/glxyresearch/status/2083181683067506899',
  },
  {
    id: 'kelbie-july31',
    label: 'Post-scan wave · July 31',
    stolenBtc: 45.91,
    note: 'Past Block scan end (block 960230). Seven of eight markers; RBF differs.',
    sourceUrl: 'https://x.com/KevinKelbie/status/2083368025864990857',
  },
  {
    id: 'evening-july31',
    label: 'Evening wave · July 31',
    stolenBtc: 0.50986038,
    note: 'Block 960457. Low-fee (~2 sat/vB) sweeps into a short-lived collector, then one vault. Distinct from the Kelbie vault.',
    sourceUrl: 'https://x.com/evands/status/2083505832587587945',
  },
  {
    id: 'morning-aug1',
    label: 'Morning wave · Aug 1',
    stolenBtc: 0.33295323,
    note: 'Blocks 960518–960523. Direct victim sweeps (~15–50 sat/vB) into one vault; honey-pot / duress-wallet report.',
    sourceUrl: 'https://x.com/TomerStrolight/status/2083525927309320202',
  },
] as const;

export const CLUSTER_BY_ID: Record<ClusterId, Cluster> = Object.fromEntries(
  CLUSTERS.map((c) => [c.id, c]),
) as Record<ClusterId, Cluster>;

/** Sum of cluster drain estimates across all watched waves. */
export const ORIGINAL_STOLEN_BTC = CLUSTERS.reduce(
  (sum, c) => sum + c.stolenBtc,
  0,
);

/** Primary public writeups for the sweep and the firmware issue. */
export const SOURCES = [
  {
    label: 'Galaxy Research',
    note: 'Mapped the July 30 fingerprint set: 1,082.65 BTC across 1,196 addresses into four holdings.',
    url: 'https://x.com/glxyresearch/status/2083181683067506899',
  },
  {
    label: 'Kevin Kelbie',
    note: 'July 31 post-scan wave (~45.9 BTC) after Block’s scan window; similar markers, different RBF behavior.',
    url: 'https://x.com/KevinKelbie/status/2083368025864990857',
  },
  {
    label: 'Evan Schoenberg',
    note: 'Evening July 31 low-fee (~2 sat/vB) sweeps consolidated into a separate ~0.51 BTC vault.',
    url: 'https://x.com/evands/status/2083505832587587945',
  },
  {
    label: 'Tomer Strolight',
    note: 'Aug 1 morning wave: RNG / duress-wallet honey pot swept into a ~0.33 BTC vault (blocks 960518–960523).',
    url: 'https://x.com/TomerStrolight/status/2083525927309320202',
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

export const HOLDING_ADDRESSES: readonly HoldingAddress[] = [
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
    label: 'July 31 vault',
    reportBtc: 45.90251994,
    clusterId: 'kelbie-july31',
    note: 'Consolidated from 1,216 sweeps; still unspent',
  },
  {
    address: 'bc1q7rmsw0ra7zrphe66wwa9960ffm69cp8dlrrcgf',
    label: 'Evening vault',
    reportBtc: 0.50980268,
    clusterId: 'evening-july31',
    note: '0.50980268 BTC consolidated from victim sweeps',
  },
  {
    address: 'bc1qzm5pauxyv7t7vqstzpumqcn066wfjsmev34mf3',
    label: 'Aug 1 vault',
    reportBtc: 0.33203236,
    clusterId: 'morning-aug1',
    note: '0.33203236 BTC from 16 victim sweeps; still unspent',
  },
] as const;

/**
 * What actually landed in watched holding addresses. Lower than
 * ORIGINAL_STOLEN_BTC because sweep and consolidation fees burned sats,
 * so this is the baseline for "is it still there".
 */
export const CONSOLIDATED_BTC = HOLDING_ADDRESSES.reduce(
  (sum, h) => sum + h.reportBtc,
  0,
);

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
export const REFRESH_INTERVAL_MS = 60_000;
export const SATS_PER_BTC = 100_000_000;
/** Primary wave funds reported unspent at this block; later spends count as movement. */
export const WATCH_AFTER_BLOCK = 960_400;

/** Hop 0 = watched holdings; hop 1+ = destinations of those spends. */
export const MAX_HOP_DEPTH = 2;
/** Cap fan-out per spend so public mempool polling stays cheap. */
export const MAX_DESTINATIONS_PER_SPEND = 3;
/** Ignore dust-sized hop destinations. */
export const MIN_HOP_FOLLOW_SATS = 1_000_000; // 0.01 BTC
/** Hard cap on extra addresses watched beyond the seed holdings. */
export const MAX_HOP_WATCH_ADDRESSES = 16;
