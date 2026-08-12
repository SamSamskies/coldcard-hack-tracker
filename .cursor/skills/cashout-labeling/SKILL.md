---
name: cashout-labeling
description: >-
  Trace emptied Coldcard-hack vaults to hop destinations, identify exchange or
  bridge exits (Arkham/labels), and update KNOWN_ADDRESS_LABELS vs holdings.
  Use when funds moved, cash-outs, peels, THORChain/KuCoin/Coinbase/Bullish-style
  exits, “where did the coins go?”, or labeling movement-feed destinations.
---

# Cash-out Labeling

When watched holdings spend, classify destinations and label known exits so the
movement feed and UI stay honest. Hop discovery **stops** at addresses in
`KNOWN_ADDRESS_LABELS` (no further watches / no peels emitted from those venues).
On-chain hops: [btc-esplora-verify](../btc-esplora-verify/SKILL.md). Bridge
decode (THOR / Hyperunit / Chainflip): [btc-bridge-follow](../btc-bridge-follow/SKILL.md).
Patterns / tools: [reference.md](reference.md). Policy:
[coldcard-hack-research](../coldcard-hack-research/SKILL.md).

## Workflow

```
- [ ] Confirm source vault emptied / partial move (live balance vs reportBtc)
- [ ] Follow hops (depth ≤2, ≥0.01 BTC, ≤3 dests/spend, block > 960400)
- [ ] Skip surplus pass-through / Ocean peels
- [ ] Classify pattern (peel / fan-out / CJ / bridge / CEX) — see below
- [ ] If bridge vault: resolve via btc-bridge-follow, then continue labeling
- [ ] Identify destination role (see table)
- [ ] Label with evidence (Arkham / OKLink / Bithypha / primary report) — or leave unlabeled
- [ ] Edit data + optional UI rail; npm test; snapshot if holdings changed
```

## Pattern → action (quick)

| Pattern | Action |
|---------|--------|
| Peel / multi-hop | Follow large outs per hop rules; label exits |
| Fan-out (1→many) | Cap dests; don’t mint holdings per leaf |
| Many-to-one | Consolidation → holding, not cash-out |
| CoinJoin / equal-denom | Label hub; no same-operator claim from anon set |
| Bridge (THOR / Hyperunit / …) | Label vault; [btc-bridge-follow](../btc-bridge-follow/SKILL.md) |
| CEX / service hub | `KNOWN_ADDRESS_LABELS` only; stop |

Details: [reference.md](reference.md).

## Holding vs label-only

| Destination type | Put in | Do not |
|------------------|--------|--------|
| Still-holding attacker vault / Wave 4 **park** stack | `CORE_HOLDING_ADDRESSES` (or Wave 3 if fingerprint) | Treat as mere label |
| Exchange / custodial **deposit** | `KNOWN_ADDRESS_LABELS` only | Add as holding |
| High-volume **service hub** (P2SH/P2WPKH mixer/swap sink) | `KNOWN_ADDRESS_LABELS` only | Add as holding |
| Bridge vault (e.g. THORChain, Hyperunit hub) | `KNOWN_ADDRESS_LABELS` only | Count as still-held stolen |
| Intermediate hop, unknown | Follow further / note txids | Invent a venue name |

**Gotcha:** Wave 4 destination parks that are base58 `1…`/`3…` **are** holdings
(attacker still parking). P2SH *service hubs* that mix many unrelated flows are
**labels only** — even if stolen hops land there.

## Label discovery

1. Check existing `KNOWN_ADDRESS_LABELS` + [reference.md](../coldcard-hack-research/reference.md) exits.
2. **Arkham** (primary label source used in this repo):
   `https://arkm.com/explorer/address/{ADDR}`
   Firecrawl/scrape the page; if blocked, ask user for the entity name / screenshot.
3. **OKLink** (secondary entity-tag cross-check):
   `https://www.oklink.com/btc/address/{ADDR}`
   Useful when Arkham is blocked or ambiguous — exchange tags often match
   (e.g. KuCoin, Bullish, Coinbase cold wallets). Prefer WebFetch / ask the
   user to open the page; plain `curl` and Firecrawl frequently **403**. Do
   **not** use OKLink for balances, fee fingerprints, hop follow, or snapshot
   cron — Esplora stays canonical. Explorer REST APIs were suspended (~May
   2025); there is no free Esplora-style API to wire in. Unlabeled high-volume
   hubs may stay blank on OKLink even when Arkham has a soft tag.
4. **Bithypha** (tertiary — community OSINT / cluster when Arkham+OKLink are
   soft or blank): `https://bithypha.com/address/{ADDR}`. Free open explorer
   with entity icons, cluster IDs, and an OSINT notes tab. Best for unlabeled
   hops; well-known CEX deposits often add nothing beyond Arkham. Prefer
   Firecrawl scrape with `--wait-for 5000` (SPA). Plain `curl` often **403**.
   If scrape fails, ask the user to open the page. Do **not** use for balances,
   fees, or hop follow.
5. Cross-check community X only as leads — prefer situational
   `mariusoffchain` / `osint_based` (or known post ids) via X MCP
   `get_users_posts` / `get_posts_by_id`; **not** `search_posts_all`;
   xcancel fallback. Prefer Arkham / OKLink entity tags with a cited block
   height. See coldcard-hack-research [reference.md](../coldcard-hack-research/reference.md)
   for quiet-period vs situational X polls.
6. Label string style: short venue name (`KuCoin deposit`, `Coinbase Prime Custody`,
   `Bullish.com deposit`, `THORChain BTC vault`, `P2SH service hub`). Prefer
   “deposit” / “hub” / “vault” so empty balances read correctly.

If no credible label: leave unlabeled; cite txid + block in notes. Do **not**
guess exchange names from address format.

## Empty balance meaning

| Address role | Balance 0 means |
|--------------|-----------------|
| Attacker vault / park / collector | Funds **moved** — keep chasing hops |
| Labeled exchange deposit | Custodian **swept** — expected; keep label |
| Service hub | Normal churn — not a single stack |

Never “fix” emptied vaults by zeroing `reportBtc`.

## Editing the repo

### Always (known exit)

Add to `KNOWN_ADDRESS_LABELS` in `src/data/incident.ts` with a short comment:
cluster/wave, block height, evidence (Arkham / OKLink / reporter).

Also mirror the address in `coldcard-hack-research/reference.md` → Known exit labels.

### Sometimes (narrative UI)

Update `AddressList` cash-out rails / peels only when the path is user-facing and
stable (evening three rails, Wave 4 peels). Link Arkham with
`https://arkm.com/explorer/address/{addr}`, OKLink with
`https://www.oklink.com/btc/address/{addr}`, or explorer via `explorerAddressUrl`.

### Never without primary evidence

Do not add new **stolen** cluster totals from cash-out rumors (see deferred
Duel.com ~30 BTC in research reference). Need public BTC/ETH txids or addresses.

## Same-venue ≠ same operator

Shared exit hubs (e.g. Ocean peel and stolen hops both hitting `3KMmeq…`) mean
**same venue**, not proof of same actor. Wording in notes must stay careful.

## After edits

```bash
npm test
npm run snapshot   # only if CORE / Wave 3 holdings changed
```

Movement-feed labels pick up `KNOWN_ADDRESS_LABELS` with no snapshot required.
