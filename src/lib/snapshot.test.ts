import { describe, expect, it } from 'vitest';
import { parseSnapshot } from './snapshot';

describe('parseSnapshot', () => {
  it('accepts a minimal valid snapshot', () => {
    const snap = parseSnapshot({
      version: 1,
      updatedAt: '2026-08-01T12:00:00.000Z',
      source: 'mempool.space',
      usdPrice: 100000,
      addresses: [
        {
          address: 'bc1qq85v2c926eg6pgxhwp6q7lf6cnsz80qs3fcu9r',
          balanceSats: 1,
          utxoCount: 1,
        },
      ],
      movements: [],
    });
    expect(snap?.addresses).toHaveLength(1);
    expect(snap?.usdPrice).toBe(100000);
  });

  it('rejects empty or malformed payloads', () => {
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot({})).toBeNull();
    expect(
      parseSnapshot({
        updatedAt: '2026-08-01T12:00:00.000Z',
        source: 'x',
        addresses: [],
      }),
    ).toBeNull();
  });
});
