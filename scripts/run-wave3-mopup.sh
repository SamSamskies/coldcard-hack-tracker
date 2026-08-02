#!/usr/bin/env bash
# Fill remaining Wave 3 block gaps, then merge + follow.
# Safe to re-run — resumes from each shard's checkpoint.
#
# Gaps after the first parallel run:
#   960415-960433  (Blockstream shard died; 0 parks)
#   960470-960471  (bitaroo died on last block(s))
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SCRIPT="$ROOT/scripts/find-wave3-vaults.py"
OUT="$ROOT/scripts/wave3-out"
LOG="$OUT/logs"
mkdir -p "$LOG"

fail=0

run_shard() {
  local host="$1" start="$2" end="$3" name="$4"
  local dir="$OUT/$name"
  echo "[$name] $host blocks $start-$end -> $LOG/$name.log"
  if python3 "$SCRIPT" \
      --host "$host" \
      --start "$start" \
      --end "$end" \
      --out "$dir" \
      --scan-only \
      >"$LOG/$name.log" 2>&1; then
    echo "[$name] done"
  else
    echo "[$name] FAILED (see $LOG/$name.log)" >&2
    fail=1
  fi
}

echo "Mopping up missing blocks on emzy + bitaroo (parallel)…"
# Split the big Blockstream hole across the two reliable mirrors
run_shard "https://mempool.emzy.de"     960415 960424 "shard-1a-gap-emzy" &
run_shard "https://mempool.bitaroo.net" 960425 960433 "shard-1b-gap-bitaroo" &
# Finish the last bitaroo blocks (resumes shard-3 checkpoint if present)
run_shard "https://mempool.bitaroo.net" 960470 960471 "shard-3-mempool-bitaroo-net" &

wait

if [[ "$fail" -ne 0 ]]; then
  echo "One or more mop-up shards failed. Fix/re-run before merge." >&2
  exit 1
fi

echo
echo "Merging all shards…"
# Clear previous merged parks.jsonl by removing dir contents carefully
rm -f "$OUT/merged/parks.jsonl" "$OUT/merged/checkpoint.json" "$OUT/merged/vaults.csv"
python3 "$SCRIPT" --merge "$OUT"/shard-* --out "$OUT/merged"

echo
echo "Following parks -> vaults (emzy + bitaroo, slower interval)…"
python3 "$SCRIPT" \
  --out "$OUT/merged" \
  --follow-only \
  --host "https://mempool.emzy.de" \
  --host "https://mempool.bitaroo.net" \
  --min-interval 0.6

echo
echo "Done. See $OUT/merged/vaults.csv"
