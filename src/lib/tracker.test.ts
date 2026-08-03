import { describe, expect, it } from 'vitest';
import { KNOWN_ADDRESS_LABELS, WATCH_AFTER_BLOCK } from '../data/incident';
import type { Tx } from './mempool';
import {
  dedupeMovements,
  discoverNextHops,
  heldStats,
  isKnownExitAddress,
  isPostWatch,
  isSurplusPassThrough,
  movementsFromWatch,
  omitKnownExitChurn,
  orderTxsForBalance,
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

  it('skips surplus peels that left the report balance intact', () => {
    const reportSats = 69_135_523;
    const minerSats = 6_042_459;
    const fundReport = makeTx({
      txid: 'fund-report',
      vin: [{ prevout: { scriptpubkey_address: hop, value: reportSats } }],
      vout: [{ scriptpubkey_address: vault, value: reportSats }],
      blockHeight: WATCH_AFTER_BLOCK + 1,
    });
    const fundMiner = makeTx({
      txid: 'zz-fund-miner', // sorts after peel by txid; same block as peel
      vin: [{ prevout: { scriptpubkey_address: hop, value: minerSats } }],
      vout: [{ scriptpubkey_address: vault, value: minerSats }],
      blockHeight: WATCH_AFTER_BLOCK + 2,
    });
    const peel = makeTx({
      txid: 'aa-ocean-peel', // would sort before fund by txid without topo order
      vin: [
        {
          txid: 'zz-fund-miner',
          prevout: { scriptpubkey_address: vault, value: minerSats },
        },
      ],
      vout: [{ scriptpubkey_address: hop, value: minerSats - 7_700 }],
      blockHeight: WATCH_AFTER_BLOCK + 2,
    });
    const empty = makeTx({
      txid: 'empty-stack',
      vin: [
        { prevout: { scriptpubkey_address: vault, value: 49_981_846 } },
        { prevout: { scriptpubkey_address: vault, value: 19_153_677 } },
      ],
      vout: [
        { scriptpubkey_address: hop, value: 45_000_000 },
        { scriptpubkey_address: hop, value: 24_135_200 },
      ],
      confirmed: false,
    });

    const txs = [empty, peel, fundMiner, fundReport]; // newest-first, as Esplora
    const seed: WatchTarget = {
      address: vault,
      label: 'Aug 1 hop vault',
      hop: 0,
      reportBtc: reportSats / 100_000_000,
    };

    expect(orderTxsForBalance(txs).map((t) => t.txid)).toEqual([
      'fund-report',
      'zz-fund-miner',
      'aa-ocean-peel',
      'empty-stack',
    ]);
    expect(
      isSurplusPassThrough(vault, seed.reportBtc!, txs, 'aa-ocean-peel'),
    ).toBe(true);
    expect(
      isSurplusPassThrough(vault, seed.reportBtc!, txs, 'empty-stack'),
    ).toBe(false);

    const moves = movementsFromWatch([seed], [txs]);
    expect(moves.map((m) => m.txid)).toEqual(['empty-stack']);
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

  it('does not follow destinations of surplus peels', () => {
    const reportSats = 50_000_000;
    const minerSats = 6_000_000;
    const minerDest = 'bc1qminerxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    const fund = makeTx({
      txid: 'fund',
      vin: [{ prevout: { scriptpubkey_address: big, value: reportSats + minerSats } }],
      vout: [{ scriptpubkey_address: vault, value: reportSats + minerSats }],
      blockHeight: WATCH_AFTER_BLOCK + 1,
    });
    const peel = makeTx({
      txid: 'peel',
      vin: [{ prevout: { scriptpubkey_address: vault, value: minerSats } }],
      vout: [{ scriptpubkey_address: minerDest, value: minerSats - 1_000 }],
      blockHeight: WATCH_AFTER_BLOCK + 2,
    });
    const empty = makeTx({
      txid: 'empty',
      vin: [{ prevout: { scriptpubkey_address: vault, value: reportSats } }],
      vout: [{ scriptpubkey_address: big, value: reportSats - 1_000 }],
      confirmed: false,
    });
    const seed: WatchTarget = {
      address: vault,
      label: 'Vault',
      hop: 0,
      reportBtc: reportSats / 100_000_000,
    };

    const next = discoverNextHops(
      [seed],
      [[empty, peel, fund]],
      new Set([vault]),
      8,
    );
    expect(next.map((w) => w.address)).toEqual([big]);
  });

  it('does not follow into known exit labels', () => {
    const exitAddr = Object.keys(KNOWN_ADDRESS_LABELS)[0]!;
    expect(isKnownExitAddress(exitAddr)).toBe(true);
    const tx = makeTx({
      vin: [{ prevout: { scriptpubkey_address: vault, value: 41_000_000 } }],
      vout: [
        { scriptpubkey_address: exitAddr, value: 30_000_000 },
        { scriptpubkey_address: big, value: 10_900_000 },
      ],
      blockHeight: WATCH_AFTER_BLOCK + 5,
    });

    const next = discoverNextHops([watch], [[tx]], new Set([vault]), 8);
    expect(next.map((w) => w.address)).toEqual([big]);
  });
});

describe('known exit churn filter', () => {
  const exitAddr = Object.keys(KNOWN_ADDRESS_LABELS)[0]!;
  const further = 'bc1qfurtherxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

  it('does not emit movements from labeled exit venues', () => {
    const exitWatch: WatchTarget = {
      address: exitAddr,
      label: 'Labeled exit',
      hop: 1,
    };
    const tx = makeTx({
      vin: [{ prevout: { scriptpubkey_address: exitAddr, value: 50_000_000 } }],
      vout: [{ scriptpubkey_address: further, value: 49_900_000 }],
      blockHeight: WATCH_AFTER_BLOCK + 10,
    });
    expect(movementsFromWatch([exitWatch], [[tx]])).toEqual([]);
  });

  it('omitKnownExitChurn drops stale snapshot peels from labeled venues', () => {
    const base: Omit<Movement, 'txid' | 'fromAddress'> = {
      fromLabel: 'Hop',
      amountBtc: 40,
      destinations: [further],
      hop: 2,
      confirmed: true,
      blockHeight: WATCH_AFTER_BLOCK + 20,
    };
    const kept: Movement = {
      ...base,
      txid: 'keep',
      fromAddress: 'bc1qvaultxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    };
    const dropped: Movement = {
      ...base,
      txid: 'drop',
      fromAddress: exitAddr,
    };
    expect(omitKnownExitChurn([kept, dropped])).toEqual([kept]);
  });
});

describe('sortMovements', () => {
  it('orders by newest block height, then hop, then txid', () => {
    const base: Omit<Movement, 'txid' | 'hop' | 'blockHeight'> = {
      fromAddress: 'a',
      fromLabel: 'A',
      amountBtc: 1,
      destinations: [],
      confirmed: true,
    };
    const sorted = sortMovements([
      { ...base, txid: 'b', hop: 0, blockHeight: 100 },
      { ...base, txid: 'a', hop: 1, blockHeight: 200 },
      { ...base, txid: 'c', hop: 0, blockHeight: 200 },
    ]);
    expect(sorted.map((m) => m.txid)).toEqual(['c', 'a', 'b']);
  });

  it('puts unconfirmed ahead of confirmed, and falls back to block time', () => {
    const base: Omit<Movement, 'txid' | 'confirmed' | 'blockHeight' | 'blockTime'> =
      {
        fromAddress: 'a',
        fromLabel: 'A',
        amountBtc: 1,
        destinations: [],
        hop: 0,
      };
    const sorted = sortMovements([
      { ...base, txid: 'old', confirmed: true, blockTime: 50 },
      { ...base, txid: 'mem', confirmed: false },
      { ...base, txid: 'hi', confirmed: true, blockHeight: 300 },
    ]);
    expect(sorted.map((m) => m.txid)).toEqual(['mem', 'hi', 'old']);
  });
});

describe('dedupeMovements', () => {
  const base: Omit<Movement, 'txid' | 'confirmed' | 'blockTime' | 'blockHeight'> =
    {
      fromAddress: 'bc1qfrom',
      fromLabel: 'Aug 1 hop vault',
      amountBtc: 0.69,
      destinations: ['bc1qto'],
      hop: 0,
    };

  it('prefers a confirmed live copy over a stale unconfirmed snapshot row', () => {
    const txid = '5ecc3052deadbeef';
    const snapshot: Movement = {
      ...base,
      txid,
      confirmed: false,
    };
    const live: Movement = {
      ...base,
      txid,
      confirmed: true,
      blockHeight: 960_900,
      blockTime: 1_754_100_000,
    };
    const out = dedupeMovements([snapshot, live]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      confirmed: true,
      blockTime: 1_754_100_000,
      blockHeight: 960_900,
    });
  });

  it('keeps distinct txids and sorts newest height first', () => {
    const out = dedupeMovements([
      { ...base, txid: 'old', confirmed: true, blockHeight: 100 },
      { ...base, txid: 'new', confirmed: true, blockHeight: 200 },
    ]);
    expect(out.map((m) => m.txid)).toEqual(['new', 'old']);
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
