import type { Movement } from './tracker';

export function movementKey(m: Pick<Movement, 'txid' | 'fromAddress'>): string {
  return `${m.txid}:${m.fromAddress}`;
}

export type AlertWatchState = {
  /** True after the first ready snapshot was recorded without notifying. */
  primed: boolean;
  seen: ReadonlySet<string>;
};

export function createAlertWatchState(): AlertWatchState {
  return { primed: false, seen: new Set() };
}

/**
 * Decide which movements to notify for.
 *
 * Priming waits until `ready` (first successful poll) so a page load with
 * alerts already on does not treat the initial feed as brand-new spends.
 * Enabling while the feed already has items baselines those without notifying.
 */
export function advanceAlertWatch(
  state: AlertWatchState,
  movements: readonly Movement[],
  options: { enabled: boolean; ready: boolean },
): { state: AlertWatchState; toNotify: Movement[] } {
  if (!options.enabled) {
    return { state: createAlertWatchState(), toNotify: [] };
  }

  if (!options.ready) {
    return { state, toNotify: [] };
  }

  const keys = movements.map(movementKey);

  if (!state.primed) {
    return {
      state: { primed: true, seen: new Set(keys) },
      toNotify: [],
    };
  }

  const seen = new Set(state.seen);
  const toNotify = movements.filter((m) => !seen.has(movementKey(m)));
  for (const m of toNotify) {
    seen.add(movementKey(m));
  }

  return { state: { primed: true, seen }, toNotify };
}
