# Coldcard Hack Research — Reference

Read this when you need concrete constants, source URLs, or script paths. Keep `SKILL.md` as the workflow.

## File map

| Path | Role |
|------|------|
| `src/data/incident.ts` | Clusters, fingerprints, `CORE_HOLDING_ADDRESSES`, sources, hop/mempool constants, `KNOWN_ADDRESS_LABELS` |
| `src/data/wave3Vaults.ts` | Watched Wave 3 P2WSH vaults; `WAVE3_VAULT_COUNT`, `WAVE3_VAULT_REPORT_BTC`, `WAVE3_MIN_WATCH_BTC` |
| `src/data/incident.test.ts` | Cluster sums, Galaxy total, uniqueness |
| `public/snapshot.json` | Cron balances + movements |
| `scripts/build-snapshot.mjs` | Builds snapshot from TS holdings via Esplora |
| `scripts/find-wave3-vaults.py` | Offline Wave 3 scan / follow |
| `scripts/run-wave3-parallel.sh` | Sharded scan (emzy + bitaroo) |
| `scripts/run-wave3-mopup.sh` | Fill block gaps then merge/follow |
| `scripts/wave3-out/merged/vaults.csv` | Candidate vaults with park lineage |
| `.github/workflows/snapshot.yml` | ~30m cron + push triggers |

`HOLDING_ADDRESSES` = core ∪ Wave 3. Core = live browser poll; Wave 3 = snapshot only.

## Fingerprints

| Wave | Blocks | Fee sat/vB | Markers |
|------|--------|------------|---------|
| Galaxy Wave 1 | 960183–960191 | 30 | Multi-path BIP84/49/44; no change; window Jul 30 01:10:20–01:51:26 UTC |
| Galaxy Wave 2 | 960345–960369 | **50 and 10** | Vault ~45.90 BTC + collector ~30.18 BTC; 1478 victims |
| Galaxy Wave 3 | 960396–960471 | 180–220 | park → P2WSH; Galaxy ~293 vaults / ~207.73 BTC; watched ≥0.5 only |
| Evening | — | 1–2 | Distinct from Galaxy W2; Ocean peel ≠ stolen |
| Morning | 960518–960523 | 15–50 | ~16 victim sweeps; direct → vault; Mk4 claim withdrawn |
| Early Aug 2 | **960668** | 9 | 04:03 UTC; 902 inputs / 795 addrs; ~64.90 BTC landed |
| Likely Wave 4 | **960778–960792** | 1–3 | Thorn pattern-match (no victim report yet); filtered ~443.34 BTC / 703 addrs after −89 multisig (−20.58) and −6 prior-history dests (−5.39); 210 fresh dests; RBF; no collector |

Movement watch: block **> 960400**. Hop follow: depth ≤2, ≥0.01 BTC, ≤3 dests/spend.

## Explorer hosts

Browser probe order (`MEMPOOL_HOSTS`): mempool.space → emzy → bitaroo.

Cron / bulk research preference: **bitaroo → emzy**; avoid hammering space/Blockstream.

## Primary sources (encoded)

**Galaxy (X)**

- Wave 1: `https://x.com/glxyresearch/status/2083181683067506899`
- Wave 2: `https://x.com/glxyresearch/status/2083560940469981591`
- Wave 3 / headline: `https://x.com/glxyresearch/status/2083623500183421043`

**Community**

- Rob Hamilton (early): `https://x.com/Rob1Ham/status/2082896614218203616`
- Kevin Kelbie (W2 vault): `https://x.com/KevinKelbie/status/2083368025864990857`
- Evan Schoenberg (evening): `https://x.com/evands/status/2083505832587587945`
- Tomer Strolight (morning): `https://x.com/TomerStrolight/status/2083578868191957292`
- Marius Offchain (early Aug 2): `https://x.com/mariusoffchain/status/2083814011859030252`
- Erik (early Aug 2 Mk3 victim): `https://x.com/eriklocalhost/status/2083875886458171626`
- Alex Thorn (likely Wave 4): `https://x.com/intangiblecoins/status/2084079706320646300`

**Advisories / root cause**

- Coinkite: `https://blog.coinkite.com/coldcard-mk3-seed-generation-warning/`
- Block Engineering: `https://engineering.block.xyz/blog/predictable-rng-fallback-and-32-bit-reseed-in-coldcard-firmware`
- WizardSardine: `https://wizardsardine.com/blog/coldcard-rng-vulnerability/`
- CoinDesk Aug 1: `https://www.coindesk.com/tech/2026/08/01/how-bitcoin-cold-wallets-lost-usd70-million-in-an-attack-that-never-touched-the-devices`

COLDCARD RNG chain map: public cross-check for Wave 3; no URL constant in repo — find the current public map when reconstructing.

## Known exit labels

Full labeling workflow: [cashout-labeling](../cashout-labeling/SKILL.md). Arkham:
`https://arkm.com/explorer/address/{addr}`.

- `bc1qp6yzmq5kjr8yvyw7453gxvq4z3tvkdyadqm794` — THORChain BTC vault
- `3KMmeqPeQcngyTehdfSwsGqvxfU7J7qtc8` — P2SH service hub (likely custodial/swap; hops mixed out)
- `3CTpBmp8uWTcHJBjmyVe8VPPyCHTzj2hBH` — Bullish.com deposit (Wave 4 dual-sweep park peel, block 960793)
- `324H9uyTV9bPgAVgmdJNxPKKKZmowk5CYq` — Bullish.com hot wallet (custodian sweep after 3CTp; stop hop-follow)
- `3CdVzfAe6Aw9K4oSPYXC7BR1xLxCPkxAUs` — Bullish.com (feeds 324H9; Arkham)
- `bc1qactqjuk4kghfgaqqt454hzzzs5lsaysunf80gh` — P2WPKH service hub (Wave 4 hop, block 960797)
- `bc1qdj58duywm3ng0twrxk5kykup9q6jmmj72n60ms` — Coinbase Prime Custody (Wave 4 hop, block 960818; Arkham)
- `1KbDEg1tDz2ErYgaDbaDhhawnLrSQFaFx5` — Wintermute (Bullish hot-wallet peel target; Arkham)
- `328GxewqTzMxLPvLemaKS7Q5Wi1io8EEYD` — KuCoin deposit (evening sibling peel, block 960802; Arkham cluster 27fe)
- `3JEQJdb1Cwbzvevzj1ECAoiMbvb2yckvCe` — KuCoin deposit (evening sibling peel, block 960804; same Arkham cluster)

## Wave 3 pipeline

```text
find-wave3-vaults.py --scan-only (sharded)
  → merge → --follow-only --fresh-parks --p2wpkh-parks-only
  → vaults.csv → filter ≥ 0.5 BTC → wave3Vaults.ts
```

Target vs Galaxy: ~293 vaults / ~207.73 BTC. Watched set is intentionally partial.

## Gotchas

- `CONSOLIDATED_BTC` < `ORIGINAL_STOLEN_BTC` (fees + unwatched/omitted Wave 3).
- Cluster `date` is day-granularity only.
- Ocean ~0.060 BTC (block 960511) hit the same P2SH service hub as stolen hops (same exit venue) but **not** counted as stolen.
- Surplus pass-through while report balance still held is ignored.
- Early Aug 2 matches weak-seed profile but is **not** a Galaxy-published wave.
- Snapshot keeps prior balance on explorer failure rather than writing zeros.
- `build-snapshot.mjs` parses bech32 + base58 holdings from core + Wave 3; P2SH *service hubs* in `KNOWN_ADDRESS_LABELS` are labels only.
- **Dual totals (not a bug):** `GALAXY.totalStolenBtc` (~1367.05) = Waves 1–3 only. `ORIGINAL_STOLEN_BTC` (~1876.83) = all seven clusters. Gap ≈509.78 is evening + morning + early Aug 2 + Wave 4. External auditors often flag this as inconsistency.
- **`reportBtc` ≠ live balance:** It is the original reported stack used for held/partial/moved status. Emptied vaults keep non-zero `reportBtc` on purpose; live Balance/snapshot shows 0. Do not “fix” by zeroing `reportBtc`.
- **Empty balance meaning depends on address role:** Exchange deposit empty ⇒ custodian swept (good for compliance). Attacker vault empty ⇒ funds moved. darkness-svc ([Nostr note](https://damus.io/nevent1qqs0muc6qzuvgq54wfrf64czxpp9386tg4ds5wtvclclly4udgtau8qtdcjm9), Aug 3 2026) verified KuCoin `328Gx…` (~9.79 BTC / 37 txs) + `3JEQ…` (~8.84 BTC / 26 txs) and consol. `bc1qs86u…` (1.54 BTC) all at zero — deposit empties intentional.

## Deferred / unverified

### Duel.com cash-out (~30 BTC)

Alex Thorn ([thread](https://x.com/intangiblecoins/status/2083792644048597326)) reported a ~30 BTC one-off Coldcard victim with ~17 BTC peeled via THORChain → ~229.72 ETH into Duel.com. Briefly added to `CLUSTERS` / Total stolen, then **removed** until public txids/addresses appear.

Keep out for now:

- No published victim/attacker addresses or hop txids
- On-chain search did not find a matching ~17 BTC peel into the known THOR vault
- Duel disputed freeze process; claim is thinner than fingerprint waves

Re-add only if primary evidence surfaces (BTC/ETH txids or addresses). Do not fold into `GALAXY.totalStolenBtc`.
