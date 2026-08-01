import { describe, expect, it } from 'vitest';
import type { Movement } from './tracker';
import {
  advanceAlertWatch,
  createAlertWatchState,
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

describe('advanceAlertWatch', () => {
  it('does nothing while alerts are disabled', () => {
    const primed = {
      primed: true,
      seen: new Set([movementKey(movement('old'))]),
    };
    const result = advanceAlertWatch(primed, [movement('new')], {
      enabled: false,
      ready: true,
    });
    expect(result.toNotify).toEqual([]);
    expect(result.state).toEqual(createAlertWatchState());
  });

  it('waits for the first ready poll before priming', () => {
    let state = createAlertWatchState();

    // Preference on, but first poll has not finished — do not baseline yet.
    let result = advanceAlertWatch(state, [], {
      enabled: true,
      ready: false,
    });
    expect(result.state.primed).toBe(false);
    expect(result.toNotify).toEqual([]);

    // First successful poll already includes a spend — baseline, no notify.
    result = advanceAlertWatch(result.state, [movement('tx-pass')], {
      enabled: true,
      ready: true,
    });
    expect(result.state.primed).toBe(true);
    expect(result.state.seen.has(movementKey(movement('tx-pass')))).toBe(true);
    expect(result.toNotify).toEqual([]);

    // Later poll with a new spend — notify.
    result = advanceAlertWatch(result.state, [
      movement('tx-pass'),
      movement('tx-new'),
    ], { enabled: true, ready: true });
    expect(result.toNotify.map((m) => m.txid)).toEqual(['tx-new']);
  });

  it('does not notify for movements already shown when alerts turn on', () => {
    const existing = [movement('tx-pass'), movement('tx-hop', 'bc1qhop')];
    const result = advanceAlertWatch(createAlertWatchState(), existing, {
      enabled: true,
      ready: true,
    });
    expect(result.toNotify).toEqual([]);
    expect(result.state.seen.size).toBe(2);
  });

  it('notifies only unseen spends after priming', () => {
    const first = advanceAlertWatch(createAlertWatchState(), [], {
      enabled: true,
      ready: true,
    });
    const second = advanceAlertWatch(
      first.state,
      [movement('a'), movement('b')],
      { enabled: true, ready: true },
    );
    expect(second.toNotify.map((m) => m.txid)).toEqual(['a', 'b']);

    const third = advanceAlertWatch(
      second.state,
      [movement('a'), movement('b'), movement('c')],
      { enabled: true, ready: true },
    );
    expect(third.toNotify.map((m) => m.txid)).toEqual(['c']);
  });

  it('treats the same txid from a different address as fresh', () => {
    const primed = advanceAlertWatch(
      createAlertWatchState(),
      [movement('same', 'bc1qfrom')],
      { enabled: true, ready: true },
    );
    const next = advanceAlertWatch(
      primed.state,
      [movement('same', 'bc1qfrom'), movement('same', 'bc1qother')],
      { enabled: true, ready: true },
    );
    expect(next.toNotify).toHaveLength(1);
    expect(next.toNotify[0]?.fromAddress).toBe('bc1qother');
  });
});
