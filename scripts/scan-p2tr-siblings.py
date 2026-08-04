#!/usr/bin/env python3
"""
Sibling scan for the Kelbie P2TR wave fingerprint.

Scans 1-vout sweeps in the P2TR fee bands, aggregates by destination (esp. bc1p),
and does NOT skip known Galaxy/community windows (activity can overlap).

Checkpoints after each block (aggregates + next_height). Re-running the same
--start/--end resumes by default; use --refetch to redo the window.

  python3 scripts/scan-p2tr-siblings.py --start 960624 --end 960760 --host https://mempool.bitaroo.net
  python3 scripts/scan-p2tr-siblings.py --start 960761 --end 960897 --host https://mempool.emzy.de
  # resume after interrupt (same args):
  python3 scripts/scan-p2tr-siblings.py --start 960624 --end 960760 --host https://mempool.bitaroo.net
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
import time
from collections import defaultdict
from pathlib import Path

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

FEE_BANDS = [(4.0, 7.0), (20.0, 45.0)]


def in_fee_band(rate: float, bands: list[tuple[float, float]]) -> bool:
    return any(lo <= rate <= hi for lo, hi in bands)


def checkpoint_path(out: Path, start: int, end: int) -> Path:
    return out / f"checkpoint-{start}-{end}.json"


def empty_addr() -> dict:
    return {
        "sats": 0,
        "n": 0,
        "heights": set(),
        "fees": [],
        "sample_txids": [],
    }


def serialize_addrs(by_addr: dict[str, dict]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for addr, d in by_addr.items():
        out[addr] = {
            "sats": int(d["sats"]),
            "n": int(d["n"]),
            "heights": sorted(d["heights"]),
            "fees": list(d["fees"]),
            "sample_txids": list(d["sample_txids"]),
        }
    return out


def deserialize_addrs(raw: dict | None) -> dict[str, dict]:
    by_addr: dict[str, dict] = defaultdict(empty_addr)
    if not raw:
        return by_addr
    for addr, d in raw.items():
        by_addr[addr] = {
            "sats": int(d.get("sats") or 0),
            "n": int(d.get("n") or 0),
            "heights": set(d.get("heights") or []),
            "fees": list(d.get("fees") or []),
            "sample_txids": list(d.get("sample_txids") or []),
        }
    return by_addr


def atomic_write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(payload, indent=2, sort_keys=True))
    tmp.replace(path)


def load_checkpoint(path: Path) -> dict | None:
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text())
    except (json.JSONDecodeError, OSError) as e:
        print(f"  warning: bad checkpoint {path}: {e} — starting fresh", flush=True)
        return None


def build_rows(
    by_addr: dict[str, dict], *, min_btc: float, min_sweeps: int
) -> list[dict]:
    rows = []
    for addr, d in by_addr.items():
        btc = d["sats"] / 1e8
        if d["n"] < min_sweeps and btc < min_btc:
            continue
        heights = d["heights"]
        if not heights:
            continue
        rows.append(
            {
                "address": addr,
                "btc": btc,
                "sweeps": d["n"],
                "block_start": min(heights),
                "block_end": max(heights),
                "is_p2tr": addr.startswith("bc1p"),
                "already_watched": addr in KNOWN,
                "sample_fees": d["fees"],
                "sample_txids": d["sample_txids"],
            }
        )
    rows.sort(key=lambda r: (-r["is_p2tr"], -r["btc"], -r["sweeps"]))
    return rows


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
    p.add_argument(
        "--refetch",
        action="store_true",
        help="Ignore checkpoint and re-scan the whole --start/--end window",
    )
    args = p.parse_args()

    hosts = args.hosts or [
        "https://mempool.bitaroo.net",
        "https://mempool.emzy.de",
    ]
    api = Esplora(hosts, timeout=args.timeout, min_interval=args.min_interval)
    bands = FEE_BANDS
    cp_path = checkpoint_path(args.out, args.start, args.end)

    by_addr: dict[str, dict] = defaultdict(empty_addr)
    sweeps = 0
    resume_height = args.start
    prior_elapsed = 0.0

    if not args.refetch:
        cp = load_checkpoint(cp_path)
        if cp:
            if cp.get("start") != args.start or cp.get("end") != args.end:
                print(
                    f"  warning: checkpoint window {cp.get('start')}-{cp.get('end')} "
                    f"≠ {args.start}-{args.end} — starting fresh",
                    flush=True,
                )
            elif "addresses" not in cp:
                # Old progress-only checkpoints cannot restore aggregates.
                print(
                    f"  warning: {cp_path.name} has no address aggregates "
                    f"(progress-only). Re-scanning from {args.start} so totals "
                    f"stay complete. Delete it or pass --refetch to silence this.",
                    flush=True,
                )
            else:
                next_h = int(cp.get("next_height") or args.start)
                if next_h > args.end:
                    print(
                        f"checkpoint already complete through {args.end} "
                        f"({cp_path}) — writing final shard from saved aggregates",
                        flush=True,
                    )
                    by_addr = deserialize_addrs(cp.get("addresses"))
                    sweeps = int(cp.get("sweeps_matched") or 0)
                    resume_height = args.end + 1
                    prior_elapsed = float(cp.get("elapsed_s") or 0)
                elif next_h > args.start:
                    by_addr = deserialize_addrs(cp.get("addresses"))
                    sweeps = int(cp.get("sweeps_matched") or 0)
                    resume_height = next_h
                    prior_elapsed = float(cp.get("elapsed_s") or 0)
                    print(
                        f"resuming at block {resume_height} "
                        f"({sweeps} sweeps, {len(by_addr)} addrs) from {cp_path}",
                        flush=True,
                    )

    t0 = time.time()

    for height in range(resume_height, args.end + 1):
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

        elapsed = round(prior_elapsed + (time.time() - t0), 1)
        atomic_write_json(
            cp_path,
            {
                "start": args.start,
                "end": args.end,
                "next_height": height + 1,
                "sweeps_matched": sweeps,
                "elapsed_s": elapsed,
                "host": api.host,
                "fee_bands": bands,
                "addresses": serialize_addrs(by_addr),
                "updated_at_unix": int(time.time()),
            },
        )

    rows = build_rows(by_addr, min_btc=args.min_btc, min_sweeps=args.min_sweeps)
    elapsed = round(prior_elapsed + (time.time() - t0), 1)
    out = {
        "window": [args.start, args.end],
        "fee_bands": bands,
        "sweeps_matched": sweeps,
        "elapsed_s": elapsed,
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
    path = args.out / f"shard-{args.start}-{args.end}.json"
    atomic_write_json(path, out)
    print(
        f"done: {sweeps} matched sweeps → {len(rows)} dests "
        f"({len(out['p2tr_new_ge_min_btc'])} new P2TR ≥{args.min_btc} BTC) "
        f"in {elapsed}s → {path}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
