import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CONSOLIDATED_BTC,
  HOLDING_ADDRESSES,
  MAX_DESTINATIONS_PER_SPEND,
  MAX_HOP_DEPTH,
  MAX_HOP_WATCH_ADDRESSES,
  MIN_HOP_FOLLOW_SATS,
  REFRESH_INTERVAL_MS,
  WATCH_AFTER_BLOCK,
  type HoldingAddress,
} from '../data/incident';
import {
  activeHostName,
  addressBalanceSats,
  fetchAddress,
  fetchAddressTxs,
  fetchUsdPrice,
  outboundFromAddress,
  satsToBtc,
  type AddressResponse,
  type Tx,
} from '../lib/mempool';

export type AddressStatus = 'held' | 'partial' | 'emptied';

export type LiveAddress = HoldingAddress & {
  balanceBtc: number;
  balanceSats: number;
  utxoCount: number;
  status: AddressStatus;
  flash?: boolean;
};

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

export type TrackerData = {
  addresses: LiveAddress[];
  heldBtc: number;
  movedBtc: number;
  heldPct: number;
  usdPrice: number | null;
  movements: Movement[];
  lastMovement: Movement | null;
  lastUpdated: Date | null;
  source: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

type WatchTarget = {
  address: string;
  label: string;
  hop: number;
};

function statusFor(balanceBtc: number, reportBtc: number): AddressStatus {
  if (balanceBtc <= 0.000_000_01) return 'emptied';
  // Allow small fee dust difference vs report snapshot
  if (balanceBtc < reportBtc * 0.99) return 'partial';
  return 'held';
}

function utxoEstimate(addr: AddressResponse): number {
  return (
    addr.chain_stats.funded_txo_count -
    addr.chain_stats.spent_txo_count +
    (addr.mempool_stats.funded_txo_count - addr.mempool_stats.spent_txo_count)
  );
}

function isPostWatch(tx: Tx): boolean {
  const height = tx.status.block_height;
  return (
    !tx.status.confirmed || (height != null && height > WATCH_AFTER_BLOCK)
  );
}

function movementsFromWatch(
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
function discoverNextHops(
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

function sortMovements(items: Movement[]): Movement[] {
  return [...items].sort((a, b) => {
    const ta = a.blockTime ?? (a.confirmed ? 0 : Number.MAX_SAFE_INTEGER);
    const tb = b.blockTime ?? (b.confirmed ? 0 : Number.MAX_SAFE_INTEGER);
    if (ta !== tb) return tb - ta;
    if (a.hop !== b.hop) return a.hop - b.hop;
    return a.txid.localeCompare(b.txid);
  });
}

export function useTrackerData(): TrackerData {
  const [addresses, setAddresses] = useState<LiveAddress[]>([]);
  const [usdPrice, setUsdPrice] = useState<number | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevBalances = useRef<Map<string, number>>(new Map());
  const flashTimers = useRef<Map<string, number>>(new Map());
  /** Destinations discovered from prior polls; survives a single missed tx page. */
  const hopWatchRef = useRef<Map<string, WatchTarget>>(new Map());

  const refresh = useCallback(async () => {
    try {
      setError(null);

      const seedWatches: WatchTarget[] = HOLDING_ADDRESSES.map((h) => ({
        address: h.address,
        label: h.label,
        hop: 0,
      }));

      const [summaries, price, ...seedTxLists] = await Promise.all([
        Promise.all(HOLDING_ADDRESSES.map((h) => fetchAddress(h.address))),
        fetchUsdPrice().catch(() => null),
        ...HOLDING_ADDRESSES.map((h) =>
          fetchAddressTxs(h.address).catch(() => [] as Tx[]),
        ),
      ]);

      const known = new Set(seedWatches.map((w) => w.address));
      const allMovements = movementsFromWatch(
        seedWatches,
        seedTxLists as Tx[][],
      );

      // Merge freshly discovered hops with any remembered from earlier polls.
      const freshHops = discoverNextHops(
        seedWatches,
        seedTxLists as Tx[][],
        known,
        MAX_HOP_WATCH_ADDRESSES,
      );
      for (const hop of freshHops) {
        hopWatchRef.current.set(hop.address, hop);
        known.add(hop.address);
      }
      // Drop remembered hops that somehow match a holding (shouldn't happen).
      for (const addr of HOLDING_ADDRESSES.map((h) => h.address)) {
        hopWatchRef.current.delete(addr);
      }

      let hopWatches = [...hopWatchRef.current.values()]
        .filter((w) => w.hop >= 1 && w.hop <= MAX_HOP_DEPTH)
        .sort((a, b) => a.hop - b.hop || a.address.localeCompare(b.address))
        .slice(0, MAX_HOP_WATCH_ADDRESSES);

      for (const w of hopWatches) known.add(w.address);

      // Iteratively deepen: hop 1 spends can reveal hop 2 destinations.
      for (let round = 0; round < MAX_HOP_DEPTH && hopWatches.length > 0; round++) {
        const hopTxLists = await Promise.all(
          hopWatches.map((w) =>
            fetchAddressTxs(w.address).catch(() => [] as Tx[]),
          ),
        );
        allMovements.push(...movementsFromWatch(hopWatches, hopTxLists));

        const slotsLeft = MAX_HOP_WATCH_ADDRESSES - hopWatchRef.current.size;
        const next = discoverNextHops(hopWatches, hopTxLists, known, slotsLeft);
        if (next.length === 0) break;

        for (const hop of next) {
          hopWatchRef.current.set(hop.address, hop);
          known.add(hop.address);
        }

        hopWatches = next;
      }

      // Prune ref to the capped set we actually care about.
      const keep = new Set(
        [...hopWatchRef.current.values()]
          .sort((a, b) => a.hop - b.hop || a.address.localeCompare(b.address))
          .slice(0, MAX_HOP_WATCH_ADDRESSES)
          .map((w) => w.address),
      );
      for (const addr of [...hopWatchRef.current.keys()]) {
        if (!keep.has(addr)) hopWatchRef.current.delete(addr);
      }

      const live: LiveAddress[] = HOLDING_ADDRESSES.map((h, i) => {
        const summary = summaries[i];
        const balanceSats = addressBalanceSats(summary);
        const balanceBtc = satsToBtc(balanceSats);
        const prev = prevBalances.current.get(h.address);
        const changed = prev !== undefined && prev !== balanceSats;
        prevBalances.current.set(h.address, balanceSats);

        if (changed) {
          const existing = flashTimers.current.get(h.address);
          if (existing) window.clearTimeout(existing);
          const t = window.setTimeout(() => {
            setAddresses((curr) =>
              curr.map((a) =>
                a.address === h.address ? { ...a, flash: false } : a,
              ),
            );
            flashTimers.current.delete(h.address);
          }, 1600);
          flashTimers.current.set(h.address, t);
        }

        return {
          ...h,
          balanceBtc,
          balanceSats,
          utxoCount: Math.max(0, utxoEstimate(summary)),
          status: statusFor(balanceBtc, h.reportBtc),
          flash: changed,
        };
      });

      setAddresses(live);
      if (price != null) setUsdPrice(price);
      setMovements(sortMovements(allMovements));
      setLastUpdated(new Date());
      setSource(activeHostName());
      setLoading(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load chain data');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timers = flashTimers.current;
    void refresh();
    const id = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    return () => {
      window.clearInterval(id);
      for (const t of timers.values()) window.clearTimeout(t);
    };
  }, [refresh]);

  const heldBtc = addresses.reduce((s, a) => s + a.balanceBtc, 0);
  // Measured against what reached the holding addresses, so sweep fees
  // are not reported as movement.
  const movedBtc = Math.max(0, CONSOLIDATED_BTC - heldBtc);
  const heldPct =
    CONSOLIDATED_BTC > 0
      ? Math.min(100, (heldBtc / CONSOLIDATED_BTC) * 100)
      : 0;

  const lastMovement =
    movements.find((m) => m.confirmed) ?? movements[0] ?? null;

  return {
    addresses,
    heldBtc,
    movedBtc,
    heldPct,
    usdPrice,
    movements,
    lastMovement,
    lastUpdated,
    source,
    loading,
    error,
    refresh,
  };
}
