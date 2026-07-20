# Future work

Things requested or identified during development that are deliberately deferred, not forgotten.

## Requested, not yet built

- **"Locate me" button.** Especially relevant in PWA/standalone mode on a phone at the show — use the browser Geolocation API to drop a "you are here" marker and fly the map to it. Needs a permission-gated button (likely near the zoom controls) and a distinct marker style so it doesn't get confused with aircraft or VFR checkpoints.

## Known limitations worth revisiting

- **OpenSky anonymous rate limits.** `/api/track/[icao24]` (real flight-history lookup) and the original `/api/flights` prototype both depend on OpenSky's anonymous tier, which is credit-limited and can 429 for extended periods (observed a 23h lockout during development from one IP). The app degrades gracefully (cached data, honest "rate limited" status), but a free OpenSky account (OAuth2 client credentials) would raise the ceiling significantly if this becomes a recurring problem. That requires env vars for client id/secret — a deliberate step up from the current zero-config design, so it wasn't done by default.
- **No offline/service-worker support.** The current PWA setup (manifest + icon.tsx/apple-icon.tsx + apple-web-app meta) makes the app installable to a home screen, but there's no service worker, so it's not offline-capable. Add one (e.g. via `next-pwa` or a hand-rolled worker) if offline viewing at the show (spotty cell coverage) becomes a priority.
- **AirVenture-specific ground POIs not plotted.** Boeing Plaza, Warbird Alley, Camp Scholler, the North 40, etc. were deliberately left off the map — no verified, precise public coordinate source was found for them (unlike the runways and VFR checkpoints, which come from OurAirports and a published FAA-sourced arrival chart respectively). Revisit if EAA ever publishes a georeferenced grounds map.
- **Squawk/emergency alerts are visual-only.** A 7500/7600/7700 squawk highlights in the traffic list and aircraft panel but doesn't page/notify — could add a push notification or audible alert if that's ever wanted.
- **Flight-so-far line is a best-effort estimate for most aircraft.** Real recorded history via OpenSky's `/tracks/all` is used when available; a great-circle arc from the filed route's origin airport is the fallback for commercial flights without track data; GA/homebuilt aircraft (no filed public route) get no line at all rather than a fabricated one. No free API gives the exact flown path for every aircraft type.
