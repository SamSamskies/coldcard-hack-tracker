#!/usr/bin/env python3
"""
Batch-check confirmed BTC balances via Blockchair (research only).

Uses BLOCKCHAIR_API_KEY from env or repo-root .env. Do not wire this into
the snapshot cron — quota is limited (~10k request points).

Usage:
  python3 scripts/blockchair-balances.py bc1q... bc1p...
  echo -e 'bc1q...\\nbc1p...' | python3 scripts/blockchair-balances.py
  python3 scripts/blockchair-balances.py --file addrs.txt
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

_SCRIPTS_DIR = Path(__file__).resolve().parent
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from blockchair_client import Blockchair, BlockchairError, get_api_key

SATS_PER_BTC = 100_000_000


def read_addresses(args: argparse.Namespace) -> list[str]:
    addrs: list[str] = []
    if args.file:
        text = Path(args.file).read_text()
        addrs.extend(text.replace(",", "\n").split())
    addrs.extend(args.addresses)
    if not addrs and not sys.stdin.isatty():
        addrs.extend(sys.stdin.read().replace(",", "\n").split())
    # Dedupe, preserve order
    seen: set[str] = set()
    out: list[str] = []
    for a in addrs:
        a = a.strip()
        if a and a not in seen:
            seen.add(a)
            out.append(a)
    return out


def main() -> int:
    p = argparse.ArgumentParser(description="Blockchair mass balance check")
    p.add_argument("addresses", nargs="*", help="BTC addresses")
    p.add_argument("--file", "-f", help="File with addresses (whitespace/comma)")
    p.add_argument("--json", action="store_true", help="Print JSON map address→sats")
    args = p.parse_args()

    addrs = read_addresses(args)
    if not addrs:
        print("error: no addresses provided", file=sys.stderr)
        return 2

    key = get_api_key()
    if not key:
        print(
            "error: BLOCKCHAIR_API_KEY required (env or repo-root .env)",
            file=sys.stderr,
        )
        return 2

    bc = Blockchair(key)
    try:
        balances = bc.address_balances(addrs)
    except BlockchairError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1

    if args.json:
        import json

        print(json.dumps(balances, indent=2, sort_keys=True))
    else:
        for addr in addrs:
            sats = balances.get(addr, 0)
            print(f"{sats / SATS_PER_BTC:.8f} BTC\t{sats}\t{addr}")
        missing = [a for a in addrs if a not in balances]
        if missing:
            print(
                f"# note: {len(missing)} address(es) omitted by API "
                f"(unseen or zero balance)",
                file=sys.stderr,
            )
        print(
            f"# cost {bc.request_cost_total:.3f} request points "
            f"({bc.request_count} call(s))",
            file=sys.stderr,
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
