export const APP_NAME = 'Coldcard Hack Tracker';

export const ORIGINAL_STOLEN_BTC = 1082.65;

export const INCIDENT = {
  dateLabel: 'July 30, 2026',
  windowUtc: '01:10:20 – 01:51:26 UTC',
  victimAddresses: 1196,
  blockStart: 960_183,
  blockEnd: 960_191,
  feeSatPerVb: 30,
  sourceLabel: 'Galaxy Research',
  sourceUrl: 'https://x.com/glxyresearch',
} as const;

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
