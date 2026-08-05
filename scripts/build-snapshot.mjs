#!/usr/bin/env node
/**
 * Fetch holding balances (and txs for vaults that look moved) and write
 * public/snapshot.json for the static dashboard to load without browser polling.
 *
 * Usage: node scripts/build-snapshot.mjs
 *
 * Fetch strategy:
 *  - One paced worker per Esplora host (no shared stampede)
 *  - First pass all addresses, then mop-up only failures
 *  - On hard failure, keep prior snapshot balance when available
 *
 * Intentionally Esplora-only: do not use BLOCKCHAIR_API_KEY here (limited
 * research quota; tip scout / scripts/blockchair-balances.py are opt-in).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT = join(ROOT, 'public', 'snapshot.json');
const SATS_PER_BTC = 100_000_000;
const TIMEOUT_MS = 12_000;
const PROBE_TIMEOUT_MS = 4_000;
const MIN_INTERVAL_MS = 400;
const MAX_ATTEMPTS = 4;
const MOP_UP_ROUNDS = 2;
const WATCH_AFTER_BLOCK = 960_400;
const MAX_DESTINATIONS_PER_SPEND = 3;
const MIN_HOP_FOLLOW_SATS = 1_000_000;
const MAX_HOP_DEPTH = 2;
const MAX_HOP_WATCH_ADDRESSES = 16;

/** Prefer mirrors that currently answer from this network; probe filters dead ones. */
const HOSTS = [
  'https://mempool.bitaroo.net',
  'https://mempool.space',
  'https://mempool.emzy.de',
];

/** Bech32 (bc1…) or base58 legacy/P2SH (1…/3…) holding addresses. */
const BTC_ADDR_RE = String.raw`(?:bc1[a-z0-9]+|[13][a-km-zA-HJ-NP-Z1-9]{25,34})`;

function extractKnownExitAddresses() {
  const text = readFileSync(join(ROOT, 'src/data/incident.ts'), 'utf8');
  const block = text.match(
    /KNOWN_ADDRESS_LABELS[\s\S]*?= \{([\s\S]*?)\n\};/,
  );
  if (!block) throw new Error('Could not find KNOWN_ADDRESS_LABELS');
  const addrs = new Set();
  const re = new RegExp(
    String.raw`(?:'(${BTC_ADDR_RE})'|(${BTC_ADDR_RE}))\s*:`,
    'g',
  );
  let m;
  while ((m = re.exec(block[1]))) {
    addrs.add(m[1] || m[2]);
  }
  return addrs;
}

const KNOWN_EXIT_ADDRESSES = extractKnownExitAddresses();

function isKnownExitAddress(address) {
  return KNOWN_EXIT_ADDRESSES.has(address);
}

function extractAddresses(filePath) {
  const text = readFileSync(filePath, 'utf8');
  return [
    ...text.matchAll(new RegExp(String.raw`address:\s*'(${BTC_ADDR_RE})'`, 'g')),
  ].map((m) => m[1]);
}

/** Numeric fields from `export const P2TR_WAVE = { … }` for reportBtc refs. */
function extractP2trWaveBtc(coreText) {
  const block = coreText.match(/export const P2TR_WAVE = \{([\s\S]*?)\n\} as const;/);
  if (!block) throw new Error('Could not find P2TR_WAVE');
  const vals = {};
  const re = /(\w+Btc):\s*([0-9.]+)/g;
  let m;
  while ((m = re.exec(block[1]))) {
    vals[m[1]] = Number(m[2]);
  }
  for (const key of ['smallVaultBtc', 'hopVaultBtc', 'laterVaultBtc']) {
    if (!Number.isFinite(vals[key])) {
      throw new Error(`P2TR_WAVE.${key} missing or not numeric`);
    }
  }
  return vals;
}

function resolveReportBtc(raw, p2trBtc) {
  if (/^[0-9.]+$/.test(raw)) return Number(raw);
  const ref = raw.match(/^P2TR_WAVE\.(\w+)$/);
  if (ref && Number.isFinite(p2trBtc[ref[1]])) return p2trBtc[ref[1]];
  throw new Error(`Unhandled reportBtc expression: ${raw}`);
}

function extractHoldings() {
  const coreFile = join(ROOT, 'src/data/incident.ts');
  const wave3File = join(ROOT, 'src/data/wave3Vaults.ts');
  const coreText = readFileSync(coreFile, 'utf8');
  const p2trBtc = extractP2trWaveBtc(coreText);
  // Only the CORE_HOLDING_ADDRESSES block — not SOURCE urls etc.
  const coreBlock = coreText.match(
    /const CORE_HOLDING_ADDRESSES[\s\S]*?= \[([\s\S]*?)\];/,
  );
  if (!coreBlock) throw new Error('Could not find CORE_HOLDING_ADDRESSES');

  const core = [];
  const entryRe = new RegExp(
    String.raw`\{\s*address:\s*'(${BTC_ADDR_RE})',\s*label:\s*'([^']+)',\s*reportBtc:\s*([0-9.]+|P2TR_WAVE\.\w+)`,
    'g',
  );
  let m;
  while ((m = entryRe.exec(coreBlock[1]))) {
    // Object body until the next top-level `},` — enough to see pollBalance.
    const objBody = coreBlock[1].slice(m.index).split(/\n\s*\},/)[0] ?? '';
    core.push({
      address: m[1],
      label: m[2],
      reportBtc: resolveReportBtc(m[3], p2trBtc),
      pollBalance: !/\bpollBalance:\s*false\b/.test(objBody),
    });
  }

  const wave3Text = readFileSync(wave3File, 'utf8');
  const wave3 = [];
  const wRe = new RegExp(
    String.raw`\{\s*address:\s*'(${BTC_ADDR_RE})',\s*label:\s*'([^']+)',\s*reportBtc:\s*([0-9.]+)`,
    'g',
  );
  while ((m = wRe.exec(wave3Text))) {
    wave3.push({
      address: m[1],
      label: m[2],
      reportBtc: Number(m[3]),
      pollBalance: true,
    });
  }

  const holdings = [...core, ...wave3];
  if (holdings.length === 0) throw new Error('No holdings parsed');

  // Sanity: every `address:` in the CORE block and wave3Vaults must parse.
  const coreAddrs = [
    ...coreBlock[1].matchAll(
      new RegExp(String.raw`address:\s*'(${BTC_ADDR_RE})'`, 'g'),
    ),
  ].map((x) => x[1]);
  for (const a of coreAddrs) {
    if (!holdings.some((h) => h.address === a)) {
      throw new Error(`Missing core holding ${a}`);
    }
  }
  for (const a of extractAddresses(wave3File)) {
    if (!holdings.some((h) => h.address === a)) {
      throw new Error(`Missing wave3 address ${a}`);
    }
  }
  return holdings;
}

function loadPriorSnapshot() {
  if (!existsSync(OUT)) return { balances: new Map(), movements: [] };
  try {
    const prev = JSON.parse(readFileSync(OUT, 'utf8'));
    const balances = new Map();
    for (const a of prev.addresses ?? []) {
      if (a?.address != null && a.balanceSats != null) {
        balances.set(a.address, {
          balanceSats: a.balanceSats,
          utxoCount: a.utxoCount ?? 0,
        });
      }
    }
    const movements = Array.isArray(prev.movements) ? prev.movements : [];
    return { balances, movements };
  } catch {
    return { balances: new Map(), movements: [] };
  }
}

function movementDedupeKey(m) {
  return `${m.txid}:${m.fromAddress}`;
}

function dedupeMovements(items) {
  const byKey = new Map();
  for (const m of items) {
    byKey.set(movementDedupeKey(m), m);
  }
  return sortMovements([...byKey.values()]);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function probeHost(host) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(`${host}/api/blocks/tip/height`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'coldcard-hack-snapshot/2.1' },
    });
    if (!res.ok) return false;
    const text = (await res.text()).trim();
    return /^\d+$/.test(text);
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Drop hosts that don't answer a tip-height probe (avoids striping into dead mirrors). */
async function selectLiveHosts(hosts) {
  const results = await Promise.all(
    hosts.map(async (host) => ({ host, ok: await probeHost(host) })),
  );
  for (const r of results) {
    console.log(`  probe ${r.host.replace(/^https?:\/\//, '')}: ${r.ok ? 'ok' : 'DOWN'}`);
  }
  const live = results.filter((r) => r.ok).map((r) => r.host);
  if (live.length === 0) {
    throw new Error('No Esplora hosts responded to tip-height probe');
  }
  return live;
}

/** One paced client per host — workers never share a single stampeding host. */
class HostClient {
  constructor(host) {
    this.host = host;
    this.cooldownUntil = 0;
    this.chain = Promise.resolve();
    this.ok = 0;
    this.fail = 0;
    this.consecutiveFails = 0;
  }

  get available() {
    return Date.now() >= this.cooldownUntil;
  }

  /** Serialize requests on this host and pace them. */
  getJson(path) {
    const run = async () => {
      const waitCd = this.cooldownUntil - Date.now();
      if (waitCd > 0) await sleep(waitCd);
      await sleep(MIN_INTERVAL_MS);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch(`${this.host}${path}`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'coldcard-hack-snapshot/2.1' },
        });
        if (res.status === 429 || res.status >= 500) {
          const backoff = res.status === 429 ? 8_000 : 2_000;
          this.cooldownUntil = Date.now() + backoff;
          this.fail++;
          this.consecutiveFails++;
          throw new Error(`${this.host} ${res.status}`);
        }
        if (!res.ok) {
          this.fail++;
          this.consecutiveFails++;
          throw new Error(`${this.host} ${res.status}`);
        }
        this.ok++;
        this.consecutiveFails = 0;
        return await res.json();
      } catch (err) {
        // HTTP status errors already counted above; count transport failures here
        const httpErr =
          err instanceof Error && /\s\d{3}$/.test(err.message);
        if (!httpErr) {
          this.fail++;
          this.consecutiveFails++;
          if (this.consecutiveFails >= 3) {
            this.cooldownUntil = Date.now() + 5_000;
          }
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    };

    const next = this.chain.then(run, run);
    // Keep chain alive even if this request fails
    this.chain = next.catch(() => {});
    return next;
  }
}

class HostPool {
  constructor(hosts) {
    this.clients = hosts.map((h) => new HostClient(h));
    this.rr = 0;
    this.lastHost = hosts[0];
  }

  pickClient() {
    const n = this.clients.length;
    for (let i = 0; i < n; i++) {
      const c = this.clients[(this.rr + i) % n];
      if (c.available) {
        this.rr = (this.rr + i + 1) % n;
        this.lastHost = c.host;
        return c;
      }
    }
    // All cooling down — use soonest-ready
    let best = this.clients[0];
    for (const c of this.clients) {
      if (c.cooldownUntil < best.cooldownUntil) best = c;
    }
    this.lastHost = best.host;
    return best;
  }

  async getJson(path, attempts = MAX_ATTEMPTS) {
    let lastError;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const client = this.pickClient();
      try {
        return await client.getJson(path);
      } catch (err) {
        lastError = err;
        await sleep(400 * (attempt + 1));
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  /**
   * Fetch many paths using a shared queue + one worker per live host.
   * Failed items are not assigned to known-dead stripes up front.
   */
  async mapPaths(items, pathFor) {
    const results = new Array(items.length);
    let next = 0;

    const worker = async (client) => {
      for (;;) {
        if (client.consecutiveFails >= 8 && this.clients.length > 1) {
          // This host is cooked for this run — stop spending queue slots on it
          return;
        }
        const i = next++;
        if (i >= items.length) return;
        const item = items[i];
        try {
          results[i] = {
            item,
            data: await client.getJson(pathFor(item)),
            error: null,
          };
        } catch (err) {
          results[i] = { item, data: null, error: err };
        }
      }
    };

    await Promise.all(this.clients.map((c) => worker(c)));

    // Any indices skipped because a worker bailed early
    for (let i = 0; i < items.length; i++) {
      if (results[i] === undefined) {
        const item = items[i];
        try {
          results[i] = {
            item,
            data: await this.getJson(pathFor(item)),
            error: null,
          };
        } catch (err) {
          results[i] = { item, data: null, error: err };
        }
      }
    }
    return results;
  }

  stats() {
    return this.clients
      .map((c) => `${c.host.replace(/^https?:\/\//, '')}:${c.ok}ok/${c.fail}fail`)
      .join(' ');
  }
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

function txChronologicalKey(tx) {
  if (!tx.status.confirmed) return Number.MAX_SAFE_INTEGER;
  return tx.status.block_height ?? tx.status.block_time ?? 0;
}

function compareTxChronology(a, b) {
  const ka = txChronologicalKey(a);
  const kb = txChronologicalKey(b);
  if (ka !== kb) return ka - kb;
  return a.txid.localeCompare(b.txid);
}

/** Oldest-first; same-block parents before children via vin.txid. */
function orderTxsForBalance(txs) {
  if (txs.length <= 1) return [...txs];

  const byId = new Map(txs.map((t) => [t.txid, t]));
  const ids = new Set(byId.keys());
  const indegree = new Map();
  const children = new Map();

  for (const t of txs) {
    indegree.set(t.txid, 0);
    children.set(t.txid, []);
  }

  for (const t of txs) {
    const seenParents = new Set();
    for (const vin of t.vin) {
      const parent = vin.txid;
      if (!parent || !ids.has(parent) || seenParents.has(parent)) continue;
      seenParents.add(parent);
      children.get(parent).push(t.txid);
      indegree.set(t.txid, (indegree.get(t.txid) ?? 0) + 1);
    }
  }

  const ready = txs
    .filter((t) => (indegree.get(t.txid) ?? 0) === 0)
    .sort(compareTxChronology);
  const out = [];

  while (ready.length > 0) {
    const t = ready.shift();
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

function addressDeltaSats(tx, address) {
  const spent = tx.vin
    .filter((v) => v.prevout?.scriptpubkey_address === address)
    .reduce((sum, v) => sum + (v.prevout?.value ?? 0), 0);
  const received = tx.vout
    .filter((o) => o.scriptpubkey_address === address)
    .reduce((sum, o) => sum + o.value, 0);
  return received - spent;
}

/** Outbound that left the reported stack intact (surplus peel). */
function isSurplusPassThrough(address, reportBtc, txs, txid) {
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

function shouldEmitOutbound(watch, txs, tx) {
  if (!isPostWatch(tx)) return false;
  if (outboundFromAddress(tx, watch.address).amountSats <= 0) return false;
  if (
    watch.reportBtc != null &&
    isSurplusPassThrough(watch.address, watch.reportBtc, txs, tx.txid)
  ) {
    return false;
  }
  return true;
}

function movementsFromWatch(watches, txLists) {
  const items = [];
  watches.forEach((w, i) => {
    if (isKnownExitAddress(w.address)) return;
    const txs = txLists[i] ?? [];
    for (const tx of txs) {
      if (!shouldEmitOutbound(w, txs, tx)) continue;
      const { amountSats, destinations } = outboundFromAddress(tx, w.address);
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
    if (isKnownExitAddress(w.address)) return;
    const txs = txLists[i] ?? [];
    for (const tx of txs) {
      if (!shouldEmitOutbound(w, txs, tx)) continue;
      const { destinations } = outboundFromAddress(tx, w.address);
      const byAddr = new Map();
      for (const o of tx.vout) {
        const dest = o.scriptpubkey_address;
        if (!dest || dest === w.address) continue;
        byAddr.set(dest, (byAddr.get(dest) ?? 0) + o.value);
      }
      // Re-sort by value after filter so the largest exit (e.g. service hub)
      // is always among the followed hops, not a smaller sibling output.
      const recipients = destinations
        .map((addr) => ({ address: addr, valueSats: byAddr.get(addr) ?? 0 }))
        .filter(
          (r) =>
            r.valueSats >= MIN_HOP_FOLLOW_SATS &&
            !known.has(r.address) &&
            !isKnownExitAddress(r.address),
        )
        .sort((a, b) => b.valueSats - a.valueSats);
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

function movementSortKey(m) {
  if (!m.confirmed) return Number.MAX_SAFE_INTEGER;
  return m.blockHeight ?? m.blockTime ?? 0;
}

function sortMovements(items) {
  return [...items].sort((a, b) => {
    const ka = movementSortKey(a);
    const kb = movementSortKey(b);
    if (ka !== kb) return kb - ka;
    if (a.hop !== b.hop) return a.hop - b.hop;
    return a.txid.localeCompare(b.txid);
  });
}

/**
 * Fetch address summaries; mop up failures without redoing successes.
 * Returns Map(address -> esplora address json | null)
 */
async function fetchAddressSummaries(pool, holdings) {
  const byAddr = new Map();
  let pending = holdings.map((h) => h.address);

  console.log(
    `Fetching ${pending.length} holdings (${pool.clients.length} live host(s), paced)…`,
  );
  let round = 0;
  while (pending.length > 0 && round <= MOP_UP_ROUNDS) {
    if (round > 0) {
      console.log(`Mop-up round ${round}: retrying ${pending.length} failures…`);
      await sleep(2_000);
    }
    const batch = await pool.mapPaths(pending, (addr) => `/api/address/${addr}`);
    const still = [];
    let failLogged = 0;
    for (const { item: addr, data, error } of batch) {
      if (data) {
        byAddr.set(addr, data);
      } else {
        still.push(addr);
        if (round === 0 && failLogged < 5) {
          console.warn(`fail ${addr}: ${error?.message ?? error}`);
          failLogged++;
        }
      }
    }
    if (round === 0 && still.length > failLogged) {
      console.warn(`… ${still.length - failLogged} more failures this pass`);
    }
    pending = still;
    round++;
  }

  for (const addr of pending) {
    byAddr.set(addr, null);
  }
  return byAddr;
}

async function main() {
  const holdings = extractHoldings();
  const prior = loadPriorSnapshot();
  const noPollAddrs = new Set(
    holdings.filter((h) => !h.pollBalance).map((h) => h.address),
  );
  const toFetch = holdings.filter((h) => h.pollBalance);
  console.log(
    `Holdings: ${holdings.length} (${toFetch.length} to poll, ${noPollAddrs.size} pollBalance:false)`,
  );
  console.log('Probing Esplora hosts…');
  const liveHosts = await selectLiveHosts(HOSTS);
  console.log(`Using: ${liveHosts.join(', ')}`);
  const pool = new HostPool(liveHosts);

  const summaries = await fetchAddressSummaries(pool, toFetch);

  let usdPrice = null;
  try {
    const prices = await pool.getJson('/api/v1/prices');
    usdPrice = prices.USD ?? null;
  } catch {
    console.warn('price fetch failed');
  }

  const addresses = [];
  const activeSeeds = [];
  let liveOk = 0;
  let priorOk = 0;
  let reportFallback = 0;
  let synthEmpty = 0;

    for (const h of holdings) {
    if (!h.pollBalance) {
      synthEmpty++;
      addresses.push({
        address: h.address,
        balanceSats: 0,
        utxoCount: 0,
        ok: true,
      });
      // Still walk /txs so hop trails stay in the movement feed.
      // Must match shouldWatchSeedMovements(h, 0) in src/lib/tracker.ts.
      activeSeeds.push({
        address: h.address,
        label: h.label,
        hop: 0,
        reportBtc: h.reportBtc,
      });
      continue;
    }

    const addr = summaries.get(h.address);
    if (addr) {
      liveOk++;
      const sats = balanceSats(addr);
      const balanceBtc = sats / SATS_PER_BTC;
      addresses.push({
        address: h.address,
        balanceSats: sats,
        utxoCount: Math.max(0, utxoEstimate(addr)),
        ok: true,
      });
      // statusFor !== 'held' — same as shouldWatchSeedMovements for polled holdings
      if (statusFor(balanceBtc, h.reportBtc) !== 'held') {
        activeSeeds.push({
          address: h.address,
          label: h.label,
          hop: 0,
          reportBtc: h.reportBtc,
        });
      }
      continue;
    }

    const prev = prior.balances.get(h.address);
    if (prev) {
      priorOk++;
      addresses.push({
        address: h.address,
        balanceSats: prev.balanceSats,
        utxoCount: prev.utxoCount,
        ok: false,
        fromPrior: true,
      });
      const balanceBtc = prev.balanceSats / SATS_PER_BTC;
      if (statusFor(balanceBtc, h.reportBtc) !== 'held') {
        activeSeeds.push({
          address: h.address,
          label: h.label,
          hop: 0,
          reportBtc: h.reportBtc,
        });
      }
      continue;
    }

    reportFallback++;
    addresses.push({
      address: h.address,
      balanceSats: Math.round(h.reportBtc * SATS_PER_BTC),
      utxoCount: 0,
      ok: false,
    });
  }

  const allMovements = [];
  const known = new Set(holdings.map((h) => h.address));
  const hopWatch = new Map();
  const fetchedTxAddrs = new Set();

  const frozenHops = new Set();
  for (const m of prior.movements) {
    if (m && typeof m.fromAddress === 'string' && (m.hop ?? 0) >= MAX_HOP_DEPTH) {
      frozenHops.add(m.fromAddress);
      known.add(m.fromAddress);
    }
  }
  if (frozenHops.size > 0) {
    console.log(`Skipping ${frozenHops.size} frozen terminal hop(s)…`);
  }

  if (activeSeeds.length > 0) {
    console.log(`Fetching txs for ${activeSeeds.length} moved seeds…`);
    const seedBatch = await pool.mapPaths(
      activeSeeds,
      (w) => `/api/address/${w.address}/txs`,
    );
    const seedTxLists = seedBatch.map((r) => r.data ?? []);
    for (const w of activeSeeds) fetchedTxAddrs.add(w.address);
    allMovements.push(...movementsFromWatch(activeSeeds, seedTxLists));

    const fresh = discoverNextHops(
      activeSeeds,
      seedTxLists,
      known,
      MAX_HOP_WATCH_ADDRESSES,
    );
    for (const hop of fresh) {
      if (frozenHops.has(hop.address)) continue;
      hopWatch.set(hop.address, hop);
      known.add(hop.address);
    }

    let hopWatches = [...hopWatch.values()]
      .filter(
        (w) =>
          w.hop >= 1 &&
          w.hop <= MAX_HOP_DEPTH &&
          !frozenHops.has(w.address),
      )
      .sort((a, b) => a.hop - b.hop || a.address.localeCompare(b.address))
      .slice(0, MAX_HOP_WATCH_ADDRESSES);

    for (let round = 0; round < MAX_HOP_DEPTH && hopWatches.length > 0; round++) {
      const hopBatch = await pool.mapPaths(
        hopWatches,
        (w) => `/api/address/${w.address}/txs`,
      );
      const hopTxLists = hopBatch.map((r) => r.data ?? []);
      for (const w of hopWatches) fetchedTxAddrs.add(w.address);
      allMovements.push(...movementsFromWatch(hopWatches, hopTxLists));
      // Newly emitted terminal hops freeze for the rest of this run's discovery.
      for (const m of allMovements) {
        if ((m.hop ?? 0) >= MAX_HOP_DEPTH) {
          frozenHops.add(m.fromAddress);
          known.add(m.fromAddress);
        }
      }
      const slotsLeft = MAX_HOP_WATCH_ADDRESSES - hopWatch.size;
      const next = discoverNextHops(hopWatches, hopTxLists, known, slotsLeft);
      if (next.length === 0) break;
      for (const hop of next) {
        if (frozenHops.has(hop.address)) continue;
        hopWatch.set(hop.address, hop);
        known.add(hop.address);
      }
      hopWatches = next.filter((w) => !frozenHops.has(w.address));
    }
  }

  // Keep prior rows for addresses we did not re-fetch (no-poll seeds, frozen
  // terminal hops, and hop trails that were not rediscovered this run).
  const preservedUnwatched = prior.movements.filter(
    (m) =>
      m &&
      typeof m.txid === 'string' &&
      typeof m.fromAddress === 'string' &&
      !fetchedTxAddrs.has(m.fromAddress) &&
      !isKnownExitAddress(m.fromAddress),
  );

  if (liveOk === 0 && priorOk === 0) {
    throw new Error('No address balances fetched');
  }

  const snapshot = {
    version: 1,
    updatedAt: new Date().toISOString(),
    source: pool.lastHost.replace(/^https?:\/\//, ''),
    usdPrice,
    addresses: addresses.map(({ address, balanceSats, utxoCount }) => ({
      address,
      balanceSats,
      utxoCount,
    })),
    movements: dedupeMovements([
      ...allMovements.filter((m) => !isKnownExitAddress(m.fromAddress)),
      ...preservedUnwatched,
    ]),
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(
    `Wrote ${OUT} (live=${liveOk} prior=${priorOk} synthEmpty=${synthEmpty} reportFallback=${reportFallback}/${holdings.length}, ${snapshot.movements.length} movements)`,
  );
  console.log(`Hosts: ${pool.stats()}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
