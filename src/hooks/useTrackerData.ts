import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CONSOLIDATED_BTC,
  HOLDING_ADDRESSES,
  MAX_HOP_DEPTH,
  MAX_HOP_WATCH_ADDRESSES,
  REFRESH_INTERVAL_MS,
  type HoldingAddress,
} from '../data/incident';
import {
  activeHostName,
  addressBalanceSats,
  fetchAddress,
  fetchAddressTxs,
  fetchUsdPrice,
  satsToBtc,
  type AddressResponse,
  type Tx,
} from '../lib/mempool';
import {
  discoverNextHops,
  heldStats,
  movementsFromWatch,
  shouldTrackSeedOutbounds,
  sortMovements,
  statusFor,
  type AddressStatus,
  type Movement,
  type WatchTarget,
} from '../lib/tracker';

export type { AddressStatus, Movement };

export type LiveAddress = HoldingAddress & {
  balanceBtc: number;
  balanceSats: number;
  utxoCount: number;
  status: AddressStatus;
  flash?: boolean;
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

function utxoEstimate(addr: AddressResponse): number {
  return (
    addr.chain_stats.funded_txo_count -
    addr.chain_stats.spent_txo_count +
    (addr.mempool_stats.funded_txo_count - addr.mempool_stats.spent_txo_count)
  );
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

      // Ignore outbounds from vaults that still hold their reportBtc. Those are
      // later surplus / unrelated churn, not the reported stolen stack moving.
      const reportTouched = new Set(
        HOLDING_ADDRESSES.filter((h, i) => {
          const balanceBtc = satsToBtc(addressBalanceSats(summaries[i]));
          return shouldTrackSeedOutbounds(balanceBtc, h.reportBtc);
        }).map((h) => h.address),
      );

      const activeSeeds: WatchTarget[] = [];
      const activeSeedTxLists: Tx[][] = [];
      seedWatches.forEach((w, i) => {
        if (!reportTouched.has(w.address)) return;
        activeSeeds.push(w);
        activeSeedTxLists.push((seedTxLists as Tx[][])[i] ?? []);
      });

      const known = new Set(seedWatches.map((w) => w.address));
      const allMovements = movementsFromWatch(activeSeeds, activeSeedTxLists);

      // Only follow hops from report-impacting spends (rebuild each poll).
      hopWatchRef.current.clear();
      const freshHops = discoverNextHops(
        activeSeeds,
        activeSeedTxLists,
        known,
        MAX_HOP_WATCH_ADDRESSES,
      );
      for (const hop of freshHops) {
        hopWatchRef.current.set(hop.address, hop);
        known.add(hop.address);
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
  // are not reported as movement. Surplus that arrives and leaves while the
  // report balance remains is ignored in the movement feed as well.
  const { movedBtc, heldPct } = heldStats(heldBtc, CONSOLIDATED_BTC);

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
