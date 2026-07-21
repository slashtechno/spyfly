# SpyFly

A live air traffic radar, originally for [EAA AirVenture Oshkosh](https://www.eaa.org/airventure) — the world's busiest control tower for one week a year. Built on free, zero-config public data sources. 

## What it does

- **Aircraft detail** on selection: registration, type, operator, year built, size class, and a photo when available. Filed routes (origin → destination, plus a clearly-labeled straight-line ETA estimate) for scheduled airline flights. A real recorded flight-history line when OpenSky has one, falling back to a great-circle estimate, falling back to nothing — never a fabricated line.
- **Filter by category** — commercial, military, or GA/hobby traffic.
- **Installable PWA** — add to your home screen for a fullscreen experience.
- **Works anywhere, not just KOSH** — pass `?lat=&lon=&label=` to point the radar at any airport, e.g. `/?lat=33.9425&lon=-118.4081&label=LAX`. Live traffic and real runway geometry both follow; the Fisk VFR corridor and "day of AirVenture" counter are Oshkosh-only and only show for the default location.

## Data sources (all free, no API key)

| Source | Used for |
|---|---|
| [airplanes.live](https://airplanes.live/) | Live aircraft positions, registration, type, operator, year built — fetched directly from the browser, so each visitor's own IP counts against its rate limit instead of one shared server IP |
| [OpenSky Network](https://opensky-network.org/) | Real recorded flight-history tracks (`/tracks/all`) |
| [adsbdb.com](https://www.adsbdb.com/) | Aircraft photos, filed route lookup by callsign |
| [OurAirports](https://ourairports.com/) | Real runway geometry, worldwide — curated for KOSH, fetched and filtered server-side by proximity for anywhere else |
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

> [!NOTE]
> This was built as a small proof-of-concept using AI, but the state it's in now is still very usable, and I do consider it to be polished enough to be deployed publicly. 