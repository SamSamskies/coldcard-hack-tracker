---
name: new-wave-scan
description: >-
  Periodically scout the last 3 Bitcoin tip blocks for unreported
  Coldcard-hack-like sweep waves (dense 1-vout fee clusters). Default is
  shallow tip-only (--no-escalate); do not deep-scan or backfill unless the
  user explicitly asks.   Prefer on-demand / ~daily while quiet — not part of a research
  pass, and do not offer it after research. Use only when the user
  explicitly asks to check for new waves, tip sweeps, or a local
  wave check.
---

# New Wave Scan

Proactive **tip-only** scout for this tracker. Default: last **3** tip blocks.
Does **not** auto-edit `incident.ts`.

Related: [btc-esplora-verify](../btc-esplora-verify/SKILL.md),
[coldcard-hack-research](../coldcard-hack-research/SKILL.md).

## Hard scope (do not improvise)

Unless the user **explicitly** asks for a deep / wider / historical scan:

- Run **only** the last **3** tip blocks.
- Prefer Esplora by default for agents. Use `--blockchair` only after a
  **cost estimate + user OK** (see below) when `BLOCKCHAIR_API_KEY` is set.
- Do **not** use `--blocks`, `--escalate-blocks`, `--start`/`--end`, or `--refetch`.
- Do **not** “fill a tip gap,” catch up a behind checkpoint, or widen after a
  noisy/false-looking candidate on your own.
- A script note that the checkpoint skipped blocks is **not** permission to
  backfill — report the tip-window verdict and stop.

Deep modes (auto-escalate to 12, `--blocks N`, fixed `--start`/`--end`) only
when the user asks (e.g. “deep scan,” “scan 12 blocks,” “scan blocks X–Y”).

## Blockchair cost gate (required)

Pay-as-you-go quota (~10k points). **Never** call Blockchair until you tell the
user an estimate and they approve (or they already asked to spend it).

Rough costs (weighted points, not HTTP call counts):

| Action | Ballpark |
|--------|----------|
| `blockchair-balances.py` N addrs | ≈ `1 + 0.001×N` |
| Tip scout 3 blocks `--blockchair` (current path) | **often 100–500+**; dense tip blocks have been ~100 pts for the 1-vout SQL page alone |
| Historical / >12 blocks | Do not run without explicit `--blockchair-force` + user OK |

Before running:

1. State planned command + block/address count.
2. Give a ballpark point cost and remaining budget if known.
3. Wait for OK (unless the user already said to use Blockchair for this run).
4. Prefer Esplora when the estimate is unclear or the work can wait.

After a Blockchair run, report **actual** `blockchair cost:` / stderr cost lines.

## When to run

- User: “check for new waves”, “scan tip”, “any new sweeps?”
- Prefer **on demand** or at most ~daily while the incident is quiet — do not
  treat tip scouting as a routine every-research-pass chore.
- Skip proactive scans when the user is only updating labels / cash-outs /
  docs and has not asked about new waves.

## Workflow

```
- [ ] If using Blockchair: estimate points + get user OK first
- [ ] Run tip scout:
      python3 scripts/scan-new-waves.py --no-escalate --blockchair   # only after OK
      python3 scripts/scan-new-waves.py --no-escalate                # default / no key
- [ ] Read verdict from stdout / scripts/wave-scan-out/latest.json
- [ ] If Blockchair: report actual request cost from logs
- [ ] If NO_NEW_CANDIDATES → report clean tip window; stop
- [ ] If candidates → verify sample txids + dest freshness (still no widen)
- [ ] Optional community lead check (X MCP timelines / post IDs, else xcancel)
- [ ] Only then follow coldcard-hack-research to add cluster/holdings
- [ ] Ask before any deeper scan if verification needs a wider window
```

## Run the scout

```bash
# Default for agents (free Esplora) unless user approved Blockchair spend
python3 scripts/scan-new-waves.py --no-escalate

# After cost estimate + user OK (needs BLOCKCHAIR_API_KEY in env/.env)
python3 scripts/scan-new-waves.py --no-escalate --blockchair

# Only if user asks for auto-widen on hit (shallow 3 → escalate to 12)
python3 scripts/scan-new-waves.py
# With Blockchair, escalate past 12 tip blocks needs --blockchair-force

# Only if user asks for deep / custom depth
python3 scripts/scan-new-waves.py --blocks 12
python3 scripts/scan-new-waves.py --escalate-blocks 18

# Only if user asks to force re-fetch the tip window
python3 scripts/scan-new-waves.py --refetch

# Only if user asks for a historical / fixed range
python3 scripts/scan-new-waves.py --start 960800 --end 960820 --sample-every 1
```

**Blockchair:** opt-in via `--blockchair` + `BLOCKCHAIR_API_KEY` **after cost
gate**. Filters 1-vout txs via SQL, then hydrates recipients with batched
`dashboards/transactions` (≤10/call). Soft-max **12** blocks unless
`--blockchair-force`. On API failure the scout **aborts** (no silent Esplora
fallback). Never use the key in snapshot cron.

**Policy:** tip window only (3 blocks) unless explicitly asked for deeper.
Never backfill missed history on your own.

| Mode | Meaning |
|------|---------|
| `tip` / `tip-delta` | Shallow tip window |
| `tip-escalated` | Candidates found → widened to `--escalate-blocks` |
| `uptodate` | Checkpoint already covers tip |
| `fixed` | Explicit `--start`/`--end` research range |

Hosts (Esplora default): **blockstream.info** first, then bitaroo → emzy. Pace default **200ms**.
Output gitignored under `scripts/wave-scan-out/`.

Expect ~1–2 min/block on Blockstream Esplora; Blockchair tip checks are usually
much faster. Clean 3-block Esplora checks ~5 min; escalate adds ~the extra 9
blocks when something looks off.

## Interpreting results

| Signal | Meaning |
|--------|---------|
| `NO_NEW_CANDIDATES` | No Coldcard-shaped fee peak in the tip window |
| `escalated: true` | Shallow hit triggered deeper tip scan |
| `shape: park-like` / `vault-like` | Wave-like lead — still verify |
| `noisy_fee_band: true` | Skepticism required |

Never edit `incident.ts` from scout output alone. One destination eating most BTC
in a “park-like” cluster is usually ordinary traffic, not a Coldcard wave.

## Confirm a candidate

1. Sample txids → 1-vout + fee via esplora skill.
2. Dest freshness; consolidation pattern.
3. Optional same-day reports via X MCP timelines / known accounts (else xcancel).
   Do not use `search_posts_all`.
4. If real → coldcard-hack-research; add range to `KNOWN_WINDOWS`.

## Report format

```
Wave scan · {mode} · window {start}–{end} (tip {tip})
Verdict: clean | N candidate(s) [escalated]
```

## Maintenance

Update `KNOWN_WINDOWS` in `scripts/scan-new-waves.py` when a new wave’s block
range is known. Evening wave has no published window — treat ≤3 sat/vB skeptically.
