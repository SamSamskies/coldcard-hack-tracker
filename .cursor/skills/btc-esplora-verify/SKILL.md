---
name: btc-esplora-verify
description: >-
  Verify Bitcoin addresses and txs via public Esplora APIs (mempool mirrors):
  balance, fee sat/vB, block/fee fingerprint match, and hop follow. Use when
  checking Coldcard-hack vaults, collectors, parks, cash-outs, candidate
  addresses, or “where did the coins go?” on-chain — before editing incident.ts
  or wave3Vaults.ts.
---

# BTC Esplora Verify

Public Esplora only. Match this repo’s hop and rate-limit rules so research
agrees with the dashboard tracker and snapshot cron.

For cluster/fingerprint policy, also read
[coldcard-hack-research](../coldcard-hack-research/SKILL.md).

## Hosts & pacing

| Use | Hosts |
|-----|--------|
| **Bulk research** (default) | `https://mempool.bitaroo.net`, then `https://mempool.emzy.de` |
| **Avoid stampeding** | `mempool.space`, Blockstream |
| **Browser probe order** (app only) | space → emzy → bitaroo |

- Pace **≥400ms** between calls to the **same** host.
- On 429 / 5xx: sleep, switch mirror, retry once; then ask the user.
- Write dumps under `.firecrawl/` or `/tmp` — do not commit raw explorer JSON.

```bash
HOST=https://mempool.bitaroo.net
# fallback: HOST=https://mempool.emzy.de
sleep 0.4   # between requests to $HOST
```

## Quick recipes

Copy-paste; replace `$ADDR` / `$TXID` / `$HOST`.

### Balance (BTC)

```bash
curl -fsS "$HOST/api/address/$ADDR" | jq '
  ((.chain_stats.funded_txo_sum - .chain_stats.spent_txo_sum)
   + (.mempool_stats.funded_txo_sum - .mempool_stats.spent_txo_sum)) / 1e8'
```

Compare to `reportBtc` in data: allow fees / partial moves. Empty live balance +
non-zero `reportBtc` is normal for spent vaults — do **not** zero `reportBtc`.

### Recent txs

```bash
curl -fsS "$HOST/api/address/$ADDR/txs" | jq '[.[] | {
  txid, block: .status.block_height, fee, weight,
  fee_sat_vb: (if .weight then (.fee / (.weight / 4)) else null end),
  outs: [.vout[] | {addr: .scriptpubkey_address, btc: (.value/1e8)}]
}]'
```

Paginate older history: `/api/address/$ADDR/txs/chain/$LAST_TXID`.

### Tx fee sat/vB + structure

```bash
curl -fsS "$HOST/api/tx/$TXID" | jq '{
  txid, block: .status.block_height,
  fee_sat_vb: (.fee / (.weight / 4)),
  vin_n: (.vin|length), vout_n: (.vout|length),
  outs: [.vout[] | {addr: .scriptpubkey_address, btc: (.value/1e8)}]
}'
```

Fingerprint match: confirmed height in claimed block window **and**
`fee_sat_vb` in claimed band. Prefer 1-out sweeps / documented park→vault.

### Tip height (sanity)

```bash
curl -fsS "$HOST/api/blocks/tip/height"
```

## Fingerprint checklist

For each candidate address / funding tx:

1. Current balance vs claimed `reportBtc` (fees OK).
2. Funding tx(s) in claimed **block** window.
3. Funding tx(s) in claimed **fee sat/vB** band (`fee / (weight/4)`).
4. Structure matches wave (1-out sweep, park→P2WSH, multi-path, etc.).
5. If spent: list destinations; apply hop rules below.

Reject unrelated consolidations that only share an approximate BTC amount.

## Hop follow (match dashboard)

Constants from `src/data/incident.ts`:

| Constant | Value |
|----------|--------|
| `MAX_HOP_DEPTH` | 2 |
| `MAX_DESTINATIONS_PER_SPEND` | 3 |
| `MIN_HOP_FOLLOW_SATS` | 1_000_000 (0.01 BTC) |
| Movement watch | block **> 960400** |

Procedure:

1. Load `/api/address/$ADDR/txs` for the vault/collector.
2. Keep only **outbound** spends with `status.block_height > 960400` (or unconfirmed).
3. Per spend, take external vouts (not change-back), ≥ 0.01 BTC, largest first, max 3.
4. Recurse to depth 2. Stop at known labels in `KNOWN_ADDRESS_LABELS` once identified.
5. **Ignore surplus pass-through**: outbound while address still holds ≥ ~99% of `reportBtc` (Ocean peels, etc.) — not stolen movement.

More jq / multi-hop notes: [reference.md](reference.md).

## Classify before editing data

| Finding | Action |
|---------|--------|
| Consolidation still holding stack | Core holding or Wave 3 (≥ 0.5 BTC) |
| Parallel fee-band sink | Collector (core + label) |
| Intermediate before vault | Park — research only |
| Post-spend destination | Hop / cash-out — label if known exit |
| Ocean peel / surplus pass-through | Notes only — not stolen |

Do not invent addresses that contradict existing clusters. Run `npm test` after data edits.

## When blocked

After one clear failure (429 that persists, dead mirrors, empty scrape), ask the
user — paste explorer link, approve slower path, or supply a screenshot. Do not
guess balances or fee rates.
