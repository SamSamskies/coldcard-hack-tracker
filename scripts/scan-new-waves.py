#!/usr/bin/env python3
"""
Tip-following scout for Coldcard-hack-like sweep waves.

Always looks at a short window ending at chain tip (default 3 blocks). Does
**not** catch up missed history. If the shallow pass finds candidates, auto-
escalates to a deeper tip window (--escalate-blocks, default 12) unless
--no-escalate. Checkpoint only skips blocks already fetched inside the window.

Usage:
  python3 scripts/scan-new-waves.py                  # last 3 blocks; escalate on hit
  python3 scripts/scan-new-waves.py --blocks 12      # start deep
  python3 scripts/scan-new-waves.py --no-escalate    # shallow only
  python3 scripts/scan-new-waves.py --start 960800 --end 960850  # research only

Checkpoint: scripts/wave-scan-out/checkpoint.json. Default host: blockstream.info
(free Esplora), then bitaroo/emzy. Default pace 200ms.

Optional: --blockchair uses BLOCKCHAIR_API_KEY (env/.env) to SQL-filter 1-vout
txs instead of paging full blocks. Research-only; abort on API failure; soft-max
12 blocks unless --blockchair-force. Not for snapshot cron.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from blockchair_client import (  # noqa: E402
    Blockchair,
    BlockchairError,
    fee_sat_per_vb,
    get_api_key,
)

DEFAULT_HOSTS = [
    # Tip scout: free Blockstream Esplora was faster / less 429-prone than
    # community mirrors in Aug 2026 probes. Keep mirrors as failover.
    "https://blockstream.info",
    "https://mempool.bitaroo.net",
    "https://mempool.emzy.de",
]

# Known wave block ranges from src/data/incident.ts — update when adding a wave.
# Evening wave has no published block window; fee 1–2 alone is not enough to exclude.
KNOWN_WINDOWS: list[tuple[int, int, str]] = [
    (960_183, 960_191, "galaxy-wave1"),
    (960_345, 960_369, "galaxy-wave2"),
    (960_396, 960_471, "galaxy-wave3"),
    (960_518, 960_523, "morning-aug1"),
    (960_668, 960_668, "early-aug2"),
    (960_778, 960_792, "wave4-aug3"),
]

# Fee bands that are noisy at tip (common RBF / low-prio). Need much stronger
# evidence before surfacing as candidates.
NOISY_FEE_MAX = 3

# Well-known non-attacker sinks that often dominate 1-vout histograms.
EXCLUDED_DESTINATIONS = {
    # Binance hot wallet — routinely tops low-fee 1-vout buckets
    "bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h",
}


@dataclass
class Sweep:
    height: int
    txid: str
    address: str | None
    sats: int
    fee_sat_vb: float
    vin_n: int

    def to_json(self) -> dict:
        return {
            "height": self.height,
            "txid": self.txid,
            "address": self.address,
            "sats": self.sats,
            "fee_sat_vb": self.fee_sat_vb,
            "vin_n": self.vin_n,
        }

    @staticmethod
    def from_json(d: dict) -> "Sweep":
        return Sweep(
            height=int(d["height"]),
            txid=str(d.get("txid") or ""),
            address=d.get("address"),
            sats=int(d.get("sats") or 0),
            fee_sat_vb=float(d.get("fee_sat_vb") or 0),
            vin_n=int(d.get("vin_n") or 0),
        )


def checkpoint_path(out_dir: Path) -> Path:
    return out_dir / "checkpoint.json"


def load_checkpoint(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError) as e:
        print(f"  warning: bad checkpoint {path}: {e} — bootstrapping", flush=True)
        return None


def save_checkpoint(
    path: Path,
    *,
    last_scanned_height: int,
    sweeps: list[Sweep],
    keep_below: int,
) -> None:
    """Persist tip cursor + sweeps with height >= keep_below for next merge."""
    recent = [s for s in sweeps if s.height >= keep_below]
    # Dedupe by txid (overlap re-fetches)
    by_txid: dict[str, Sweep] = {}
    for s in recent:
        if s.txid:
            by_txid[s.txid] = s
    payload = {
        "last_scanned_height": last_scanned_height,
        "recent_sweeps": [s.to_json() for s in by_txid.values()],
        "updated_at_unix": int(time.time()),
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, indent=2, sort_keys=True))
    tmp.replace(path)


class Esplora:
    def __init__(self, hosts: list[str], timeout: float, min_interval: float):
        self.hosts = [h.rstrip("/") for h in hosts]
        self.timeout = timeout
        self.min_interval = min_interval
        self._host_i = 0
        self._last_req = 0.0
        self.host = self.hosts[0]

    def _sleep_rate(self) -> None:
        gap = time.monotonic() - self._last_req
        if gap < self.min_interval:
            time.sleep(self.min_interval - gap)

    def _url(self, path: str) -> str:
        base = self.host
        if base.endswith("/api"):
            return f"{base}{path}"
        return f"{base}/api{path}"

    def _rotate(self) -> None:
        self._host_i = (self._host_i + 1) % len(self.hosts)
        self.host = self.hosts[self._host_i]
        print(f"  rotating host → {self.host}", flush=True)

    def get_json(self, path: str, retries: int = 8):
        last_err: Exception | None = None
        for attempt in range(retries):
            self._sleep_rate()
            url = self._url(path)
            try:
                req = urllib.request.Request(
                    url, headers={"User-Agent": "coldcard-new-wave-scan/1.0"}
                )
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    raw = resp.read()
                    self._last_req = time.monotonic()
                    if not raw:
                        return None
                    return json.loads(raw)
            except urllib.error.HTTPError as e:
                last_err = e
                self._last_req = time.monotonic()
                if e.code in (429, 502, 503, 504):
                    wait = min(120.0, (2**attempt) * 1.5)
                    print(
                        f"  HTTP {e.code} on {path} — sleep {wait:.1f}s "
                        f"(attempt {attempt + 1}/{retries})",
                        flush=True,
                    )
                    time.sleep(wait)
                    if e.code == 429 and attempt % 2 == 1:
                        self._rotate()
                    continue
                if e.code in (400, 404) and "/txs/" in path:
                    return []
                if e.code == 404:
                    self._rotate()
                    time.sleep(min(30.0, (2**attempt) * 1.0))
                    continue
                raise
            except Exception as e:
                last_err = e
                self._last_req = time.monotonic()
                wait = min(60.0, (2**attempt) * 1.0)
                print(f"  error {type(e).__name__}: {e} — sleep {wait:.1f}s", flush=True)
                time.sleep(wait)
                if attempt % 2 == 1:
                    self._rotate()
        raise RuntimeError(f"failed {path}: {last_err}")

    def get_text(self, path: str, retries: int = 8) -> str:
        last_err: Exception | None = None
        for attempt in range(retries):
            self._sleep_rate()
            url = self._url(path)
            try:
                req = urllib.request.Request(
                    url, headers={"User-Agent": "coldcard-new-wave-scan/1.0"}
                )
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    text = resp.read().decode().strip()
                    self._last_req = time.monotonic()
                    return text
            except Exception as e:
                last_err = e
                self._last_req = time.monotonic()
                wait = min(60.0, (2**attempt) * 1.0)
                print(f"  text error {e} — sleep {wait:.1f}s", flush=True)
                time.sleep(wait)
                if attempt % 2 == 1:
                    self._rotate()
        raise RuntimeError(f"failed text {path}: {last_err}")


def in_known_window(height: int) -> str | None:
    for a, b, label in KNOWN_WINDOWS:
        if a <= height <= b:
            return label
    return None


def iter_block_txs(api: Esplora, height: int):
    block_hash = api.get_text(f"/block-height/{height}")
    start_idx = 0
    pages = 0
    while pages < 500:
        page = api.get_json(f"/block/{block_hash}/txs/{start_idx}")
        if not page:
            break
        yield from page
        if len(page) < 25:
            break
        start_idx += len(page)
        pages += 1


def collect_sweeps(
    api: Esplora, start: int, end: int, *, sample_every: int
) -> list[Sweep]:
    sweeps: list[Sweep] = []
    step = max(1, sample_every)
    heights = list(range(start, end + 1, step))
    if heights[-1] != end:
        heights.append(end)
    for height in heights:
        known = in_known_window(height)
        tag = f" [skip known:{known}]" if known else ""
        print(f"  block {height}{tag}", flush=True)
        if known:
            continue
        for tx in iter_block_txs(api, height):
            fee = tx.get("fee")
            weight = tx.get("weight")
            vouts = tx.get("vout") or []
            if not fee or not weight or len(vouts) != 1:
                continue
            rate = fee / (weight / 4)
            v0 = vouts[0] or {}
            sweeps.append(
                Sweep(
                    height=height,
                    txid=tx.get("txid") or "",
                    address=v0.get("scriptpubkey_address"),
                    sats=int(v0.get("value") or 0),
                    fee_sat_vb=round(rate, 2),
                    vin_n=len(tx.get("vin") or []),
                )
            )
    return sweeps


def collect_sweeps_blockchair(
    bc: Blockchair, start: int, end: int, *, sample_every: int
) -> list[Sweep]:
    """
    SQL-filter 1-vout non-coinbase txs, then hydrate recipients via batched
    dashboards/transactions (≤10 hashes/call). Avoids paging every index-0
    output in the block (that path burns quota fast).
    """
    sweeps: list[Sweep] = []
    step = max(1, sample_every)
    heights = list(range(start, end + 1, step))
    if heights[-1] != end:
        heights.append(end)

    for height in heights:
        known = in_known_window(height)
        tag = f" [skip known:{known}]" if known else ""
        print(f"  block {height}{tag} [blockchair]", flush=True)
        if known:
            continue

        # 1-vout non-coinbase txs in this block (fee + weight + hash).
        rows: list[dict] = []
        for row in bc.iter_table(
            "transactions",
            q=f"block_id({height}),output_count(1),is_coinbase(false)",
        ):
            fee = row.get("fee")
            weight = row.get("weight")
            txid = row.get("hash")
            if not fee or not weight or not txid:
                continue
            rows.append(row)

        if not rows:
            continue

        # Hydrate recipients in batches of 10 (cost ≈ 1 + 0.1*(n-1) each).
        by_hash: dict[str, dict] = {}
        for i in range(0, len(rows), 10):
            chunk = rows[i : i + 10]
            hashes = [str(r["hash"]) for r in chunk]
            path = f"/dashboards/transactions/{','.join(hashes)}"
            body = bc.get(path)
            data = body.get("data") or {}
            if not isinstance(data, dict):
                raise BlockchairError(
                    "unexpected dashboards/transactions payload", body=body
                )
            by_hash.update(data)

        for row in rows:
            txid = str(row["hash"])
            dash = by_hash.get(txid) or {}
            outputs = dash.get("outputs") or []
            if len(outputs) != 1:
                # Fall back to table totals if dashboard omitted / mismatched.
                continue
            out0 = outputs[0] or {}
            rate = fee_sat_per_vb(row["fee"], row["weight"])
            sweeps.append(
                Sweep(
                    height=height,
                    txid=txid,
                    address=out0.get("recipient"),
                    sats=int(out0.get("value") or row.get("output_total") or 0),
                    fee_sat_vb=round(rate, 2),
                    vin_n=int(row.get("input_count") or 0),
                )
            )

    return sweeps


BLOCKCHAIR_SOFT_MAX_BLOCKS = 12


def cluster_candidates(
    sweeps: list[Sweep],
    *,
    min_sweeps: int,
    min_btc: float,
    window_blocks: int,
    fee_slack: int,
) -> list[dict]:
    """
    Group by integer fee bucket, then find contiguous height spans where a
    bucket stays hot. Keep only local fee peaks with a Coldcard-like shape:
    many fresh one-shot parks, or few destinations consolidating most BTC.
    """
    by_fee: dict[int, list[Sweep]] = defaultdict(list)
    for s in sweeps:
        if s.address in EXCLUDED_DESTINATIONS:
            continue
        by_fee[int(s.fee_sat_vb)].append(s)

    # Global fee histogram for peak detection
    fee_counts = {k: len(v) for k, v in by_fee.items()}

    def is_local_peak(bucket: int, count: int) -> bool:
        left = fee_counts.get(bucket - 1, 0)
        right = fee_counts.get(bucket + 1, 0)
        neighbor_avg = (left + right) / 2 if (left or right) else 0
        # Peak if clearly above neighbors, or isolated with enough mass
        if neighbor_avg <= 0:
            return count >= min_sweeps
        return count >= max(min_sweeps, neighbor_avg * 1.4)

    candidates: list[dict] = []
    for fee_bucket, items in sorted(by_fee.items()):
        items = sorted(items, key=lambda x: x.height)
        if len(items) < min_sweeps:
            continue
        if not is_local_peak(fee_bucket, len(items)):
            continue

        # Sliding contiguous groups: merge if gap ≤ window_blocks / 2
        groups: list[list[Sweep]] = []
        cur: list[Sweep] = [items[0]]
        max_gap = max(2, window_blocks // 2)
        for s in items[1:]:
            if s.height - cur[-1].height <= max_gap:
                cur.append(s)
            else:
                groups.append(cur)
                cur = [s]
        groups.append(cur)

        for g in groups:
            noisy = fee_bucket <= NOISY_FEE_MAX
            need = min_sweeps * (3 if noisy else 1)
            if len(g) < need:
                continue
            h0, h1 = g[0].height, g[-1].height
            if h1 - h0 > window_blocks * 2:
                density = len(g) / max(1, h1 - h0 + 1)
                if density < need / max(window_blocks, 1):
                    continue
            btc = sum(x.sats for x in g) / 1e8
            min_btc_eff = min_btc * (2 if noisy else 1)
            if btc < min_btc_eff:
                continue

            dest_sats: dict[str, int] = defaultdict(int)
            dest_n: dict[str, int] = defaultdict(int)
            for x in g:
                if not x.address or x.address in EXCLUDED_DESTINATIONS:
                    continue
                dest_sats[x.address] += x.sats
                dest_n[x.address] += 1
            if not dest_sats:
                continue

            n_sweeps = len(g)
            n_dests = len(dest_sats)
            one_shot = sum(1 for n in dest_n.values() if n == 1)
            one_shot_ratio = one_shot / n_dests
            dest_ratio = n_dests / n_sweeps
            top_addr, top_sats = max(dest_sats.items(), key=lambda kv: kv[1])
            top_share = top_sats / sum(dest_sats.values())

            # Shape A: park-like — many unique one-shot destinations
            park_like = dest_ratio >= 0.55 and one_shot_ratio >= 0.7 and n_dests >= 12
            # Shape B: vault-like — few destinations eating most BTC
            vault_like = dest_ratio <= 0.25 and top_share >= 0.35 and n_dests <= 20
            if not (park_like or vault_like):
                continue
            # Noisy fee: Wave-4-scale park mass only (tip is full of 1–3 sat/vB junk)
            if noisy and not (
                park_like and n_dests >= 80 and btc >= max(50.0, min_btc_eff)
            ):
                continue

            # Prefer victim-style small vin counts (median)
            vins = sorted(x.vin_n for x in g)
            median_vin = vins[len(vins) // 2]

            top_dests = sorted(dest_sats.items(), key=lambda kv: -kv[1])[:8]
            candidates.append(
                {
                    "fee_sat_vb_bucket": fee_bucket,
                    "fee_slack_note": (
                        f"also check ±{fee_slack} buckets for dual-band siblings"
                    ),
                    "block_start": h0,
                    "block_end": h1,
                    "sweep_count": n_sweeps,
                    "unique_destinations": n_dests,
                    "one_shot_dest_ratio": round(one_shot_ratio, 3),
                    "top_dest_share": round(top_share, 3),
                    "shape": "park-like" if park_like else "vault-like",
                    "median_vin": median_vin,
                    "btc": round(btc, 8),
                    "noisy_fee_band": noisy,
                    "top_destinations": [
                        {"address": a, "btc": round(s / 1e8, 8)} for a, s in top_dests
                    ],
                    "sample_txids": [x.txid for x in g[:5]],
                }
            )

    candidates.sort(key=lambda c: (-c["btc"], -c["sweep_count"]))
    return candidates


def main() -> int:
    p = argparse.ArgumentParser(
        description="Scout tip blocks for new sweep waves (no historical catch-up)"
    )
    p.add_argument("--host", action="append", dest="hosts", help="Esplora base URL")
    p.add_argument(
        "--blocks",
        type=int,
        default=3,
        help="Tip window size (blocks back from tip; default 3)",
    )
    p.add_argument("--start", type=int, help="Fixed range start (inclusive)")
    p.add_argument("--end", type=int, help="Fixed range end (inclusive)")
    p.add_argument(
        "--sample-every",
        type=int,
        default=None,
        help="Visit every Nth block (default: 1 when fetching ≤12 blocks, else 2)",
    )
    p.add_argument("--min-sweeps", type=int, default=12)
    p.add_argument("--min-btc", type=float, default=3.0)
    p.add_argument(
        "--window-blocks",
        type=int,
        default=24,
        help="Expected max span of a wave-like burst / sweep cache depth",
    )
    p.add_argument("--fee-slack", type=int, default=2)
    p.add_argument("--timeout", type=float, default=45.0)
    p.add_argument("--min-interval", type=float, default=0.2)
    p.add_argument(
        "--out",
        type=Path,
        default=Path("scripts/wave-scan-out"),
        help="Output directory for latest.json + checkpoint.json",
    )
    p.add_argument(
        "--no-checkpoint",
        action="store_true",
        help="Do not read or write checkpoint",
    )
    p.add_argument(
        "--refetch",
        action="store_true",
        help="Re-fetch the whole tip window even if checkpoint covers it",
    )
    p.add_argument(
        "--escalate-blocks",
        type=int,
        default=12,
        help="If shallow tip scan finds candidates, widen to this many tip blocks",
    )
    p.add_argument(
        "--no-escalate",
        action="store_true",
        help="Do not auto-widen tip window when candidates appear",
    )
    p.add_argument(
        "--blockchair",
        action="store_true",
        help=(
            "Fetch 1-vout sweeps via Blockchair SQL tables (needs "
            "BLOCKCHAIR_API_KEY in env/.env). Abort on API failure — "
            "does not fall back to Esplora. Not for snapshot cron."
        ),
    )
    p.add_argument(
        "--blockchair-force",
        action="store_true",
        help=(
            f"Allow Blockchair on windows larger than "
            f"{BLOCKCHAIR_SOFT_MAX_BLOCKS} blocks (burns quota)"
        ),
    )
    args = p.parse_args()

    hosts = args.hosts or DEFAULT_HOSTS
    api = Esplora(hosts, timeout=args.timeout, min_interval=args.min_interval)
    bc: Blockchair | None = None
    if args.blockchair:
        key = get_api_key()
        if not key:
            print(
                "error: --blockchair requires BLOCKCHAIR_API_KEY "
                "(env or repo-root .env)",
                file=sys.stderr,
            )
            return 2
        bc = Blockchair(key, timeout=args.timeout, min_interval=args.min_interval)
    cp_path = checkpoint_path(args.out)

    tip = int(api.get_text("/blocks/tip/height"))
    cached: list[Sweep] = []
    advance_checkpoint = not args.no_checkpoint
    window_start = tip
    window_end = tip

    if args.start is not None and args.end is not None:
        window_start, window_end = args.start, args.end
        fetch_start, fetch_end = window_start, window_end
        mode = "fixed"
        advance_checkpoint = False
    else:
        window_start = max(1, tip - args.blocks + 1)
        window_end = tip
        fetch_end = tip
        mode = "tip"
        cp = None if args.no_checkpoint else load_checkpoint(cp_path)
        if cp:
            last = int(cp.get("last_scanned_height") or 0)
            cached = [
                Sweep.from_json(d)
                for d in (cp.get("recent_sweeps") or [])
                if int(d.get("height") or 0) >= window_start
            ]
            if not args.refetch and last >= tip:
                print(
                    f"scan-new-waves: tip {tip} already covered "
                    f"(checkpoint {cp_path}) — nothing new",
                    flush=True,
                )
                summary = {
                    "tip": tip,
                    "mode": "uptodate",
                    "window_start": window_start,
                    "window_end": window_end,
                    "fetched_start": None,
                    "fetched_end": None,
                    "host": api.host,
                    "candidates": [],
                    "verdict": "NO_NEW_CANDIDATES",
                    "note": "tip window already scanned",
                }
                args.out.mkdir(parents=True, exist_ok=True)
                (args.out / "latest.json").write_text(
                    json.dumps(summary, indent=2, sort_keys=True)
                )
                print(f"Wrote {args.out / 'latest.json'}", flush=True)
                return 0
            if not args.refetch and last >= window_start:
                # Only fetch new tip blocks inside the window — never catch up
                # blocks that fell out behind window_start.
                fetch_start = last + 1
                mode = "tip-delta"
            else:
                fetch_start = window_start
                if last and last < window_start - 1:
                    print(
                        f"  note: checkpoint at {last} is behind tip window "
                        f"{window_start}–{tip}; not catching up missed blocks",
                        flush=True,
                    )
        else:
            fetch_start = window_start

    if fetch_start > fetch_end:
        print(
            f"scan-new-waves: tip {tip} window {window_start}–{window_end} "
            f"— nothing to fetch",
            flush=True,
        )
        return 0

    new_block_count = fetch_end - fetch_start + 1
    if args.sample_every is not None:
        sample_every = max(1, args.sample_every)
    elif new_block_count <= 12:
        sample_every = 1
    else:
        sample_every = 2

    backend = "blockchair" if bc else api.host
    # Visited heights (respecting sample_every) drive Blockchair cost estimate.
    step = max(1, sample_every)
    visit_heights = list(range(fetch_start, fetch_end + 1, step))
    if visit_heights and visit_heights[-1] != fetch_end:
        visit_heights.append(fetch_end)
    visit_n = sum(1 for h in visit_heights if not in_known_window(h))
    # ~transactions pages (≤100 rows, cost ~5+) + dashboards/transactions
    # batches of 10 (~1.9 each). Rough upper bound for estimate logging.
    est_bc_cost = visit_n * 10 + 80  # soft estimate; actual logged after run

    if bc and new_block_count > BLOCKCHAIR_SOFT_MAX_BLOCKS and not args.blockchair_force:
        print(
            f"error: Blockchair window is {new_block_count} blocks "
            f"(soft max {BLOCKCHAIR_SOFT_MAX_BLOCKS}, est ~{est_bc_cost} "
            f"request points). Pass --blockchair-force to proceed.",
            file=sys.stderr,
        )
        return 2

    print(
        f"scan-new-waves: tip={tip} mode={mode} "
        f"window={window_start}–{window_end} fetch={fetch_start}–{fetch_end} "
        f"({new_block_count} blocks) via {backend}\n"
        f"  sample-every={sample_every}; cached_sweeps={len(cached)}; "
        f"thresholds: ≥{args.min_sweeps} sweeps, ≥{args.min_btc} BTC, "
        f"window~{args.window_blocks} blocks",
        flush=True,
    )
    if bc:
        print(
            f"  blockchair: ~{visit_n} blocks (est. order-of-magnitude "
            f"~{est_bc_cost} request points; actual logged at end)",
            flush=True,
        )

    try:
        if bc:
            fresh = collect_sweeps_blockchair(
                bc, fetch_start, fetch_end, sample_every=sample_every
            )
        else:
            fresh = collect_sweeps(
                api, fetch_start, fetch_end, sample_every=sample_every
            )
    except BlockchairError as e:
        print(f"error: Blockchair failed — {e}", file=sys.stderr)
        if bc:
            print(
                f"  spent ~{bc.request_cost_total:.2f} request points "
                f"across {bc.request_count} call(s) before abort",
                file=sys.stderr,
            )
        return 1
    by_txid: dict[str, Sweep] = {s.txid: s for s in cached if s.txid}
    for s in fresh:
        if s.txid:
            by_txid[s.txid] = s
    sweeps = [s for s in by_txid.values() if window_start <= s.height <= window_end]

    candidates = cluster_candidates(
        sweeps,
        min_sweeps=args.min_sweeps,
        min_btc=args.min_btc,
        window_blocks=args.window_blocks,
        fee_slack=args.fee_slack,
    )

    hist: dict[int, int] = defaultdict(int)
    for s in fresh:
        hist[int(s.fee_sat_vb)] += 1

    escalated = False
    escalate_fetched_start = None
    escalate_fetched_end = None
    if (
        candidates
        and mode != "fixed"
        and not args.no_escalate
        and args.blocks < args.escalate_blocks
    ):
        deep_start = max(1, tip - args.escalate_blocks + 1)
        if deep_start < window_start:
            print(
                f"\n*** {len(candidates)} candidate(s) in shallow window — "
                f"escalating to blocks {deep_start}–{tip} "
                f"({args.escalate_blocks} tip blocks) ***",
                flush=True,
            )
            esc_end = window_start - 1
            esc_blocks = esc_end - deep_start + 1
            if (
                bc
                and esc_blocks + (fetch_end - fetch_start + 1)
                > BLOCKCHAIR_SOFT_MAX_BLOCKS
                and not args.blockchair_force
            ):
                print(
                    f"  skipping Blockchair escalate ({esc_blocks} more blocks) "
                    f"— pass --blockchair-force to allow",
                    flush=True,
                )
                more = []
            elif bc:
                more = collect_sweeps_blockchair(
                    bc, deep_start, esc_end, sample_every=1
                )
            else:
                more = collect_sweeps(api, deep_start, esc_end, sample_every=1)
            if more:
                escalate_fetched_start = deep_start
                escalate_fetched_end = esc_end
                for s in more:
                    if s.txid:
                        by_txid[s.txid] = s
                    hist[int(s.fee_sat_vb)] += 1
                fresh.extend(more)
                window_start = deep_start
                sweeps = [
                    s
                    for s in by_txid.values()
                    if window_start <= s.height <= window_end
                ]
                candidates = cluster_candidates(
                    sweeps,
                    min_sweeps=args.min_sweeps,
                    min_btc=args.min_btc,
                    window_blocks=args.window_blocks,
                    fee_slack=args.fee_slack,
                )
                mode = "tip-escalated"
                escalated = True

    summary = {
        "tip": tip,
        "mode": mode,
        "window_start": window_start,
        "window_end": window_end,
        "fetched_start": fetch_start,
        "fetched_end": fetch_end,
        "escalated": escalated,
        "escalate_fetched_start": escalate_fetched_start,
        "escalate_fetched_end": escalate_fetched_end,
        "host": backend,
        "esplora_host": api.host,
        "blockchair": bool(bc),
        "blockchair_request_cost": round(bc.request_cost_total, 3) if bc else None,
        "blockchair_request_count": bc.request_count if bc else None,
        "one_vout_sweeps_fresh": len(fresh),
        "one_vout_sweeps_clustered": len(sweeps),
        "cached_sweeps_used": len(cached),
        "fee_histogram_int_sat_vb": dict(sorted(hist.items())),
        "known_windows_skipped": [
            {"start": a, "end": b, "id": lab} for a, b, lab in KNOWN_WINDOWS
        ],
        "sample_every": sample_every,
        "thresholds": {
            "min_sweeps": args.min_sweeps,
            "min_btc": args.min_btc,
            "window_blocks": args.window_blocks,
        },
        "candidates": candidates,
        "verdict": (
            "NO_NEW_CANDIDATES"
            if not candidates
            else f"{len(candidates)}_CANDIDATE(S) — investigate before editing data"
        ),
    }

    args.out.mkdir(parents=True, exist_ok=True)
    out_path = args.out / "latest.json"
    out_path.write_text(json.dumps(summary, indent=2, sort_keys=True))

    if advance_checkpoint:
        keep_below = window_start
        save_checkpoint(
            cp_path,
            last_scanned_height=min(fetch_end, tip),
            sweeps=sweeps,
            keep_below=keep_below,
        )
        print(
            f"Checkpoint → {cp_path} (last_scanned_height={min(fetch_end, tip)})",
            flush=True,
        )

    print(f"\n=== {summary['verdict']} ===", flush=True)
    if escalated:
        print(
            f"(escalated tip window to {window_start}–{window_end})",
            flush=True,
        )
    print(
        f"fresh 1-vout sweeps: {len(fresh)} (cluster set {len(sweeps)} w/ cache)",
        flush=True,
    )
    if hist:
        top_fees = sorted(hist.items(), key=lambda kv: -kv[1])[:10]
        print(
            "top fee buckets (fresh):",
            ", ".join(f"{k}={v}" for k, v in top_fees),
            flush=True,
        )
    for i, c in enumerate(candidates, 1):
        noisy = " (noisy low-fee)" if c["noisy_fee_band"] else ""
        print(
            f"\n[{i}] ~{c['fee_sat_vb_bucket']} sat/vB{noisy}  "
            f"{c.get('shape', '?')}  "
            f"blocks {c['block_start']}–{c['block_end']}  "
            f"{c['sweep_count']} sweeps / {c['unique_destinations']} dests / "
            f"{c['btc']} BTC",
            flush=True,
        )
        for d in c["top_destinations"][:3]:
            print(f"    {d['btc']:.4f} BTC → {d['address']}", flush=True)
    if bc:
        print(
            f"blockchair cost: {bc.request_cost_total:.2f} request points "
            f"({bc.request_count} calls)",
            flush=True,
        )
    print(f"\nWrote {out_path}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("interrupted", file=sys.stderr)
        raise SystemExit(130)
