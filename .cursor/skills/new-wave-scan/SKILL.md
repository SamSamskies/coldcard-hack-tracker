---
name: new-wave-scan
description: >-
  Periodically scout recent Bitcoin tip blocks for unreported Coldcard-hack-like
  sweep waves (dense 1-vout fee clusters). Use when the user asks to check for
  new waves, scan for new sweeps, hunt for unreported waves, or run a local
  periodic wave check — before waiting on Galaxy/community reports.
---

# New Wave Scan

Proactive **tip-only** scout for this tracker. Default: last **3** tip blocks.
If that shallow pass finds candidates, the script **auto-escalates** to 12 tip
blocks. Does **not** catch up missed history beyond the tip window. Does **not**
auto-edit `incident.ts`.

Related: [btc-esplora-verify](../btc-esplora-verify/SKILL.md),
[coldcard-hack-research](../coldcard-hack-research/SKILL.md).

## When to run

- User: “check for new waves”, “scan tip”, “any new sweeps?”, periodic reminder

## Workflow

```
- [ ] Run scripts/scan-new-waves.py (3 tip blocks; auto-escalates to 12 on hit)
- [ ] Read verdict from stdout / scripts/wave-scan-out/latest.json
- [ ] If NO_NEW_CANDIDATES → report clean tip window; stop
- [ ] If candidates (after any escalate) → verify sample txids + dest freshness
- [ ] Optional community lead check (xcancel)
- [ ] Only then follow coldcard-hack-research to add cluster/holdings
```

## Run the scout

```bash
# Default: 3 tip blocks; on candidates, fetch back to 12 tip blocks automatically
python3 scripts/scan-new-waves.py

# Shallow only (no auto-widen)
python3 scripts/scan-new-waves.py --no-escalate

# Start deep / custom escalate depth
python3 scripts/scan-new-waves.py --blocks 12
python3 scripts/scan-new-waves.py --escalate-blocks 18

# Force re-fetch the whole tip window
python3 scripts/scan-new-waves.py --refetch

# Historical research only (no tip cursor / no escalate)
python3 scripts/scan-new-waves.py --start 960800 --end 960820 --sample-every 1
```

**Policy:** tip window only — never backfill ancient missed history. Shallow-first,
deepen only when suspicious.

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
