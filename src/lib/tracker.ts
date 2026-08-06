import {
  KNOWN_ADDRESS_LABELS,
  MAX_DESTINATIONS_PER_SPEND,
  MAX_HOP_DEPTH,
  MAX_MOVEMENT_DESTINATIONS,
  MIN_HOP_FOLLOW_SATS,
  SATS_PER_BTC,
  WATCH_AFTER_BLOCK,
} from '../data/incident';
import { outboundFromAddress, satsToBtc, type Tx } from './mempool';

/** Exchange / bridge / service hub — show the cash-in, do not chase custodian churn. */
export function isKnownExitAddress(address: string): boolean {
  return Object.hasOwn(KNOWN_ADDRESS_LABELS, address);
}

/** CoinJoin / mixer fan-out — not a trackable stolen-stack peel. */
export function isHighFanoutSpend(destinationCount: number): boolean {
  return destinationCount > MAX_MOVEMENT_DESTINATIONS;
}

export type AddressStatus = 'held' | 'partial' | 'emptied';

export type Movement = {
  txid: string;
  fromAddress: string;
  fromLabel: string;
  amountBtc: number;
  destinations: string[];
  /** 0 = original holding address; 1+ = followed hop. */
  hop: number;
  confirmed: boolean;
  blockHeight?: number;
  blockTime?: number;
};

export type WatchTarget = {
  address: string;
  label: string;
  hop: number;
  /**
   * Seed holdings only. When set, outbounds that leave this report balance
   * intact (surplus pass-through) are ignored — even after the vault later
   * empties and seed tracking turns on.
   */
  reportBtc?: number;
};

export function statusFor(balanceBtc: number, reportBtc: number): AddressStatus {
  if (balanceBtc <= 0.000_000_01) return 'emptied';
  // Allow small fee dust difference vs report snapshot
  if (balanceBtc < reportBtc * 0.99) return 'partial';
  return 'held';
}

/**
 * Vaults that still hold their report balance may pass surplus coins through.
 * Those outbounds are not the reported stolen stack moving — skip them.
 */
export function shouldTrackSeedOutbounds(
  balanceBtc: number,
  reportBtc: number,
): boolean {
  return statusFor(balanceBtc, reportBtc) !== 'held';
}

/**
 * Whether a holding should get `/txs` walks for the movement feed.
 *
 * `pollBalance: false` only skips *balance* polls (synth 0). Those emptied
 * vaults must still be movement seeds — otherwise hop trails disappear from
 * the feed on the next snapshot/live refresh.
 */
export function shouldWatchSeedMovements(
  h: { pollBalance?: boolean; reportBtc: number },
  balanceBtc: number,
): boolean {
  if (h.pollBalance === false) return true;
  return shouldTrackSeedOutbounds(balanceBtc, h.reportBtc);
}

export function isPostWatch(tx: Tx): boolean {
  const height = tx.status.block_height;
  return (
    !tx.status.confirmed || (height != null && height > WATCH_AFTER_BLOCK)
  );
}

function txChronologicalKey(tx: Tx): number {
  if (!tx.status.confirmed) return Number.MAX_SAFE_INTEGER;
  return tx.status.block_height ?? tx.status.block_time ?? 0;
}

function compareTxChronology(a: Tx, b: Tx): number {
  const ka = txChronologicalKey(a);
  const kb = txChronologicalKey(b);
  if (ka !== kb) return ka - kb;
  return a.txid.localeCompare(b.txid);
}

/**
 * Oldest-first, with same-block parents before children (via vin.txid).
 * Needed when a surplus deposit and its peel land in the same block —
 * lexicographic txid order alone can put the peel first and break the filter.
 */
export function orderTxsForBalance(txs: readonly Tx[]): Tx[] {
  if (txs.length <= 1) return [...txs];

  const byId = new Map(txs.map((t) => [t.txid, t]));
  const ids = new Set(byId.keys());
  const indegree = new Map<string, number>();
  const children = new Map<string, string[]>();

  for (const t of txs) {
    indegree.set(t.txid, 0);
    children.set(t.txid, []);
  }

  for (const t of txs) {
    const seenParents = new Set<string>();
    for (const vin of t.vin) {
      const parent = vin.txid;
      if (!parent || !ids.has(parent) || seenParents.has(parent)) continue;
      seenParents.add(parent);
      children.get(parent)!.push(t.txid);
      indegree.set(t.txid, (indegree.get(t.txid) ?? 0) + 1);
    }
  }

  const ready = txs
    .filter((t) => (indegree.get(t.txid) ?? 0) === 0)
    .sort(compareTxChronology);
  const out: Tx[] = [];

  while (ready.length > 0) {
    const t = ready.shift()!;
    out.push(t);
    for (const childId of children.get(t.txid) ?? []) {
      const next = (indegree.get(childId) ?? 1) - 1;
      indegree.set(childId, next);
      if (next === 0) {
        const child = byId.get(childId);
        if (child) {
          ready.push(child);
          ready.sort(compareTxChronology);
        }
      }
    }
  }

  if (out.length < txs.length) {
    const seen = new Set(out.map((t) => t.txid));
    out.push(...txs.filter((t) => !seen.has(t.txid)).sort(compareTxChronology));
  }
  return out;
}

function addressDeltaSats(tx: Tx, address: string): number {
  const spent = tx.vin
    .filter((v) => v.prevout?.scriptpubkey_address === address)
    .reduce((sum, v) => sum + (v.prevout?.value ?? 0), 0);
  const received = tx.vout
    .filter((o) => o.scriptpubkey_address === address)
    .reduce((sum, o) => sum + o.value, 0);
  return received - spent;
}

/**
 * True when this outbound left the address still holding ~its reported stack
 * (e.g. Ocean miner peel through the Aug 1 hop vault).
 */
export function isSurplusPassThrough(
  address: string,
  reportBtc: number,
  txs: readonly Tx[],
  txid: string,
): boolean {
  const thresholdSats = reportBtc * SATS_PER_BTC * 0.99;
  const ordered = orderTxsForBalance(txs);

  let balanceSats = 0;
  for (const tx of ordered) {
    balanceSats += addressDeltaSats(tx, address);
    if (tx.txid !== txid) continue;
    if (outboundFromAddress(tx, address).amountSats <= 0) return false;
    return balanceSats >= thresholdSats;
  }
  return false;
}

/**
 * True when an earlier *stolen-stack* outbound from this address already hit a
 * labeled exit (exchange / bridge / service hub). Later receive→peel cycles on
 * hop parks are pass-through reuse, not stolen-stack movement.
 *
 * Surplus peels (seed `reportBtc` still intact) do not count — an Ocean peel
 * into a shared hub must not freeze the later empty of the reported stack.
 */
export function isPostKnownExitPassThrough(
  address: string,
  txs: readonly Tx[],
  txid: string,
  reportBtc?: number,
): boolean {
  const ordered = orderTxsForBalance(txs);
  let sawKnownExit = false;

  for (const tx of ordered) {
    if (tx.txid === txid) return sawKnownExit;

    const { amountSats, destinations } = outboundFromAddress(tx, address);
    if (amountSats <= 0) continue;
    if (
      reportBtc != null &&
      isSurplusPassThrough(address, reportBtc, txs, tx.txid)
    ) {
      continue;
    }
    if (destinations.some(isKnownExitAddress)) sawKnownExit = true;
  }
  return false;
}

function shouldEmitOutbound(
  watch: WatchTarget,
  txs: readonly Tx[],
  tx: Tx,
): boolean {
  if (!isPostWatch(tx)) return false;
  const { amountSats, destinations } = outboundFromAddress(tx, watch.address);
  if (amountSats <= 0) return false;
  if (isHighFanoutSpend(destinations.length)) return false;
  if (
    watch.reportBtc != null &&
    isSurplusPassThrough(watch.address, watch.reportBtc, txs, tx.txid)
  ) {
    return false;
  }
  if (
    isPostKnownExitPassThrough(
      watch.address,
      txs,
      tx.txid,
      watch.reportBtc,
    )
  ) {
    return false;
  }
  return true;
}

export function movementsFromWatch(
  watches: readonly WatchTarget[],
  txLists: Tx[][],
): Movement[] {
  const items: Movement[] = [];

  watches.forEach((w, i) => {
    // Labeled venues are terminal: cash-in is shown from the prior hop; their
    // later peels are custodian/OTC churn, not stolen-stack movement.
    if (isKnownExitAddress(w.address)) return;

    const txs = txLists[i] ?? [];
    for (const tx of txs) {
      if (!shouldEmitOutbound(w, txs, tx)) continue;
      const { amountSats, destinations } = outboundFromAddress(tx, w.address);

      items.push({
        txid: tx.txid,
        fromAddress: w.address,
        fromLabel: w.label,
        amountBtc: satsToBtc(amountSats),
        destinations,
        hop: w.hop,
        confirmed: tx.status.confirmed,
        blockHeight: tx.status.block_height,
        blockTime: tx.status.block_time,
      });
    }
  });

  return items;
}

/** Drop stale snapshot rows that are peels from labeled exit venues. */
export function omitKnownExitChurn(items: readonly Movement[]): Movement[] {
  return items.filter((m) => !isKnownExitAddress(m.fromAddress));
}

/** Drop CoinJoin / mixer fan-out rows (incl. stale snapshot). */
export function omitHighFanoutMovements(
  items: readonly Movement[],
): Movement[] {
  return items.filter((m) => !isHighFanoutSpend(m.destinations.length));
}

/**
 * Drop later peels from an address after it already cashed out to a known exit
 * (list-level; covers stale snapshot rows without re-walking txs).
 */
export function omitPostKnownExitPassThroughMovements(
  items: readonly Movement[],
): Movement[] {
  const chronological = [...items].sort((a, b) => {
    const ka = a.confirmed
      ? (a.blockHeight ?? a.blockTime ?? 0)
      : Number.MAX_SAFE_INTEGER;
    const kb = b.confirmed
      ? (b.blockHeight ?? b.blockTime ?? 0)
      : Number.MAX_SAFE_INTEGER;
    if (ka !== kb) return ka - kb;
    return a.txid.localeCompare(b.txid);
  });

  const cashedOut = new Set<string>();
  const drop = new Set<string>();

  for (const m of chronological) {
    const key = `${m.txid}:${m.fromAddress}`;
    if (cashedOut.has(m.fromAddress)) {
      drop.add(key);
      continue;
    }
    if (m.destinations.some(isKnownExitAddress)) {
      cashedOut.add(m.fromAddress);
    }
  }

  return items.filter((m) => !drop.has(`${m.txid}:${m.fromAddress}`));
}

function hopLabel(address: string, hop: number): string {
  return `Hop ${hop} · ${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * From hop-N spends, pick the largest fresh destinations to watch next.
 * Caps depth, per-spend fan-out, dust, and total extra watches.
 * Does not follow into {@link KNOWN_ADDRESS_LABELS} exits (terminal cash-outs).
 */
export function discoverNextHops(
  watches: readonly WatchTarget[],
  txLists: Tx[][],
  known: Set<string>,
  remainingSlots: number,
): WatchTarget[] {
  if (remainingSlots <= 0) return [];

  const scored = new Map<string, { hop: number; valueSats: number }>();

  watches.forEach((w, i) => {
    if (w.hop >= MAX_HOP_DEPTH) return;
    if (isKnownExitAddress(w.address)) return;

    const txs = txLists[i] ?? [];
    for (const tx of txs) {
      if (!shouldEmitOutbound(w, txs, tx)) continue;
      const { recipients } = outboundFromAddress(tx, w.address);

      const follow = recipients
        .filter(
          (r) =>
            r.valueSats >= MIN_HOP_FOLLOW_SATS &&
            !known.has(r.address) &&
            !isKnownExitAddress(r.address),
        )
        .sort((a, b) => b.valueSats - a.valueSats)
        .slice(0, MAX_DESTINATIONS_PER_SPEND);

      for (const r of follow) {
        const nextHop = w.hop + 1;
        const prev = scored.get(r.address);
        if (!prev || r.valueSats > prev.valueSats) {
          scored.set(r.address, { hop: nextHop, valueSats: r.valueSats });
        }
      }
    }
  });

  return [...scored.entries()]
    .sort((a, b) => b[1].valueSats - a[1].valueSats)
    .slice(0, remainingSlots)
    .map(([address, { hop }]) => ({
      address,
      hop,
      label: hopLabel(address, hop),
    }));
}

function movementSortKey(m: Movement): number {
  if (!m.confirmed) return Number.MAX_SAFE_INTEGER;
  return m.blockHeight ?? m.blockTime ?? 0;
}

export function sortMovements(items: Movement[]): Movement[] {
  return [...items].sort((a, b) => {
    const ka = movementSortKey(a);
    const kb = movementSortKey(b);
    if (ka !== kb) return kb - ka;
    if (a.hop !== b.hop) return a.hop - b.hop;
    return a.txid.localeCompare(b.txid);
  });
}

/** Prefer confirmed / block-annotated copies; later items win ties (live over snapshot). */
function movementFreshness(m: Movement): number {
  let score = 0;
  if (m.confirmed) score += 2;
  if (m.blockTime != null || m.blockHeight != null) score += 1;
  return score;
}

/**
 * Collapse duplicate txid+fromAddress rows (snapshot + live merge).
 * Stale unconfirmed snapshot rows must not beat a later confirmed live copy.
 */
export function dedupeMovements(items: Movement[]): Movement[] {
  const byKey = new Map<string, Movement>();
  for (const m of items) {
    const key = `${m.txid}:${m.fromAddress}`;
    const prev = byKey.get(key);
    if (!prev || movementFreshness(m) >= movementFreshness(prev)) {
      byKey.set(key, m);
    }
  }
  return sortMovements([...byKey.values()]);
}

/**
 * Terminal hop addresses that already have a recorded outbound at max depth.
 * Skip rediscovery /txs for these — further hops are not followed, and
 * re-polling usually only reprints CoinJoin fan-outs.
 */
export function frozenTerminalHopAddresses(
  movements: readonly Pick<Movement, 'fromAddress' | 'hop'>[],
  maxHop: number = MAX_HOP_DEPTH,
): Set<string> {
  const out = new Set<string>();
  for (const m of movements) {
    if (m.hop >= maxHop) out.add(m.fromAddress);
  }
  return out;
}

export function heldStats(
  heldBtc: number,
  consolidatedBtc: number,
): { movedBtc: number; heldPct: number } {
  const movedBtc = Math.max(0, consolidatedBtc - heldBtc);
  const heldPct =
    consolidatedBtc > 0
      ? Math.min(100, (heldBtc / consolidatedBtc) * 100)
      : 0;
  return { movedBtc, heldPct };
}
