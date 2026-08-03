# Esplora verify — reference

Recipes and gotchas for [SKILL.md](SKILL.md). Prefer bitaroo/emzy; sleep ≥400ms
between calls to the same host.

## Endpoints used

| Path | Purpose |
|------|---------|
| `/api/blocks/tip/height` | Liveness probe |
| `/api/address/{addr}` | Balance via chain + mempool stats |
| `/api/address/{addr}/txs` | Newest ~25 txs |
| `/api/address/{addr}/txs/chain/{last_txid}` | Older pages |
| `/api/tx/{txid}` | Full tx (fee, weight, vins/vouts) |
| `/api/block-height/{n}` | Block hash at height |
| `/api/block/{hash}/txs/{start}` | Block tx pages (fingerprint scans) |

Balance sats (same as `addressBalanceSats` in `src/lib/mempool.ts`):

```
(chain funded − chain spent) + (mempool funded − mempool spent)
```

Fee sat/vB (same as Wave 3 scanner):

```
fee / (weight / 4)
```

## Outbound from an address

A tx is outbound if some `vin[].prevout.scriptpubkey_address === $ADDR`.

Amount leaving ≈ sum(spent vins from addr) − sum(vouts back to addr).

Destinations = vouts whose address ≠ `$ADDR`, aggregated by address.

```bash
ADDR=bc1q...
curl -fsS "$HOST/api/address/$ADDR/txs" | jq --arg a "$ADDR" '
  [.[] | select(any(.vin[]; .prevout.scriptpubkey_address == $a)) | {
    txid,
    block: .status.block_height,
    fee_sat_vb: (if .weight then (.fee / (.weight / 4)) else null end),
    spent_btc: (([.vin[] | select(.prevout.scriptpubkey_address == $a) | .prevout.value] | add) / 1e8),
    change_btc: (([.vout[] | select(.scriptpubkey_address == $a) | .value] | add // 0) / 1e8),
    dests: (
      [.vout[] | select(.scriptpubkey_address != null and .scriptpubkey_address != $a)
        | {addr: .scriptpubkey_address, sats: .value}]
      | group_by(.addr)
      | map({addr: .[0].addr, btc: ((map(.sats)|add)/1e8)})
      | sort_by(-.btc)
    )
  }]'
```

Filter hop candidates: `block > 960400` (or null), `btc >= 0.01`, take top 3.

## Funding fingerprint sample

Given a vault, inspect **inbound** txs (received, not spent from it) for block + fee:

```bash
ADDR=bc1q...
curl -fsS "$HOST/api/address/$ADDR/txs" | jq --arg a "$ADDR" '
  [.[]
    | select(any(.vout[]; .scriptpubkey_address == $a))
    | select(all(.vin[]; .prevout.scriptpubkey_address != $a))
    | {
        txid,
        block: .status.block_height,
        fee_sat_vb: (if .weight then (.fee / (.weight / 4)) else null end),
        received_btc: (([.vout[] | select(.scriptpubkey_address == $a) | .value] | add) / 1e8),
        vout_n: (.vout|length)
      }
  ]'
```

Compare `block` / `fee_sat_vb` / `vout_n` to the wave fingerprint in
`coldcard-hack-research/reference.md`.

## Block-window fee scan (narrow)

For a small height range and fee band (do **not** hammer; shard across hosts):

```bash
# Example: one height, 1-out, fee band 180–220
H=960400
FEE_MIN=180; FEE_MAX=220
HASH=$(curl -fsS "$HOST/api/block-height/$H")
sleep 0.4
curl -fsS "$HOST/api/block/$HASH/txs/0" | jq --argjson lo "$FEE_MIN" --argjson hi "$FEE_MAX" '
  [.[]
    | select(.fee and .weight)
    | . as $t
    | (($t.fee / ($t.weight / 4)) as $r)
    | select($r >= $lo and $r <= $hi)
    | select(($t.vout|length) == 1)
    | {
        txid: $t.txid,
        fee_sat_vb: ($r|round*100/100),
        addr: $t.vout[0].scriptpubkey_address,
        btc: ($t.vout[0].value/1e8)
      }
  ]'
```

For full Wave 3–style discovery use `scripts/find-wave3-vaults.py` + parallel
shell helpers instead of ad-hoc curls.

## Surplus pass-through (skip as stolen movement)

If after an outbound the address still holds ≥ ~99% of `reportBtc`, treat that
spend as surplus peel (see `isSurplusPassThrough` in `src/lib/tracker.ts`).
Document in notes; do not add to stolen totals or treat as vault cash-out.

## Empty balance interpretation

| Role | Empty balance means |
|------|---------------------|
| Attacker vault / collector | Funds moved — follow hops |
| Exchange / custodial deposit | Custodian swept — expected; keep label |
| Park | Usually emptied into vault by design |

## Related scripts

| Script | When |
|--------|------|
| `npm run snapshot` / `scripts/build-snapshot.mjs` | Refresh all holdings + movements |
| `scripts/find-wave3-vaults.py` | Offline fingerprint scan / park→vault follow |
| `scripts/run-wave3-parallel.sh` | Sharded block scan across emzy + bitaroo |
