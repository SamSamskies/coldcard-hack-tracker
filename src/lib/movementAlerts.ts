import { MAX_HOP_DEPTH } from '../data/incident';
import type { Movement } from './tracker';

export function movementKey(m: Pick<Movement, 'txid' | 'fromAddress'>): string {
  return `${m.txid}:${m.fromAddress}`;
}

export type AlertWatchState = {
  /** True after the first ready snapshot was recorded without notifying. */
  primed: boolean;
  /** Unix seconds when the watch was primed; used to ignore historical rediscoveries. */
  primedAtSec: number;
  seen: ReadonlySet<string>;
};

export function createAlertWatchState(): AlertWatchState {
  return { primed: false, primedAtSec: 0, seen: new Set() };
}

/**
 * Only alert for spends that look new relative to when alerts were primed.
 * Unconfirmed always qualifies. Confirmed needs a block time at/after prime
 * (small grace for clock / block-timestamp skew).
 *
 * Terminal hop spends (`hop >= MAX_HOP_DEPTH`) are never alerted — same cutoff
 * as hop follow / freeze (CoinJoin remix fan-outs are feed noise, not exits).
 */
export function isAlertableMovement(
  m: Pick<Movement, 'confirmed' | 'blockTime' | 'hop'>,
  primedAtSec: number,
  nowSec: number = Math.floor(Date.now() / 1000),
): boolean {
  if (m.hop >= MAX_HOP_DEPTH) return false;
  if (!m.confirmed) return true;
  if (m.blockTime == null) return false;
  // 10-minute grace: a block mined just before priming can still be "new".
  const floor = Math.min(primedAtSec, nowSec) - 10 * 60;
  return m.blockTime >= floor;
}

/**
 * Decide which movements to notify for.
 *
 * Priming waits until `ready` (first successful poll) so a page load with
 * alerts already on does not treat the initial feed as brand-new spends.
 * Enabling while the feed already has items baselines those without notifying.
 *
 * Later polls may rediscover older hop spends that were not in the primed
 * set (snapshot vs live, transient /txs failures). Those are marked seen but
 * only notify when {@link isAlertableMovement} says they are recent.
 */
export function advanceAlertWatch(
  state: AlertWatchState,
  movements: readonly Movement[],
  options: {
    enabled: boolean;
    ready: boolean;
    nowSec?: number;
  },
): { state: AlertWatchState; toNotify: Movement[] } {
  if (!options.enabled) {
    // Keep priming state. Resetting here on every disabled pass made a brief
    // enabled=false frame (e.g. preference hydration) wipe the watch and
    // re-baseline real spends as "already seen".
    return { state, toNotify: [] };
  }

  if (!options.ready) {
    return { state, toNotify: [] };
  }

  const nowSec = options.nowSec ?? Math.floor(Date.now() / 1000);
  const keys = movements.map(movementKey);

  if (!state.primed) {
    return {
      state: { primed: true, primedAtSec: nowSec, seen: new Set(keys) },
      toNotify: [],
    };
  }

  const seen = new Set(state.seen);
  const fresh = movements.filter((m) => !seen.has(movementKey(m)));
  for (const m of fresh) {
    seen.add(movementKey(m));
  }

  const toNotify = fresh.filter((m) =>
    isAlertableMovement(m, state.primedAtSec, nowSec),
  );

  return {
    state: { primed: true, primedAtSec: state.primedAtSec, seen },
    toNotify,
  };
}
