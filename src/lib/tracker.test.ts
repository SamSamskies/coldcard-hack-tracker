import { describe, expect, it } from 'vitest';
import { WATCH_AFTER_BLOCK } from '../data/incident';
import type { Tx } from './mempool';
import {
  discoverNextHops,
  heldStats,
  isPostWatch,
  movementsFromWatch,
  shouldTrackSeedOutbounds,
  sortMovements,
  statusFor,
  type Movement,
  type WatchTarget,
} from './tracker';

function makeTx(partial: {
  txid?: string;
  vin: Tx['vin'];
  vout: Tx['vout'];
  confirmed?: boolean;
  blockHeight?: number;
  blockTime?: number;
}): Tx {
  return {
    txid: partial.txid ?? 'txid',
    fee: 0,
    vin: partial.vin,
    vout: partial.vout,
    status: {
      confirmed: partial.confirmed ?? true,
      block_height: partial.blockHeight,
      block_time: partial.blockTime,
    },
  };
}

describe('statusFor', () => {
  it('marks emptied, partial, and held balances', () => {
    expect(statusFor(0, 1)).toBe('emptied');
    expect(statusFor(0.5, 1)).toBe('partial');
    expect(statusFor(0.995, 1)).toBe('held');
    expect(statusFor(1, 1)).toBe('held');
  });
});

describe('shouldTrackSeedOutbounds (surplus pass-through)', () => {
  const reportBtc = 0.50980268;

  it('ignores outbounds while the vault still holds its report balance', () => {
    expect(shouldTrackSeedOutbounds(reportBtc, reportBtc)).toBe(false);
    // Surplus arrived and left; reported stack still sits there.
    expect(shouldTrackSeedOutbounds(reportBtc + 0.001, reportBtc)).toBe(false);
  });

  it('tracks outbounds once the reported stack is touched', () => {
    expect(shouldTrackSeedOutbounds(reportBtc * 0.5, reportBtc)).toBe(true);
    expect(shouldTrackSeedOutbounds(0, reportBtc)).toBe(true);
  });
});

describe('isPostWatch', () => {
  it('includes unconfirmed spends', () => {
    expect(
      isPostWatch(
        makeTx({
          vin: [],
          vout: [],
          confirmed: false,
        }),
      ),
    ).toBe(true);
  });

  it('includes confirmed spends after the watch block', () => {
    expect(
      isPostWatch(
        makeTx({
          vin: [],
          vout: [],
          blockHeight: WATCH_AFTER_BLOCK + 1,
        }),
      ),
    ).toBe(true);
  });

  it('excludes confirmed spends at or before the watch block', () => {
    expect(
      isPostWatch(
        makeTx({
          vin: [],
          vout: [],
          blockHeight: WATCH_AFTER_BLOCK,
        }),
      ),
    ).toBe(false);
  });
});

describe('movementsFromWatch', () => {
  const vault = 'bc1qvaultxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  const hop = 'bc1qhopxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  const watch: WatchTarget = { address: vault, label: 'Evening vault', hop: 0 };

  it('emits a movement for post-watch outbounds', () => {
    const tx = makeTx({
      txid: 'move1',
      vin: [{ prevout: { scriptpubkey_address: vault, value: 41_000_000 } }],
      vout: [{ scriptpubkey_address: hop, value: 40_900_000 }],
      blockHeight: WATCH_AFTER_BLOCK + 10,
      blockTime: 1_700_000_000,
    });

    const moves = movementsFromWatch([watch], [[tx]]);
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({
      txid: 'move1',
      fromAddress: vault,
      hop: 0,
      destinations: [hop],
    });
    expect(moves[0].amountBtc).toBeCloseTo(0.41, 6);
  });

  it('skips pre-watch consolidation spends', () => {
    const tx = makeTx({
      vin: [{ prevout: { scriptpubkey_address: vault, value: 50_000_000 } }],
      vout: [{ scriptpubkey_address: hop, value: 49_900_000 }],
      blockHeight: WATCH_AFTER_BLOCK - 50,
    });
    expect(movementsFromWatch([watch], [[tx]])).toEqual([]);
  });
});

describe('discoverNextHops', () => {
  const vault = 'bc1qvaultxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  const big = 'bc1qbigxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  const dust = 'bc1qdustxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
  const watch: WatchTarget = { address: vault, label: 'Vault', hop: 0 };

  it('follows large post-watch destinations and skips dust', () => {
    const tx = makeTx({
      vin: [{ prevout: { scriptpubkey_address: vault, value: 42_000_000 } }],
      vout: [
        { scriptpubkey_address: big, value: 41_000_000 },
        { scriptpubkey_address: dust, value: 500_000 },
      ],
      blockHeight: WATCH_AFTER_BLOCK + 5,
    });

    const next = discoverNextHops([watch], [[tx]], new Set([vault]), 8);
    expect(next).toHaveLength(1);
    expect(next[0].address).toBe(big);
    expect(next[0].hop).toBe(1);
  });

  it('does not rediscover known addresses', () => {
    const tx = makeTx({
      vin: [{ prevout: { scriptpubkey_address: vault, value: 41_000_000 } }],
      vout: [{ scriptpubkey_address: big, value: 40_900_000 }],
      blockHeight: WATCH_AFTER_BLOCK + 5,
    });

    const next = discoverNextHops(
      [watch],
      [[tx]],
      new Set([vault, big]),
      8,
    );
    expect(next).toEqual([]);
  });

  it('stops discovering past MAX_HOP_DEPTH', () => {
    const hop2: WatchTarget = { address: big, label: 'Hop 2', hop: 2 };
    const further = 'bc1qfurtherxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    const tx = makeTx({
      vin: [{ prevout: { scriptpubkey_address: big, value: 40_000_000 } }],
      vout: [{ scriptpubkey_address: further, value: 39_900_000 }],
      blockHeight: WATCH_AFTER_BLOCK + 5,
    });

    expect(discoverNextHops([hop2], [[tx]], new Set([big]), 8)).toEqual([]);
  });
});

describe('sortMovements', () => {
  it('orders by newest block time, then hop, then txid', () => {
    const base: Omit<Movement, 'txid' | 'hop' | 'blockTime'> = {
      fromAddress: 'a',
      fromLabel: 'A',
      amountBtc: 1,
      destinations: [],
      confirmed: true,
    };
    const sorted = sortMovements([
      { ...base, txid: 'b', hop: 0, blockTime: 100 },
      { ...base, txid: 'a', hop: 1, blockTime: 200 },
      { ...base, txid: 'c', hop: 0, blockTime: 200 },
    ]);
    expect(sorted.map((m) => m.txid)).toEqual(['c', 'a', 'b']);
  });
});

describe('heldStats', () => {
  it('computes moved BTC and held percent against consolidated total', () => {
    expect(heldStats(90, 100)).toEqual({ movedBtc: 10, heldPct: 90 });
  });

  it('never reports negative moved BTC', () => {
    expect(heldStats(105, 100).movedBtc).toBe(0);
  });
});
