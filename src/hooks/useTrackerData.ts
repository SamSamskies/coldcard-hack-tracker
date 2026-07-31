import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CONSOLIDATED_BTC,
  HOLDING_ADDRESSES,
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

function buildMovements(
  holdings: readonly HoldingAddress[],
  txLists: Tx[][],
): Movement[] {
  const items: Movement[] = [];

  holdings.forEach((h, i) => {
    for (const tx of txLists[i] ?? []) {
      const { amountSats, destinations } = outboundFromAddress(tx, h.address);
      if (amountSats <= 0) continue;

      const height = tx.status.block_height;
      const isPostWatch =
        !tx.status.confirmed ||
        (height != null && height > WATCH_AFTER_BLOCK);
      if (!isPostWatch) continue;

      items.push({
        txid: tx.txid,
        fromAddress: h.address,
        fromLabel: h.label,
        amountBtc: satsToBtc(amountSats),
        destinations,
        confirmed: tx.status.confirmed,
        blockHeight: tx.status.block_height,
        blockTime: tx.status.block_time,
      });
    }
  });

  items.sort((a, b) => {
    const ta = a.blockTime ?? (a.confirmed ? 0 : Number.MAX_SAFE_INTEGER);
    const tb = b.blockTime ?? (b.confirmed ? 0 : Number.MAX_SAFE_INTEGER);
    if (ta !== tb) return tb - ta;
    return a.txid.localeCompare(b.txid);
  });

  return items;
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

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [summaries, price, ...txLists] = await Promise.all([
        Promise.all(HOLDING_ADDRESSES.map((h) => fetchAddress(h.address))),
        fetchUsdPrice().catch(() => null),
        ...HOLDING_ADDRESSES.map((h) =>
          fetchAddressTxs(h.address).catch(() => [] as Tx[]),
        ),
      ]);

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
      setMovements(buildMovements(HOLDING_ADDRESSES, txLists as Tx[][]));
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
  // Measured against what reached the holding addresses, so the attacker's
  // sweep fees are not reported as movement.
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
