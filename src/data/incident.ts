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
 * Aug 24 update ([Thorn](https://x.com/intangiblecoins/status/2091852664388600079);
 * Galaxy Research chart as of Aug 23): established losses 1,789.28 BTC /
 * 8,865 addresses; $114.7M at theft-time (weighted $64,097/BTC) / $138.8M at
 * Aug 23 close ($77,593). 221 identified victims covering 2,292 addresses and
 * 790.72 BTC (44.2%). Medium-confidence unpublished band → 1,824 BTC (~$140M
 * theft-time). No new attack-wave headline. Unmoved/moved split not restated
 * (still Aug 14: 1,531 / ~246).
 *
 * Aug 16 update ([thread](https://x.com/glxyresearch/status/2089002238391832948)):
 * losses exceeded $115M valued at theft-time BTC price; chart cumulative
 * ~$114.0M. Established-losses chart 1,778.57697908 BTC / 8,680 addresses.
 * Spoken with 200+ victims (chart: 203 reporters; 192 verified into the
 * established set covering 40.2% of swept BTC). Dormancy / footprint charts
 * only — no new attack-wave headline. Superseded on BTC / address / victim
 * counts by Aug 24. No confirmed attack after Aug 6 still stands from Aug 14.
 *
 * Aug 14 update ([thread](https://x.com/glxyresearch/status/2088252639767085417);
 * [brief](https://www.galaxy.com/insights/research/coldcard-exploit-abates-as-total-losses-climb-to-at-least-1700-btc)):
 * high-confidence 1,778.84 BTC / 8,600+ addresses (~$112.7M spot) from 190
 * victims spoken to; 1,531 unmoved / ~246 moved; candidates → 2,417.35.
 * Superseded on $ / victim / address counts by later cuts; BTC band refined on
 * the Aug 16 chart, then again Aug 24.
 *
 * Aug 7 cut was 1,719 tweet / 1,719.19 chart (= 1,367.05 + 352.14 footprints),
 * candidates → 2,300+. Aug 3 cut was 1,596 tweet / ~1,591 chart.
 */
export const GALAXY = {
  /** Waves 1–3 same-operator total — must equal those three cluster sums. */
  totalStolenBtc: 1367.05,
  victimAddresses: 4585,
  /** Galaxy’s reported finals; our live Wave 3 watch list is a partial reconstruct. */
  holdingAddresses: 7 + 293,
  /** Aug 24 chart established losses (Waves 1–3 + owner-confirmed footprints). */
  highConfidenceBtc: 1789.28,
  /** Aug 24 chart: 8,865 addresses in the established-losses set. */
  highConfidenceVictimAddresses: 8865,
  /**
   * Owner-confirmed footprints = Aug 24 chart 1,789.28 − W1–3.
   * Sankey (block 962304, Aug 14): E 209.94, Q 43.48, T 23.68, A 23.30, plus
   * 41 smaller footprints 111.39 — lettered composition unchanged; total refined.
   */
  footprintsConfirmedBtc: 422.23,
  /**
   * Of the high-confidence set, still in attacker-controlled addresses
   * unmoved (Aug 14 tweet / brief; Aug 16 and Aug 24 did not restate).
   */
  unmovedBtc: 1531,
  /**
   * Moved by attackers after theft (Aug 14). ≈65% coinjoin / ≈35% onward;
   * 1531 + 246 rounds to the then ~1,778 headline. Aug 24 did not restate.
   */
  movedAfterTheftBtc: 246,
  /** Identified victims with a named owner (Aug 24 chart: 221; 2,292 addrs). */
  victimsSpokenTo: 221,
  /** Footprints beyond Waves 1–3 (Aug 14; Aug 16 charts still use lettered set). */
  additionalFootprints: 33,
  /**
   * Medium-confidence unpublished band (Aug 24): 1,824 − 1,789.28.
   * Aug 14 chart had 271 pattern-matched addresses / 15.93 BTC; Thorn’s
   * Aug 24 “medium confidence (not yet confirmed)” remainder is 34.72.
   */
  patternMatchedUnconfirmedBtc: 34.72,
  /**
   * High-confidence + unpublished candidates (incl. Wave 4). Aug 14 published
   * 2,417.35; recomputed after Aug 24 chart refinement of the high-confidence
   * and medium bands (wave4Candidate kept).
   */
  withCandidateWave4Btc: 2446.58,
  /**
   * Unpublished Wave 4 band so W1–3 + footprints + pattern-matched + this
   * = withCandidateWave4Btc. Aug 7 figure was 448.73 (Thorn/Nunchuk pastebin
   * cut); Galaxy’s Aug 14 unpublished Wave 4 remainder is 622.58.
   */
  wave4CandidateBtc: 622.58,
  /** Wave 3 map (Aug 1). */
  sourceUrl: 'https://x.com/glxyresearch/status/2083623500183421043',
  /** Losses exceed $100M / multi-attacker footprints (Aug 3). */
  aug3UpdateUrl: 'https://x.com/glxyresearch/status/2084411904924045370',
  /** $111M confirmed / 1,719 BTC high-confidence (Aug 7). */
  aug7UpdateUrl: 'https://x.com/glxyresearch/status/2085748513015488758',
  /** $112.7M / 1,778.84 BTC high-confidence; attacks eased (Aug 14). */
  aug14UpdateUrl: 'https://x.com/glxyresearch/status/2088252639767085417',
  /** $115M theft-time valuation / 1,778.58 BTC chart; 200+ victims (Aug 16). */
  aug16UpdateUrl: 'https://x.com/glxyresearch/status/2089002238391832948',
  /** 1,789.28 BTC / 8,865 addrs / 221 victims; medium → 1,824 BTC (Aug 24). */
  aug24UpdateUrl: 'https://x.com/intangiblecoins/status/2091852664388600079',
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
    note: 'Two fee bands into a watched vault plus a collector; collector emptied Aug 7 into a hop still holding ~30.18 BTC.',
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
    note: 'Pattern-match only (no victim report yet). Galaxy’s Aug 7 Wave 4 figure was 448.73 BTC after cutting 89 multisig destinations; their Aug 14 unpublished Wave 4 band is 622.58. We go one step further than the Aug 7 cut and also drop 6 destinations that already had prior on-chain history (−5.39 BTC), so our watched total is 443.34. Galaxy’s candidate ceiling is ~2,447 BTC (Aug 24 high-confidence 1,789.28 plus medium 34.72 plus Aug 14 unpublished Wave 4 622.58) — not our stricter 443.34 cut. Watched addresses are a sparse still-held sample.',
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
    label: 'Alex Thorn · Wave 3 first vault cash-out',
    note: 'Sep 2: first funds from Wave 1–3 original hacker vaults to move — Wave 3 vault (~20.50 BTC, Reporter-0018 / 20 victim addrs) spent through 2-of-2 hops → staging → THORChain → ETH 0x160a7A4c… (affiliate “sto”). As of Sep 3: 317.16 ETH still unmoved on that address (4 router internals; nonce 0 — no peel). ~187 BTC / 292 vaults still resting (~90% of Wave 3); BTC-side THOR refunds/retries ongoing. Vault scripts revealed as BIP-67-sorted 2-of-2; cash-out wallet (RBF + anti-fee-sniping) differs from Jul 31/Aug 1 sweep tooling; THOR deposits are a third stack (OP_RETURN memos). Watch-list vault [bc1qn3uy9…](address:bc1qn3uy9j26m79vghed2uddr89l344xa5efnn4d0rxhz4q3xxlyxryqq595ld) matches. Waves 1–2 original holdings still unmoved.',
    url: 'https://x.com/intangiblecoins/status/2095297452681158840',
  },
  {
    label: 'Alex Thorn · Galaxy · Aug 24 totals',
    note: 'Aug 24 (chart as of Aug 23): established losses 1,789.28 BTC / 8,865 addresses; $114.7M at theft-time (weighted $64,097/BTC) / $138.8M at Aug 23 close ($77,593). 221 identified victims covering 2,292 addresses and 790.72 BTC (44.2%). Median address 0.00152 BTC, mean 0.20184; dormancy median 3.2y. Losses concentrated: 45% of stolen value in 1–10 BTC addresses; largest 1% of addresses hold 41%. Medium-confidence unpublished band → 1,824 BTC (~$140M theft-time). No new attack wave. Unmoved/moved split not restated (still Aug 14: 1,531 / ~246).',
    url: 'https://x.com/intangiblecoins/status/2091852664388600079',
  },
  {
    label: 'Coinkite · firmware 5.6.1 / 1.5.1Q',
    note: 'Aug 20: thoroughly reviewed follow-up to the July 31 hotfix. Mk4/Mk5 5.6.1 and Q 1.5.1Q are the current recommended standard releases ([status](https://coldcard.com/security/status); [status.json](https://coldcard.com/security/status.json)). Minimum fixed for new seeds remains 5.6.0 / 1.5.0Q (Edge still 6.6.0X / 6.6.0QX). New seeds require user entropy (65 keypresses / 50 dice / 128 coin flips) mixed with STM32 TRNG + SE1 + SE2; Yasmarang backup PRNG replaced by SHA-256 Hash_DRBG. Also staged-PSBT re-verify before signing, USB/firmware-update boundaries, Delta Mode isolation, active-wallet backup fixes, safer SIGHASH defaults. Updating still does not repair an existing affected seed — migrate per the advisory. LE investigation ongoing; no named suspect in Coinkite’s post. [X](https://x.com/COLDCARDwallet/status/2090459345301488071).',
    url: 'https://blog.coinkite.com/coldcard-security-update-5.6.1-1.5.1q/',
  },
  {
    label: 'Bitcoin Magazine · Wave 1 / law enforcement',
    note: 'Aug 18: Juan Galt reports Block’s paid blockchain-data-account lead (Clay Garrett, Jul 31) may have given authorities a path to the Wave 1 operator. Galaxy’s Alex Thorn said in a [Bitcoin Policy Institute / Bitcoin Magazine YouTube segment](https://www.youtube.com/watch?v=XlvsJblW4Sg) that Wave 1’s “attacker identity, may be known to law enforcement,” and that Wave 2’s pattern could be the same actor. Headline mentions the FBI; no FBI statement, named suspect, arrest, indictment, or seizure is in the public record. Wave 1 stack still unmoved.',
    url: 'https://bitcoinmagazine.com/technical/hunting-down-the-coldcard-hacker-wave-1-thief-may-be-known-to-fbi',
  },
  {
    label: 'Galaxy Research · $115M update',
    note: 'Aug 16: losses exceeded $115M valued at theft-time BTC price (chart cumulative ~$114.0M). Established-losses chart 1,778.57697908 BTC / 8,680 addresses. Spoken with 200+ victims (chart: 203 reporters; 192 verified into the established set ≈40.2% of swept BTC). Thread is dormancy / footprint analysis charts — no new attack wave. No confirmed attack after Aug 6 still from Aug 14. Victim help: DM @intangiblecoins. Superseded on BTC / address / victim counts by Thorn’s Aug 24 cut.',
    url: 'https://x.com/glxyresearch/status/2089002238391832948',
  },
  {
    label: 'Galaxy Research · $112M update',
    note: 'Aug 14: high-confidence 1,778.84 BTC / 8,600+ addresses (~$112.7M spot) from 190 victims spoken to; tweet rounds to 1,778 BTC / $112M. No confirmed attack after Aug 6. Three waves + ≥33 footprints; multiple attackers. 1,531 BTC still unmoved; ~246 moved (≈65% coinjoin / ≈35% onward). Medium-confidence + unconfirmed Wave 4 → 2,417.35 BTC ($153M). Attacker-address lists shared with exchanges, compliance, and law enforcement. Superseded on $ / victim / address counts by the Aug 16 cut. [Brief](https://www.galaxy.com/insights/research/coldcard-exploit-abates-as-total-losses-climb-to-at-least-1700-btc) / [Thorn](https://x.com/intangiblecoins/status/2088305623318298903).',
    url: 'https://x.com/glxyresearch/status/2088252639767085417',
  },
  {
    label: 'Galaxy Research · $111M update',
    note: 'Aug 7: high-confidence 1,719 BTC / 8,092 addresses (~$111M); chart established losses 1,719.19. Outstanding candidates → 2,300+ BTC if promoted; total losses likely exceed $130M. 25+ attack patterns / multiple threat actors. Scope still Coldcard Mk3/Mk4/Mk5/Q post–2021-03-17 firmware. 250+ victim reports via @intangiblecoins. Superseded by later Galaxy cuts.',
    url: 'https://x.com/glxyresearch/status/2085748513015488758',
  },
  {
    label: 'Galaxy Research · $100M update',
    note: 'Aug 3: high-confidence 1,596 BTC / ~7,300 addresses across Waves 1–3 + 14 owner-confirmed footprints; candidate Wave 4 would bring ~2,055 BTC. Multiple independent attackers. Waves 1–3 coins then still unmoved (Wave 2 collector later emptied Aug 7). Superseded by later Galaxy cuts.',
    url: 'https://x.com/glxyresearch/status/2084411904924045370',
  },
  {
    label: 'Alex Thorn · Footprint O',
    note: 'Aug 4: ≥15 attackers (footprints A–O). Overnight footprint O ~12 BTC from 126 addresses from one victim report; later folded into Galaxy’s Aug 7 confirmed footprint set (no public address list).',
    url: 'https://x.com/intangiblecoins/status/2084584284837322868',
  },
  {
    label: 'James O\'Beirne · CK tripwire',
    note: 'Aug 4: live honeypot scoreboard mapping attacker brute-force depth via decoys with added dice/passphrase entropy ([cktripwire.com](https://cktripwire.com/); [announcement](https://x.com/jamesob/status/2084769501661331589)). Zero-entropy control swept in ~1h. By Aug 8, multiple ~5-bit low (dice) honeypots were swept ([jamesob](https://x.com/jamesob/status/2086154136064586229)). Frontier was ~11 bits after low (pass) HP-E786 / HP-9C4F (Aug 12–13). Aug 26: 2-of-3 multisig honeypot HP-5D67 swept (~22d live). Aug 28: low (dice) HP-8EF5 swept (~12.9–13 bits / 5 dice rolls, ~24d live) — [Galaxy](https://x.com/glxyresearch/status/2093456632378191930). Aug 31: twin 13-bit low (dice) HP-C4AD swept (~27d live) — [Galaxy](https://x.com/glxyresearch/status/2094530813794910594). Scoreboard as of Sep 2: frontier still ~13 bits (13 swept / 6 live); one low(dice) ~5-bit HP-696E still live; mid/high/extreme still live. ColeTU’s weak BIP-39 passphrase experiment remains an external honeypot (1–3 word Mk3 passphrases swept in ~6–7d). Defensive research only — do not add honeypot sinks to holdings.',
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
    label: '@osint_based · P2TR later-vault ETH rail',
    note: 'Aug 5: later P2TR vault cash-out — ~205 ETH via THORChain into 0x41B752… → 200 ETH Tornado Cash (2×100). Same Kelbie later vault (bc1p0l0…), not a new cluster; BTC→THOR amount/path soft through commingled hubs. ~4.44 BTC still parked on bc1prjnv….',
    url: 'https://x.com/osint_based/status/2084913457921429800',
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
    note: 'Official guidance (updated Aug 1): who is exposed, minimum fixed firmware versions, and migration steps. Live matrix / recommended releases: [Security Status](https://coldcard.com/security/status). Aug 20 follow-up release is 5.6.1 / 1.5.1Q.',
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
    label: 'SlowMist',
    note: 'Aug 12: reproduces the Mk3 4.1.9 attack chain (Yasmarang fallback, button-press profiles, GPU pad search) and MistTrack consolidations aligned with Galaxy W1–3 / Early Aug 2 / P2TR cash-outs. Uses Galaxy’s 1,719 BTC headline; their “Wave 4” label for bc1q0rvn88… is our Early Aug 2 vault, not Thorn’s Likely Wave 4.',
    url: 'https://slowmist.medium.com/coldcard-111-million-theft-a-deep-dive-into-the-private-key-vulnerability-8e51d1a969d3',
  },
  {
    label: 'Praveen Perera · Wave 1 forensics',
    note: 'Aug 12–13: reconstructs 328 weak Mk3 seeds covering 1,042 / 1,195 Wave 1 sources (949.7 BTC); maps Holding 1–4 into three scan-session branches; same 30 sat/vB address-job builder + paid-API clues; 153 sources (~133 BTC) still unexplained.',
    url: 'https://praveenperera.com/blog/coldcard-mk3-weak-rng-wave1/',
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
    note: 'July 30 operator used a paid blockchain-data account during the sweeps; findings shared with authorities. Aug 18 Bitcoin Magazine / Thorn follow-up: that lead “may” identify Wave 1 to law enforcement — not an FBI-confirmed suspect.',
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

/** Whether the snapshot cron should fetch this holding's balance from Esplora. */
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
  'bc1qcmnjt058q8hs4fvjr9wlu2kt974fyqnprfjvtl', // Wave 4 park
  'bc1qn3uy9j26m79vghed2uddr89l344xa5efnn4d0rxhz4q3xxlyxryqq595ld', // Wave 3 vault 1
] as const;

/** Wave 1/2 + community vaults — balances from the cron snapshot. */
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
    note: 'Collector from 93 sweeps at ~10 sat/vB. Emptied Aug 7 (block 961368, ~2.4 sat/vB): 93-input consolidate → [bc1qez89…](address:bc1qez89sph5tgghmf36u79hq62h8n2xqqka05dt6n) still holding ~30.18 BTC ([93df0d26…abd4](txid:93df0d26e08ce950643f8cd03fd845c3d5697ba6021ec18874ee8e531f4eabd4)). Dust leftover (~0.00002 BTC). [Chainabuse victim](https://chainabuse.com/report/d4c95fab-ed8e-4749-ae81-9d42bfdab1cb).',
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
    note: 'Emptied Aug 4 → Taproot hop → Wasabi CJ cascade (trail above).',
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
    note: 'Later sibling; fees mostly ~5 sat/vB with 25/40 bands (blocks 960773–960897). Emptied Aug 4 — trail below. ETH side ([@osint_based](https://x.com/osint_based/status/2084913457921429800)): ~205 ETH via THORChain into [0x41B752…](https://etherscan.io/address/0x41B7529a411EeA979a8d468bdEBd36b0ad703268) → 200 ETH Tornado (2×100); BTC→THOR hop soft (commingled hubs). ~4.44 BTC still on Taproot park [bc1prjnv…](address:bc1prjnvz77lhd3t6kdxt34x4yzgwu4qfdgyges8h6qhwldj60z5mcqs7pprpr).',
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
    note: 'Emptied Aug 4 (block 961064, ~2 sat/vB): 14-input P2SH consolidate with sibling parks → [334iKwmh…](address:334iKwmhLKzJFoijrcQwcBFfFth7QjJ6gB) ([f02164a9…50db281](txid:f02164a928da943385b1f1a93ec404d2bba6c381e96dc99e0298c188650db281)). Same tx as [342L6n3b…](address:342L6n3b61n1CGoh8wCzuzyXUvyZTSjZtz) + [36XfMDAYu…](address:36XfMDAYuCn76DDJt5HV6kJxCukb1F1x3G) + [34nHYNnc…](address:34nHYNnc9DLxo3iCzvSHiyD2YsC3jP4qDQ). Mix includes parks funded outside Wave 4 window. Sep 1 (block 965054, ~2 sat/vB): that hop emptied → [3Qm8C2ns…](address:3Qm8C2ns2XpzLq36xGbTYAAVNfd924RtV9) (~135.81) + [3H5i5M4Q…](address:3H5i5M4QFgDaeGAPAe7f6b8XeYzToqFU3o) (0.6) ([503ef827…21ccf4c0](txid:503ef8276d88aeb1f501651ba10a560413566863351d8dfdca57b5cf21ccf4c0)).',
  },
  {
    address: '342L6n3b61n1CGoh8wCzuzyXUvyZTSjZtz',
    label: 'Wave 4 park',
    reportBtc: 2.02374869,
    clusterId: 'wave4-aug3',
    pollBalance: false,
    note: 'Emptied Aug 4 (block 961064): same 14-input consolidate as [35dHFzKH…](address:35dHFzKHn4WCnr3XJj1YErXJ44xPX4wNxH) → [334iKwmh…](address:334iKwmhLKzJFoijrcQwcBFfFth7QjJ6gB); that hop emptied Sep 1 → [3Qm8C2ns…](address:3Qm8C2ns2XpzLq36xGbTYAAVNfd924RtV9) / [3H5i5M4Q…](address:3H5i5M4QFgDaeGAPAe7f6b8XeYzToqFU3o).',
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
    note: 'Emptied Aug 4 (block 961064): same 14-input consolidate as [35dHFzKH…](address:35dHFzKHn4WCnr3XJj1YErXJ44xPX4wNxH) → [334iKwmh…](address:334iKwmhLKzJFoijrcQwcBFfFth7QjJ6gB); that hop emptied Sep 1 → [3Qm8C2ns…](address:3Qm8C2ns2XpzLq36xGbTYAAVNfd924RtV9) / [3H5i5M4Q…](address:3H5i5M4QFgDaeGAPAe7f6b8XeYzToqFU3o).',
  },
  {
    address: 'bc1qcmnjt058q8hs4fvjr9wlu2kt974fyqnprfjvtl',
    label: 'Wave 4 park',
    reportBtc: 1.04998888,
    clusterId: 'wave4-aug3',
    pollBalance: false,
    note: 'Emptied Aug 19 (block 963189, ~0.8 sat/vB): single-out → P2TR [bc1pynh7j…](address:bc1pynh7jn4jqh7h5v4l6fxxkjk7a0tqvt603ysnyn00824qmh2njcesd7ngxm) ([fd5af32f…30cb177b](txid:fd5af32f0c71a9e2cdc9d966130f31ccc5a2fa2ae320b283b61d4e1b30cb177b)). That hop mixed Aug 20 in Wasabi 2.x / WabiSabi (block 963262, 196-in/236-out, Taproot-heavy, power-of-3 dens [3dc1ced1…43c304d0](txid:3dc1ced1483f7800cc4019772b9a941bcabf5fc810fed4fb920c2ec843c304d0)) — anonymity set; stop.',
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
    note: 'Emptied Aug 4 (block 961064): same 14-input consolidate as [35dHFzKH…](address:35dHFzKHn4WCnr3XJj1YErXJ44xPX4wNxH) → [334iKwmh…](address:334iKwmhLKzJFoijrcQwcBFfFth7QjJ6gB); that hop emptied Sep 1 → [3Qm8C2ns…](address:3Qm8C2ns2XpzLq36xGbTYAAVNfd924RtV9) / [3H5i5M4Q…](address:3H5i5M4QFgDaeGAPAe7f6b8XeYzToqFU3o).',
  },
  {
    address: '3Qm8C2ns2XpzLq36xGbTYAAVNfd924RtV9',
    label: 'Wave 4 hop',
    reportBtc: 135.80743236,
    clusterId: 'wave4-aug3',
    note: 'Sep 1 (block 965054, ~2 sat/vB): large out from emptied hop [334iKwmh…](address:334iKwmhLKzJFoijrcQwcBFfFth7QjJ6gB) ([503ef827…21ccf4c0](txid:503ef8276d88aeb1f501651ba10a560413566863351d8dfdca57b5cf21ccf4c0)). Fresh P2SH park (1 tx); unlabeled as of Sep 2.',
  },
  {
    address: '3H5i5M4QFgDaeGAPAe7f6b8XeYzToqFU3o',
    label: 'Wave 4 hop peel',
    reportBtc: 0.6,
    clusterId: 'wave4-aug3',
    note: 'Sep 1 (block 965054): 0.6 BTC peel sibling of [3Qm8C2ns…](address:3Qm8C2ns2XpzLq36xGbTYAAVNfd924RtV9) from [334iKwmh…](address:334iKwmhLKzJFoijrcQwcBFfFth7QjJ6gB). Fresh P2SH (1 tx); unlabeled as of Sep 2.',
  },
];

const WAVE3_HOLDING_ADDRESSES: readonly HoldingAddress[] = WAVE3_VAULTS.map(
  (v) => ({
    address: v.address,
    label: v.label,
    reportBtc: v.reportBtc,
    clusterId: 'galaxy-wave3' as const,
    ...('note' in v && v.note ? { note: v.note } : {}),
    ...('pollBalance' in v && v.pollBalance === false
      ? { pollBalance: false as const }
      : {}),
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
/** How often a visible tab re-reads /snapshot.json (same-origin; not Esplora). */
export const SNAPSHOT_REFRESH_INTERVAL_MS = 15 * 60_000;
export const SATS_PER_BTC = 100_000_000;
/** Primary wave funds reported unspent at this block; later spends count as movement. */
export const WATCH_AFTER_BLOCK = 960_400;

/**
 * Known cash-out / infrastructure addresses that may appear in the movement
 * feed. Labels help trackers spot exits the hop follower may not reach.
 */
export const KNOWN_ADDRESS_LABELS: Readonly<Record<string, string>> = {
  bc1qp6yzmq5kjr8yvyw7453gxvq4z3tvkdyadqm794: 'THORChain BTC vault',
  /**
   * Wave 3 Sep 2 THOR inbound vaults (swap memos → ETH 0x160a7A4c…).
   * Do not label intermediate hops/staging here — that stops hop follow before the bridge.
   */
  bc1qkpljhacarzyvalnfynqux6xy83v9j2rcqqq44z: 'THORChain BTC vault',
  bc1qxmatfxczp5v4dhtpfk6t97kt5vjvl2rf084r49: 'THORChain BTC vault',
  bc1qeay5x2ap5cycqgje4s9y973eh3faaz9yw3zwph: 'THORChain BTC vault',
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
   * Wave 4 hop peel target from bc1q40y6… (stolen exit block 960794; later surplus
   * peels e.g. 961114, 961194 are filtered once this hub cash-in is seen).
   * ~1.5M txs / ~75 BTC; Arkham High Transacting only.
   */
  bc1qrqlamjhy2qp0xj5mxv4sx7ra9qfmfxllf93l26: 'P2WPKH service hub',
  /**
   * Wave 4 hop (block 960818): multi-park + 352zz/35uR cluster consolidate.
   * Arkham: Coinbase Prime Custody.
   */
  bc1qdj58duywm3ng0twrxk5kykup9q6jmmj72n60ms: 'Coinbase Prime Custody',
  /**
   * Commingled hop-2 consolidate target (block 963214): 55-in → this + peel.
   * Trail touched via prior Wave 4 hop address churn (not pure park stack).
   * Arkham: Coinbase Prime Custody (OKLink: Coinbase Cold Wallet_299).
   */
  bc1q7yjedqu4thq908rkwmmqpst7sf8j0djplhrsxd: 'Coinbase Prime Custody',
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
  /**
   * Hyperunit bridge hub — Arkham entity hyperunit. Appears as consolidate
   * target from Hyperunit Deposit peels in Early Aug 2 Wasabi remix anonymity
   * sets (not proven same operator as the 64 BTC residual). Stop hop-follow.
   */
  bc1pdwu79dady576y3fupmm82m3g7p2p9f6hgyeqy0tdg7ztxg7xrayqlkl8j9:
    'Hyperunit hub',
  /**
   * Wave 4 hop-1 peel (block 961731): emptied bc1q72k76… → this address (~0.0077 BTC).
   * Arkham: Bybit (OKLink: Exchange Bybit).
   */
  '17fqFGPGPTmoWRqSnoSUp4VMDExDofFcFL': 'Bybit deposit',
  /**
   * Wave 4 hop-2 peels from intermediate bc1q55llq… (blocks 960898, 961148, 961384;
   * dust < 0.01 BTC each). Arkham: Quidax Deposit Address (cluster e1e9).
   */
  bc1qcgjnpnsnsyklteqmsunv2vm7ww4zs02q9jtdt7: 'Quidax deposit',
};

/** Hop 0 = watched holdings; hop 1+ = destinations of those spends. */
export const MAX_HOP_DEPTH = 2;
/** Cap fan-out per spend so public mempool polling stays cheap. */
export const MAX_DESTINATIONS_PER_SPEND = 3;
/**
 * Spends with more destination addresses than this are treated as CoinJoin /
 * mixer fan-out for **seed** (hop 0) emission. Hop trails use the tighter
 * `MAX_DESTINATIONS_PER_SPEND` so batch peels do not spray the feed. Do not
 * emit or hop-follow spends over the hop-appropriate cap.
 */
export const MAX_MOVEMENT_DESTINATIONS = 50;
/** Ignore dust-sized hop destinations. */
export const MIN_HOP_FOLLOW_SATS = 1_000_000; // 0.01 BTC
/** Hard cap on extra addresses watched beyond the seed holdings. */
export const MAX_HOP_WATCH_ADDRESSES = 16;
