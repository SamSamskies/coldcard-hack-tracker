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
| `.github/workflows/snapshot.yml` | ~12h cron + push triggers |

Tip / new-wave scouting (`scripts/scan-new-waves.py`) is **not** part of this
workflow. Do not offer it after a research pass. Use **new-wave-scan** only
when the user explicitly asks.

`HOLDING_ADDRESSES` = core ∪ Wave 3. Both are served from the cron snapshot
(no live browser Esplora).

## Fingerprints

| Wave | Blocks | Fee sat/vB | Markers |
|------|--------|------------|---------|
| Galaxy Wave 1 | 960183–960191 | 30 | Multi-path BIP84/49/44; no change; window Jul 30 01:10:20–01:51:26 UTC |
| Galaxy Wave 2 | 960345–960369 | **50 and 10** | Vault ~45.90 BTC + collector ~30.18 BTC; 1478 victims |
| Galaxy Wave 3 | 960396–960471 | 180–220 | park → P2WSH; Galaxy ~293 vaults / ~207.73 BTC; watched ≥0.5 only |
| Evening | — | 1–2 | Distinct from Galaxy W2; Ocean peel ≠ stolen |
| Morning | 960518–960523 | 15–50 | ~16 victim sweeps; direct → vault; Mk4 claim withdrawn |
| Early Aug 2 | **960668** | 9 | 04:03 UTC; 902 inputs / 795 addrs; ~64.90 BTC landed |
| P2TR (Kelbie) | **960624–960897** | ~5 (later also 25/40) | 1-vout multi-path → P2TR sinks; Chainabuse victim on small vault; watched ~46.97 BTC (3 sinks incl. hop from emptied bc1ptd…); distinct from Wave 4 |
| Likely Wave 4 | **960778–960792** | 1–3 | Thorn pattern-match (no victim report yet); filtered ~443.34 BTC / 703 addrs after −89 multisig (−20.58) and −6 prior-history dests (−5.39); 210 fresh dests; RBF; no collector |

Movement watch: block **> 960400**. Hop follow: depth ≤2, ≥0.01 BTC, ≤3 dests/spend.

## Explorer hosts

UI address/tx links (`MEMPOOL_HOSTS`): mempool.space → emzy → bitaroo.

Cron / bulk research preference: **bitaroo → emzy**; avoid hammering space/Blockstream.
The dashboard does not poll Esplora in the browser.

## X MCP workflow (no unapproved keyword search)

Do **not** call `search_posts_all` (App-Only + pay-per-use; MCP user OAuth 403s).

**Local cache (credits):** `.firecrawl/x-cache.sqlite` via `scripts/x_cache.py`.

```bash
python3 scripts/x_cache.py has POST_ID          # hit → skip MCP
python3 scripts/x_cache.py get POST_ID
python3 scripts/x_cache.py list-user glxyresearch --since 2026-08-05T00:00:00Z
# after MCP get_users_posts / get_posts_by_id:
python3 scripts/x_cache.py put-posts --username glxyresearch --start-time 2026-08-05T00:00:00Z < response.json
python3 scripts/x_cache.py stats
```

1. Cache-check known post ids / `list-user` before MCP
2. **Quiet-period poll** — do **not** fetch all three every research pass. Prefer:
   - On a dedicated “any new reports?” ask, or when chasing a lead: `glxyresearch` first (Galaxy headlines / footprints)
   - Add `intangiblecoins` (Wave 4 + victim pipeline) / `KevinKelbie` (fee-band / P2TR finds) only if Galaxy is quiet and you still need community wave leads
   - Same pattern: `get_users_by_username` → `get_users_posts` with `start_time` / `exclude=replies` → **`put-posts`**
3. **Situational** — only when the task needs them (same fetch → cache pattern):
   - `jamesob` — CK tripwire scoreboard / honeypot frontier moved
   - `mariusoffchain` — cash-out / mixing / hop exits
   - `osint_based` — ETH rail / Tornado-style peels when tracing those exits
4. **Do not routine-poll** — one-shot primary sources; use known `sourceUrl` + `get_posts_by_id(s)` only:
   - `evands`, `TomerStrolight`, `Rob1Ham`, `eriklocalhost`, `nunchuk_io`
5. `get_posts_by_id(s)` for thread replies and quoted posts → **`put-posts`**
6. **Keyword search only after user approval** — CLI recent search: `npx -y @xdevplatform/xurl search 'QUERY' -n 20` (≈ $0.005 × results). Ask with query + N + rough cost first; see rule `x-api-search-approval`.

## Primary sources (encoded)

**Galaxy (X)**

- Wave 1: `https://x.com/glxyresearch/status/2083181683067506899`
- Wave 2: `https://x.com/glxyresearch/status/2083560940469981591`
- Wave 3 / headline: `https://x.com/glxyresearch/status/2083623500183421043`
- Aug 3 $100M / footprints: `https://x.com/glxyresearch/status/2084411904924045370`
  - Then: high-confidence ~1,596 BTC / ~7,300 addrs; chart footprints A–N 223.85; +W4 → ~2,055
- Aug 16 $115M / dormancy charts: `https://x.com/glxyresearch/status/2089002238391832948`
  - Theft-time valuation >$115M (chart ~$114.0M); chart 1,778.57697908 BTC / 8,680 addrs
  - 200+ victims spoken to (chart: 203 reporters / 192 verified); no new attack wave
- Aug 14 $112M / attacks eased: `https://x.com/glxyresearch/status/2088252639767085417`
  - High-confidence 1,778.84 BTC / 8,600+ addrs (~$112.7M spot); tweet 1,778 / $112M
  - No confirmed attack after Aug 6; 190 victims spoken to; ≥33 footprints
  - 1,531 BTC unmoved; ~246 moved (≈65% coinjoin); candidates → 2,417.35 BTC ($153M)
  - Brief: `https://www.galaxy.com/insights/research/coldcard-exploit-abates-as-total-losses-climb-to-at-least-1700-btc`
  - Thorn: `https://x.com/intangiblecoins/status/2088305623318298903`
- Aug 7 $111M / footprints: `https://x.com/glxyresearch/status/2085748513015488758`
  - High-confidence 1,719 BTC / 8,092 addrs (chart 1,719.19 = 1,367.05 + 352.14 footprints)
  - Candidates → 2,300+ BTC; 25+ attack patterns; 250+ victim reports via @intangiblecoins
  - Superseded by the Aug 14 cut
  - Footprint O (Aug 4, Thorn): `https://x.com/intangiblecoins/status/2084584284837322868` (~12 BTC / 126 addrs; later in Aug 7 confirmed set)

**Community**

- Rob Hamilton (early): `https://x.com/Rob1Ham/status/2082896614218203616`
- Kevin Kelbie (W2 vault): `https://x.com/KevinKelbie/status/2083368025864990857`
- Kevin Kelbie (P2TR wave): `https://x.com/KevinKelbie/status/2084294469126361372`
- @osint_based (P2TR later-vault THOR→Tornado ETH rail): `https://x.com/osint_based/status/2084913457921429800`
- Evan Schoenberg (evening): `https://x.com/evands/status/2083505832587587945`
- Tomer Strolight (morning): `https://x.com/TomerStrolight/status/2083578868191957292`
- Marius Offchain (early Aug 2): `https://x.com/mariusoffchain/status/2083814011859030252`
- Erik (early Aug 2 Mk3 victim): `https://x.com/eriklocalhost/status/2083875886458171626`
- Alex Thorn (likely Wave 4): `https://x.com/intangiblecoins/status/2084079706320646300`
- James O'Beirne (CK tripwire launch): `https://x.com/jamesob/status/2084769501661331589`

**Attacker capability frontier (honeypots — not stolen holdings)**

- Scoreboard: `https://cktripwire.com/`
- Methodology: `https://cktripwire.com/methodology`
- Re-scrape on research passes; if a new difficulty band is swept, refresh `SOURCES` / RiskChecklist notes. Never add honeypot sinks to holdings.

**Advisories / root cause**

- Coinkite: `https://blog.coinkite.com/coldcard-mk3-seed-generation-warning/`
- Block Engineering: `https://engineering.block.xyz/blog/predictable-rng-fallback-and-32-bit-reseed-in-coldcard-firmware`
- WizardSardine: `https://wizardsardine.com/blog/coldcard-rng-vulnerability/`
- SlowMist Aug 12: `https://slowmist.medium.com/coldcard-111-million-theft-a-deep-dive-into-the-private-key-vulnerability-8e51d1a969d3`
- CoinDesk Aug 1: `https://www.coindesk.com/tech/2026/08/01/how-bitcoin-cold-wallets-lost-usd70-million-in-an-attack-that-never-touched-the-devices`

COLDCARD RNG chain map: public cross-check for Wave 3; no URL constant in repo — find the current public map when reconstructing.

## Chainabuse (victim reports)

Public scam/theft reports: [chainabuse.com](https://www.chainabuse.com/).

| Use | How |
|-----|-----|
| Address check | Search the candidate attacker / vault address; open matching report(s) |
| Keyword scout | Firecrawl search `site:chainabuse.com coldcard` (or `cold card hack`) for new leads |
| What to extract | Reported destination address(es), sweep txids, claimed USD/BTC, report URL |
| Weight | Corroboration only — self-reports are unverified until Esplora fingerprint match |

Cite report URLs in cluster `note` / sources when they back a holding (e.g. Kelbie P2TR vault + report `6e9ac9f1-…`). Do not add holdings from Chainabuse alone.

## Known exit labels

Full labeling workflow: [cashout-labeling](../cashout-labeling/SKILL.md)
(patterns: [cashout-labeling/reference.md](../cashout-labeling/reference.md)).
Bridge hops: [btc-bridge-follow](../btc-bridge-follow/SKILL.md). Arkham
(primary): `https://arkm.com/explorer/address/{addr}`. OKLink (secondary tags
only — not balances/hops): `https://www.oklink.com/btc/address/{addr}`.
Bithypha (tertiary OSINT/cluster when labels are soft): 
`https://bithypha.com/address/{addr}` — Firecrawl with `--wait-for` (SPA; curl often 403).

- `bc1qp6yzmq5kjr8yvyw7453gxvq4z3tvkdyadqm794` — THORChain BTC vault
- `3KMmeqPeQcngyTehdfSwsGqvxfU7J7qtc8` — P2SH service hub (likely custodial/swap; hops mixed out)
- `3CTpBmp8uWTcHJBjmyVe8VPPyCHTzj2hBH` — Bullish.com deposit (Wave 4 dual-sweep park peel, block 960793)
- `324H9uyTV9bPgAVgmdJNxPKKKZmowk5CYq` — Bullish.com hot wallet (custodian sweep after 3CTp; stop hop-follow)
- `3CdVzfAe6Aw9K4oSPYXC7BR1xLxCPkxAUs` — Bullish.com (feeds 324H9; Arkham)
- `bc1qactqjuk4kghfgaqqt454hzzzs5lsaysunf80gh` — P2WPKH service hub (Wave 4 hop, block 960797)
- `bc1qrqlamjhy2qp0xj5mxv4sx7ra9qfmfxllf93l26` — P2WPKH service hub (Wave 4 peel from bc1q40y6… @960794; surplus peels e.g. 961114, 961194; Arkham High Transacting; ~1.5M txs)
- `bc1qdj58duywm3ng0twrxk5kykup9q6jmmj72n60ms` — Coinbase Prime Custody (Wave 4 hop, block 960818; Arkham)
- `1KbDEg1tDz2ErYgaDbaDhhawnLrSQFaFx5` — Wintermute (Bullish hot-wallet peel target; Arkham)
- `328GxewqTzMxLPvLemaKS7Q5Wi1io8EEYD` — KuCoin deposit (evening sibling peel, block 960802; Arkham cluster 27fe)
- `3JEQJdb1Cwbzvevzj1ECAoiMbvb2yckvCe` — KuCoin deposit (evening sibling peel, block 960804; same Arkham cluster)
- `13i9ZaXBYJ74qPuK7JrJ6Znws5uTa37vQt` — Binance deposit (P2TR later-vault peel; Arkham cluster 3476)
- `14ajEkhPAgEoow6BHw8b42Dj6JjZSWtsxR` — Binance deposit (same cluster 3476)
- `199JVFuJgimybw4RXBmftLAVufPeyP2GwG` — Binance deposit (same cluster 3476)
- `12FuyGfaaiGbZTXd7Rk5jLNnPzpczMnwzY` — Binance deposit (via bc1q2nfx… → bc1qjwsuc… peel ~0.168 BTC; same cluster 3476)
- `bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h` — Binance hot wallet (consolidate from those deposits; stop hop-follow)
- `bc1q2nfxrvvg67nhey0gk0cc8ke2ea4akge8kskyyq` — OP_RETURN messenger hub (P2TR later-vault hop; Arkham OP_RETURN Messenger; stop hop-follow)
- `bc1qqa7p9qj89f6vg3yhuejhylty8l6626emj736pr` — OP_RETURN messenger hub (P2TR later-vault hop; Arkham OP_RETURN Messenger; stop hop-follow)
- `bc1qesrvsn8g7ln6rmtru5kmuve4cma37r9gsrd78w` — OP_RETURN messenger hub (peels from bc1qqa7p9…; Arkham High Transacting + OP_RETURN Messenger)
- `153La7Fb1p9JLeM26UGmwTXZuMdA9fWmav` — Binance deposit (batch from bc1qesrv…, block 961064; Arkham)
- `bc1pdwu79dady576y3fupmm82m3g7p2p9f6hgyeqy0tdg7ztxg7xrayqlkl8j9` — Hyperunit hub (Arkham; Early Aug 2 CJ remix equal-denom peels — anonymity set, not proven same operator; stop hop-follow)
- `17fqFGPGPTmoWRqSnoSUp4VMDExDofFcFL` — Bybit deposit (Wave 4 hop-1 peel from bc1q72k76… @961731; Arkham Bybit; OKLink Exchange: Bybit)
- `bc1qcgjnpnsnsyklteqmsunv2vm7ww4zs02q9jtdt7` — Quidax deposit (Wave 4 hop-2 from bc1q55llq… peels @960898/961148/961384; Arkham Quidax Deposit; stop hop-follow)

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
- **Dual totals (not a bug):** `GALAXY.totalStolenBtc` (~1367.05) = Waves 1–3 only. `ORIGINAL_STOLEN_BTC` = all tracked clusters (Galaxy 1–3 + community). Community gap includes evening + morning + early Aug 2 + P2TR + Wave 4. External auditors often flag Galaxy vs all-clusters as inconsistency.
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
