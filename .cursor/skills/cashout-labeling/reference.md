# Cash-out Labeling — Reference

Pattern catalog and tool notes for hop exits. Policy stays in [SKILL.md](SKILL.md).
Bridge decode steps: [btc-bridge-follow](../btc-bridge-follow/SKILL.md).

## Fund-movement patterns (BTC)

Classify structure before inventing a venue name. Real paths often combine
several patterns (peel → bridge → CEX).

| Pattern | What it looks like | Tracker action |
|---------|-------------------|----------------|
| **Peel chain** | Spend splits into small “peel” + large remainder; remainder peels again | Follow large branch (≥0.01 BTC, ≤3 dests); peels may hit CEX/hubs — label those |
| **One-to-many fan-out** | One vault → many similar-sized outs in one or few txs | Cap at hop rules; label any known hubs; don’t treat every leaf as a new holding |
| **Multi-hop relay** | Fresh addresses, one-shot receive→send, little dApp use | Depth ≤2 then stop or label; note txids if still unknown |
| **Many-to-one** | Many victims / parks → one vault | That’s consolidation — **holding**, not a cash-out |
| **CoinJoin / equal-denom** | Many equal outputs (Wasabi-style); remix into hubs | Label hub if known; **do not** attribute anonymity-set peers as same operator |
| **Bridge hop** | Land on THOR / Hyperunit / Chainflip / similar vault | Label vault; resolve destination via [btc-bridge-follow](../btc-bridge-follow/SKILL.md) — don’t count as still-held |
| **CEX / custodial deposit** | Arkham/OKLink/Bithypha entity tag | `KNOWN_ADDRESS_LABELS` only; stop hop-follow |
| **Service hub** | High-tx P2SH/P2WPKH mixer/swap sink | Label only; same venue ≠ same operator |
| **P2P / OTC / non-KYC** | Off-chain exit after on-chain trail ends | Note suspicion; need primary evidence before any stolen-total claim |

### Peel vs surplus pass-through

- **Attacker peel (stolen movement):** vault/park spends and live balance drops meaningfully relative to `reportBtc`.
- **Surplus / Ocean peel (ignore):** outbound while address still holds ≈≥99% of `reportBtc` — see `btc-esplora-verify`.

### CoinJoin / mixer caution

- Equal-denom peels into Hyperunit / Wasabi-like clusters are an **anonymity set**, not proof of common control.
- Stop hop-follow at labeled CJ/bridge hubs; cite “anonymity set” in notes when wording identity.
- Post-mix clustering needs behavior beyond amount alone (shared CEX deposit history, time windows, etc.) — usually out of scope for dashboard labels.

## ETH rail after BTC bridge

When a BTC hop resolves to ETH (e.g. THOR → ETH, then Tornado / DEX / CEX):

1. Record BTC vault label + bridge out tx / inbound ETH address in notes.
2. Situational X: `osint_based` / `mariusoffchain` (cached MCP posts) as leads only.
3. Fixed Tornado deposit sizes (0.1 / 1 / 10 / 100 ETH) are clues, not attribution.
4. Freezable stables (USDT/USDC) matter for **victim/compliance** context — this tracker still needs public addresses/txids before editing stolen totals.
5. Do **not** add ETH addresses to `CORE_HOLDING_ADDRESSES`.

## Community tools (BTC-relevant shortlist)

Prefer repo defaults first (Esplora, Arkham, OKLink, Bithypha, X MCP). Optional:

| Tool | Use |
|------|-----|
| Arkham | Primary entity labels / graphs |
| OKLink | Secondary BTC entity tags |
| Bithypha | Tertiary OSINT / cluster when labels soft |
| mempool.space / mirrors | Balance, fee, hops (via Esplora skill) |
| ViewBlock / THOR explorers | Bridge out → inbound asset/address |
| Chainflip scan | BTC↔other Chainflip swaps |
| Hypurrscan / Hyperunit docs | UBTC deposit/withdraw loops |
| Dune | Rare custom queries (Tornado withdraw sets, etc.) |
| MetaSleuth / Cielo | Optional multichain graphs if user asks |

MistTrack is useful commercially for graphs/AML scores but is **not** wired as a
default step here — don’t assume API access.

## Wording discipline

- Shared hub (Ocean peel + stolen hop) → same **venue**, not same **actor**.
- Bridge/CJ exit → funds **left** the watched BTC stack; label + optional off-BTC note.
- Rumored cash-outs without txids (e.g. deferred Duel.com) stay out of clusters.
