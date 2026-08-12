---
name: btc-bridge-follow
description: >-
  Resolve Coldcard-hack BTC hops that land on bridges or wrapped-BTC loops
  (THORChain, Hyperunit, Chainflip): find the post-bridge asset and destination
  address, then hand off to cash-out labeling. Use when a hop hits a bridge
  vault, Hyperunit deposit, THOR/Chainflip swap, or “where did BTC go after
  bridging?”
---

# BTC Bridge Follow

When Esplora hop-follow lands on a **bridge / wrap vault**, stop treating it as
a still-held stolen stack. Label the vault, resolve the **outbound** leg, then
return to [cashout-labeling](../cashout-labeling/SKILL.md). On-chain BTC hops:
[btc-esplora-verify](../btc-esplora-verify/SKILL.md).

Do **not** add post-bridge ETH/other-chain addresses to `CORE_HOLDING_ADDRESSES`.

## Workflow

```
- [ ] Confirm BTC spend into known/suspected bridge vault (Arkham / existing labels)
- [ ] Label vault in KNOWN_ADDRESS_LABELS if missing (bridge = label-only)
- [ ] Resolve bridge out → destination chain + address + amount
- [ ] Note txids / explorers in incident notes or research reference
- [ ] If destination is CEX/hub on BTC again: label and stop
- [ ] If destination is ETH/other: record rail in notes; situational X only; no new BTC holding
```

## Known BTC bridges in this incident

| Venue | Example / role | Resolve with |
|-------|----------------|--------------|
| **THORChain** | `bc1qp6yzmq5kjr8yvyw7453gxvq4z3tvkdyadqm794` BTC vault | THOR / ViewBlock tx explorer |
| **Hyperunit** | `bc1pdwu79dady576y3fupmm82m3g7p2p9f6hgyeqy0tdg7ztxg7xrayqlkl8j9` hub; per-user deposit addrs | Hypurrscan + amount/time match |
| **Chainflip** | Swap ingress (when tagged) | https://scan.chainflip.io/ |

Prefer Firecrawl / ask user to open explorers if `curl` is bot-walled. Prefer
local `.firecrawl/` dumps over re-scraping.

---

## THORChain

1. From the BTC tx that pays the THOR vault, open the **same txid** (or linked
   inbound) on a THOR explorer:
   - https://thorchain.net/tx/{TXID}
   - https://viewblock.io/thorchain/tx/{TXID}
2. Read outbound: asset (e.g. ETH), amount, **destination address**.
3. Label the BTC vault; cite block height + Arkham/explorer in
   `KNOWN_ADDRESS_LABELS` / research reference.
4. Further ETH peels (Tornado, DEX, CEX) are **notes / OSINT leads only** unless
   the user asks for a full ETH trace. Situational accounts:
   `osint_based`, `mariusoffchain`.

If the explorer page is empty, try the other host, then ask the user for a
screenshot — don’t invent the inbound address.

---

## Hyperunit (BTC ↔ UBTC loops)

Mechanism (docs): each user gets a **unique BTC deposit address**; deposit
credits **UBTC** on Hyperliquid; withdrawals return BTC from treasury addresses.

### Detect

- Hop into a tagged Hyperunit hub **or** a fresh bc1p/bc1q that Arkham/docs
  associate with Hyperunit deposits.
- Treasury examples from public docs / prior cases (verify before relying):
  - EVM-side treasury activity on Hypurrscan
  - BTC treasury:
    `bc1pdwu79dady576y3fupmm82m3g7p2p9f6hgyeqy0tdg7ztxg7xrayqlkl8j9`
    (already labeled in this repo when used as hub)

### Resolve a cycle

1. Note deposit address + amount + time.
2. On Hypurrscan, filter treasury / hot-wallet txs by **timestamp ± window** and
   **amount** (expect small fee delta).
3. Match UBTC credit → later **BTC withdrawal** outs of similar size.
4. New BTC withdraw addresses may **re-deposit** into Hyperunit (laundering
   loop). Each re-entry is still label-only at the hub; do not add loop
   intermediates as stolen holdings.
5. Equal-denom CoinJoin-style peels into Hyperunit = **anonymity set** — see
   [cashout-labeling reference](../cashout-labeling/reference.md).

Stop hop-follow at the labeled Hyperunit hub unless a specific withdraw address
is still holding a clear stolen stack **and** fingerprint/evidence ties it
(rare; ask before adding a holding).

---

## Chainflip

1. Open https://scan.chainflip.io/ with the BTC ingress txid or address.
2. Record egress chain, asset, destination address, amounts.
3. Label any recurring Chainflip BTC ingress as a bridge/service hub if Arkham
   agrees; otherwise leave unlabeled and cite the scan URL + txid.

---

## Generic bridge (no dedicated explorer)

1. Decode BTC tx / OP_RETURN / known vault payment as far as Esplora allows.
2. Check Arkham entity graph for “bridged to …”.
3. Ask the user for the bridge UI/explorer screenshot if still opaque.
4. Never guess the destination chain address from amount alone.

---

## After resolve

| Outcome | Action |
|---------|--------|
| Bridge vault identified | `KNOWN_ADDRESS_LABELS` + research reference mirror |
| BTC reappears at CEX | Label deposit; stop |
| BTC reappears at unknown addr holding stack | Esplora verify; holding only with strong evidence |
| ETH / other chain | Notes + optional situational X; no CORE holding |
| CJ / equal-denom into hub | Label hub; no same-operator claim |

Then finish labeling via [cashout-labeling](../cashout-labeling/SKILL.md)
(`npm test`; snapshot only if holdings changed).

## When blocked

After one hard failure (bot wall, empty bridge page, ambiguous amount match),
ask the user — paste explorer result or approve Firecrawl on a specific URL.
Do not burn credits looping or invent post-bridge destinations.
