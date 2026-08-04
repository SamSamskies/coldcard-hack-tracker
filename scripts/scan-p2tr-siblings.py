#!/usr/bin/env python3
"""
One-off sibling scan for the Kelbie P2TR wave fingerprint.

Scans 1-vout sweeps in the P2TR fee bands, aggregates by destination (esp. bc1p),
and does NOT skip known Galaxy/community windows (activity can overlap).

  python3 scripts/scan-p2tr-siblings.py --start 960624 --end 960760 --host https://mempool.bitaroo.net
  python3 scripts/scan-p2tr-siblings.py --start 960761 --end 960897 --host https://mempool.emzy.de
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from collections import defaultdict
from pathlib import Path

import importlib.util

_SPEC = importlib.util.spec_from_file_location(
    "scan_new_waves",
    Path(__file__).resolve().parent / "scan-new-waves.py",
)
_MOD = importlib.util.module_from_spec(_SPEC)
sys.modules["scan_new_waves"] = _MOD
assert _SPEC.loader is not None
_SPEC.loader.exec_module(_MOD)
Esplora = _MOD.Esplora
iter_block_txs = _MOD.iter_block_txs

KNOWN = {
    "bc1pum5zf6efxgt7a8xcyjg79u25jdhz6ex9ff2m390d544v05pg698s8ftmy8",
    "bc1ptd5x926gkxdu0p8a2rufr7u8lklrfqapucj8yha7vjqh5z6md9kqf53nap",
    "bc1pdl33jtqnausmx2d4r4c6wpnk5are8jz046y3yjkw8fryjel02p7sluu9ce",
    "bc1p0l0xs2a0ffn2d9pek28k3vm9rjr2p0c5hvdlu03gpdwgzdgpscnq6qlk0h",
}


def in_fee_band(rate: float, bands: list[tuple[float, float]]) -> bool:
    return any(lo <= rate <= hi for lo, hi in bands)


def main() -> int:
    p = argparse.ArgumentParser(description="Scan P2TR-wave sibling sinks")
    p.add_argument("--start", type=int, required=True)
    p.add_argument("--end", type=int, required=True)
    p.add_argument("--host", action="append", dest="hosts")
    p.add_argument("--min-interval", type=float, default=0.2)
    p.add_argument("--timeout", type=float, default=45.0)
    p.add_argument("--min-btc", type=float, default=0.5)
    p.add_argument("--min-sweeps", type=int, default=8)
    p.add_argument(
        "--out",
        type=Path,
        default=Path("scripts/wave-scan-out/p2tr-sibling"),
    )
    args = p.parse_args()

    hosts = args.hosts or [
        "https://mempool.bitaroo.net",
        "https://mempool.emzy.de",
    ]
    api = Esplora(hosts, timeout=args.timeout, min_interval=args.min_interval)
    # Primary ~5; secondary ~25–40 on later vault.
    bands = [(4.0, 7.0), (20.0, 45.0)]

    by_addr: dict[str, dict] = defaultdict(
        lambda: {
            "sats": 0,
            "n": 0,
            "heights": set(),
            "fees": [],
            "sample_txids": [],
        }
    )
    sweeps = 0
    t0 = time.time()

    for height in range(args.start, args.end + 1):
        print(f"block {height} via {api.host}", flush=True)
        for tx in iter_block_txs(api, height):
            fee = tx.get("fee")
            weight = tx.get("weight")
            vouts = tx.get("vout") or []
            if not fee or not weight or len(vouts) != 1:
                continue
            rate = fee / (weight / 4)
            if not in_fee_band(rate, bands):
                continue
            addr = (vouts[0] or {}).get("scriptpubkey_address")
            if not addr:
                continue
            sats = int((vouts[0] or {}).get("value") or 0)
            sweeps += 1
            d = by_addr[addr]
            d["sats"] += sats
            d["n"] += 1
            d["heights"].add(height)
            if len(d["fees"]) < 8:
                d["fees"].append(round(rate, 2))
            if len(d["sample_txids"]) < 5:
                d["sample_txids"].append(tx.get("txid") or "")

        # Checkpoint each block so shards can resume / merge mid-run.
        args.out.mkdir(parents=True, exist_ok=True)
        cp = args.out / f"checkpoint-{args.start}-{args.end}.json"
        payload = {
            "start": args.start,
            "end": args.end,
            "next_height": height + 1,
            "sweeps_matched": sweeps,
            "elapsed_s": round(time.time() - t0, 1),
            "host": api.host,
        }
        cp.write_text(json.dumps(payload, indent=2))

    rows = []
    for addr, d in by_addr.items():
        btc = d["sats"] / 1e8
        # Keep denser sinks or large single-dest consolidations.
        if d["n"] < args.min_sweeps and btc < args.min_btc:
            continue
        rows.append(
            {
                "address": addr,
                "btc": btc,
                "sweeps": d["n"],
                "block_start": min(d["heights"]),
                "block_end": max(d["heights"]),
                "is_p2tr": addr.startswith("bc1p"),
                "already_watched": addr in KNOWN,
                "sample_fees": d["fees"],
                "sample_txids": d["sample_txids"],
            }
        )

    rows.sort(key=lambda r: (-r["is_p2tr"], -r["btc"], -r["sweeps"]))
    out = {
        "window": [args.start, args.end],
        "fee_bands": bands,
        "sweeps_matched": sweeps,
        "elapsed_s": round(time.time() - t0, 1),
        "host": api.host,
        "destinations": rows,
        "p2tr_new_ge_min_btc": [
            r
            for r in rows
            if r["is_p2tr"]
            and not r["already_watched"]
            and r["btc"] >= args.min_btc
            and r["sweeps"] >= args.min_sweeps
        ],
    }
    args.out.mkdir(parents=True, exist_ok=True)
    path = args.out / f"shard-{args.start}-{args.end}.json"
    path.write_text(json.dumps(out, indent=2))
    print(
        f"done: {sweeps} matched sweeps → {len(rows)} dests "
        f"({len(out['p2tr_new_ge_min_btc'])} new P2TR ≥{args.min_btc} BTC) "
        f"in {out['elapsed_s']}s → {path}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
