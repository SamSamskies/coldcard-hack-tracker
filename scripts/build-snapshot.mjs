#!/usr/bin/env node
/**
 * Fetch holding balances (and txs for vaults that look moved) and write
 * public/snapshot.json for the static dashboard to load without browser polling.
 *
 * Usage: node scripts/build-snapshot.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'snapshot.json');
const SATS_PER_BTC = 100_000_000;
const CONCURRENCY = 3;
const TIMEOUT_MS = 12_000;
const WATCH_AFTER_BLOCK = 960_400;
const MAX_DESTINATIONS_PER_SPEND = 3;
const MIN_HOP_FOLLOW_SATS = 1_000_000;
const MAX_HOP_DEPTH = 2;
const MAX_HOP_WATCH_ADDRESSES = 16;

const HOSTS = [
  'https://mempool.space',
  'https://mempool.emzy.de',
  'https://mempool.bitaroo.net',
];

function extractAddresses(filePath) {
  const text = readFileSync(filePath, 'utf8');
  return [...text.matchAll(/address:\s*'(bc1[a-z0-9]+)'/g)].map((m) => m[1]);
}

function extractHoldings() {
  const coreFile = join(ROOT, 'src/data/incident.ts');
  const wave3File = join(ROOT, 'src/data/wave3Vaults.ts');
  const coreText = readFileSync(coreFile, 'utf8');
  // Only the CORE_HOLDING_ADDRESSES block — not SOURCE urls etc.
  const coreBlock = coreText.match(
    /const CORE_HOLDING_ADDRESSES[\s\S]*?= \[([\s\S]*?)\];/,
  );
  if (!coreBlock) throw new Error('Could not find CORE_HOLDING_ADDRESSES');

  const core = [];
  const entryRe =
    /\{\s*address:\s*'(bc1[a-z0-9]+)',\s*label:\s*'([^']+)',\s*reportBtc:\s*([0-9.]+)/g;
  let m;
  while ((m = entryRe.exec(coreBlock[1]))) {
    core.push({
      address: m[1],
      label: m[2],
      reportBtc: Number(m[3]),
    });
  }

  const wave3Text = readFileSync(wave3File, 'utf8');
  const wave3 = [];
  const wRe =
    /\{\s*address:\s*'(bc1[a-z0-9]+)',\s*label:\s*'([^']+)',\s*reportBtc:\s*([0-9.]+)/g;
  while ((m = wRe.exec(wave3Text))) {
    wave3.push({
      address: m[1],
      label: m[2],
      reportBtc: Number(m[3]),
    });
  }

  const holdings = [...core, ...wave3];
  if (holdings.length === 0) throw new Error('No holdings parsed');
  // Sanity: wave3Vaults addresses should all appear
  const fromWave3File = new Set(extractAddresses(wave3File));
  for (const a of fromWave3File) {
    if (!holdings.some((h) => h.address === a)) {
      throw new Error(`Missing wave3 address ${a}`);
    }
  }
  return holdings;
}

let activeHost = HOSTS[0];

async function getJson(path) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    const host = activeHost;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${host}${path}`, { signal: controller.signal });
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`${host} ${res.status}`);
        const idx = HOSTS.indexOf(host);
        activeHost = HOSTS[(idx + 1) % HOSTS.length];
        await sleep(300 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`${host} ${res.status}`);
      return await res.json();
    } catch (err) {
      lastError = err;
      const idx = HOSTS.indexOf(host);
      activeHost = HOSTS[(idx + 1) % HOSTS.length];
      await sleep(200 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length || 1) }, () =>
      worker(),
    ),
  );
  return results;
}

function balanceSats(addr) {
  const chain =
    addr.chain_stats.funded_txo_sum - addr.chain_stats.spent_txo_sum;
  const mem =
    addr.mempool_stats.funded_txo_sum - addr.mempool_stats.spent_txo_sum;
  return chain + mem;
}

function utxoEstimate(addr) {
  return (
    addr.chain_stats.funded_txo_count -
    addr.chain_stats.spent_txo_count +
    (addr.mempool_stats.funded_txo_count - addr.mempool_stats.spent_txo_count)
  );
}

function statusFor(balanceBtc, reportBtc) {
  if (balanceBtc <= 1e-8) return 'emptied';
  if (balanceBtc < reportBtc * 0.99) return 'partial';
  return 'held';
}

function outboundFromAddress(tx, address) {
  const spent = tx.vin
    .filter((v) => v.prevout?.scriptpubkey_address === address)
    .reduce((sum, v) => sum + (v.prevout?.value ?? 0), 0);
  if (spent === 0) {
    return { amountSats: 0, destinations: [] };
  }
  const changeBack = tx.vout
    .filter((o) => o.scriptpubkey_address === address)
    .reduce((sum, o) => sum + o.value, 0);
  const byAddr = new Map();
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
  };
}

function isPostWatch(tx) {
  const height = tx.status.block_height;
  return !tx.status.confirmed || (height != null && height > WATCH_AFTER_BLOCK);
}

function movementsFromWatch(watches, txLists) {
  const items = [];
  watches.forEach((w, i) => {
    for (const tx of txLists[i] ?? []) {
      const { amountSats, destinations } = outboundFromAddress(tx, w.address);
      if (amountSats <= 0 || !isPostWatch(tx)) continue;
      items.push({
        txid: tx.txid,
        fromAddress: w.address,
        fromLabel: w.label,
        amountBtc: amountSats / SATS_PER_BTC,
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

function discoverNextHops(watches, txLists, known, slotsLeft) {
  if (slotsLeft <= 0) return [];
  const scored = [];
  watches.forEach((w, i) => {
    if (w.hop >= MAX_HOP_DEPTH) return;
    for (const tx of txLists[i] ?? []) {
      if (!isPostWatch(tx)) continue;
      const spent = tx.vin
        .filter((v) => v.prevout?.scriptpubkey_address === w.address)
        .reduce((sum, v) => sum + (v.prevout?.value ?? 0), 0);
      if (spent === 0) continue;
      const recipients = [];
      const byAddr = new Map();
      for (const o of tx.vout) {
        const dest = o.scriptpubkey_address;
        if (!dest || dest === w.address) continue;
        byAddr.set(dest, (byAddr.get(dest) ?? 0) + o.value);
      }
      for (const [addr, valueSats] of byAddr) {
        if (valueSats < MIN_HOP_FOLLOW_SATS) continue;
        if (known.has(addr)) continue;
        recipients.push({ address: addr, valueSats });
      }
      recipients.sort((a, b) => b.valueSats - a.valueSats);
      for (const r of recipients.slice(0, MAX_DESTINATIONS_PER_SPEND)) {
        scored.push({
          address: r.address,
          label: `Hop ${w.hop + 1} from ${w.label}`,
          hop: w.hop + 1,
          valueSats: r.valueSats,
        });
      }
    }
  });
  scored.sort((a, b) => b.valueSats - a.valueSats);
  const out = [];
  for (const s of scored) {
    if (out.length >= slotsLeft) break;
    if (known.has(s.address) || out.some((x) => x.address === s.address)) {
      continue;
    }
    out.push({ address: s.address, label: s.label, hop: s.hop });
  }
  return out;
}

function sortMovements(items) {
  return [...items].sort((a, b) => {
    const ta = a.blockTime ?? (a.confirmed ? 0 : Number.MAX_SAFE_INTEGER);
    const tb = b.blockTime ?? (b.confirmed ? 0 : Number.MAX_SAFE_INTEGER);
    if (ta !== tb) return tb - ta;
    return a.txid.localeCompare(b.txid);
  });
}

async function main() {
  const holdings = extractHoldings();
  console.log(`Fetching ${holdings.length} holdings…`);

  const summaries = await mapPool(holdings, CONCURRENCY, async (h) => {
    try {
      const addr = await getJson(`/api/address/${h.address}`);
      return { h, addr };
    } catch (err) {
      console.warn(`fail ${h.address}: ${err.message ?? err}`);
      return { h, addr: null };
    }
  });

  let usdPrice = null;
  try {
    const prices = await getJson('/api/v1/prices');
    usdPrice = prices.USD ?? null;
  } catch {
    console.warn('price fetch failed');
  }

  const addresses = [];
  const activeSeeds = [];
  for (const { h, addr } of summaries) {
    if (!addr) {
      addresses.push({
        address: h.address,
        balanceSats: Math.round(h.reportBtc * SATS_PER_BTC),
        utxoCount: 0,
        ok: false,
      });
      continue;
    }
    const sats = balanceSats(addr);
    const balanceBtc = sats / SATS_PER_BTC;
    addresses.push({
      address: h.address,
      balanceSats: sats,
      utxoCount: Math.max(0, utxoEstimate(addr)),
      ok: true,
    });
    if (statusFor(balanceBtc, h.reportBtc) !== 'held') {
      activeSeeds.push({ address: h.address, label: h.label, hop: 0 });
    }
  }

  const allMovements = [];
  const known = new Set(holdings.map((h) => h.address));
  const hopWatch = new Map();

  if (activeSeeds.length > 0) {
    console.log(`Fetching txs for ${activeSeeds.length} moved seeds…`);
    const seedTxLists = await mapPool(activeSeeds, CONCURRENCY, async (w) => {
      try {
        return await getJson(`/api/address/${w.address}/txs`);
      } catch {
        return [];
      }
    });
    allMovements.push(...movementsFromWatch(activeSeeds, seedTxLists));

    const fresh = discoverNextHops(
      activeSeeds,
      seedTxLists,
      known,
      MAX_HOP_WATCH_ADDRESSES,
    );
    for (const hop of fresh) {
      hopWatch.set(hop.address, hop);
      known.add(hop.address);
    }

    let hopWatches = [...hopWatch.values()]
      .filter((w) => w.hop >= 1 && w.hop <= MAX_HOP_DEPTH)
      .sort((a, b) => a.hop - b.hop || a.address.localeCompare(b.address))
      .slice(0, MAX_HOP_WATCH_ADDRESSES);

    for (let round = 0; round < MAX_HOP_DEPTH && hopWatches.length > 0; round++) {
      const hopTxLists = await mapPool(hopWatches, CONCURRENCY, async (w) => {
        try {
          return await getJson(`/api/address/${w.address}/txs`);
        } catch {
          return [];
        }
      });
      allMovements.push(...movementsFromWatch(hopWatches, hopTxLists));
      const slotsLeft = MAX_HOP_WATCH_ADDRESSES - hopWatch.size;
      const next = discoverNextHops(hopWatches, hopTxLists, known, slotsLeft);
      if (next.length === 0) break;
      for (const hop of next) {
        hopWatch.set(hop.address, hop);
        known.add(hop.address);
      }
      hopWatches = next;
    }
  }

  const okCount = addresses.filter((a) => a.ok).length;
  if (okCount === 0) {
    throw new Error('No address balances fetched');
  }

  const snapshot = {
    version: 1,
    updatedAt: new Date().toISOString(),
    source: activeHost.replace(/^https?:\/\//, ''),
    usdPrice,
    addresses: addresses.map(({ address, balanceSats, utxoCount }) => ({
      address,
      balanceSats,
      utxoCount,
    })),
    movements: sortMovements(allMovements),
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(
    `Wrote ${OUT} (${okCount}/${holdings.length} ok, ${snapshot.movements.length} movements, source=${snapshot.source})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
