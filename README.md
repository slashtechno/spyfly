# SpyFly

A live 3D traffic radar for [EAA AirVenture Oshkosh](https://www.eaa.org/airventure) — the world's busiest control tower for one week a year. Built entirely on free, keyless public data sources: no API keys, no signup, no config.

## What it does

- **Live 3D traffic radar** around KOSH (Wittman Regional Airport), pitched map with real runway geometry, the famous Fisk VFR arrival corridor, and animated plane markers.
- **Aircraft detail** on selection: registration, type, operator, year built, size class, and a photo when available. Filed routes (origin → destination, plus a clearly-labeled straight-line ETA estimate) for scheduled airline flights. A real recorded flight-history line when OpenSky has one, falling back to a great-circle estimate, falling back to nothing — never a fabricated line.
- **Filter by category** — commercial, military, or GA/hobby traffic.
- **Installable PWA** — add to your home screen for a fast, full-screen view at the show.

## Data sources (all free, no API key)

| Source | Used for |
|---|---|
| [airplanes.live](https://airplanes.live/) | Live aircraft positions, registration, type, operator, year built |
| [OpenSky Network](https://opensky-network.org/) | Real recorded flight-history tracks (`/tracks/all`) |
| [adsbdb.com](https://www.adsbdb.com/) | Aircraft photos, filed route lookup by callsign |
| [OurAirports](https://ourairports.com/) | Real runway geometry for KOSH |
| [CARTO](https://carto.com/basemaps) / [OpenStreetMap](https://www.openstreetmap.org/) | Basemap tiles |

See [`FUTURE.md`](./FUTURE.md) for known limitations and deferred work.

## Getting started

```bash
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

No environment variables are required — every API used is free and keyless. If OpenSky's anonymous rate limit becomes a bottleneck, see the note in `FUTURE.md` about registering a free OpenSky account for higher limits.

## Deploying

This is a standard Next.js app — deploy it on [Vercel](https://vercel.com/new) with no special configuration.
