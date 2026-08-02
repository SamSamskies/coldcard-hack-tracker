import { describe, expect, it } from 'vitest';
import {
  CLUSTERS,
  CLUSTER_BY_ID,
  CONSOLIDATED_BTC,
  GALAXY,
  HOLDING_ADDRESSES,
  INCIDENT,
  ORIGINAL_STOLEN_BTC,
  WAVE3_FINGERPRINT,
  type ClusterId,
} from '../data/incident';
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

  it('watches the fingerprint-matched Wave 3 vault set', () => {
    const wave3 = HOLDING_ADDRESSES.filter((h) => h.clusterId === 'galaxy-wave3');
    expect(wave3).toHaveLength(WAVE3_VAULT_COUNT);
    expect(WAVE3_FINGERPRINT.matchedVaults).toBe(WAVE3_VAULT_COUNT);
    expect(WAVE3_FINGERPRINT.matchedVaults).toBeLessThan(WAVE3_FINGERPRINT.galaxyVaults);
    expect(WAVE3_FINGERPRINT.matchedHeldBtc).toBeLessThan(WAVE3_FINGERPRINT.galaxyHeldBtc);
  });
});
