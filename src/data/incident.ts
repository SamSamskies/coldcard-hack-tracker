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
 * Galaxy investigation totals.
 *
 * `totalStolenBtc` / `victimAddresses` stay Waves 1–3 only (same-operator
 * fingerprint; Aug 1 map) so cluster invariants keep working.
 *
 * Aug 3 update ([thread](https://x.com/glxyresearch/status/2084411904924045370)):
 * high-confidence headline adds owner-confirmed lettered footprints; candidate
 * Wave 4 is still excluded from that headline. Chart Sankey used 1,591 BTC
 * (= 1,367.05 + 223.85 footprints A–N); the tweet/press figure is 1,596.
 */
export const GALAXY = {
  /** Waves 1–3 same-operator total — must equal those three cluster sums. */
  totalStolenBtc: 1367.05,
  victimAddresses: 4585,
  /** Galaxy’s reported finals; our live Wave 3 watch list is a partial reconstruct. */
  holdingAddresses: 7 + 293,
  /** Aug 3 tweet/press high-confidence: Waves 1–3 + owner-confirmed footprints. */
  highConfidenceBtc: 1596,
  /** ~7,300 addresses across Waves 1–3 + 14 smaller incidents (Aug 3). */
  highConfidenceVictimAddresses: 7300,
  /** Chart: owner-confirmed footprints A–N taken (Aug 3 cut). */
  footprintsConfirmedBtc: 223.85,
  /** Chart: of those footprints, still at first receive addresses. */
  footprintsStillHeldBtc: 204.18,
  /** Chart: pattern-matched, no owner confirmation yet. */
  patternMatchedUnconfirmedBtc: 15.27,
  /** Chart / tweet: add candidate Wave 4 (448.73) → ~2,055 BTC / ~$130m. */
  withCandidateWave4Btc: 2055,
  wave4CandidateBtc: 448.73,
  /** Wave 3 map (Aug 1). */
  sourceUrl: 'https://x.com/glxyresearch/status/2083623500183421043',
  /** Losses exceed $100M / multi-attacker footprints (Aug 3). */
  aug3UpdateUrl: 'https://x.com/glxyresearch/status/2084411904924045370',
} as const;

/**
 * Thorn’s Aug 4 “footprint O” — new overnight attacker pattern from one
 * victim report. No public destination/txid list yet, so not a watched cluster.
 */
export const FOOTPRINT_O = {
  btc: 12,
  addresses: 126,
  date: '2026-08-04',
  sourceUrl: 'https://x.com/intangiblecoins/status/2084584284837322868',
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

/**
 * Community P2TR sinks (Kevin Kelbie + Chainabuse victim). Distinct from
 * Wave 4: ~5 sat/vB (later vault also 25/40) into Taproot consolidations,
 * not Wave 4’s 1–3 sat/vB multi-park pattern. Watched set is the three
 * sinks Kelbie published — not a full wave census.
 */
export const P2TR_WAVE = {
  blockStart: 960_624,
  blockEnd: 960_897,
  /** Dominant fee band across all three sinks. */
  feeSatPerVbPrimary: 5,
  /** Secondary bands on the later vault (bc1p0l…). */
  feeSatPerVbSecondaryMin: 25,
  feeSatPerVbSecondaryMax: 40,
  smallVaultBtc: 0.50992489,
  /** Emptied collector bc1ptd… consolidated here @ block 960736. */
  hopVaultBtc: 36.01585057,
  laterVaultBtc: 10.44811501,
  emptiedCollector:
    'bc1ptd5x926gkxdu0p8a2rufr7u8lklrfqapucj8yha7vjqh5z6md9kqf53nap',
} as const;

/**
 * Likely Wave 4 (Alex Thorn / Galaxy research head). Pattern-match only —
 * Thorn has not yet confirmed via a direct victim report.
 *
 * Filters applied to the original pastebin sets (confirmed + mempool):
 *   1) −6 prior-history destinations (−5.39 BTC) — not fresh attacker parks
 *   2) −89 multisigs (−20.58 BTC) — Nunchuk flag; Waves 1–3 have zero multisigs
 *
 * `stolenBtc` / `filteredBtc` = surviving core after both filters (includes
 * what was still in mempool at first report). Watched holdings are a sparse
 * sample of still-held destinations ≥ 0.5 BTC, not the full destination set.
 */
export const WAVE4_WAVE = {
  blockStart: 960_778,
  blockEnd: 960_792,
  feeSatPerVbMin: 1,
  feeSatPerVbMax: 3,
  /** Pre-filter confirmed-window tweet stats (fingerprint context). */
  transactions: 218,
  victimAddresses: 462,
  /** Fresh attacker destinations after excluding 6 prior-history addresses. */
  destinations: 210,
  /** Original confirmed-window total before destination/multisig filters. */
  confirmedBtcAtReport: 388.92748828,
  /** Additional RBF-signaling sweeps Thorn listed at ~01:01 UTC. */
  mempoolBtcAtReport: 70.16757699,
  /** Combined pastebin total as first circulated (confirmed + mempool). */
  circulatedAddresses: 857,
  circulatedBtc: 486.11,
  /**
   * Multisig cut Thorn cited (Nunchuk). Note: 857−89≠709 and
   * 486.11−20.58≠448.73 — trust `coreAddresses` / `coreBtc` as the outcome.
   */
  multisigDiscountAddresses: 89,
  multisigDiscountBtc: 20.58,
  /** After multisig discount (Thorn / Nunchuk surviving core). */
  coreAddresses: 709,
  coreBtc: 448.73,
  priorHistoryDestinationsExcluded: 6,
  priorHistoryBtcExcluded: 5.39,
  /**
   * After both filters. Aligns with cluster stolenBtc. Assumes the 6
   * prior-history destinations were not among the 89 multisigs.
   */
  filteredAddresses: 703,
  filteredBtc: 443.34,
  /** @deprecated Use filteredBtc — kept as alias for cluster alignment tests. */
  confirmedBtc: 443.34,
  windowUtc: 'blocks 960778–960792 (~2.5h window; still expanding at report)',
  pastebinConfirmedUrl: 'https://pastebin.com/6AG9s0pP',
  pastebinMempoolUrl: 'https://pastebin.com/zR5Wk2cz',
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
  | 'early-aug2'
  | 'p2tr-aug1'
  | 'wave4-aug3';

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
 * operator; evening/morning/early-Aug-2/P2TR/Wave-4 waves may differ
 * (fingerprint / community report) and are not folded into GALAXY.totalStolenBtc.
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
    note: 'Distinct fee/structure from Galaxy Waves 1–3. Community Mk2 drain report plus a Mk3 testing-device victim in the same consolidation; sampled inputs long-dormant and funded after the March 2021 vuln window. [Chainabuse victim](https://chainabuse.com/report/61e7b80a-4ec6-42b4-a8b4-4cab1a29c9ac) lands in the same vault/tx (block 960668). Likely one of Galaxy’s lettered footprints.',
    sourceUrl: 'https://x.com/mariusoffchain/status/2083814011859030252',
  },
  {
    id: 'p2tr-aug1',
    label: 'P2TR wave · Aug 1–3',
    /**
     * Watched sinks only (Kelbie’s three P2TRs): small vault + hop from
     * emptied collector + later vault. Not a full wave census.
     */
    stolenBtc:
      P2TR_WAVE.smallVaultBtc +
      P2TR_WAVE.hopVaultBtc +
      P2TR_WAVE.laterVaultBtc,
    date: '2026-08-01',
    note: 'Distinct from Wave 4: ~5 sat/vB (later also 25/40) 1-vout multi-path sweeps into Taproot consolidations. Small vault corroborated by a Chainabuse Coldcard-hack victim report; larger sibling/hop verified on-chain with the same fingerprint. Watched set is Kelbie’s published sample, not every P2TR sink.',
    sourceUrl: 'https://x.com/KevinKelbie/status/2084294469126361372',
  },
  {
    id: 'wave4-aug3',
    label: 'Likely Wave 4 · Aug 3',
    /**
     * Thorn’s pastebin set after multisig (−20.58) and prior-history dest
     * (−5.39) filters — confirmed + mempool-at-report. Pattern-match only;
     * no direct victim confirmation yet.
     */
    stolenBtc: 443.34,
    date: '2026-08-03',
    note: 'Pattern-match only (no victim report yet). Galaxy’s revised Wave 4 figure is 448.73 BTC after cutting 89 multisig destinations. We go one step further and also drop 6 destinations that already had prior on-chain history (−5.39 BTC), so our total is 443.34. Galaxy’s Aug 3 ceiling ~2,055 BTC is their high-confidence 1,596 plus this 448.73 candidate — not our stricter 443.34 cut. Watched addresses are a sparse still-held sample.',
    sourceUrl: 'https://x.com/intangiblecoins/status/2084079706320646300',
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
    label: 'Galaxy Research · $100M update',
    note: 'Aug 3: high-confidence 1,596 BTC / ~7,300 addresses across Waves 1–3 + 14 owner-confirmed footprints; candidate Wave 4 would bring ~2,055 BTC. Multiple independent attackers. Waves 1–3 coins still unmoved.',
    url: 'https://x.com/glxyresearch/status/2084411904924045370',
  },
  {
    label: 'Alex Thorn · Footprint O',
    note: 'Aug 4: ≥15 attackers (footprints A–O). Overnight footprint O ~12 BTC from 126 addresses from one victim report; no public address list yet.',
    url: 'https://x.com/intangiblecoins/status/2084584284837322868',
  },
  {
    label: 'James O\'Beirne · CK tripwire',
    note: 'Aug 4: live honeypot scoreboard mapping attacker brute-force depth via decoys with added dice/passphrase entropy ([cktripwire.com](https://cktripwire.com/); [announcement](https://x.com/jamesob/status/2084769501661331589)). Zero-entropy control swept in ~1h; low-band (11–13 bit) honeypots still live at launch. Defensive research only — do not add honeypot sinks to holdings.',
    url: 'https://cktripwire.com/',
  },
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
    label: 'Kevin Kelbie · P2TR wave',
    note: 'Aug 3: ~0.51 BTC Chainabuse-corroborated P2TR sink plus two larger sibling Taproot consolidations (~36 + ~10 BTC) at ~5 sat/vB — distinct from Wave 4.',
    url: 'https://x.com/KevinKelbie/status/2084294469126361372',
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
    label: 'Alex Thorn · Likely Wave 4',
    note: 'Aug 3: likely 4th wave by pattern match (no victim report yet). Filtered core ~443.34 BTC / 703 addrs after removing 89 multisigs (−20.58 BTC, per Nunchuk) and 6 prior-history destinations (−5.39 BTC). Original pastebins still list the unfiltered set.',
    url: 'https://x.com/intangiblecoins/status/2084079706320646300',
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
    label: 'Nunchuk · Slipstream migration',
    note: 'Aug 3: multisig urgency tiers (Coldcard keys alone vs below threshold) and MARA Slipstream to avoid RBF-sniping during migration; Slipstream now public with no code.',
    url: 'https://x.com/nunchuk_io/status/2084163891043688858',
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
  /**
   * When false, skip Esplora *balance* polls and treat live balance as 0 (emptied).
   * Default true. Still shown on the dashboard; movement-feed `/txs` walks continue
   * so hop trails are not dropped. Terminal hop-2 watches freeze separately.
   */
  pollBalance?: boolean;
};

/** Whether live/snapshot should fetch this holding's balance from Esplora. */
export function shouldPollBalance(h: HoldingAddress): boolean {
  return h.pollBalance !== false;
}

/**
 * Confirmed-empty core holdings (0 sats) — skip Esplora balance polls.
 * Do not add dust leftovers here; synth 0 must match on-chain for KPIs.
 */
export const NO_POLL_BALANCE_ADDRESSES = [
  'bc1q7rmsw0ra7zrphe66wwa9960ffm69cp8dlrrcgf', // Evening vault
  'bc1qayw8nrec0vsa5vj4xee4dqhfgztx2gqq7w2u0s', // Aug 1 hop vault
  'bc1q0rvn88w08j75k4h48lf9fvhan7unjp7vjf5q6m', // Aug 2 vault
  '1N8knQCfjqUeJQwjkZZavbboXXL6WVqfDo', // Wave 4 park
  '35dHFzKHn4WCnr3XJj1YErXJ44xPX4wNxH', // Wave 4 park
  '342L6n3b61n1CGoh8wCzuzyXUvyZTSjZtz', // Wave 4 park
  '36XfMDAYuCn76DDJt5HV6kJxCukb1F1x3G', // Wave 4 park
  '34nHYNnc9DLxo3iCzvSHiyD2YsC3jP4qDQ', // Wave 4 park
] as const;

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
    note: 'Consolidated from 1,216 sweeps (via [bc1qsjrf5ze…](address:bc1qsjrf5ze5tmulz7y2x4pc7qaex2a35sanp3rqlx)). [Chainabuse victim](https://chainabuse.com/report/e568bed8-62f8-46b8-aae6-4d271c8d63e0) on that sweep sink.',
  },
  {
    address: 'bc1qmd5m5ktv7m5ffujxv4248fxv36myvdx79n8jp6',
    label: 'Wave 2 collector',
    reportBtc: 30.18476329,
    clusterId: 'galaxy-july31',
    note: 'Unmoved collector from 93 sweeps at ~10 sat/vB. [Chainabuse victim](https://chainabuse.com/report/d4c95fab-ed8e-4749-ae81-9d42bfdab1cb).',
  },
  {
    address: 'bc1q7rmsw0ra7zrphe66wwa9960ffm69cp8dlrrcgf',
    label: 'Evening vault',
    reportBtc: 0.50980268,
    clusterId: 'evening-july31',
    pollBalance: false,
    note: 'Jul 31 consolidation (~0.51 BTC). Emptied Aug 2–3 (ETH + BTC rails above). [Chainabuse victim](https://chainabuse.com/report/6e9fa34a-6128-4b9b-9ef9-8cc4159b1935).',
  },
  {
    address: 'bc1qayw8nrec0vsa5vj4xee4dqhfgztx2gqq7w2u0s',
    label: 'Aug 1 hop vault',
    reportBtc: 0.69135523,
    clusterId: 'evening-july31',
    pollBalance: false,
    note: '0.4998 + 0.1915 BTC stack. Emptied Aug 2 (BTC rail above). Ocean peel also met at the hub (not in report balance).',
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
    pollBalance: false,
    note: 'Emptied Aug 4 (block 961065, ~5 sat/vB): [bc1q0rvn…](address:bc1q0rvn88w08j75k4h48lf9fvhan7unjp7vjf5q6m) → Taproot hop [bc1pynd6…](address:bc1pynd6vswmxkghw6k5463xwcj7el7u4tpl2t2pnh0s8llmc2wgzfqsdu7h92) ([e3274a1b…2b3ddf](txid:e3274a1b87096938d014e1edaa01b06c3dd16e72a48f66ead95c79f83f2b3ddf)). Hop emptied same day in Wasabi-style CoinJoin (block 961069, ~2 sat/vB, 324→382; [f3ee6e61…7b24](txid:f3ee6e61129b90b4746275a2ea17b08ac53769556d61994c94f03db9bcc37b24)): equal ~1.2914 BTC outs ×20 + residual ~54.32 BTC at [bc1qajcr…](address:bc1qajcrhj3s2x0yfcj54emjukghv93su80svp2d3t). Residual re-entered a second CJ (~2 sat/vB, 320→374; [3bdac8ed…cdf935](txid:3bdac8ed822fc4cb123bc78689da3179ea8321d6daa5034c2170100399cdf935)): equal denoms (1 / 0.3355 / 0.2 / …) + new residual ~47.12 BTC at [bc1qq6s7…](address:bc1qq6s7wsmf6an78xyjkst707x32nyakj3u4jy2fr). No labeled exchange/bridge deposit on the hop path we followed — trail lost in CoinJoin.',
  },
  {
    address: 'bc1pum5zf6efxgt7a8xcyjg79u25jdhz6ex9ff2m390d544v05pg698s8ftmy8',
    label: 'P2TR vault',
    reportBtc: P2TR_WAVE.smallVaultBtc,
    clusterId: 'p2tr-aug1',
    note: '[Chainabuse victim](https://chainabuse.com/report/6e9ac9f1-61e5-49c5-947c-062afc70b73b) · 62× ~5 sat/vB sweeps (blocks 960737–960750).',
  },
  {
    address: 'bc1pdl33jtqnausmx2d4r4c6wpnk5are8jz046y3yjkw8fryjel02p7sluu9ce',
    label: 'P2TR hop vault',
    reportBtc: P2TR_WAVE.hopVaultBtc,
    clusterId: 'p2tr-aug1',
    note: 'Consolidate from emptied collector [bc1ptd5x…](address:bc1ptd5x926gkxdu0p8a2rufr7u8lklrfqapucj8yha7vjqh5z6md9kqf53nap) (101 inputs @ block 960736).',
  },
  {
    address: 'bc1p0l0xs2a0ffn2d9pek28k3vm9rjr2p0c5hvdlu03gpdwgzdgpscnq6qlk0h',
    label: 'P2TR vault',
    reportBtc: P2TR_WAVE.laterVaultBtc,
    clusterId: 'p2tr-aug1',
    note: 'Later sibling; fees mostly ~5 sat/vB with 25/40 bands (blocks 960773–960897). Emptied Aug 4 — trail below.',
  },
  {
    address: 'bc1q05g20l8k0tqjks9sq73mqgqx48pmw2cknju0ml',
    label: 'Wave 4 park',
    reportBtc: 8.55600708,
    clusterId: 'wave4-aug3',
  },
  {
    address: 'bc1qjenjhm6wgyz9m50svnvlyv6339z6jtmlmv4z23',
    label: 'Wave 4 park',
    reportBtc: 5.07348539,
    clusterId: 'wave4-aug3',
  },
  {
    address: '1N8knQCfjqUeJQwjkZZavbboXXL6WVqfDo',
    label: 'Wave 4 park',
    reportBtc: 5.61303754,
    clusterId: 'wave4-aug3',
    pollBalance: false,
    note: 'Thorn’s unique dual-sweep destination (2 victims → this park).',
  },
  {
    address: '35dHFzKHn4WCnr3XJj1YErXJ44xPX4wNxH',
    label: 'Wave 4 park',
    reportBtc: 2.17767618,
    clusterId: 'wave4-aug3',
    pollBalance: false,
    note: 'Emptied Aug 4 (block 961064, ~2 sat/vB): 14-input P2SH consolidate with sibling parks → [334iKwmh…](address:334iKwmhLKzJFoijrcQwcBFfFth7QjJ6gB) still holding ~136.41 BTC ([f02164a9…50db281](txid:f02164a928da943385b1f1a93ec404d2bba6c381e96dc99e0298c188650db281)). Same tx as [342L6n3b…](address:342L6n3b61n1CGoh8wCzuzyXUvyZTSjZtz) + [36XfMDAYu…](address:36XfMDAYuCn76DDJt5HV6kJxCukb1F1x3G) + [34nHYNnc…](address:34nHYNnc9DLxo3iCzvSHiyD2YsC3jP4qDQ). Mix includes parks funded outside Wave 4 window.',
  },
  {
    address: '342L6n3b61n1CGoh8wCzuzyXUvyZTSjZtz',
    label: 'Wave 4 park',
    reportBtc: 2.02374869,
    clusterId: 'wave4-aug3',
    pollBalance: false,
    note: 'Emptied Aug 4 (block 961064): same 14-input consolidate as [35dHFzKH…](address:35dHFzKHn4WCnr3XJj1YErXJ44xPX4wNxH) → [334iKwmh…](address:334iKwmhLKzJFoijrcQwcBFfFth7QjJ6gB) (~136.41 BTC still held).',
  },
  {
    address: 'bc1q65e6cd2k5ee2326fwwxsng370vf9pz85yce9u8',
    label: 'Wave 4 park',
    reportBtc: 1.14852067,
    clusterId: 'wave4-aug3',
  },
  {
    address: '36XfMDAYuCn76DDJt5HV6kJxCukb1F1x3G',
    label: 'Wave 4 park',
    reportBtc: 1.09429601,
    clusterId: 'wave4-aug3',
    pollBalance: false,
    note: 'Emptied Aug 4 (block 961064): same 14-input consolidate as [35dHFzKH…](address:35dHFzKHn4WCnr3XJj1YErXJ44xPX4wNxH) → [334iKwmh…](address:334iKwmhLKzJFoijrcQwcBFfFth7QjJ6gB) (~136.41 BTC still held).',
  },
  {
    address: 'bc1qcmnjt058q8hs4fvjr9wlu2kt974fyqnprfjvtl',
    label: 'Wave 4 park',
    reportBtc: 1.04998888,
    clusterId: 'wave4-aug3',
  },
  {
    address: 'bc1pj7f35576cz0cznm75h6scp9eknqeqx4r666kdpcnk9slgh4sp5vs4sulc2',
    label: 'Wave 4 park',
    reportBtc: 1.03514173,
    clusterId: 'wave4-aug3',
  },
  {
    address: '34nHYNnc9DLxo3iCzvSHiyD2YsC3jP4qDQ',
    label: 'Wave 4 park',
    reportBtc: 0.96227191,
    clusterId: 'wave4-aug3',
    pollBalance: false,
    note: 'Emptied Aug 4 (block 961064): same 14-input consolidate as [35dHFzKH…](address:35dHFzKHn4WCnr3XJj1YErXJ44xPX4wNxH) → [334iKwmh…](address:334iKwmhLKzJFoijrcQwcBFfFth7QjJ6gB) (~136.41 BTC still held).',
  },
];

const WAVE3_HOLDING_ADDRESSES: readonly HoldingAddress[] = WAVE3_VAULTS.map(
  (v) => ({
    address: v.address,
    label: v.label,
    reportBtc: v.reportBtc,
    clusterId: 'galaxy-wave3' as const,
    ...('note' in v ? { note: v.note } : {}),
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
  /** Wave 4 dual-sweep park peel (block 960793). Arkham: Bullish.com deposit. */
  '3CTpBmp8uWTcHJBjmyVe8VPPyCHTzj2hBH': 'Bullish.com deposit',
  /**
   * Bullish.com hot wallet — custodian sweep destination after 3CTp deposit empty
   * (blocks 960844+). Hop follower must stop here; peels are CEX/OTC treasury.
   */
  '324H9uyTV9bPgAVgmdJNxPKKKZmowk5CYq': 'Bullish.com hot wallet',
  /** Bullish.com cluster sibling feeding 324H9 (Arkham entity bullish-com). */
  '3CdVzfAe6Aw9K4oSPYXC7BR1xLxCPkxAUs': 'Bullish.com',
  /** Wave 4 hop (block 960797): multi-park consolidate → this high-volume P2WPKH hub. */
  bc1qactqjuk4kghfgaqqt454hzzzs5lsaysunf80gh: 'P2WPKH service hub',
  /**
   * Wave 4 hop (block 960818): multi-park + 352zz/35uR cluster consolidate.
   * Arkham: Coinbase Prime Custody.
   */
  bc1qdj58duywm3ng0twrxk5kykup9q6jmmj72n60ms: 'Coinbase Prime Custody',
  /**
   * Repeated peel target from Bullish hot wallet 324H9 (blocks 960837+).
   * Arkham: Wintermute (Binance deposit address tag).
   */
  '1KbDEg1tDz2ErYgaDbaDhhawnLrSQFaFx5': 'Wintermute',
  /**
   * Evening-wave sibling park cash-out (block 960802 peel from 1.54 BTC consol.).
   * Arkham: KuCoin (cluster 27fe).
   */
  '328GxewqTzMxLPvLemaKS7Q5Wi1io8EEYD': 'KuCoin deposit',
  /**
   * Evening-wave sibling park cash-out (block 960804 via bc1qwwl8… hop).
   * Arkham: KuCoin (same cluster 27fe as 328Gx…).
   */
  '3JEQJdb1Cwbzvevzj1ECAoiMbvb2yckvCe': 'KuCoin deposit',
  /**
   * P2TR later-vault cash-out (blocks 961034–961046): hop peels → these deposits.
   * Arkham: Binance deposit (cluster 3476).
   */
  '13i9ZaXBYJ74qPuK7JrJ6Znws5uTa37vQt': 'Binance deposit',
  '14ajEkhPAgEoow6BHw8b42Dj6JjZSWtsxR': 'Binance deposit',
  '199JVFuJgimybw4RXBmftLAVufPeyP2GwG': 'Binance deposit',
  /**
   * Later peel via messenger hop bc1qjwsuc… (blocks 961051–961075, ~0.168 BTC).
   * Arkham: same Binance deposit cluster 3476.
   */
  '12FuyGfaaiGbZTXd7Rk5jLNnPzpczMnwzY': 'Binance deposit',
  /**
   * Binance hot wallet — custodian consolidate from 13i9Za / 14aj / 199JV peels
   * (block 961043+). Hop follower must stop here.
   */
  bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h: 'Binance hot wallet',
  /**
   * Commingled P2TR later-vault hop hub (blocks 961026+). Arkham: OP_RETURN
   * Messenger (OUT:<hash> peels). Terminal — hub churn is not stolen movement.
   */
  bc1q2nfxrvvg67nhey0gk0cc8ke2ea4akge8kskyyq: 'OP_RETURN messenger hub',
  /**
   * Commingled P2TR later-vault hop hub (blocks 961019+). Arkham: OP_RETURN
   * Messenger (OUT:<hash> peels to bc1qesrv… / others). Terminal — stop hop-follow.
   */
  bc1qqa7p9qj89f6vg3yhuejhylty8l6626emj736pr: 'OP_RETURN messenger hub',
  /**
   * Repeated ~0.33 BTC peel target from P2TR hop hub bc1qqa7p9… (blocks 961056+).
   * Arkham: High Transacting + OP_RETURN Messenger (OUT:<hash> memos); feeds Binance.
   */
  bc1qesrvsn8g7ln6rmtru5kmuve4cma37r9gsrd78w: 'OP_RETURN messenger hub',
  /**
   * Batch from messenger hub bc1qesrv… (block 961064, ~1.333 BTC).
   * Arkham: Binance deposit.
   */
  '153La7Fb1p9JLeM26UGmwTXZuMdA9fWmav': 'Binance deposit',
};

/** Hop 0 = watched holdings; hop 1+ = destinations of those spends. */
export const MAX_HOP_DEPTH = 2;
/** Cap fan-out per spend so public mempool polling stays cheap. */
export const MAX_DESTINATIONS_PER_SPEND = 3;
/** Ignore dust-sized hop destinations. */
export const MIN_HOP_FOLLOW_SATS = 1_000_000; // 0.01 BTC
/** Hard cap on extra addresses watched beyond the seed holdings. */
export const MAX_HOP_WATCH_ADDRESSES = 16;
