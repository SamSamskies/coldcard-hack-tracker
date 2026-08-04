"""
Thin Blockchair API client for local/agent research.

Loads BLOCKCHAIR_API_KEY from the environment or repo-root .env.
Never print the key. Snapshot cron must not import/use this module.
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_BASE = "https://api.blockchair.com"
DEFAULT_CHAIN = "bitcoin"
USER_AGENT = "coldcard-blockchair/1.0"


class BlockchairError(RuntimeError):
    def __init__(self, message: str, *, code: int | None = None, body: Any = None):
        super().__init__(message)
        self.code = code
        self.body = body


def load_dotenv(path: Path | None = None) -> None:
    """Set missing env vars from a .env file (does not override existing)."""
    env_path = path or (ROOT / ".env")
    if not env_path.is_file():
        return
    for line in env_path.read_text().splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        key, val = s.split("=", 1)
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, val)


def get_api_key() -> str | None:
    load_dotenv()
    key = (os.environ.get("BLOCKCHAIR_API_KEY") or "").strip()
    return key or None


class Blockchair:
    def __init__(
        self,
        api_key: str,
        *,
        chain: str = DEFAULT_CHAIN,
        base: str = DEFAULT_BASE,
        timeout: float = 45.0,
        min_interval: float = 0.15,
    ):
        if not api_key:
            raise BlockchairError("BLOCKCHAIR_API_KEY is empty")
        self.api_key = api_key
        self.chain = chain
        self.base = base.rstrip("/")
        self.timeout = timeout
        self.min_interval = min_interval
        self._last_req = 0.0
        self.request_cost_total = 0.0
        self.request_count = 0

    def _sleep_rate(self) -> None:
        gap = time.monotonic() - self._last_req
        if gap < self.min_interval:
            time.sleep(self.min_interval - gap)

    def get(
        self,
        path: str,
        params: dict[str, Any] | None = None,
        *,
        retries: int = 4,
    ) -> dict[str, Any]:
        """GET path under /{chain}/… with key= appended. path may start with /."""
        q = dict(params or {})
        q["key"] = self.api_key
        path = path if path.startswith("/") else f"/{path}"
        url = f"{self.base}/{self.chain}{path}?{urllib.parse.urlencode(q, safe='(),.')}"
        last_err: Exception | None = None
        for attempt in range(retries):
            self._sleep_rate()
            try:
                req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    raw = resp.read()
                    self._last_req = time.monotonic()
                    body = json.loads(raw) if raw else {}
                    self._accumulate_cost(body)
                    code = (body.get("context") or {}).get("code", 200)
                    if code != 200:
                        err = (body.get("context") or {}).get("error") or f"code {code}"
                        raise BlockchairError(str(err), code=int(code), body=body)
                    return body
            except urllib.error.HTTPError as e:
                self._last_req = time.monotonic()
                raw = e.read().decode("utf-8", "replace")
                body: Any = None
                try:
                    body = json.loads(raw) if raw else None
                except json.JSONDecodeError:
                    body = raw
                ctx = (body or {}).get("context") if isinstance(body, dict) else {}
                err = (ctx or {}).get("error") or e.reason
                if e.code in (402, 430):
                    raise BlockchairError(
                        f"HTTP {e.code}: {err}", code=e.code, body=body
                    ) from e
                if e.code in (429, 435, 502, 503, 504) and attempt + 1 < retries:
                    wait = min(60.0, (2**attempt) * 1.5)
                    print(
                        f"  blockchair HTTP {e.code} — sleep {wait:.1f}s "
                        f"(attempt {attempt + 1}/{retries})",
                        flush=True,
                    )
                    time.sleep(wait)
                    last_err = BlockchairError(
                        f"HTTP {e.code}: {err}", code=e.code, body=body
                    )
                    continue
                raise BlockchairError(
                    f"HTTP {e.code}: {err}", code=e.code, body=body
                ) from e
            except BlockchairError:
                raise
            except Exception as e:
                self._last_req = time.monotonic()
                last_err = e
                if attempt + 1 < retries:
                    wait = min(30.0, (2**attempt) * 1.0)
                    print(
                        f"  blockchair error {type(e).__name__}: {e} — "
                        f"sleep {wait:.1f}s",
                        flush=True,
                    )
                    time.sleep(wait)
                    continue
                raise BlockchairError(str(e)) from e
        raise BlockchairError(f"failed {path}: {last_err}")

    def post_form(
        self,
        path: str,
        form: dict[str, str],
        *,
        retries: int = 4,
    ) -> dict[str, Any]:
        path = path if path.startswith("/") else f"/{path}"
        url = (
            f"{self.base}/{self.chain}{path}"
            f"?{urllib.parse.urlencode({'key': self.api_key})}"
        )
        data = urllib.parse.urlencode(form).encode()
        last_err: Exception | None = None
        for attempt in range(retries):
            self._sleep_rate()
            try:
                req = urllib.request.Request(
                    url,
                    data=data,
                    method="POST",
                    headers={
                        "User-Agent": USER_AGENT,
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                )
                with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                    raw = resp.read()
                    self._last_req = time.monotonic()
                    body = json.loads(raw) if raw else {}
                    self._accumulate_cost(body)
                    code = (body.get("context") or {}).get("code", 200)
                    if code != 200:
                        err = (body.get("context") or {}).get("error") or f"code {code}"
                        raise BlockchairError(str(err), code=int(code), body=body)
                    return body
            except urllib.error.HTTPError as e:
                self._last_req = time.monotonic()
                raw = e.read().decode("utf-8", "replace")
                try:
                    body = json.loads(raw) if raw else None
                except json.JSONDecodeError:
                    body = raw
                ctx = (body or {}).get("context") if isinstance(body, dict) else {}
                err = (ctx or {}).get("error") or e.reason
                if e.code in (402, 430):
                    raise BlockchairError(
                        f"HTTP {e.code}: {err}", code=e.code, body=body
                    ) from e
                if e.code in (429, 435, 502, 503, 504) and attempt + 1 < retries:
                    wait = min(60.0, (2**attempt) * 1.5)
                    time.sleep(wait)
                    last_err = BlockchairError(
                        f"HTTP {e.code}: {err}", code=e.code, body=body
                    )
                    continue
                raise BlockchairError(
                    f"HTTP {e.code}: {err}", code=e.code, body=body
                ) from e
            except BlockchairError:
                raise
            except Exception as e:
                self._last_req = time.monotonic()
                last_err = e
                if attempt + 1 < retries:
                    time.sleep(min(30.0, (2**attempt) * 1.0))
                    continue
                raise BlockchairError(str(e)) from e
        raise BlockchairError(f"failed POST {path}: {last_err}")

    def _accumulate_cost(self, body: dict[str, Any]) -> None:
        self.request_count += 1
        cost = (body.get("context") or {}).get("request_cost")
        if cost is not None:
            try:
                self.request_cost_total += float(cost)
            except (TypeError, ValueError):
                pass

    def iter_table(
        self,
        table: str,
        *,
        q: str,
        limit: int = 100,
        max_pages: int = 50,
    ):
        """Yield rows from an infinitable (transactions, outputs, …)."""
        offset = 0
        pages = 0
        while pages < max_pages:
            body = self.get(
                f"/{table}",
                {"q": q, "limit": str(limit), "offset": str(offset)},
            )
            rows = body.get("data") or []
            if not isinstance(rows, list):
                raise BlockchairError(f"unexpected {table} payload", body=body)
            yield from rows
            ctx = body.get("context") or {}
            if len(rows) < limit:
                break
            offset += len(rows)
            pages += 1
            total = ctx.get("total_rows")
            if total is not None and offset >= int(total):
                break

    def address_balances(self, addresses: list[str]) -> dict[str, int]:
        """
        Mass balance check (confirmed sats). Missing / zero-balance addrs omitted.
        Cost ≈ 1 + 0.001 * len(addresses).
        """
        if not addresses:
            return {}
        # API allows up to 25_000; keep batches modest for URL/body size.
        out: dict[str, int] = {}
        batch_size = 5_000
        for i in range(0, len(addresses), batch_size):
            chunk = addresses[i : i + batch_size]
            body = self.post_form(
                "/addresses/balances",
                {"addresses": ",".join(chunk)},
            )
            data = body.get("data") or {}
            if not isinstance(data, dict):
                raise BlockchairError("unexpected balances payload", body=body)
            for addr, sats in data.items():
                out[str(addr)] = int(sats)
        return out


def fee_sat_per_vb(fee: int | float, weight: int | float) -> float:
    """Match Esplora scout: fee / (weight/4)."""
    w = float(weight)
    if w <= 0:
        return 0.0
    return float(fee) / (w / 4.0)
