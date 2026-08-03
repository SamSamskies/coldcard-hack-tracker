import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ADDRESS_FETCH_CONCURRENCY,
  CONSOLIDATED_BTC,
  CORE_HOLDING_ADDRESSES,
  HOLDING_ADDRESSES,
  MAX_HOP_DEPTH,
  MAX_HOP_WATCH_ADDRESSES,
  REFRESH_INTERVAL_MS,
  SATS_PER_BTC,
  SNAPSHOT_REFRESH_INTERVAL_MS,
  type HoldingAddress,
} from '../data/incident';
import {
  addressBalanceSats,
  fetchAddress,
  fetchAddressTxs,
  fetchUsdPrice,
  satsToBtc,
  type AddressResponse,
  type Tx,
} from '../lib/mempool';
import { mapPool } from '../lib/pool';
import { fetchSnapshot, type Snapshot } from '../lib/snapshot';
import {
  dedupeMovements,
  discoverNextHops,
  heldStats,
  movementsFromWatch,
  omitKnownExitChurn,
  shouldTrackSeedOutbounds,
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

function reportAsLive(h: HoldingAddress, prev?: LiveAddress): LiveAddress {
  if (prev) return { ...prev, flash: false };
  const balanceSats = Math.round(h.reportBtc * SATS_PER_BTC);
  return {
    ...h,
    balanceBtc: h.reportBtc,
    balanceSats,
    utxoCount: 0,
    status: 'held',
  };
}

function liveFromSats(
  h: HoldingAddress,
  balanceSats: number,
  utxoCount: number,
  prevBalance: number | undefined,
): LiveAddress {
  const balanceBtc = satsToBtc(balanceSats);
  const changed = prevBalance !== undefined && prevBalance !== balanceSats;
  return {
    ...h,
    balanceBtc,
    balanceSats,
    utxoCount,
    status: statusFor(balanceBtc, h.reportBtc),
    flash: changed,
  };
}

export function useTrackerData(): TrackerData {
  const [addresses, setAddresses] = useState<LiveAddress[]>([]);
  const [usdPrice, setUsdPrice] = useState<number | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevBalances = useRef<Map<string, number>>(new Map());
  const flashTimers = useRef<Map<string, number>>(new Map());
  const hopWatchRef = useRef<Map<string, WatchTarget>>(new Map());
  const addressesRef = useRef<LiveAddress[]>([]);
  const snapshotMovementsRef = useRef<Movement[]>([]);
  const liveMovementsRef = useRef<Movement[]>([]);
  const snapshotAtRef = useRef(0);

  const scheduleFlashClear = useCallback((address: string) => {
    const existing = flashTimers.current.get(address);
    if (existing) window.clearTimeout(existing);
    const t = window.setTimeout(() => {
      setAddresses((curr) =>
        curr.map((a) => (a.address === address ? { ...a, flash: false } : a)),
      );
      flashTimers.current.delete(address);
    }, 1600);
    flashTimers.current.set(address, t);
  }, []);

  const publishMovements = useCallback(() => {
    setMovements(
      dedupeMovements(
        omitKnownExitChurn([
          ...snapshotMovementsRef.current,
          ...liveMovementsRef.current,
        ]),
      ),
    );
  }, []);

  /** Apply snapshot to Wave 3 rows; optionally seed core if we have no live data yet. */
  const applySnapshot = useCallback(
    (snapshot: Snapshot, opts: { seedCore: boolean }) => {
      const prevByAddr = new Map(
        addressesRef.current.map((a) => [a.address, a]),
      );
      const snapByAddr = new Map(
        snapshot.addresses.map((a) => [a.address, a]),
      );
      const hasLiveCore = addressesRef.current.some(
        (a) => a.clusterId !== 'galaxy-wave3',
      );

      const live = HOLDING_ADDRESSES.map((h) => {
        const isWave3 = h.clusterId === 'galaxy-wave3';
        const shouldSeed =
          isWave3 || (opts.seedCore && !hasLiveCore) || !prevByAddr.has(h.address);

        if (!shouldSeed && !isWave3) {
          return reportAsLive(h, prevByAddr.get(h.address));
        }

        const row = snapByAddr.get(h.address);
        if (!row) return reportAsLive(h, prevByAddr.get(h.address));

        const prev = prevBalances.current.get(h.address);
        prevBalances.current.set(h.address, row.balanceSats);
        const next = liveFromSats(h, row.balanceSats, row.utxoCount, prev);
        if (next.flash) scheduleFlashClear(h.address);
        return next;
      });

      addressesRef.current = live;
      snapshotMovementsRef.current = snapshot.movements;
      snapshotAtRef.current = Date.parse(snapshot.updatedAt) || Date.now();
      setAddresses(live);
      if (snapshot.usdPrice != null) setUsdPrice(snapshot.usdPrice);
      publishMovements();
    },
    [publishMovements, scheduleFlashClear],
  );

  const refreshSnapshot = useCallback(async () => {
    const snapshot = await fetchSnapshot();
    if (!snapshot) return false;
    const t = Date.parse(snapshot.updatedAt) || 0;
    const seedCore = addressesRef.current.length === 0;
    if (!seedCore && t && t <= snapshotAtRef.current) return true;
    applySnapshot(snapshot, { seedCore });
    return true;
  }, [applySnapshot]);

  const refreshLive = useCallback(async () => {
    const prevByAddr = new Map(
      addressesRef.current.map((a) => [a.address, a]),
    );

    const [summaryResults, price] = await Promise.all([
      mapPool(CORE_HOLDING_ADDRESSES, ADDRESS_FETCH_CONCURRENCY, async (h) => {
        try {
          return await fetchAddress(h.address);
        } catch {
          return null;
        }
      }),
      fetchUsdPrice().catch(() => null),
    ]);

    const summaryByAddr = new Map<string, AddressResponse>();
    CORE_HOLDING_ADDRESSES.forEach((h, i) => {
      const summary = summaryResults[i];
      if (summary) summaryByAddr.set(h.address, summary);
    });

    const coreOk = CORE_HOLDING_ADDRESSES.some((h) =>
      summaryByAddr.has(h.address),
    );
    if (!coreOk) {
      throw new Error(
        'Could not load core holding balances from any explorer',
      );
    }

    const live: LiveAddress[] = HOLDING_ADDRESSES.map((h) => {
      if (h.clusterId === 'galaxy-wave3') {
        return reportAsLive(h, prevByAddr.get(h.address));
      }

      const summary = summaryByAddr.get(h.address);
      if (!summary) {
        return reportAsLive(h, prevByAddr.get(h.address));
      }

      const balanceSats = addressBalanceSats(summary);
      const prev = prevBalances.current.get(h.address);
      const row = liveFromSats(
        h,
        balanceSats,
        Math.max(0, utxoEstimate(summary)),
        prev,
      );
      prevBalances.current.set(h.address, balanceSats);
      if (row.flash) scheduleFlashClear(h.address);
      return row;
    });

    const activeSeeds: WatchTarget[] = [];
    const activeAddrs: string[] = [];
    for (const h of CORE_HOLDING_ADDRESSES) {
      const summary = summaryByAddr.get(h.address);
      if (!summary) continue;
      const balanceBtc = satsToBtc(addressBalanceSats(summary));
      if (!shouldTrackSeedOutbounds(balanceBtc, h.reportBtc)) continue;
      activeSeeds.push({
        address: h.address,
        label: h.label,
        hop: 0,
        reportBtc: h.reportBtc,
      });
      activeAddrs.push(h.address);
    }

    const activeSeedTxLists = await mapPool(
      activeAddrs,
      ADDRESS_FETCH_CONCURRENCY,
      (addr) => fetchAddressTxs(addr).catch(() => [] as Tx[]),
    );

    const known = new Set(HOLDING_ADDRESSES.map((h) => h.address));
    const allMovements = movementsFromWatch(activeSeeds, activeSeedTxLists);

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

    for (let round = 0; round < MAX_HOP_DEPTH && hopWatches.length > 0; round++) {
      const hopTxLists = await mapPool(
        hopWatches,
        ADDRESS_FETCH_CONCURRENCY,
        (w) => fetchAddressTxs(w.address).catch(() => [] as Tx[]),
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

    const keep = new Set(
      [...hopWatchRef.current.values()]
        .sort((a, b) => a.hop - b.hop || a.address.localeCompare(b.address))
        .slice(0, MAX_HOP_WATCH_ADDRESSES)
        .map((w) => w.address),
    );
    for (const addr of [...hopWatchRef.current.keys()]) {
      if (!keep.has(addr)) hopWatchRef.current.delete(addr);
    }

    addressesRef.current = live;
    liveMovementsRef.current = allMovements;
    setAddresses(live);
    if (price != null) setUsdPrice(price);
    publishMovements();
  }, [publishMovements, scheduleFlashClear]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const hadSnapshot = await refreshSnapshot();
      if (hadSnapshot) setLoading(false);

      await refreshLive();
      setLoading(false);
    } catch (e) {
      if (addressesRef.current.length === 0) {
        setError(e instanceof Error ? e.message : 'Failed to load chain data');
      }
      setLoading(false);
    }
  }, [refreshLive, refreshSnapshot]);

  useEffect(() => {
    const timers = flashTimers.current;
    void refresh();
    const liveId = window.setInterval(
      () => {
        void refreshLive().catch(() => {
          /* keep last good core data */
        });
      },
      REFRESH_INTERVAL_MS,
    );
    const snapId = window.setInterval(() => {
      void refreshSnapshot();
    }, SNAPSHOT_REFRESH_INTERVAL_MS);
    return () => {
      window.clearInterval(liveId);
      window.clearInterval(snapId);
      for (const t of timers.values()) window.clearTimeout(t);
    };
  }, [refresh, refreshLive, refreshSnapshot]);

  const heldBtc = addresses.reduce((s, a) => s + a.balanceBtc, 0);
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
    loading,
    error,
    refresh,
  };
}
