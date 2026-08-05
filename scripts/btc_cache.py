#!/usr/bin/env python3
"""
Local SQLite cache for confirmed Bitcoin txs / address tx pages (research).

Avoids re-hitting flaky Esplora mirrors for the same confirmed objects during
hop / cash-out research. Does **not** call explorers itself — fetch, then
`put`; next time `get` / `has` is a cache hit.

Separate from `.firecrawl/x-cache.sqlite` (X credits). Do **not** use this for
live balances, tip height, mempool, snapshot cron, or the movement feed.

Shallow reorgs can move tip-adjacent txs: pass `--tip HEIGHT` on reads so
hits require ≥ `--min-confirmations` (default 6). Deep research hops are fine;
tip peels should miss until they age.

DB path (gitignored via .firecrawl/):
  .firecrawl/chain-cache.sqlite

Examples:
  python3 scripts/btc_cache.py stats
  python3 scripts/btc_cache.py has-tx TXID --tip 961200
  python3 scripts/btc_cache.py get-tx TXID --tip 961200
  python3 scripts/btc_cache.py put-tx < tx.json
  python3 scripts/btc_cache.py put-txs < '[...]'
  python3 scripts/btc_cache.py put-address-txs bc1q… < txs.json
  python3 scripts/btc_cache.py get-address-txs bc1q… --tip 961200
  python3 scripts/btc_cache.py missing-txs < ids.json --tip 961200
"""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / ".firecrawl" / "chain-cache.sqlite"
DEFAULT_MIN_CONFIRMATIONS = 6

SCHEMA = """
CREATE TABLE IF NOT EXISTS txs (
  txid TEXT PRIMARY KEY,
  block_height INTEGER,
  confirmed INTEGER NOT NULL DEFAULT 0,
  fee INTEGER,
  weight INTEGER,
  raw_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  source TEXT
);

CREATE INDEX IF NOT EXISTS idx_txs_block_height ON txs(block_height);
CREATE INDEX IF NOT EXISTS idx_txs_confirmed ON txs(confirmed);

CREATE TABLE IF NOT EXISTS address_tx_pages (
  address TEXT NOT NULL,
  page_key TEXT NOT NULL DEFAULT '',
  txids_json TEXT NOT NULL,
  raw_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  source TEXT,
  PRIMARY KEY (address, page_key)
);
"""


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def connect(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.executescript(SCHEMA)
    return conn


def _status(tx: dict[str, Any]) -> dict[str, Any]:
    st = tx.get("status")
    return st if isinstance(st, dict) else {}


def upsert_tx(
    conn: sqlite3.Connection,
    tx: dict[str, Any],
    *,
    source: str = "esplora",
) -> str:
    txid = tx.get("txid")
    if not txid or not isinstance(txid, str):
        raise ValueError("tx object needs string txid")
    st = _status(tx)
    confirmed = 1 if st.get("confirmed") else 0
    block_height = st.get("block_height")
    if block_height is not None:
        block_height = int(block_height)
    fee = tx.get("fee")
    weight = tx.get("weight")
    conn.execute(
        """
        INSERT INTO txs (txid, block_height, confirmed, fee, weight, raw_json, fetched_at, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(txid) DO UPDATE SET
          block_height = excluded.block_height,
          confirmed = excluded.confirmed,
          fee = excluded.fee,
          weight = excluded.weight,
          raw_json = excluded.raw_json,
          fetched_at = excluded.fetched_at,
          source = excluded.source
        """,
        (
            txid,
            block_height,
            confirmed,
            int(fee) if fee is not None else None,
            int(weight) if weight is not None else None,
            json.dumps(tx, separators=(",", ":"), ensure_ascii=False),
            utc_now(),
            source,
        ),
    )
    return txid


def upsert_txs(
    conn: sqlite3.Connection,
    txs: list[dict[str, Any]],
    *,
    source: str = "esplora",
) -> list[str]:
    out: list[str] = []
    for tx in txs:
        if isinstance(tx, dict) and tx.get("txid"):
            out.append(upsert_tx(conn, tx, source=source))
    conn.commit()
    return out


def put_address_txs(
    conn: sqlite3.Connection,
    address: str,
    txs: list[dict[str, Any]],
    *,
    page_key: str = "",
    source: str = "esplora",
) -> dict[str, Any]:
    """Store an address /txs (or /txs/chain/…) page and upsert each confirmed tx."""
    txids = upsert_txs(conn, txs, source=source)
    conn.execute(
        """
        INSERT INTO address_tx_pages (address, page_key, txids_json, raw_json, fetched_at, source)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(address, page_key) DO UPDATE SET
          txids_json = excluded.txids_json,
          raw_json = excluded.raw_json,
          fetched_at = excluded.fetched_at,
          source = excluded.source
        """,
        (
            address,
            page_key,
            json.dumps(txids),
            json.dumps(txs, separators=(",", ":"), ensure_ascii=False),
            utc_now(),
            source,
        ),
    )
    conn.commit()
    return {"address": address, "page_key": page_key, "txids": len(txids)}


def get_tx(conn: sqlite3.Connection, txid: str) -> dict[str, Any] | None:
    row = conn.execute(
        "SELECT txid, block_height, confirmed, fee, weight, raw_json, fetched_at, source "
        "FROM txs WHERE txid = ?",
        (txid,),
    ).fetchone()
    if not row:
        return None
    out = dict(row)
    out["raw"] = json.loads(out.pop("raw_json"))
    out["confirmed"] = bool(out["confirmed"])
    return out


def has_tx(conn: sqlite3.Connection, txid: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM txs WHERE txid = ? LIMIT 1", (txid,)
    ).fetchone()
    return row is not None


def confirmations(block_height: int | None, tip_height: int) -> int | None:
    if block_height is None:
        return None
    return tip_height - int(block_height) + 1


def is_reorg_safe(
    *,
    confirmed: bool,
    block_height: int | None,
    tip_height: int | None,
    min_confirmations: int = DEFAULT_MIN_CONFIRMATIONS,
) -> bool:
    """True when cache may be trusted against shallow tip reorgs.

    Without tip_height, only require confirmed + known block_height (caller
    accepted tip risk). With tip_height, require confirmations >= min.
    """
    if not confirmed or block_height is None:
        return False
    if tip_height is None:
        return True
    conf = confirmations(block_height, tip_height)
    return conf is not None and conf >= min_confirmations


def tx_row_reorg_safe(
    row: dict[str, Any],
    *,
    tip_height: int | None,
    min_confirmations: int = DEFAULT_MIN_CONFIRMATIONS,
) -> bool:
    return is_reorg_safe(
        confirmed=bool(row.get("confirmed")),
        block_height=row.get("block_height"),
        tip_height=tip_height,
        min_confirmations=min_confirmations,
    )


def get_address_txs(
    conn: sqlite3.Connection,
    address: str,
    *,
    page_key: str = "",
) -> dict[str, Any] | None:
    row = conn.execute(
        "SELECT address, page_key, txids_json, raw_json, fetched_at, source "
        "FROM address_tx_pages WHERE address = ? AND page_key = ?",
        (address, page_key),
    ).fetchone()
    if not row:
        return None
    return {
        "address": row["address"],
        "page_key": row["page_key"],
        "txids": json.loads(row["txids_json"]),
        "txs": json.loads(row["raw_json"]),
        "fetched_at": row["fetched_at"],
        "source": row["source"],
    }


def stats(conn: sqlite3.Connection) -> dict[str, Any]:
    n_tx = conn.execute("SELECT COUNT(*) AS n FROM txs").fetchone()["n"]
    n_conf = conn.execute(
        "SELECT COUNT(*) AS n FROM txs WHERE confirmed = 1"
    ).fetchone()["n"]
    n_pages = conn.execute(
        "SELECT COUNT(*) AS n FROM address_tx_pages"
    ).fetchone()["n"]
    newest = conn.execute(
        "SELECT fetched_at FROM txs ORDER BY fetched_at DESC LIMIT 1"
    ).fetchone()
    return {
        "db": str(DEFAULT_DB),
        "txs": n_tx,
        "confirmed_txs": n_conf,
        "address_tx_pages": n_pages,
        "newest_tx_fetched_at": newest["fetched_at"] if newest else None,
    }


def _read_json_stdin_or_file(path: str | None) -> Any:
    if path and path != "-":
        return json.loads(Path(path).read_text())
    return json.load(sys.stdin)


def _add_reorg_gate(p: argparse.ArgumentParser) -> None:
    p.add_argument(
        "--tip",
        type=int,
        default=None,
        help="current chain tip height; with this, miss tip-adjacent txs",
    )
    p.add_argument(
        "--min-confirmations",
        type=int,
        default=DEFAULT_MIN_CONFIRMATIONS,
        help=f"min confirmations vs --tip (default {DEFAULT_MIN_CONFIRMATIONS})",
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB,
        help=f"sqlite path (default {DEFAULT_DB})",
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("stats", help="cache counts")

    p_has = sub.add_parser(
        "has-tx", help="exit 0 if txid cached (and reorg-safe if --tip)"
    )
    p_has.add_argument("txid")
    _add_reorg_gate(p_has)

    p_get = sub.add_parser(
        "get-tx", help="print cached tx JSON (miss if tip-adjacent with --tip)"
    )
    p_get.add_argument("txid")
    _add_reorg_gate(p_get)

    p_put = sub.add_parser("put-tx", help="upsert one Esplora tx object")
    p_put.add_argument("file", nargs="?", default="-")
    p_put.add_argument("--source", default="esplora")

    p_puts = sub.add_parser(
        "put-txs", help="upsert array of Esplora tx objects (also from /txs)"
    )
    p_puts.add_argument("file", nargs="?", default="-")
    p_puts.add_argument("--source", default="esplora")

    p_put_addr = sub.add_parser(
        "put-address-txs",
        help="cache address /txs page + upsert each tx (stale if address moves later)",
    )
    p_put_addr.add_argument("address")
    p_put_addr.add_argument("file", nargs="?", default="-")
    p_put_addr.add_argument(
        "--page-key",
        default="",
        help="empty = first page; else last txid of prior page for /txs/chain/",
    )
    p_put_addr.add_argument("--source", default="esplora")

    p_get_addr = sub.add_parser(
        "get-address-txs",
        help="print cached address page (miss if any tx tip-adjacent with --tip)",
    )
    p_get_addr.add_argument("address")
    p_get_addr.add_argument("--page-key", default="")
    _add_reorg_gate(p_get_addr)

    p_missing = sub.add_parser(
        "missing-txs",
        help="print txids not in cache / not reorg-safe",
    )
    p_missing.add_argument("file", nargs="?", default="-")
    _add_reorg_gate(p_missing)

    args = parser.parse_args(argv)
    conn = connect(args.db)

    if args.cmd == "stats":
        print(json.dumps(stats(conn), indent=2))
        return 0

    if args.cmd == "has-tx":
        row = get_tx(conn, args.txid)
        ok = bool(row) and tx_row_reorg_safe(
            row,
            tip_height=args.tip,
            min_confirmations=args.min_confirmations,
        )
        if row and not ok and args.tip is not None:
            conf = confirmations(row.get("block_height"), args.tip)
            print(
                f"miss (tip-adjacent: conf={conf}, need>={args.min_confirmations})",
                file=sys.stderr,
            )
        print("hit" if ok else "miss")
        return 0 if ok else 1

    if args.cmd == "get-tx":
        row = get_tx(conn, args.txid)
        if not row:
            print(f"miss: {args.txid}", file=sys.stderr)
            return 1
        if not tx_row_reorg_safe(
            row,
            tip_height=args.tip,
            min_confirmations=args.min_confirmations,
        ):
            conf = (
                confirmations(row.get("block_height"), args.tip)
                if args.tip is not None
                else None
            )
            print(
                f"miss (not reorg-safe: confirmed={row.get('confirmed')} "
                f"conf={conf} need>={args.min_confirmations}): {args.txid}",
                file=sys.stderr,
            )
            return 1
        print(json.dumps(row, indent=2, ensure_ascii=False))
        return 0

    if args.cmd == "put-tx":
        payload = _read_json_stdin_or_file(args.file)
        if not isinstance(payload, dict):
            print("put-tx expects a tx object", file=sys.stderr)
            return 2
        txid = upsert_tx(conn, payload, source=args.source)
        conn.commit()
        print(json.dumps({"upserted": txid}))
        return 0

    if args.cmd == "put-txs":
        payload = _read_json_stdin_or_file(args.file)
        if not isinstance(payload, list):
            print("put-txs expects a JSON array of txs", file=sys.stderr)
            return 2
        ids = upsert_txs(conn, payload, source=args.source)
        print(json.dumps({"upserted": len(ids), "txids": ids[:20]}))
        return 0

    if args.cmd == "put-address-txs":
        payload = _read_json_stdin_or_file(args.file)
        if not isinstance(payload, list):
            print("put-address-txs expects a JSON array of txs", file=sys.stderr)
            return 2
        result = put_address_txs(
            conn,
            args.address,
            payload,
            page_key=args.page_key,
            source=args.source,
        )
        print(json.dumps(result))
        return 0

    if args.cmd == "get-address-txs":
        row = get_address_txs(conn, args.address, page_key=args.page_key)
        if not row:
            print(f"miss: {args.address}", file=sys.stderr)
            return 1
        if args.tip is not None:
            unsafe = []
            for tx in row["txs"]:
                st = _status(tx)
                if not is_reorg_safe(
                    confirmed=bool(st.get("confirmed")),
                    block_height=st.get("block_height"),
                    tip_height=args.tip,
                    min_confirmations=args.min_confirmations,
                ):
                    unsafe.append(tx.get("txid"))
            if unsafe:
                print(
                    f"miss (tip-adjacent txs on page, e.g. {unsafe[0]}): "
                    f"{args.address}",
                    file=sys.stderr,
                )
                return 1
        print(json.dumps(row, indent=2, ensure_ascii=False))
        return 0

    if args.cmd == "missing-txs":
        raw = _read_json_stdin_or_file(args.file)
        if isinstance(raw, list):
            ids = [str(x) for x in raw]
        elif isinstance(raw, str):
            ids = [ln.strip() for ln in raw.splitlines() if ln.strip()]
        else:
            print("missing-txs expects JSON array of txids", file=sys.stderr)
            return 2
        miss: list[str] = []
        for i in ids:
            row = get_tx(conn, i)
            if not row or not tx_row_reorg_safe(
                row,
                tip_height=args.tip,
                min_confirmations=args.min_confirmations,
            ):
                miss.append(i)
        print(json.dumps(miss))
        return 0

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
