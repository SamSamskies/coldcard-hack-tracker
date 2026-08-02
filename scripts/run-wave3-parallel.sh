#!/usr/bin/env bash
# Full Wave 3 block scan in parallel (fresh run).
# Prefer scripts/run-wave3-mopup.sh if you already have partial shard output.
#
# One shard failing no longer aborts the others / merge.
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
  echo "[$name] starting -> $LOG/$name.log"
  if python3 "$SCRIPT" \
      --host "$host" \
      --start "$start" \
      --end "$end" \
      --out "$dir" \
      --scan-only \
      >"$LOG/$name.log" 2>&1; then
    echo "[$name] finished"
  else
    echo "[$name] FAILED (see $LOG/$name.log)" >&2
    fail=1
  fi
}

echo "Shard plan (emzy + bitaroo only — no Blockstream):"
# 76 blocks -> 38 each
run_shard "https://mempool.emzy.de"     960396 960433 "shard-0-mempool-emzy-de" &
run_shard "https://mempool.bitaroo.net" 960434 960471 "shard-1-mempool-bitaroo-net" &

wait

if [[ "$fail" -ne 0 ]]; then
  echo "Some shards failed — merge may be incomplete. Check logs." >&2
fi

echo
echo "Merging…"
rm -f "$OUT/merged/parks.jsonl" "$OUT/merged/checkpoint.json" "$OUT/merged/vaults.csv"
python3 "$SCRIPT" --merge "$OUT"/shard-* --out "$OUT/merged"

echo
echo "Follow parks -> vaults…"
python3 "$SCRIPT" \
  --out "$OUT/merged" \
  --follow-only \
  --host "https://mempool.emzy.de" \
  --host "https://mempool.bitaroo.net" \
  --min-interval 0.6

echo
echo "Done. See $OUT/merged/vaults.csv"
