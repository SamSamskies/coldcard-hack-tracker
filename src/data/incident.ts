export const APP_NAME = 'Coldcard Hack Tracker';

export const ORIGINAL_STOLEN_BTC = 1082.65;

/** First public wave (Hamilton) before Galaxy’s fuller fingerprint set. */
export const EARLY_WAVE = {
  btc: 594.48,
  addresses: 500,
  sourceLabel: 'Rob Hamilton',
  sourceUrl: 'https://x.com/Rob1Ham/status/2082896614218203616',
} as const;

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

/** Primary public writeups for the sweep and the firmware issue. */
export const SOURCES = [
  {
    label: 'Galaxy Research',
    role: 'On-chain sweep',
    url: 'https://x.com/glxyresearch/status/2083181683067506899',
  },
  {
    label: 'Coinkite advisory',
    role: 'Official guidance',
    url: 'https://blog.coinkite.com/coldcard-mk3-seed-generation-warning/',
  },
  {
    label: 'Block Engineering',
    role: 'Root-cause analysis',
    url: 'https://engineering.block.xyz/blog/predictable-rng-fallback-and-32-bit-reseed-in-coldcard-firmware',
  },
] as const;

export type HoldingAddress = {
  address: string;
  label: string;
  reportBtc: number;
  note?: string;
};

export const HOLDING_ADDRESSES: readonly HoldingAddress[] = [
  {
    address: 'bc1qq85v2c926eg6pgxhwp6q7lf6cnsz80qs3fcu9r',
    label: 'Holding 1',
    reportBtc: 562.02,
  },
  {
    address: 'bc1qx76cae2706qd5q576feh7xq8rfcsjpf2htfhe3',
    label: 'Holding 2',
    reportBtc: 398.48,
  },
  {
    address: 'bc1q8jy96fe5lf8vfugydnte3cguk92gpev7kwtp3q',
    label: 'Holding 3',
    reportBtc: 89.62,
  },
  {
    address: 'bc1qnk4zh9qcnap2mycp56qjrgza3cc8ylrh8fecp0',
    label: 'Holding 4',
    reportBtc: 32.45,
    note: 'Unmoved collector remainder',
  },
] as const;

/**
 * Some networks and DNS resolvers block mempool.space, so fall through to
 * community instances that serve the same API.
 */
/**
 * What actually landed in the four holding addresses. Lower than
 * ORIGINAL_STOLEN_BTC because the attacker burned miner fees sweeping and
 * consolidating, so this is the baseline for "is it still there".
 */
export const CONSOLIDATED_BTC = HOLDING_ADDRESSES.reduce(
  (sum, h) => sum + h.reportBtc,
  0,
);

export const MEMPOOL_HOSTS = [
  'https://mempool.space',
  'https://mempool.emzy.de',
  'https://mempool.bitaroo.net',
] as const;

export const REQUEST_TIMEOUT_MS = 8_000;
export const REFRESH_INTERVAL_MS = 60_000;
export const SATS_PER_BTC = 100_000_000;
/** Galaxy reported funds unspent at this block; later spends count as movement. */
export const WATCH_AFTER_BLOCK = 960_400;

/** Hop 0 = the four Galaxy holdings; hop 1+ = destinations of those spends. */
export const MAX_HOP_DEPTH = 2;
/** Cap fan-out per spend so public mempool polling stays cheap. */
export const MAX_DESTINATIONS_PER_SPEND = 3;
/** Ignore dust-sized hop destinations. */
export const MIN_HOP_FOLLOW_SATS = 1_000_000; // 0.01 BTC
/** Hard cap on extra addresses watched beyond the four holdings. */
export const MAX_HOP_WATCH_ADDRESSES = 16;
