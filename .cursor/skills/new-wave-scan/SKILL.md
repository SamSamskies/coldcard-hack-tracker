---
name: new-wave-scan
description: >-
  Periodically scout the last 3 Bitcoin tip blocks for unreported
  Coldcard-hack-like sweep waves (dense 1-vout fee clusters). Default is
  shallow tip-only (--no-escalate); do not deep-scan or backfill unless the
  user explicitly asks. Use when checking for new waves, tip sweeps, or a
  local periodic wave check — before waiting on Galaxy/community reports.
---

# New Wave Scan

Proactive **tip-only** scout for this tracker. Default: last **3** tip blocks.
Does **not** auto-edit `incident.ts`.

Related: [btc-esplora-verify](../btc-esplora-verify/SKILL.md),
[coldcard-hack-research](../coldcard-hack-research/SKILL.md).

## Hard scope (do not improvise)

Unless the user **explicitly** asks for a deep / wider / historical scan:

- Run **only** the last **3** tip blocks.
- Prefer: `python3 scripts/scan-new-waves.py --no-escalate`
- Do **not** use `--blocks`, `--escalate-blocks`, `--start`/`--end`, or `--refetch`.
- Do **not** “fill a tip gap,” catch up a behind checkpoint, or widen after a
  noisy/false-looking candidate on your own.
- A script note that the checkpoint skipped blocks is **not** permission to
  backfill — report the tip-window verdict and stop.

Deep modes (auto-escalate to 12, `--blocks N`, fixed `--start`/`--end`) only
when the user asks (e.g. “deep scan,” “scan 12 blocks,” “scan blocks X–Y”).

## When to run

- User: “check for new waves”, “scan tip”, “any new sweeps?”, periodic reminder

## Workflow

```
- [ ] Run: python3 scripts/scan-new-waves.py --no-escalate   # 3 tip blocks only
- [ ] Read verdict from stdout / scripts/wave-scan-out/latest.json
- [ ] If NO_NEW_CANDIDATES → report clean tip window; stop
- [ ] If candidates → verify sample txids + dest freshness (still no widen)
- [ ] Optional community lead check (xcancel)
- [ ] Only then follow coldcard-hack-research to add cluster/holdings
- [ ] Ask before any deeper scan if verification needs a wider window
```

## Run the scout

```bash
# Default for agents / research check-ins: last 3 tip blocks, no auto-widen
python3 scripts/scan-new-waves.py --no-escalate

# Only if user asks for auto-widen on hit (shallow 3 → escalate to 12)
python3 scripts/scan-new-waves.py

# Only if user asks for deep / custom depth
python3 scripts/scan-new-waves.py --blocks 12
python3 scripts/scan-new-waves.py --escalate-blocks 18

# Only if user asks to force re-fetch the tip window
python3 scripts/scan-new-waves.py --refetch

# Only if user asks for a historical / fixed range
python3 scripts/scan-new-waves.py --start 960800 --end 960820 --sample-every 1
```

**Policy:** tip window only (3 blocks) unless explicitly asked for deeper.
Never backfill missed history on your own.

| Mode | Meaning |
|------|---------|
| `tip` / `tip-delta` | Shallow tip window |
| `tip-escalated` | Candidates found → widened to `--escalate-blocks` |
| `uptodate` | Checkpoint already covers tip |
| `fixed` | Explicit `--start/--end` research range |

Hosts: **blockstream.info** first, then bitaroo → emzy. Pace default **200ms**.
Output gitignored under `scripts/wave-scan-out/`.

Expect ~1–2 min/block on Blockstream. Clean 3-block checks ~5 min; escalate adds
~the extra 9 blocks when something looks off.

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
3. Optional xcancel same-day reports.
4. If real → coldcard-hack-research; add range to `KNOWN_WINDOWS`.

## Report format

```
Wave scan · {mode} · window {start}–{end} (tip {tip})
Verdict: clean | N candidate(s) [escalated]
```

## Maintenance

Update `KNOWN_WINDOWS` in `scripts/scan-new-waves.py` when a new wave’s block
range is known. Evening wave has no published window — treat ≤3 sat/vB skeptically.
