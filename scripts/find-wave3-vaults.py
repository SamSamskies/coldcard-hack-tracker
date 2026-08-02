#!/usr/bin/env python3
"""
Find Galaxy Wave 3 Coldcard P2WSH vault candidates.

Galaxy's fingerprint (Aug 1, 2026):
  - Blocks 960396–960471 (Jul 31 afternoon → Aug 1)
  - Fixed fee ~200 sat/vB, no change output
  - 293 one-to-one chains: victim → park → P2WSH vault
  - ~207.73 BTC still held across those vaults

This script scans public Esplora-compatible APIs (mempool.space mirrors /
Blockstream) with backoff + resume checkpoints. Expect it to take a long time
on free endpoints; a private Esplora/bitcoind URL is much faster.

Usage:
  python3 scripts/find-wave3-vaults.py --host https://mempool.space --scan-only

  # Parallel: one host per block shard (fastest with VPN off)
  python3 scripts/find-wave3-vaults.py --print-shards
  bash scripts/run-wave3-parallel.sh

  # After shards finish, merge then follow parks → vaults
  python3 scripts/find-wave3-vaults.py --merge scripts/wave3-out/shard-*
  python3 scripts/find-wave3-vaults.py --out scripts/wave3-out/merged --follow-only \\
      --host https://mempool.space

Outputs (under --out, default scripts/wave3-out/):
  checkpoint.json   — resume state
  parks.jsonl       — ~200 sat/vB single-output receive addresses (parks)
  vaults.csv        — candidate final P2WSH vaults still holding funds
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# Prefer community mirrors for bulk scans; mempool.space soft-throttles;
# Blockstream 429s hard under parallel load.
DEFAULT_HOSTS = [
    "https://mempool.emzy.de",
    "https://mempool.bitaroo.net",
    "https://mempool.space",
]

SCAN_HOSTS = [
    "https://mempool.emzy.de",
    "https://mempool.bitaroo.net",
]

BLOCK_START = 960_396
BLOCK_END = 960_471  # inclusive
FEE_MIN = 180.0
FEE_MAX = 220.0
TARGET_VAULTS = 293
TARGET_BTC = 207.73


def is_p2wsh(addr: str | None) -> bool:
    # Native P2WSH bech32 is typically 62 chars; P2WPKH is 42.
    return bool(addr) and addr.startswith("bc1q") and len(addr) >= 60


def host_slug(host: str) -> str:
    h = host.rstrip("/")
    if h.endswith("/api"):
        h = h[: -len("/api")]
    return h.replace("https://", "").replace("http://", "").replace(".", "-")


def split_ranges(start: int, end: int, n: int) -> list[tuple[int, int]]:
    """Inclusive [start, end] split into n contiguous shards."""
    if n <= 0:
        raise ValueError("n must be >= 1")
    total = end - start + 1
    base, rem = divmod(total, n)
    ranges: list[tuple[int, int]] = []
    cur = start
    for i in range(n):
        size = base + (1 if i < rem else 0)
        if size <= 0:
            break
        ranges.append((cur, cur + size - 1))
        cur += size
    return ranges


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
        # blockstream.info already ends with /api; mempool hosts need /api
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
                    url, headers={"User-Agent": "coldcard-wave3-scanner/1.1"}
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
                    # Past end of block tx pages on some hosts
                    return []
                if e.code == 404:
                    # Missing block/address on a mirror — try another host
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
                    url, headers={"User-Agent": "coldcard-wave3-scanner/1.1"}
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


def load_checkpoint(path: Path, default_next: int) -> dict:
    if not path.exists():
        return {
            "next_height": default_next,
            "block_start": default_next,
            "parks": {},  # addr -> {sats, n, heights, fee_rates}
        }
    return json.loads(path.read_text())


def save_checkpoint(path: Path, state: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2, sort_keys=True))
    tmp.replace(path)


def merge_park_entry(dst: dict, src: dict) -> None:
    dst["sats"] = dst.get("sats", 0) + src.get("sats", 0)
    dst["n"] = dst.get("n", 0) + src.get("n", 0)
    heights = set(dst.get("heights") or []) | set(src.get("heights") or [])
    dst["heights"] = sorted(heights)
    rates = list(dst.get("fee_rates") or []) + list(src.get("fee_rates") or [])
    dst["fee_rates"] = rates[:5]


def merge_shards(shard_dirs: list[Path], out_dir: Path) -> dict:
    parks: dict = {}
    out_dir.mkdir(parents=True, exist_ok=True)
    merged_jsonl = out_dir / "parks.jsonl"
    if merged_jsonl.exists():
        merged_jsonl.unlink()

    for d in shard_dirs:
        ckpt = d / "checkpoint.json"
        if not ckpt.exists():
            print(f"skip {d}: no checkpoint.json", flush=True)
            continue
        state = json.loads(ckpt.read_text())
        for addr, meta in (state.get("parks") or {}).items():
            if addr not in parks:
                parks[addr] = {
                    "sats": 0,
                    "n": 0,
                    "heights": [],
                    "fee_rates": [],
                }
            merge_park_entry(parks[addr], meta)
        src_jsonl = d / "parks.jsonl"
        if src_jsonl.exists():
            with merged_jsonl.open("a") as out, src_jsonl.open() as inp:
                for line in inp:
                    out.write(line)

    state = {
        "next_height": BLOCK_END + 1,
        "block_start": BLOCK_START,
        "block_end": BLOCK_END,
        "parks": parks,
        "merged_from": [str(d) for d in shard_dirs],
    }
    save_checkpoint(out_dir / "checkpoint.json", state)
    print(
        f"merged {len(shard_dirs)} shards → {out_dir / 'checkpoint.json'} "
        f"({len(parks)} unique park addresses)",
        flush=True,
    )
    return state


def scan_blocks(
    api: Esplora,
    out_dir: Path,
    state: dict,
    block_end: int,
) -> dict:
    parks: dict = state["parks"]
    parks_path = out_dir / "parks.jsonl"

    for height in range(state["next_height"], block_end + 1):
        block_hash = api.get_text(f"/block-height/{height}")
        print(f"block {height} ({block_hash[:16]}…) via {api.host}", flush=True)
        start = 0
        pages = 0
        while pages < 500:
            page = api.get_json(f"/block/{block_hash}/txs/{start}")
            if not page:
                break
            for tx in page:
                fee = tx.get("fee")
                weight = tx.get("weight")
                if not fee or not weight:
                    continue
                rate = fee / (weight / 4)
                if not (FEE_MIN <= rate <= FEE_MAX):
                    continue
                vouts = tx.get("vout") or []
                if len(vouts) != 1:
                    continue
                addr = vouts[0].get("scriptpubkey_address")
                if not addr:
                    continue
                val = int(vouts[0]["value"])
                entry = parks.setdefault(
                    addr,
                    {"sats": 0, "n": 0, "heights": [], "fee_rates": []},
                )
                entry["sats"] += val
                entry["n"] += 1
                if height not in entry["heights"]:
                    entry["heights"].append(height)
                if len(entry["fee_rates"]) < 5:
                    entry["fee_rates"].append(round(rate, 2))
                with parks_path.open("a") as f:
                    f.write(
                        json.dumps(
                            {
                                "height": height,
                                "txid": tx.get("txid"),
                                "address": addr,
                                "sats": val,
                                "fee_sat_vb": round(rate, 2),
                                "p2wsh": is_p2wsh(addr),
                            }
                        )
                        + "\n"
                    )
            if len(page) < 25:
                break
            start += len(page)
            pages += 1

        state["next_height"] = height + 1
        state["parks"] = parks
        state["block_end"] = block_end
        save_checkpoint(out_dir / "checkpoint.json", state)
        print(
            f"  checkpoint @ {height + 1}; unique park/dest addresses so far: {len(parks)}",
            flush=True,
        )

    return state


def follow_to_vaults(api: Esplora, parks: dict, out_dir: Path) -> list[dict]:
    """
    For each park address that later spent, take large P2WSH destinations.
    Also keep parks that are themselves still-funded P2WSH (edge case).
    """
    vaults: dict[str, dict] = {}

    items = sorted(parks.items(), key=lambda kv: -kv[1]["sats"])
    print(f"following {len(items)} park/dest addresses → P2WSH vaults…", flush=True)

    for i, (addr, meta) in enumerate(items, 1):
        if i % 25 == 0 or i == 1:
            print(f"  [{i}/{len(items)}] {addr} ({meta['sats'] / 1e8:.4f} BTC)", flush=True)

        # Direct P2WSH receive that never moved
        if is_p2wsh(addr):
            info = api.get_json(f"/address/{addr}")
            if info:
                c = info["chain_stats"]
                bal = c["funded_txo_sum"] - c["spent_txo_sum"]
                if bal > 0:
                    vaults[addr] = {
                        "address": addr,
                        "balance_btc": bal / 1e8,
                        "funded_btc": c["funded_txo_sum"] / 1e8,
                        "tx_count": c["tx_count"],
                        "via": "direct_p2wsh_park",
                        "park": addr,
                        "park_sats": meta["sats"],
                    }
            continue

        # Follow spends from park
        try:
            txs = api.get_json(f"/address/{addr}/txs") or []
        except Exception as e:
            print(f"  skip {addr}: {e}", flush=True)
            continue

        for tx in txs:
            spent_from = False
            for vin in tx.get("vin") or []:
                prev = vin.get("prevout") or {}
                if prev.get("scriptpubkey_address") == addr:
                    spent_from = True
                    break
            if not spent_from:
                continue
            for vout in tx.get("vout") or []:
                dest = vout.get("scriptpubkey_address")
                if not is_p2wsh(dest):
                    continue
                val = int(vout["value"])
                if val < 100_000:  # ignore dust < 0.001 BTC
                    continue
                info = api.get_json(f"/address/{dest}")
                if not info:
                    continue
                c = info["chain_stats"]
                bal = c["funded_txo_sum"] - c["spent_txo_sum"]
                if bal <= 0:
                    continue
                prev = vaults.get(dest)
                if prev is None or (bal / 1e8) > prev["balance_btc"]:
                    vaults[dest] = {
                        "address": dest,
                        "balance_btc": bal / 1e8,
                        "funded_btc": c["funded_txo_sum"] / 1e8,
                        "tx_count": c["tx_count"],
                        "via": "park_to_p2wsh",
                        "park": addr,
                        "park_sats": meta["sats"],
                    }

    rows = sorted(vaults.values(), key=lambda r: -r["balance_btc"])
    csv_path = out_dir / "vaults.csv"
    with csv_path.open("w", newline="") as f:
        w = csv.DictWriter(
            f,
            fieldnames=[
                "address",
                "balance_btc",
                "funded_btc",
                "tx_count",
                "via",
                "park",
                "park_sats",
            ],
        )
        w.writeheader()
        for row in rows:
            w.writerow(row)

    total = sum(r["balance_btc"] for r in rows)
    print(
        f"\nWrote {len(rows)} candidate vaults → {csv_path}\n"
        f"Sum balance: {total:.4f} BTC (Galaxy target ~{TARGET_BTC} BTC / {TARGET_VAULTS} vaults)",
        flush=True,
    )
    return rows


def print_shards(base_out: Path, hosts: list[str], start: int, end: int) -> None:
    ranges = split_ranges(start, end, len(hosts))
    script = Path(__file__).resolve()
    print("# Run these in parallel (separate terminals or background jobs):\n")
    for i, ((a, b), host) in enumerate(zip(ranges, hosts)):
        out = base_out / f"shard-{i}-{host_slug(host)}"
        print(
            f"python3 {script} --host {host} --start {a} --end {b} "
            f"--out {out} --scan-only"
        )
    print("\n# When all shards finish:")
    print(f"python3 {script} --merge '{base_out}/shard-*' --out {base_out}/merged")
    print(
        f"python3 {script} --out {base_out}/merged --follow-only "
        f"--host {hosts[0]}"
    )


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        "--host",
        action="append",
        dest="hosts",
        help="Esplora base URL (repeatable). Default: public mirrors.",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=Path(__file__).resolve().parent / "wave3-out",
        help="Output directory",
    )
    parser.add_argument("--start", type=int, default=BLOCK_START, help="First block (inclusive)")
    parser.add_argument("--end", type=int, default=BLOCK_END, help="Last block (inclusive)")
    parser.add_argument(
        "--min-interval",
        type=float,
        default=0.35,
        help="Minimum seconds between HTTP requests (default 0.35)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=90.0,
        help="HTTP timeout seconds",
    )
    parser.add_argument(
        "--follow-only",
        action="store_true",
        help="Skip block scan; only follow parks from checkpoint to vaults",
    )
    parser.add_argument(
        "--scan-only",
        action="store_true",
        help="Only scan blocks into checkpoint; do not follow parks yet",
    )
    parser.add_argument(
        "--print-shards",
        action="store_true",
        help="Print parallel scan commands (one host per block range) and exit",
    )
    parser.add_argument(
        "--merge",
        nargs="+",
        type=Path,
        help="Merge shard output directories into --out, then exit",
    )
    args = parser.parse_args()

    env_host = os.environ.get("MEMPOOL_API_BASE")
    hosts = args.hosts or ([env_host] if env_host else list(DEFAULT_HOSTS))

    if args.print_shards:
        print_shards(args.out, hosts, args.start, args.end)
        return 0

    if args.merge:
        dirs: list[Path] = []
        for p in args.merge:
            if p.exists():
                dirs.append(p)
            else:
                dirs.extend(sorted(p.parent.glob(p.name)))
        if not dirs:
            print("no shard dirs found to merge", file=sys.stderr)
            return 1
        merge_shards(dirs, args.out)
        return 0

    out_dir: Path = args.out
    out_dir.mkdir(parents=True, exist_ok=True)
    ckpt_path = out_dir / "checkpoint.json"

    api = Esplora(hosts, timeout=args.timeout, min_interval=args.min_interval)
    print(f"hosts: {hosts}", flush=True)
    print(f"out:   {out_dir}", flush=True)
    print(
        f"scan:  blocks {args.start}–{args.end}, fee {FEE_MIN}–{FEE_MAX} sat/vB, 1-vout",
        flush=True,
    )

    state = load_checkpoint(ckpt_path, default_next=args.start)
    if state["next_height"] < args.start:
        state["next_height"] = args.start

    if not args.follow_only:
        if state["next_height"] > args.end:
            print("block scan already complete (checkpoint).", flush=True)
        else:
            print(f"resuming block scan at {state['next_height']}", flush=True)
            state = scan_blocks(api, out_dir, state, block_end=args.end)

    if args.scan_only:
        print("scan-only done.", flush=True)
        return 0

    parks = state.get("parks") or {}
    if not parks:
        print("no parks in checkpoint — run a block scan first", file=sys.stderr)
        return 1

    follow_to_vaults(api, parks, out_dir)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
