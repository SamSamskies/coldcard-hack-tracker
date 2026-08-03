---
name: new-wave-scan
description: >-
  Periodically scout recent Bitcoin tip blocks for unreported Coldcard-hack-like
  sweep waves (dense 1-vout fee clusters). Use when the user asks to check for
  new waves, scan for new sweeps, hunt for unreported waves, or run a local
  periodic wave check — before waiting on Galaxy/community reports.
---

# New Wave Scan

Proactive **tip-only** scout for this tracker. Always checks a short window at
chain tip. Does **not** catch up missed history — if a check was skipped, that
gap is abandoned (community monitors cover the same ground). Does **not**
auto-edit `incident.ts`.

Related: [btc-esplora-verify](../btc-esplora-verify/SKILL.md),
[coldcard-hack-research](../coldcard-hack-research/SKILL.md).

## When to run

- User: “check for new waves”, “scan tip”, “any new sweeps?”, periodic reminder

## Workflow

```
- [ ] Run scripts/scan-new-waves.py (default: last 12 tip blocks)
- [ ] Read verdict from stdout / scripts/wave-scan-out/latest.json
- [ ] If NO_NEW_CANDIDATES → report clean tip window; stop
- [ ] If candidates → verify 2–3 sample txids (fee + 1-vout + fresh dest)
- [ ] Optional community lead check (xcancel)
- [ ] Only then follow coldcard-hack-research to add cluster/holdings
```

## Run the scout

```bash
# Default: last ~12 blocks at tip (~2h). Checkpoint skips already-fetched tip blocks.
python3 scripts/scan-new-waves.py

# Tighter / wider tip window
python3 scripts/scan-new-waves.py --blocks 6
python3 scripts/scan-new-waves.py --blocks 18

# Force re-fetch the whole tip window
python3 scripts/scan-new-waves.py --refetch

# Historical research only (no tip cursor update)
python3 scripts/scan-new-waves.py --start 960800 --end 960820 --sample-every 1
```

**Policy:** tip window only. Never backfill `last_scanned → window_start`. Missed
blocks behind the window are dropped on purpose.

| Mode | Meaning |
|------|---------|
| `tip` | Fetch whole tip window |
| `tip-delta` | Tip advanced; only fetch new blocks inside the window |
| `uptodate` | Checkpoint already covers tip |
| `fixed` | Explicit `--start/--end` research range |

Hosts: bitaroo → emzy. Pace ≥400ms. Output gitignored under `scripts/wave-scan-out/`.

Expect ~2–3 min per **fetched** block. After the first tip pass, later checks
usually only fetch a few new blocks (~5–15 min if you check every few hours).

## Interpreting results

| Signal | Meaning |
|--------|---------|
| `NO_NEW_CANDIDATES` | No Coldcard-shaped fee peak in the tip window |
| `shape: park-like` / `vault-like` | Wave-like lead — still verify |
| `noisy_fee_band: true` | Skepticism required |

Never edit `incident.ts` from scout output alone.

## Confirm a candidate

1. Sample txids → 1-vout + fee via esplora skill.
2. Dest freshness; consolidation pattern.
3. Optional xcancel same-day reports.
4. If real → coldcard-hack-research; add range to `KNOWN_WINDOWS`.

## Report format

```
Wave scan · {mode} · window {start}–{end} (tip {tip})
Verdict: clean | N candidate(s)
```

## Maintenance

Update `KNOWN_WINDOWS` in `scripts/scan-new-waves.py` when a new wave’s block
range is known. Evening wave has no published window — treat ≤3 sat/vB skeptically.
