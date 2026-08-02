import {
  MEMPOOL_HOSTS,
  REQUEST_TIMEOUT_MS,
  SATS_PER_BTC,
} from '../data/incident';

export type ChainStats = {
  funded_txo_count: number;
  funded_txo_sum: number;
  spent_txo_count: number;
  spent_txo_sum: number;
  tx_count: number;
};

export type AddressResponse = {
  address: string;
  chain_stats: ChainStats;
  mempool_stats: ChainStats;
};

export type TxStatus = {
  confirmed: boolean;
  block_height?: number;
  block_time?: number;
};

export type TxVin = {
  prevout?: {
    scriptpubkey_address?: string;
    value: number;
  };
};

export type TxVout = {
  scriptpubkey_address?: string;
  value: number;
};

export type Tx = {
  txid: string;
  fee: number;
  vin: TxVin[];
  vout: TxVout[];
  status: TxStatus;
};

export type PricesResponse = {
  time: number;
  USD: number;
  EUR?: number;
};

let activeHost: string = MEMPOOL_HOSTS[0];
let hostProbe: Promise<string> | null = null;

export function getActiveHost(): string {
  return activeHost;
}

export function activeHostName(): string {
  return activeHost.replace(/^https?:\/\//, '');
}

async function getWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Picks a reachable host once and reuses it, so a blocked or dead host does
 * not cost every later request a full timeout.
 */
function resolveHost(): Promise<string> {
  if (hostProbe) return hostProbe;

  hostProbe = (async () => {
    let lastError: unknown;

    for (const host of MEMPOOL_HOSTS) {
      try {
        const res = await getWithTimeout(`${host}/api/blocks/tip/height`);
        if (!res.ok) {
          lastError = new Error(`${host} responded ${res.status}`);
          continue;
        }
        activeHost = host;
        return host;
      } catch (err) {
        lastError = err;
      }
    }

    hostProbe = null;
    throw new Error(
      `No Bitcoin explorer reachable. Tried ${MEMPOOL_HOSTS.map((h) =>
        h.replace(/^https?:\/\//, ''),
      ).join(', ')}. Last error: ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  })();

  return hostProbe;
}

async function fetchJson<T>(path: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt++) {
    const host = await resolveHost();
    try {
      const res = await getWithTimeout(`${host}${path}`);
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`${host} responded ${res.status}`);
        // Soft fail: try another mirror instead of poisoning every in-flight call.
        hostProbe = null;
        const idx = MEMPOOL_HOSTS.findIndex((h) => h === host);
        activeHost = MEMPOOL_HOSTS[(idx + 1) % MEMPOOL_HOSTS.length]!;
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`${host} responded ${res.status}`);
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      hostProbe = null;
      await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Request failed for ${path}`);
}

export function addressBalanceSats(addr: AddressResponse): number {
  const chain =
    addr.chain_stats.funded_txo_sum - addr.chain_stats.spent_txo_sum;
  const mem =
    addr.mempool_stats.funded_txo_sum - addr.mempool_stats.spent_txo_sum;
  return chain + mem;
}

export function satsToBtc(sats: number): number {
  return sats / SATS_PER_BTC;
}

export function fetchAddress(address: string): Promise<AddressResponse> {
  return fetchJson(`/api/address/${address}`);
}

export function fetchAddressTxs(address: string): Promise<Tx[]> {
  return fetchJson(`/api/address/${address}/txs`);
}

export function fetchUsdPrice(): Promise<number> {
  return fetchJson<PricesResponse>('/api/v1/prices').then((p) => p.USD);
}

export function explorerAddressUrl(address: string): string {
  return `${activeHost}/address/${address}`;
}

export function explorerTxUrl(txid: string): string {
  return `${activeHost}/tx/${txid}`;
}

/** Outbound spend from a watched address: value leaving that address. */
export function outboundFromAddress(
  tx: Tx,
  address: string,
): {
  amountSats: number;
  destinations: string[];
  recipients: { address: string; valueSats: number }[];
} {
  const spent = tx.vin
    .filter((v) => v.prevout?.scriptpubkey_address === address)
    .reduce((sum, v) => sum + (v.prevout?.value ?? 0), 0);

  if (spent === 0) {
    return { amountSats: 0, destinations: [], recipients: [] };
  }

  const changeBack = tx.vout
    .filter((o) => o.scriptpubkey_address === address)
    .reduce((sum, o) => sum + o.value, 0);

  const byAddr = new Map<string, number>();
  for (const o of tx.vout) {
    const dest = o.scriptpubkey_address;
    if (!dest || dest === address) continue;
    byAddr.set(dest, (byAddr.get(dest) ?? 0) + o.value);
  }

  const recipients = [...byAddr.entries()]
    .map(([addr, valueSats]) => ({ address: addr, valueSats }))
    .sort((a, b) => b.valueSats - a.valueSats);

  return {
    amountSats: Math.max(0, spent - changeBack),
    destinations: recipients.map((r) => r.address),
    recipients,
  };
}
