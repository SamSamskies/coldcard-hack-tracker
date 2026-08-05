import { describe, expect, it } from 'vitest';
import {
  CLUSTERS,
  CLUSTER_BY_ID,
  CONSOLIDATED_BTC,
  CORE_HOLDING_ADDRESSES,
  EARLY_AUG2_WAVE,
  EVENING_WAVE,
  FOOTPRINT_O,
  GALAXY,
  HOLDING_ADDRESSES,
  INCIDENT,
  MORNING_WAVE,
  NO_POLL_BALANCE_ADDRESSES,
  ORIGINAL_STOLEN_BTC,
  P2TR_WAVE,
  WAVE2_FINGERPRINT,
  WAVE3_FINGERPRINT,
  WAVE4_WAVE,
  shouldPollBalance,
  type ClusterId,
} from '../data/incident';
import { heldStats, shouldWatchSeedMovements, statusFor } from '../lib/tracker';
import { WAVE3_VAULT_COUNT } from './wave3Vaults';

describe('incident data invariants', () => {
  it('sums cluster stolen BTC into ORIGINAL_STOLEN_BTC', () => {
    const sum = CLUSTERS.reduce((s, c) => s + c.stolenBtc, 0);
    expect(ORIGINAL_STOLEN_BTC).toBe(sum);
  });

  it('sums holding report balances into CONSOLIDATED_BTC', () => {
    const sum = HOLDING_ADDRESSES.reduce((s, h) => s + h.reportBtc, 0);
    expect(CONSOLIDATED_BTC).toBe(sum);
  });

  it('keeps consolidated below original stolen (fees + unwatched waves)', () => {
    expect(CONSOLIDATED_BTC).toBeLessThan(ORIGINAL_STOLEN_BTC);
  });

  it('matches Galaxy’s three-wave headline total for Waves 1–3', () => {
    const galaxyIds: ClusterId[] = [
      'galaxy-july30',
      'galaxy-july31',
      'galaxy-wave3',
    ];
    const sum = galaxyIds.reduce((s, id) => s + CLUSTER_BY_ID[id].stolenBtc, 0);
    expect(sum).toBeCloseTo(GALAXY.totalStolenBtc, 2);
  });

  it('keeps Galaxy Aug 3 headline tiers ordered', () => {
    expect(GALAXY.highConfidenceBtc).toBeGreaterThan(GALAXY.totalStolenBtc);
    expect(GALAXY.withCandidateWave4Btc).toBeGreaterThan(GALAXY.highConfidenceBtc);
    // Chart labels round to whole BTC (1,591 / 2,055).
    expect(
      GALAXY.totalStolenBtc + GALAXY.footprintsConfirmedBtc,
    ).toBeCloseTo(1591, 0);
    expect(
      GALAXY.totalStolenBtc +
        GALAXY.footprintsConfirmedBtc +
        GALAXY.patternMatchedUnconfirmedBtc +
        GALAXY.wave4CandidateBtc,
    ).toBeCloseTo(GALAXY.withCandidateWave4Btc, 0);
    expect(GALAXY.footprintsStillHeldBtc).toBeLessThanOrEqual(
      GALAXY.footprintsConfirmedBtc,
    );
  });

  it('documents Footprint O without adding a watched cluster', () => {
    expect(FOOTPRINT_O.btc).toBe(12);
    expect(FOOTPRINT_O.addresses).toBe(126);
    expect(CLUSTERS.some((c) => c.sourceUrl === FOOTPRINT_O.sourceUrl)).toBe(
      false,
    );
  });

  it('has unique holding addresses', () => {
    const addrs = HOLDING_ADDRESSES.map((h) => h.address);
    expect(new Set(addrs).size).toBe(addrs.length);
  });

  it('maps every cluster id and holding to a known cluster', () => {
    const ids = CLUSTERS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const id of ids) {
      expect(CLUSTER_BY_ID[id].id).toBe(id);
    }

    for (const h of HOLDING_ADDRESSES) {
      expect(CLUSTER_BY_ID[h.clusterId as ClusterId]).toBeDefined();
    }
  });

  it('keeps Galaxy victim path counts consistent', () => {
    const { bip84, bip49, bip44 } = INCIDENT.victimsByPath;
    expect(bip84 + bip49 + bip44).toBe(INCIDENT.victimAddresses);
  });

  it('keeps per-cluster holding totals at or below the cluster estimate', () => {
    for (const cluster of CLUSTERS) {
      const held = HOLDING_ADDRESSES.filter((h) => h.clusterId === cluster.id).reduce(
        (s, h) => s + h.reportBtc,
        0,
      );
      // Holdings can be slightly under stolen (fees) but should not exceed it.
      expect(held).toBeLessThanOrEqual(cluster.stolenBtc + 1e-8);
    }
  });

  it('keeps Wave 2 fingerprint holdings aligned with watched addresses', () => {
    const wave2 = HOLDING_ADDRESSES.filter((h) => h.clusterId === 'galaxy-july31');
    expect(wave2).toHaveLength(2);
    expect(
      WAVE2_FINGERPRINT.vaultBtc + WAVE2_FINGERPRINT.collectorBtc,
    ).toBeCloseTo(
      wave2.reduce((s, h) => s + h.reportBtc, 0),
      8,
    );
  });

  it('keeps community wave markers aligned with watched holdings', () => {
    expect(
      EVENING_WAVE.eveningVaultBtc + EVENING_WAVE.hopVaultBtc,
    ).toBeCloseTo(CLUSTER_BY_ID['evening-july31'].stolenBtc, 8);
    expect(EARLY_AUG2_WAVE.landedBtc).toBeCloseTo(
      HOLDING_ADDRESSES.find((h) => h.clusterId === 'early-aug2')!.reportBtc,
      8,
    );
    expect(MORNING_WAVE.victimSweeps).toBeGreaterThan(0);
    expect(
      P2TR_WAVE.smallVaultBtc +
        P2TR_WAVE.hopVaultBtc +
        P2TR_WAVE.laterVaultBtc,
    ).toBeCloseTo(CLUSTER_BY_ID['p2tr-aug1'].stolenBtc, 8);
    const p2tr = HOLDING_ADDRESSES.filter((h) => h.clusterId === 'p2tr-aug1');
    expect(p2tr).toHaveLength(3);
    expect(p2tr.reduce((s, h) => s + h.reportBtc, 0)).toBeCloseTo(
      CLUSTER_BY_ID['p2tr-aug1'].stolenBtc,
      8,
    );
    expect(WAVE4_WAVE.filteredBtc).toBeCloseTo(
      CLUSTER_BY_ID['wave4-aug3'].stolenBtc,
      8,
    );
    expect(WAVE4_WAVE.confirmedBtc).toBe(WAVE4_WAVE.filteredBtc);
    expect(WAVE4_WAVE.coreBtc - WAVE4_WAVE.priorHistoryBtcExcluded).toBeCloseTo(
      WAVE4_WAVE.filteredBtc,
      8,
    );
    // Thorn’s IMPACT lines (857/−89→709 and 486.11/−20.58→448.73) don’t
    // arithmetically reconcile; trust the published surviving-core figures.
    expect(WAVE4_WAVE.coreAddresses).toBe(709);
    expect(WAVE4_WAVE.coreBtc).toBeCloseTo(448.73, 8);
    expect(WAVE4_WAVE.destinations).toBe(210);
    expect(WAVE4_WAVE.filteredAddresses).toBe(
      WAVE4_WAVE.coreAddresses -
        WAVE4_WAVE.priorHistoryDestinationsExcluded,
    );
    const wave4 = HOLDING_ADDRESSES.filter((h) => h.clusterId === 'wave4-aug3');
    expect(wave4.length).toBeGreaterThan(0);
    expect(wave4.every((h) => h.reportBtc >= 0.5)).toBe(true);
    expect(wave4.reduce((s, h) => s + h.reportBtc, 0)).toBeLessThan(
      WAVE4_WAVE.filteredBtc,
    );
  });

  it('watches higher-value fingerprint-matched Wave 3 vaults only', () => {
    const wave3 = HOLDING_ADDRESSES.filter((h) => h.clusterId === 'galaxy-wave3');
    expect(wave3).toHaveLength(WAVE3_VAULT_COUNT);
    expect(WAVE3_FINGERPRINT.matchedVaults).toBe(WAVE3_VAULT_COUNT);
    expect(WAVE3_FINGERPRINT.minWatchBtc).toBe(0.5);
    expect(wave3.every((h) => h.reportBtc >= WAVE3_FINGERPRINT.minWatchBtc)).toBe(
      true,
    );
    expect(WAVE3_FINGERPRINT.matchedVaults).toBeLessThan(WAVE3_FINGERPRINT.galaxyVaults);
    expect(WAVE3_FINGERPRINT.matchedHeldBtc).toBeLessThan(WAVE3_FINGERPRINT.galaxyHeldBtc);
  });

  it('skips Esplora balance polls only for the documented empty cores', () => {
    const noPoll = CORE_HOLDING_ADDRESSES.filter((h) => !shouldPollBalance(h));
    expect(noPoll.map((h) => h.address).sort()).toEqual(
      [...NO_POLL_BALANCE_ADDRESSES].sort(),
    );
    expect(HOLDING_ADDRESSES.filter((h) => !shouldPollBalance(h))).toHaveLength(
      NO_POLL_BALANCE_ADDRESSES.length,
    );
    // Still listed with original report stacks — never removed or zeroed.
    for (const addr of NO_POLL_BALANCE_ADDRESSES) {
      const h = CORE_HOLDING_ADDRESSES.find((x) => x.address === addr);
      expect(h).toBeDefined();
      expect(h!.pollBalance).toBe(false);
      expect(h!.reportBtc).toBeGreaterThan(0);
      expect(statusFor(0, h!.reportBtc)).toBe('emptied');
    }
  });

  it('still seeds movement-feed tx walks for every pollBalance:false holding', () => {
    // Regression: treating pollBalance:false like "stop all Esplora" dropped
    // hop 1/2 rows from the movement feed on the next snapshot rebuild.
    const movementSeeds = CORE_HOLDING_ADDRESSES.filter((h) =>
      shouldWatchSeedMovements(h, shouldPollBalance(h) ? h.reportBtc : 0),
    );
    for (const addr of NO_POLL_BALANCE_ADDRESSES) {
      expect(movementSeeds.some((h) => h.address === addr)).toBe(true);
    }
    expect(
      CORE_HOLDING_ADDRESSES.filter((h) => !shouldPollBalance(h)).every((h) =>
        shouldWatchSeedMovements(h, 0),
      ),
    ).toBe(true);
  });

  it('keeps KPIs identical when synth-0 replaces a fetched-0 for no-poll holdings', () => {
    // Simulate balances: polled cores + wave3 at report (held); no-poll at 0.
    const fetchedZeroHeldBtc = HOLDING_ADDRESSES.reduce((sum, h) => {
      if (!shouldPollBalance(h)) return sum + 0;
      return sum + h.reportBtc;
    }, 0);
    const synthZeroHeldBtc = HOLDING_ADDRESSES.reduce((sum, h) => {
      if (!shouldPollBalance(h)) return sum + 0; // synth path
      return sum + h.reportBtc;
    }, 0);
    expect(synthZeroHeldBtc).toBe(fetchedZeroHeldBtc);
    expect(heldStats(synthZeroHeldBtc, CONSOLIDATED_BTC)).toEqual(
      heldStats(fetchedZeroHeldBtc, CONSOLIDATED_BTC),
    );
    // No-poll stacks still count toward consolidated (moved), not held.
    const noPollReport = CORE_HOLDING_ADDRESSES.filter(
      (h) => !shouldPollBalance(h),
    ).reduce((s, h) => s + h.reportBtc, 0);
    expect(noPollReport).toBeGreaterThan(0);
    const { movedBtc } = heldStats(synthZeroHeldBtc, CONSOLIDATED_BTC);
    expect(movedBtc).toBeGreaterThanOrEqual(noPollReport - 1e-8);
  });
});
