#!/usr/bin/env python3
"""
Local SQLite cache for X/Twitter posts fetched during research.

Avoids re-pulling the same post ids / timeline pages through MCP or xurl
(shared pay-per-use credit pool). Does **not** call the X API itself — the
agent (or a wrapper) fetches, then `put`; next time `get` is a cache hit.

DB path (gitignored via .firecrawl/):
  .firecrawl/x-cache.sqlite

Examples:
  python3 scripts/x_cache.py stats
  python3 scripts/x_cache.py has 2084892387445244196
  python3 scripts/x_cache.py get 2084892387445244196
  python3 scripts/x_cache.py put-post < post.json
  python3 scripts/x_cache.py put-posts < mcp_response.json
  python3 scripts/x_cache.py list-user mariusoffchain --since 2026-08-04T00:00:00Z
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
DEFAULT_DB = ROOT / ".firecrawl" / "x-cache.sqlite"

SCHEMA = """
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  author_id TEXT,
  author_username TEXT,
  created_at TEXT,
  text TEXT,
  note_tweet TEXT,
  conversation_id TEXT,
  url TEXT,
  raw_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  source TEXT
);

CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_username ON posts(author_username);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  name TEXT,
  raw_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  source TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS timeline_fetches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  username TEXT,
  start_time TEXT,
  end_time TEXT,
  since_id TEXT,
  until_id TEXT,
  newest_id TEXT,
  oldest_id TEXT,
  result_count INTEGER,
  post_ids_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  source TEXT
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


def _note_tweet_text(post: dict[str, Any]) -> str | None:
    nt = post.get("note_tweet")
    if isinstance(nt, dict):
        return nt.get("text")
    if isinstance(nt, str):
        return nt
    return None


def _username_from_includes(
    post: dict[str, Any], includes: dict[str, Any] | None
) -> str | None:
    if post.get("username"):
        return post["username"]
    author_id = post.get("author_id")
    if not author_id or not includes:
        return None
    for u in includes.get("users") or []:
        if str(u.get("id")) == str(author_id):
            return u.get("username")
    return None


def upsert_post(
    conn: sqlite3.Connection,
    post: dict[str, Any],
    *,
    includes: dict[str, Any] | None = None,
    source: str = "mcp",
    fetched_at: str | None = None,
) -> str:
    pid = str(post.get("id") or "")
    if not pid:
        raise ValueError("post missing id")
    username = _username_from_includes(post, includes)
    conn.execute(
        """
        INSERT INTO posts (
          id, author_id, author_username, created_at, text, note_tweet,
          conversation_id, url, raw_json, fetched_at, source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          author_id=excluded.author_id,
          author_username=COALESCE(excluded.author_username, posts.author_username),
          created_at=COALESCE(excluded.created_at, posts.created_at),
          text=COALESCE(excluded.text, posts.text),
          note_tweet=COALESCE(excluded.note_tweet, posts.note_tweet),
          conversation_id=COALESCE(excluded.conversation_id, posts.conversation_id),
          url=COALESCE(excluded.url, posts.url),
          raw_json=excluded.raw_json,
          fetched_at=excluded.fetched_at,
          source=excluded.source
        """,
        (
            pid,
            str(post["author_id"]) if post.get("author_id") is not None else None,
            username,
            post.get("created_at"),
            post.get("text"),
            _note_tweet_text(post),
            str(post["conversation_id"])
            if post.get("conversation_id") is not None
            else None,
            post.get("url"),
            json.dumps(post, ensure_ascii=False),
            fetched_at or utc_now(),
            source,
        ),
    )
    return pid


def upsert_user(
    conn: sqlite3.Connection,
    user: dict[str, Any],
    *,
    source: str = "mcp",
    fetched_at: str | None = None,
) -> str:
    uid = str(user.get("id") or "")
    if not uid:
        raise ValueError("user missing id")
    conn.execute(
        """
        INSERT INTO users (id, username, name, raw_json, fetched_at, source)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          username=COALESCE(excluded.username, users.username),
          name=COALESCE(excluded.name, users.name),
          raw_json=excluded.raw_json,
          fetched_at=excluded.fetched_at,
          source=excluded.source
        """,
        (
            uid,
            user.get("username"),
            user.get("name"),
            json.dumps(user, ensure_ascii=False),
            fetched_at or utc_now(),
            source,
        ),
    )
    return uid


def ingest_payload(
    conn: sqlite3.Connection,
    payload: Any,
    *,
    source: str = "mcp",
    username_hint: str | None = None,
    start_time: str | None = None,
    end_time: str | None = None,
    since_id: str | None = None,
    until_id: str | None = None,
) -> dict[str, int]:
    """
    Accepts:
      - a single post object
      - MCP-style { data: post|posts[], includes?: { users, tweets } }
      - a bare list of posts
    """
    fetched_at = utc_now()
    posts: list[dict[str, Any]] = []
    includes: dict[str, Any] = {}
    meta: dict[str, Any] = {}

    if isinstance(payload, list):
        posts = [p for p in payload if isinstance(p, dict)]
    elif isinstance(payload, dict):
        if "data" in payload:
            data = payload["data"]
            if isinstance(data, list):
                posts = [p for p in data if isinstance(p, dict)]
            elif isinstance(data, dict) and data.get("id"):
                posts = [data]
            includes = payload.get("includes") or {}
            meta = payload.get("meta") or {}
        elif payload.get("id") and (
            "text" in payload or "created_at" in payload or "author_id" in payload
        ):
            posts = [payload]
            includes = payload.get("includes") or {}
        else:
            raise ValueError("unrecognized JSON shape for put")
    else:
        raise ValueError("payload must be object or array")

    n_posts = 0
    for p in posts:
        # Skip pure retweet shells only if they lack useful text? Keep them —
        # id is still useful for since_id watermarking.
        upsert_post(
            conn, p, includes=includes, source=source, fetched_at=fetched_at
        )
        n_posts += 1

    # Included referenced tweets (quoted / retweeted originals)
    for t in includes.get("tweets") or []:
        if isinstance(t, dict) and t.get("id"):
            upsert_post(
                conn, t, includes=includes, source=source, fetched_at=fetched_at
            )
            n_posts += 1

    n_users = 0
    for u in includes.get("users") or []:
        if isinstance(u, dict) and u.get("id"):
            upsert_user(conn, u, source=source, fetched_at=fetched_at)
            n_users += 1

    # Timeline watermark when this looks like get_users_posts
    if posts and (meta.get("newest_id") or start_time or since_id):
        author_id = posts[0].get("author_id")
        username = username_hint or _username_from_includes(posts[0], includes)
        post_ids = [str(p["id"]) for p in posts if p.get("id")]
        conn.execute(
            """
            INSERT INTO timeline_fetches (
              user_id, username, start_time, end_time, since_id, until_id,
              newest_id, oldest_id, result_count, post_ids_json, fetched_at, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(author_id) if author_id is not None else None,
                username,
                start_time,
                end_time,
                since_id or meta.get("oldest_id"),
                until_id,
                meta.get("newest_id"),
                meta.get("oldest_id"),
                meta.get("result_count", len(post_ids)),
                json.dumps(post_ids),
                fetched_at,
                source,
            ),
        )

    conn.commit()
    return {"posts": n_posts, "users": n_users}


def get_post(conn: sqlite3.Connection, post_id: str) -> dict[str, Any] | None:
    row = conn.execute("SELECT * FROM posts WHERE id = ?", (str(post_id),)).fetchone()
    if not row:
        return None
    out = dict(row)
    out["raw"] = json.loads(out.pop("raw_json"))
    return out


def has_post(conn: sqlite3.Connection, post_id: str) -> bool:
    row = conn.execute(
        "SELECT 1 FROM posts WHERE id = ? LIMIT 1", (str(post_id),)
    ).fetchone()
    return row is not None


def list_user_posts(
    conn: sqlite3.Connection,
    username: str,
    *,
    since: str | None = None,
    until: str | None = None,
    limit: int = 50,
) -> list[dict[str, Any]]:
    sql = """
      SELECT id, author_username, created_at, text, note_tweet, url, fetched_at
      FROM posts
      WHERE lower(author_username) = lower(?)
    """
    params: list[Any] = [username]
    if since:
        sql += " AND created_at >= ?"
        params.append(since)
    if until:
        sql += " AND created_at < ?"
        params.append(until)
    sql += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    return [dict(r) for r in conn.execute(sql, params).fetchall()]


def stats(conn: sqlite3.Connection) -> dict[str, Any]:
    posts = conn.execute("SELECT COUNT(*) AS n FROM posts").fetchone()["n"]
    users = conn.execute("SELECT COUNT(*) AS n FROM users").fetchone()["n"]
    fetches = conn.execute(
        "SELECT COUNT(*) AS n FROM timeline_fetches"
    ).fetchone()["n"]
    newest = conn.execute(
        "SELECT created_at FROM posts ORDER BY created_at DESC LIMIT 1"
    ).fetchone()
    return {
        "db": str(DEFAULT_DB),
        "posts": posts,
        "users": users,
        "timeline_fetches": fetches,
        "newest_post_created_at": newest["created_at"] if newest else None,
    }


def _read_json_stdin_or_file(path: str | None) -> Any:
    if path and path != "-":
        return json.loads(Path(path).read_text())
    return json.load(sys.stdin)


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

    p_has = sub.add_parser("has", help="exit 0 if post id cached")
    p_has.add_argument("post_id")

    p_get = sub.add_parser("get", help="print cached post JSON")
    p_get.add_argument("post_id")

    p_put = sub.add_parser(
        "put-post", help="upsert one post object from stdin/file"
    )
    p_put.add_argument("file", nargs="?", default="-")
    p_put.add_argument("--source", default="mcp")

    p_puts = sub.add_parser(
        "put-posts",
        help="upsert MCP get_users_posts / get_posts_by_id response JSON",
    )
    p_puts.add_argument("file", nargs="?", default="-")
    p_puts.add_argument("--source", default="mcp")
    p_puts.add_argument("--username", default=None)
    p_puts.add_argument("--start-time", default=None)
    p_puts.add_argument("--end-time", default=None)
    p_puts.add_argument("--since-id", default=None)
    p_puts.add_argument("--until-id", default=None)

    p_list = sub.add_parser("list-user", help="list cached posts by username")
    p_list.add_argument("username")
    p_list.add_argument("--since", default=None)
    p_list.add_argument("--until", default=None)
    p_list.add_argument("--limit", type=int, default=50)

    p_missing = sub.add_parser(
        "missing",
        help="print post ids from stdin (JSON array or newline list) not in cache",
    )
    p_missing.add_argument("file", nargs="?", default="-")

    args = parser.parse_args(argv)
    conn = connect(args.db)

    if args.cmd == "stats":
        print(json.dumps(stats(conn), indent=2))
        return 0

    if args.cmd == "has":
        ok = has_post(conn, args.post_id)
        print("hit" if ok else "miss")
        return 0 if ok else 1

    if args.cmd == "get":
        row = get_post(conn, args.post_id)
        if not row:
            print(f"miss: {args.post_id}", file=sys.stderr)
            return 1
        print(json.dumps(row, indent=2, ensure_ascii=False))
        return 0

    if args.cmd == "put-post":
        payload = _read_json_stdin_or_file(args.file)
        if not isinstance(payload, dict):
            print("put-post expects a post object", file=sys.stderr)
            return 2
        pid = upsert_post(conn, payload, source=args.source)
        conn.commit()
        print(json.dumps({"upserted": pid}))
        return 0

    if args.cmd == "put-posts":
        payload = _read_json_stdin_or_file(args.file)
        result = ingest_payload(
            conn,
            payload,
            source=args.source,
            username_hint=args.username,
            start_time=args.start_time,
            end_time=args.end_time,
            since_id=args.since_id,
            until_id=args.until_id,
        )
        print(json.dumps(result))
        return 0

    if args.cmd == "list-user":
        rows = list_user_posts(
            conn,
            args.username,
            since=args.since,
            until=args.until,
            limit=args.limit,
        )
        print(json.dumps(rows, indent=2, ensure_ascii=False))
        return 0

    if args.cmd == "missing":
        raw = _read_json_stdin_or_file(args.file)
        if isinstance(raw, list):
            ids = [str(x) for x in raw]
        elif isinstance(raw, str):
            ids = [ln.strip() for ln in raw.splitlines() if ln.strip()]
        else:
            print("missing expects JSON array of ids", file=sys.stderr)
            return 2
        miss = [i for i in ids if not has_post(conn, i)]
        print(json.dumps(miss))
        return 0

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
