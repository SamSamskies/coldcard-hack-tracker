---
name: coldcard-hack-research
description: >-
  Research and update the Coldcard Hack Tracker dashboard — Galaxy/community
  wave fingerprints, consolidation vaults, collectors, hop cash-outs, and
  snapshot data. Use when researching the Coldcard RNG/seed-entropy hack,
  finding or verifying BTC addresses, updating incident.ts or wave3Vaults.ts,
  investigating a new wave, checking X/Reddit/Chainabuse/community reports, or
  refreshing on-chain facts for this repo.
---

# Coldcard Hack Research

Live tracker for BTC held after Coldcard seed-entropy sweeps (Jul 2026+).
Canonical facts live in code; explorers only supply live balances.

## When this skill applies

- User asks to research, verify, or update hack-related addresses / totals / waves
- New Galaxy or community report appears (X, blog, CoinDesk, etc.)
- Wave 3 vault list or snapshot needs refresh
- Investigating hops, cash-outs, or “where did the coins go?”

## Tooling order

1. **Read repo first** — `src/data/incident.ts`, `src/data/wave3Vaults.ts`, tests, README. Do not invent addresses that contradict existing clusters.
2. **Firecrawl** — search/scrape articles, advisories, and any public pages. Prefer writing to `.firecrawl/` (already gitignored).
3. **CK tripwire** — scrape **[cktripwire.com](https://cktripwire.com/)** (and [methodology](https://cktripwire.com/methodology) if needed) for honeypot **frontier** updates: which difficulty bands (trivial / low / mid / …) have been swept and fastest times. This maps attacker brute-force depth (dice/passphrase entropy), not stolen consolidation. **Do not** add honeypot addresses or sweep sinks to `CORE_HOLDING_ADDRESSES` / Wave 3 / stolen totals. If a new band is swept, update the CK tripwire `SOURCES` note and the RiskChecklist “Lower risk” cite as needed. Also check `@jamesob` posts when the scoreboard moved.
4. **X/Twitter** — prefer the **X MCP** (`xapi` via `@xdevplatform/xurl` → `https://api.x.com/mcp`). **Do not call `search_posts_all`** — full-archive search needs App-Only Bearer + pay-per-use; our MCP session is user OAuth and that tool 403s. Use read tools only: in the quiet period, poll **on demand** (prefer `glxyresearch`; add `intangiblecoins` / `KevinKelbie` only when hunting community leads) — not all three every research pass; situational accounts only when needed; one-shot reporters via known post id — see [reference.md](reference.md). Then `get_posts_by_id` / `get_posts_by_ids` for threads. **Before fetching, check the local SQLite cache** (`scripts/x_cache.py has|get|list-user`) so repeat research does not re-burn credits on the same ids; after a successful MCP response, **`put-posts`** the JSON into `.firecrawl/x-cache.sqlite` (gitignored). **Keyword / recent search is gated:** do **not** run `npx -y @xdevplatform/xurl search …`, raw `/2/tweets/search/recent`, or `search_posts_all` unless the user explicitly approves that query (credits ≈ **$0.005 × posts returned**; MCP and CLI share the same pool). When proposing a search, state the query, `max_results`, and rough cost, then wait. Pace approved calls — quotas burn fast. Keep canonical `x.com` URLs in `sourceUrl`. For Galaxy chart **media/OCR**, MCP text is often enough; if you need `pbs.twimg.com/...name=orig` image URLs, fall back to **[xcancel.com](https://xcancel.com/)** (rewrite `https://x.com/...` → `https://xcancel.com/...`). If MCP auth fails or is rate-limited, try xcancel, then ask the user for text/screenshot. Never guess totals from a broken fetch. Do not use bookmark/write tools for research.
5. **Reddit** — use Firecrawl **search** (`site:reddit.com`, `r/Bitcoin`, `r/coldcard`, etc.) for leads. Firecrawl often **cannot scrape** Reddit thread pages (blocked / unsupported); Reddit’s public JSON API is also frequently 403 from agents. Treat search titles/snippets as leads only — ask the user to paste a thread if comments matter. Prefer primary X/blog links from posts, then verify on-chain before editing data.
6. **Chainabuse** — secondary victim-corroboration / lead source ([chainabuse.com](https://www.chainabuse.com/)). Search for candidate attacker addresses, or keywords like `coldcard` / `cold card hack`. Reports often list destination addresses + sweep txids. Treat as **unverified self-reports**: useful to strengthen a pattern-matched sink or surface small waves early, never as proof of totals or attribution. Always verify reported addresses/txids on-chain before editing data. Cite the report URL in notes when it corroborates a holding. If scrape/search is blocked, ask the user for the report link or paste — do not invent victim claims.
7. **On-chain** — follow **[btc-esplora-verify](../btc-esplora-verify/SKILL.md)** (curl/jq recipes, fingerprint checklist, hop rules). Prefer `mempool.bitaroo.net` or `mempool.emzy.de` for bulk scans; do not stampede `mempool.space` / Blockstream. Pace ≥400ms between host calls. For confirmed txs already fetched this session, prefer **`scripts/btc_cache.py`** (`.firecrawl/chain-cache.sqlite`) over re-hitting Esplora.
8. **Cash-outs / labels** — when vaults empty or hops hit exchanges/bridges, follow **[cashout-labeling](../cashout-labeling/SKILL.md)** (holding vs label-only, Arkham primary / OKLink secondary / Bithypha tertiary for unlabeled hops, `KNOWN_ADDRESS_LABELS`). Bridge decode (THOR / Hyperunit / Chainflip → post-bridge dest): **[btc-bridge-follow](../btc-bridge-follow/SKILL.md)**.
9. **OCR** — for chart images (Galaxy maps), use local Vision/OCR; do not trust eyeballed BTC figures.

Do **not** run `scan-new-waves.py` from this skill, and do **not** offer or ask about a tip / new-wave scan at the end of a research report. Quiet period: tip scouting is a separate explicit ask via **[new-wave-scan](../new-wave-scan/SKILL.md)** only.

### When blocked

After **one** clear failure (bot wall, unsupported site, 403/429 that retries won’t fix, empty scrape, explorer outage / SSL / timeouts), **ask the user for help** instead of looping. Say what you needed and what failed, then offer a concrete ask, e.g.:

- **Approve Blockchair** for the on-chain check (balances / tip scout) — state the planned command + ballpark request points; user has said to ask for this when Esplora is blocked or slow
- Paste the X/Reddit/blog text or a screenshot
- Open a URL and confirm what it shows
- Re-auth X MCP (`npx -y @xdevplatform/xurl auth oauth2`) or `firecrawl login` if credits/auth died
- Approve a slower/manual path (browser, different host)

Do not invent facts to paper over a blocked fetch. Partial results are fine — report what you have and what’s missing.

Details: [reference.md](reference.md).

## Source of truth

| Kind | Where |
|------|--------|
| Clusters, fingerprints, core holdings, sources | `src/data/incident.ts` |
| Wave 3 watch list (≥ 0.5 BTC) | `src/data/wave3Vaults.ts` |
| Invariants | `src/data/incident.test.ts` |
| Live Wave 3 balances | `public/snapshot.json` via `npm run snapshot` |
| Offline Wave 3 discovery | `scripts/find-wave3-vaults.py`, `scripts/wave3-out/` |

Galaxy Waves 1–3 `stolenBtc` must continue to sum to `GALAXY.totalStolenBtc` (~1367.05).

## Research workflow

```
Task:
- [ ] Identify claim (new wave / new vault / cash-out / total update)
- [ ] Locate primary source (Galaxy X, community reporter, advisory)
- [ ] Re-check cktripwire.com for frontier / honeypot sweeps (not stolen holdings)
- [ ] Check Reddit for corroborating / earlier community leads
- [ ] Check Chainabuse for victim reports on candidate addresses (or coldcard keyword leads)
- [ ] Extract fingerprint: blocks, fee sat/vB, structure (1-out sweep, park→P2WSH, etc.)
- [ ] Cross-check on-chain (address balance, funding txs, fee rates)
- [ ] Decide: core holding vs Wave 3 watch vs label-only
- [ ] Edit data + tests; run npm test; optionally npm run snapshot
```
### Classifying addresses

| Role | Meaning | Where it goes |
|------|---------|----------------|
| **Vault** | Consolidation landing still (or formerly) holding the stack | `CORE_HOLDING_ADDRESSES` or Wave 3 list |
| **Collector** | Parallel fee-band sink / unmoved remainder | Core holding with clear label |
| **Park** | Wave 3 intermediate P2WPKH before P2WSH vault | Research only — not a dashboard holding |
| **Hop / cash-out** | Destination after spend | Follow via hop logic; label in `KNOWN_ADDRESS_LABELS` if known — see [cashout-labeling](../cashout-labeling/SKILL.md) |
| **Not stolen** | Ocean peels, surplus pass-through while report balance still held; **CK tripwire honeypots** | Document in notes; do **not** add to stolen totals |

### Wave 3 rules (critical)

- List is **not** Galaxy’s published addresses — reconstructed from fingerprint + public COLDCARD RNG chain map.
- Keep only vaults ≥ `WAVE3_MIN_WATCH_BTC` (0.5). Smaller vaults omitted on purpose.
- Prefer regenerating from `scripts/find-wave3-vaults.py` + `scripts/wave3-out/merged/vaults.csv` over copying tweet screenshots.
- Fingerprint: blocks **960396–960471**, fee **180–220** sat/vB, pattern **victim → park → P2WSH**.

### Adding a new community wave

1. Add fingerprint const + `ClusterId` + `CLUSTERS` entry (`stolenBtc`, day-granularity `date`, `sourceUrl`, honest `note`).
2. Add one+ entries to `CORE_HOLDING_ADDRESSES` (`reportBtc`, `clusterId`, label).
3. Update UI copy only if `AddressList` / timeline needs fingerprint meta.
4. Extend `incident.test.ts` invariants.
5. Run `npm test`, then `npm run snapshot` if holdings changed.

### Updating Galaxy headlines

- Edit `GALAXY` and Wave 1–3 cluster `stolenBtc` together.
- Re-check `SOURCES` / notes for wording that would overclaim (e.g. implying Wave 3 list is Galaxy’s).

## On-chain verification checklist

Use **[btc-esplora-verify](../btc-esplora-verify/SKILL.md)** for commands. Summary:

1. Confirm current balance vs claimed `reportBtc` (allow fees / partial moves).
2. Confirm funding txs sit in the claimed block/fee band when asserting a fingerprint match.
3. Prefer single-output sweeps / documented park→vault hops; reject unrelated consolidations.
4. If vault spent: note destinations; use hop rules (max depth 2, ignore &lt; 0.01 BTC dust, surplus pass-through ignored). Movement watch starts after block **960400**.

## Do / don’t

**Do**

- Cite primary sources in `sourceUrl` / notes.
- Keep day-granularity dates unless the report supports finer timing.
- Prefer explorer mirrors for bulk work; write research dumps under `.firecrawl/` or `scripts/wave3-out/`.
- Ask the user after a hard block — don’t burn credits on endless retries.
- Run `npm test` after data edits.

**Don’t**

- Treat Ocean miner peels or surplus pass-through as stolen movement.
- Add P2SH service hubs as holdings (labels only in `KNOWN_ADDRESS_LABELS`; Wave 4 destination parks that happen to be base58 `1…`/`3…` *are* holdings and must stay in `CORE_HOLDING_ADDRESSES`).
- Treat Chainabuse filings as proof of stolen totals or same-operator attribution without on-chain fingerprint match.
- Stampede public explorers or invent Wave 3 addresses from incomplete scrapes.
- Quietly skip a blocked primary source and guess totals from secondary press.
- Commit `.firecrawl/` or raw `scripts/wave3-out/` checkpoints unless the user asks.

## After edits

```bash
npm test
npm run snapshot   # if holdings / Wave 3 list changed
```

Push to `main` (or wait for Actions) so `public/snapshot.json` refreshes for Wave 3.
