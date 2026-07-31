# Coldcard Hack Tracker

Live single-page dashboard for Bitcoin held after the July 2026 Coldcard seed-entropy sweep.

Monitors the four Galaxy Research “current location” addresses via the public [mempool.space](https://mempool.space) API (no API key). Shows still-held %, BTC/USD value, per-address status, and outbound spends when funds move.

## Develop

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Build / deploy

```bash
npm run build
npm run preview
```

`dist/` is a static site — deploy to Vercel, Netlify, Cloudflare Pages, or any static host.

## Data sources

| Data | Source |
|------|--------|
| Address balances & txs | `/api/address/{addr}` |
| BTC/USD | `/api/v1/prices` |
| Incident facts | Galaxy Research (static) |

No API key is needed. The UI refreshes about every 60 seconds.

### Movement alerts

Use the **Alerts** toggle in the header for browser notifications when a new
outbound spend appears (holdings or followed hops). Preference is stored in
`localStorage`; the tab must stay open for polling to continue.

### Explorer mirrors

Some networks, VPNs, and DNS filters block `mempool.space`, which makes every
request fail in the browser. The app probes hosts in order and reuses the first
one that answers:

1. `mempool.space`
2. `mempool.emzy.de`
3. `mempool.bitaroo.net`

The footer shows which host served the current data. Edit `MEMPOOL_HOSTS` in
[src/data/incident.ts](src/data/incident.ts) to add your own instance.

### Hop following

When a holding address spends, the tracker follows the largest destinations
(up to hop 2, ignoring dust under 0.01 BTC) and lists those outbound spends in
the movement feed. Still-held % stays based on the original four Galaxy
addresses only.

## Disclaimer

Not affiliated with Coinkite or Coldcard. For public blockchain monitoring only.

## License

[MIT](LICENSE)
