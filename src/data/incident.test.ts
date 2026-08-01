import { describe, expect, it } from 'vitest';
import {
  CLUSTERS,
  CLUSTER_BY_ID,
  CONSOLIDATED_BTC,
  HOLDING_ADDRESSES,
  INCIDENT,
  ORIGINAL_STOLEN_BTC,
  type ClusterId,
} from '../data/incident';

describe('incident data invariants', () => {
  it('sums cluster stolen BTC into ORIGINAL_STOLEN_BTC', () => {
    const sum = CLUSTERS.reduce((s, c) => s + c.stolenBtc, 0);
    expect(ORIGINAL_STOLEN_BTC).toBe(sum);
  });

  it('sums holding report balances into CONSOLIDATED_BTC', () => {
    const sum = HOLDING_ADDRESSES.reduce((s, h) => s + h.reportBtc, 0);
    expect(CONSOLIDATED_BTC).toBe(sum);
  });

  it('keeps consolidated below original stolen (fees burned)', () => {
    expect(CONSOLIDATED_BTC).toBeLessThan(ORIGINAL_STOLEN_BTC);
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
});
