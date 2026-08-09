import { describe, expect, it } from 'vitest';
import { KNOWN_ADDRESS_LABELS, WATCH_AFTER_BLOCK } from '../data/incident';
import type { Tx } from './mempool';
import {
  dedupeMovements,
  discoverNextHops,
  frozenTerminalHopAddresses,
  heldStats,
  isHighFanoutSpend,
  isKnownExitAddress,
  isPostKnownExitPassThrough,
  isPostWatch,
  isSurplusPassThrough,
  movementsFromWatch,
  omitHighFanoutMovements,
  omitKnownExitChurn,
  omitPostKnownExitPassThroughMovements,
  orderTxsForBalance,
  shouldTrackSeedOutbounds,
  shouldWatchSeedMovements,
  sortMovements,
  statusFor,
  type Movement,
  type WatchTarget,
} from './tracker';
import {
  MAX_DESTINATIONS_PER_SPEND,
  MAX_HOP_DEPTH,
  MAX_MOVEMENT_DESTINATIONS,
} from '../data/incident';
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

describe('shouldWatchSeedMovements', () => {
  it('always watches txs for pollBalance:false even though balance polls stop', () => {
    // Regression: skipping /txs for no-poll empties dropped all hop rows from
    // the movement feed after the next snapshot.
    const emptied = { pollBalance: false as const, reportBtc: 64.9 };
    expect(shouldWatchSeedMovements(emptied, 0)).toBe(true);
  });

  it('does not watch held polled vaults', () => {
    const held = { reportBtc: 10 };
    expect(shouldWatchSeedMovements(held, 10)).toBe(false);
    expect(shouldWatchSeedMovements(held, 10.001)).toBe(false);
  });

  it('watches polled vaults once emptied or partial', () => {
    const vault = { reportBtc: 10 };
    expect(shouldWatchSeedMovements(vault, 0)).toBe(true);
    expect(shouldWatchSeedMovements(vault, 5)).toBe(true);
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

  it('keeps the first hop peel to a known exit, drops later pass-throughs', () => {
    // Wave 4-style hop park: stolen cash-out to a service hub, then the same
    // address keeps receiving unrelated sats and peeling them to the hub.
    // Hop watches have no reportBtc, so the seed surplus filter cannot help.
    const exitAddr = Object.keys(KNOWN_ADDRESS_LABELS)[0]!;
    const park = hop;
    const stolenSats = 1_123_566;
    const surplusSats = 401_567;

    const fundStolen = makeTx({
      txid: 'fund-stolen',
      vin: [{ prevout: { scriptpubkey_address: vault, value: stolenSats } }],
      vout: [{ scriptpubkey_address: park, value: stolenSats }],
      blockHeight: WATCH_AFTER_BLOCK + 10,
    });
    const cashOut = makeTx({
      txid: 'cash-out',
      vin: [
        {
          txid: 'fund-stolen',
          prevout: { scriptpubkey_address: park, value: stolenSats },
        },
      ],
      vout: [{ scriptpubkey_address: exitAddr, value: stolenSats - 264 }],
      blockHeight: WATCH_AFTER_BLOCK + 11,
    });
    const fundSurplus = makeTx({
      txid: 'fund-surplus',
      vin: [{ prevout: { scriptpubkey_address: vault, value: surplusSats } }],
      vout: [{ scriptpubkey_address: park, value: surplusSats }],
      blockHeight: WATCH_AFTER_BLOCK + 50,
    });
    const surplusPeel = makeTx({
      txid: 'surplus-peel',
      vin: [
        {
          txid: 'fund-surplus',
          prevout: { scriptpubkey_address: park, value: surplusSats },
        },
      ],
      vout: [{ scriptpubkey_address: exitAddr, value: surplusSats - 132 }],
      blockHeight: WATCH_AFTER_BLOCK + 51,
    });

    const txs = [surplusPeel, fundSurplus, cashOut, fundStolen]; // newest-first
    const hopWatch: WatchTarget = {
      address: park,
      label: 'Hop 1 · bc1qho…xxxx',
      hop: 1,
    };

    expect(isPostKnownExitPassThrough(park, txs, 'cash-out')).toBe(false);
    expect(isPostKnownExitPassThrough(park, txs, 'surplus-peel')).toBe(true);

    const moves = movementsFromWatch([hopWatch], [txs]);
    expect(moves.map((m) => m.txid)).toEqual(['cash-out']);
  });

  it('does not let a surplus peel to a known exit freeze the later empty', () => {
    const exitAddr = Object.keys(KNOWN_ADDRESS_LABELS)[0]!;
    const reportSats = 50_000_000;
    const minerSats = 6_000_000;
    const fundReport = makeTx({
      txid: 'fund-report',
      vin: [{ prevout: { scriptpubkey_address: hop, value: reportSats } }],
      vout: [{ scriptpubkey_address: vault, value: reportSats }],
      blockHeight: WATCH_AFTER_BLOCK + 1,
    });
    const fundMiner = makeTx({
      txid: 'fund-miner',
      vin: [{ prevout: { scriptpubkey_address: hop, value: minerSats } }],
      vout: [{ scriptpubkey_address: vault, value: minerSats }],
      blockHeight: WATCH_AFTER_BLOCK + 2,
    });
    const oceanPeel = makeTx({
      txid: 'ocean-peel',
      vin: [{ prevout: { scriptpubkey_address: vault, value: minerSats } }],
      vout: [{ scriptpubkey_address: exitAddr, value: minerSats - 1_000 }],
      blockHeight: WATCH_AFTER_BLOCK + 3,
    });
    const empty = makeTx({
      txid: 'empty-stack',
      vin: [{ prevout: { scriptpubkey_address: vault, value: reportSats } }],
      vout: [{ scriptpubkey_address: hop, value: reportSats - 1_000 }],
      blockHeight: WATCH_AFTER_BLOCK + 4,
    });
    const txs = [empty, oceanPeel, fundMiner, fundReport];
    const seed: WatchTarget = {
      address: vault,
      label: 'Aug 1 hop vault',
      hop: 0,
      reportBtc: reportSats / 100_000_000,
    };

    expect(
      isPostKnownExitPassThrough(vault, txs, 'empty-stack', seed.reportBtc),
    ).toBe(false);
    expect(movementsFromWatch([seed], [txs]).map((m) => m.txid)).toEqual([
      'empty-stack',
    ]);
  });

  it('skips CoinJoin-scale fan-out spends', () => {
    const outs = Array.from({ length: MAX_MOVEMENT_DESTINATIONS + 1 }, (_, i) => ({
      scriptpubkey_address: `bc1qcj${String(i).padStart(37, 'x')}`,
      value: 1_000_000,
    }));
    const tx = makeTx({
      txid: 'cj-remix',
      vin: [
        {
          prevout: {
            scriptpubkey_address: vault,
            value: outs.reduce((s, o) => s + o.value, 0) + 500,
          },
        },
      ],
      vout: outs,
      blockHeight: WATCH_AFTER_BLOCK + 5,
    });
    expect(isHighFanoutSpend(outs.length, 0)).toBe(true);
    expect(movementsFromWatch([watch], [[tx]])).toEqual([]);
  });

  it('keeps multi-out peels from seed holdings (hop 0)', () => {
    // Wave 4-style park peel: more outs than hop-follow cap, under CJ ceiling.
    const n = MAX_DESTINATIONS_PER_SPEND + 5;
    const outs = Array.from({ length: n }, (_, i) => ({
      scriptpubkey_address: `bc1qpk${String(i).padStart(37, 'x')}`,
      value: 2_000_000,
    }));
    const tx = makeTx({
      txid: 'park-peel',
      vin: [
        {
          prevout: {
            scriptpubkey_address: vault,
            value: outs.reduce((s, o) => s + o.value, 0) + 500,
          },
        },
      ],
      vout: outs,
      blockHeight: WATCH_AFTER_BLOCK + 5,
    });
    expect(isHighFanoutSpend(n, 0)).toBe(false);
    expect(movementsFromWatch([watch], [[tx]]).map((m) => m.txid)).toEqual([
      'park-peel',
    ]);
  });

  it('skips hop-trail peels wider than hop-follow fan-out', () => {
    const hopWatch: WatchTarget = {
      address: vault,
      label: 'Hop 1 from Wave 4 park',
      hop: 1,
    };
    const n = MAX_DESTINATIONS_PER_SPEND + 1;
    const outs = Array.from({ length: n }, (_, i) => ({
      scriptpubkey_address: `bc1qhz${String(i).padStart(37, 'x')}`,
      value: 2_000_000,
    }));
    const tx = makeTx({
      txid: 'hop-fanout',
      vin: [
        {
          prevout: {
            scriptpubkey_address: vault,
            value: outs.reduce((s, o) => s + o.value, 0) + 500,
          },
        },
      ],
      vout: outs,
      blockHeight: WATCH_AFTER_BLOCK + 5,
    });
    expect(isHighFanoutSpend(n, 1)).toBe(true);
    expect(isHighFanoutSpend(MAX_DESTINATIONS_PER_SPEND, 1)).toBe(false);
    expect(movementsFromWatch([hopWatch], [[tx]])).toEqual([]);
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

  it('does not follow CoinJoin-scale fan-out spends', () => {
    const outs = Array.from({ length: MAX_MOVEMENT_DESTINATIONS + 1 }, (_, i) => ({
      scriptpubkey_address: i === 0 ? big : `bc1qcj${String(i).padStart(37, 'x')}`,
      value: 1_000_000,
    }));
    const tx = makeTx({
      vin: [
        {
          prevout: {
            scriptpubkey_address: vault,
            value: outs.reduce((s, o) => s + o.value, 0),
          },
        },
      ],
      vout: outs,
      blockHeight: WATCH_AFTER_BLOCK + 5,
    });
    expect(discoverNextHops([watch], [[tx]], new Set([vault]), 8)).toEqual([]);
  });

  it('skips rediscovery when terminal hop is already in known (frozen)', () => {
    const tx = makeTx({
      vin: [{ prevout: { scriptpubkey_address: vault, value: 41_000_000 } }],
      vout: [{ scriptpubkey_address: big, value: 40_900_000 }],
      blockHeight: WATCH_AFTER_BLOCK + 5,
    });
    const frozen = frozenTerminalHopAddresses([
      {
        fromAddress: big,
        hop: MAX_HOP_DEPTH,
      },
    ]);
    const known = new Set([vault, ...frozen]);
    expect(discoverNextHops([watch], [[tx]], known, 8)).toEqual([]);
  });
});

describe('frozenTerminalHopAddresses', () => {
  it('collects only max-depth fromAddresses', () => {
    const moves: Pick<Movement, 'fromAddress' | 'hop'>[] = [
      { fromAddress: 'a', hop: 0 },
      { fromAddress: 'b', hop: 1 },
      { fromAddress: 'c', hop: 2 },
      { fromAddress: 'd', hop: 2 },
      { fromAddress: 'c', hop: 2 },
    ];
    expect([...frozenTerminalHopAddresses(moves)].sort()).toEqual(['c', 'd']);
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

  it('omitHighFanoutMovements drops CJ-scale destination lists', () => {
    const dests = Array.from(
      { length: MAX_MOVEMENT_DESTINATIONS + 1 },
      (_, i) => `bc1qcj${String(i).padStart(37, 'x')}`,
    );
    const kept: Movement = {
      txid: 'keep',
      fromAddress: 'bc1qvaultxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      fromLabel: 'Vault',
      amountBtc: 1,
      destinations: [further],
      hop: 1,
      confirmed: true,
      blockHeight: WATCH_AFTER_BLOCK + 1,
    };
    const dropped: Movement = {
      ...kept,
      txid: 'cj',
      destinations: dests,
    };
    expect(omitHighFanoutMovements([kept, dropped])).toEqual([kept]);
  });

  it('omitHighFanoutMovements drops wide hop-trail peels but keeps wide seed peels', () => {
    const midFanout = Array.from(
      { length: MAX_DESTINATIONS_PER_SPEND + 5 },
      (_, i) => `bc1qmd${String(i).padStart(37, 'x')}`,
    );
    const seedPeel: Movement = {
      txid: 'seed',
      fromAddress: 'bc1qvaultxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
      fromLabel: 'Wave 4 park',
      amountBtc: 2,
      destinations: midFanout,
      hop: 0,
      confirmed: true,
      blockHeight: WATCH_AFTER_BLOCK + 1,
    };
    const hopPeel: Movement = {
      ...seedPeel,
      txid: 'hop',
      fromLabel: 'Hop 1 from Wave 4 park',
      hop: 1,
    };
    expect(omitHighFanoutMovements([seedPeel, hopPeel])).toEqual([seedPeel]);
  });

  it('omitPostKnownExitPassThroughMovements keeps first exit cash-in only', () => {
    const park = 'bc1qparkxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';
    const base: Omit<Movement, 'txid' | 'blockHeight'> = {
      fromAddress: park,
      fromLabel: 'Hop',
      amountBtc: 0.01,
      destinations: [exitAddr],
      hop: 1,
      confirmed: true,
    };
    const first: Movement = { ...base, txid: 'first', blockHeight: 100 };
    const later: Movement = { ...base, txid: 'later', blockHeight: 200 };
    expect(omitPostKnownExitPassThroughMovements([later, first])).toEqual([
      first,
    ]);
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
