import {
  MAX_DESTINATIONS_PER_SPEND,
  MAX_HOP_DEPTH,
  MIN_HOP_FOLLOW_SATS,
  WATCH_AFTER_BLOCK,
} from '../data/incident';
import { outboundFromAddress, satsToBtc, type Tx } from './mempool';

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

export function isPostWatch(tx: Tx): boolean {
  const height = tx.status.block_height;
  return (
    !tx.status.confirmed || (height != null && height > WATCH_AFTER_BLOCK)
  );
}

export function movementsFromWatch(
  watches: readonly WatchTarget[],
  txLists: Tx[][],
): Movement[] {
  const items: Movement[] = [];

  watches.forEach((w, i) => {
    for (const tx of txLists[i] ?? []) {
      const { amountSats, destinations } = outboundFromAddress(tx, w.address);
      if (amountSats <= 0) continue;
      if (!isPostWatch(tx)) continue;

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

function hopLabel(address: string, hop: number): string {
  return `Hop ${hop} · ${address.slice(0, 6)}…${address.slice(-4)}`;
}

/**
 * From hop-N spends, pick the largest fresh destinations to watch next.
 * Caps depth, per-spend fan-out, dust, and total extra watches.
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

    for (const tx of txLists[i] ?? []) {
      const { amountSats, recipients } = outboundFromAddress(tx, w.address);
      if (amountSats <= 0 || !isPostWatch(tx)) continue;

      for (const r of recipients.slice(0, MAX_DESTINATIONS_PER_SPEND)) {
        if (r.valueSats < MIN_HOP_FOLLOW_SATS) continue;
        if (known.has(r.address)) continue;

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

export function sortMovements(items: Movement[]): Movement[] {
  return [...items].sort((a, b) => {
    const ta = a.blockTime ?? (a.confirmed ? 0 : Number.MAX_SAFE_INTEGER);
    const tb = b.blockTime ?? (b.confirmed ? 0 : Number.MAX_SAFE_INTEGER);
    if (ta !== tb) return tb - ta;
    if (a.hop !== b.hop) return a.hop - b.hop;
    return a.txid.localeCompare(b.txid);
  });
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
