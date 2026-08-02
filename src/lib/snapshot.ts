import type { Movement } from './tracker';

export type SnapshotAddress = {
  address: string;
  balanceSats: number;
  utxoCount: number;
};

export type Snapshot = {
  version: number;
  updatedAt: string;
  source: string;
  usdPrice: number | null;
  addresses: SnapshotAddress[];
  movements: Movement[];
};

export function parseSnapshot(data: unknown): Snapshot | null {
  if (!data || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  if (typeof o.updatedAt !== 'string') return null;
  if (typeof o.source !== 'string') return null;
  if (!Array.isArray(o.addresses)) return null;

  const addresses: SnapshotAddress[] = [];
  for (const row of o.addresses) {
    if (!row || typeof row !== 'object') continue;
    const r = row as Record<string, unknown>;
    if (typeof r.address !== 'string') continue;
    if (typeof r.balanceSats !== 'number') continue;
    addresses.push({
      address: r.address,
      balanceSats: r.balanceSats,
      utxoCount: typeof r.utxoCount === 'number' ? r.utxoCount : 0,
    });
  }
  if (addresses.length === 0) return null;

  const movements: Movement[] = [];
  if (Array.isArray(o.movements)) {
    for (const row of o.movements) {
      if (!row || typeof row !== 'object') continue;
      const r = row as Record<string, unknown>;
      if (typeof r.txid !== 'string') continue;
      if (typeof r.fromAddress !== 'string') continue;
      if (typeof r.fromLabel !== 'string') continue;
      if (typeof r.amountBtc !== 'number') continue;
      if (!Array.isArray(r.destinations)) continue;
      movements.push({
        txid: r.txid,
        fromAddress: r.fromAddress,
        fromLabel: r.fromLabel,
        amountBtc: r.amountBtc,
        destinations: r.destinations.filter(
          (d): d is string => typeof d === 'string',
        ),
        hop: typeof r.hop === 'number' ? r.hop : 0,
        confirmed: Boolean(r.confirmed),
        blockHeight:
          typeof r.blockHeight === 'number' ? r.blockHeight : undefined,
        blockTime: typeof r.blockTime === 'number' ? r.blockTime : undefined,
      });
    }
  }

  return {
    version: typeof o.version === 'number' ? o.version : 1,
    updatedAt: o.updatedAt,
    source: o.source,
    usdPrice: typeof o.usdPrice === 'number' ? o.usdPrice : null,
    addresses,
    movements,
  };
}

/** Same-origin cron snapshot served from /snapshot.json. */
export async function fetchSnapshot(): Promise<Snapshot | null> {
  try {
    const res = await fetch('/snapshot.json', { cache: 'no-store' });
    if (!res.ok) return null;
    return parseSnapshot(await res.json());
  } catch {
    return null;
  }
}
