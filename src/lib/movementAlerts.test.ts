import { describe, expect, it } from 'vitest';
import type { Movement } from './tracker';
import {
  advanceAlertWatch,
  createAlertWatchState,
  isAlertableMovement,
  movementKey,
} from './movementAlerts';

function movement(
  txid: string,
  fromAddress = 'bc1qvault',
  overrides: Partial<Movement> = {},
): Movement {
  return {
    txid,
    fromAddress,
    fromLabel: 'Evening vault',
    amountBtc: 0.41,
    destinations: ['bc1qdest'],
    hop: 0,
    confirmed: true,
    ...overrides,
  };
}

describe('movementKey', () => {
  it('keys on txid and from-address', () => {
    expect(movementKey(movement('aa', 'bc1qa'))).toBe('aa:bc1qa');
  });
});

describe('isAlertableMovement', () => {
  const primedAt = 1_700_000_000;

  it('allows unconfirmed spends', () => {
    expect(
      isAlertableMovement(
        { confirmed: false, hop: 0 },
        primedAt,
        primedAt + 60,
      ),
    ).toBe(true);
  });

  it('allows confirmed spends at or after prime time', () => {
    expect(
      isAlertableMovement(
        { confirmed: true, blockTime: primedAt + 30, hop: 1 },
        primedAt,
        primedAt + 60,
      ),
    ).toBe(true);
  });

  it('allows slightly older blocks within the grace window', () => {
    expect(
      isAlertableMovement(
        { confirmed: true, blockTime: primedAt - 5 * 60, hop: 0 },
        primedAt,
        primedAt + 60,
      ),
    ).toBe(true);
  });

  it('rejects historical confirmed spends without a recent block time', () => {
    expect(
      isAlertableMovement(
        { confirmed: true, blockTime: primedAt - 86_400, hop: 0 },
        primedAt,
        primedAt + 60,
      ),
    ).toBe(false);
  });

  it('rejects confirmed spends missing block time', () => {
    expect(
      isAlertableMovement({ confirmed: true, hop: 0 }, primedAt, primedAt + 60),
    ).toBe(false);
  });

  it('rejects terminal hop spends even when unconfirmed', () => {
    expect(
      isAlertableMovement(
        { confirmed: false, hop: 2 },
        primedAt,
        primedAt + 60,
      ),
    ).toBe(false);
  });
});

describe('advanceAlertWatch', () => {
  it('does nothing while alerts are disabled without wiping priming', () => {
    const primed = {
      primed: true,
      primedAtSec: 1_700_000_000,
      seen: new Set([movementKey(movement('old'))]),
    };
    const result = advanceAlertWatch(primed, [movement('new')], {
      enabled: false,
      ready: true,
    });
    expect(result.toNotify).toEqual([]);
    expect(result.state).toEqual(primed);
  });

  it('waits for the first ready poll before priming', () => {
    let state = createAlertWatchState();
    const nowSec = 1_700_000_000;

    let result = advanceAlertWatch(state, [], {
      enabled: true,
      ready: false,
      nowSec,
    });
    expect(result.state.primed).toBe(false);
    expect(result.toNotify).toEqual([]);

    result = advanceAlertWatch(result.state, [movement('tx-pass')], {
      enabled: true,
      ready: true,
      nowSec,
    });
    expect(result.state.primed).toBe(true);
    expect(result.state.primedAtSec).toBe(nowSec);
    expect(result.state.seen.has(movementKey(movement('tx-pass')))).toBe(true);
    expect(result.toNotify).toEqual([]);

    result = advanceAlertWatch(
      result.state,
      [
        movement('tx-pass'),
        movement('tx-new', 'bc1qvault', {
          confirmed: false,
        }),
      ],
      { enabled: true, ready: true, nowSec: nowSec + 60 },
    );
    expect(result.toNotify.map((m) => m.txid)).toEqual(['tx-new']);
  });

  it('does not notify for movements already shown when alerts turn on', () => {
    const existing = [movement('tx-pass'), movement('tx-hop', 'bc1qhop')];
    const result = advanceAlertWatch(createAlertWatchState(), existing, {
      enabled: true,
      ready: true,
      nowSec: 1_700_000_000,
    });
    expect(result.toNotify).toEqual([]);
    expect(result.state.seen.size).toBe(2);
  });

  it('notifies only unseen recent spends after priming', () => {
    const nowSec = 1_700_000_000;
    const first = advanceAlertWatch(createAlertWatchState(), [], {
      enabled: true,
      ready: true,
      nowSec,
    });
    const second = advanceAlertWatch(
      first.state,
      [
        movement('a', 'bc1qvault', { confirmed: false }),
        movement('b', 'bc1qvault', {
          confirmed: true,
          blockTime: nowSec + 10,
        }),
      ],
      { enabled: true, ready: true, nowSec: nowSec + 60 },
    );
    expect(second.toNotify.map((m) => m.txid)).toEqual(['a', 'b']);

    const third = advanceAlertWatch(
      second.state,
      [
        movement('a', 'bc1qvault', { confirmed: false }),
        movement('b', 'bc1qvault', {
          confirmed: true,
          blockTime: nowSec + 10,
        }),
        movement('c', 'bc1qvault', { confirmed: false }),
      ],
      { enabled: true, ready: true, nowSec: nowSec + 120 },
    );
    expect(third.toNotify.map((m) => m.txid)).toEqual(['c']);
  });

  it('marks rediscovered historical hops seen without notifying', () => {
    const nowSec = 1_700_000_000;
    const primed = advanceAlertWatch(createAlertWatchState(), [], {
      enabled: true,
      ready: true,
      nowSec,
    });
    const next = advanceAlertWatch(
      primed.state,
      [
        movement('old-hop', 'bc1qhop', {
          hop: 2,
          confirmed: true,
          blockTime: nowSec - 86_400,
        }),
      ],
      { enabled: true, ready: true, nowSec: nowSec + 60 },
    );
    expect(next.toNotify).toEqual([]);
    expect(next.state.seen.has(movementKey(movement('old-hop', 'bc1qhop')))).toBe(
      true,
    );
  });

  it('marks terminal hop spends seen without notifying', () => {
    const nowSec = 1_700_000_000;
    const primed = advanceAlertWatch(createAlertWatchState(), [], {
      enabled: true,
      ready: true,
      nowSec,
    });
    const next = advanceAlertWatch(
      primed.state,
      [
        movement('cj-remix', 'bc1qhop2', {
          hop: 2,
          confirmed: false,
        }),
        movement('vault-out', 'bc1qvault', {
          hop: 0,
          confirmed: false,
        }),
      ],
      { enabled: true, ready: true, nowSec: nowSec + 60 },
    );
    expect(next.toNotify.map((m) => m.txid)).toEqual(['vault-out']);
    expect(
      next.state.seen.has(movementKey(movement('cj-remix', 'bc1qhop2'))),
    ).toBe(true);
  });

  it('treats the same txid from a different address as fresh', () => {
    const nowSec = 1_700_000_000;
    const primed = advanceAlertWatch(
      createAlertWatchState(),
      [movement('same', 'bc1qfrom', { confirmed: false })],
      { enabled: true, ready: true, nowSec },
    );
    const next = advanceAlertWatch(
      primed.state,
      [
        movement('same', 'bc1qfrom', { confirmed: false }),
        movement('same', 'bc1qother', { confirmed: false }),
      ],
      { enabled: true, ready: true, nowSec: nowSec + 60 },
    );
    expect(next.toNotify).toHaveLength(1);
    expect(next.toNotify[0]?.fromAddress).toBe('bc1qother');
  });
});
