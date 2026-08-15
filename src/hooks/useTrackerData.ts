import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CONSOLIDATED_BTC,
  HOLDING_ADDRESSES,
  SATS_PER_BTC,
  SNAPSHOT_REFRESH_INTERVAL_MS,
  type HoldingAddress,
} from '../data/incident';
import { satsToBtc } from '../lib/mempool';
import { fetchSnapshot, type Snapshot } from '../lib/snapshot';
import {
  dedupeMovements,
  heldStats,
  omitHighFanoutMovements,
  omitKnownExitChurn,
  omitPostKnownExitPassThroughMovements,
  statusFor,
  type AddressStatus,
  type Movement,
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
  snapshotUpdatedAt: string | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

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

/**
 * Quiet-period tracker: balances and the movement feed come only from
 * `/snapshot.json` (GitHub Actions ~6h). No live Esplora from the browser.
 * Re-reads the snapshot on load, on tab focus, and on an interval while the
 * tab is visible.
 */
export function useTrackerData(): TrackerData {
  const [addresses, setAddresses] = useState<LiveAddress[]>([]);
  const [usdPrice, setUsdPrice] = useState<number | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [snapshotUpdatedAt, setSnapshotUpdatedAt] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevBalances = useRef<Map<string, number>>(new Map());
  const flashTimers = useRef<Map<string, number>>(new Map());
  const addressesRef = useRef<LiveAddress[]>([]);
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

  const applySnapshot = useCallback(
    (snapshot: Snapshot) => {
      const prevByAddr = new Map(
        addressesRef.current.map((a) => [a.address, a]),
      );
      const snapByAddr = new Map(
        snapshot.addresses.map((a) => [a.address, a]),
      );

      const live = HOLDING_ADDRESSES.map((h) => {
        const row = snapByAddr.get(h.address);
        if (!row) return reportAsLive(h, prevByAddr.get(h.address));

        const prev = prevBalances.current.get(h.address);
        prevBalances.current.set(h.address, row.balanceSats);
        const next = liveFromSats(h, row.balanceSats, row.utxoCount, prev);
        if (next.flash) scheduleFlashClear(h.address);
        return next;
      });

      addressesRef.current = live;
      snapshotAtRef.current = Date.parse(snapshot.updatedAt) || Date.now();
      setAddresses(live);
      setSnapshotUpdatedAt(snapshot.updatedAt);
      if (snapshot.usdPrice != null) setUsdPrice(snapshot.usdPrice);
      setMovements(
        dedupeMovements(
          omitPostKnownExitPassThroughMovements(
            omitHighFanoutMovements(omitKnownExitChurn(snapshot.movements)),
          ),
        ),
      );
    },
    [scheduleFlashClear],
  );

  const refreshSnapshot = useCallback(async () => {
    const snapshot = await fetchSnapshot();
    if (!snapshot) return false;
    const t = Date.parse(snapshot.updatedAt) || 0;
    const firstLoad = addressesRef.current.length === 0;
    if (!firstLoad && t && t <= snapshotAtRef.current) return true;
    applySnapshot(snapshot);
    return true;
  }, [applySnapshot]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const ok = await refreshSnapshot();
      if (!ok && addressesRef.current.length === 0) {
        setError('Could not load snapshot.json');
      }
      setLoading(false);
    } catch (e) {
      if (addressesRef.current.length === 0) {
        setError(e instanceof Error ? e.message : 'Failed to load snapshot');
      }
      setLoading(false);
    }
  }, [refreshSnapshot]);

  useEffect(() => {
    const timers = flashTimers.current;
    void refresh();
    return () => {
      for (const t of timers.values()) window.clearTimeout(t);
    };
  }, [refresh]);

  useEffect(() => {
    let snapId: number | undefined;

    const clearTimer = () => {
      if (snapId != null) window.clearInterval(snapId);
      snapId = undefined;
    };

    const startTimer = () => {
      if (snapId != null) return;
      snapId = window.setInterval(() => {
        void refreshSnapshot();
      }, SNAPSHOT_REFRESH_INTERVAL_MS);
    };

    const syncPolling = () => {
      if (!document.hidden) startTimer();
      else clearTimer();
    };

    const onVisibility = () => {
      if (!document.hidden) void refreshSnapshot();
      syncPolling();
    };

    syncPolling();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimer();
    };
  }, [refreshSnapshot]);

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
    snapshotUpdatedAt,
    loading,
    error,
    refresh,
  };
}
