"use client";

import { useSyncExternalStore } from "react";
import airvention from "@/data/airvention.json";

export interface RadarLocation {
  lat: number;
  lon: number;
  label: string;
  // The Fisk VFR corridor, runway overlay, and "day of AirVenture" counter
  // are all Oshkosh-specific data — they only make sense for the default
  // location, not for a ?lat=&lon= override pointed at some other airport.
  isDefault: boolean;
  // False only for the one SSR/first-paint snapshot, before we've actually
  // been able to check the URL. Map3D's own setup effect runs once on
  // mount and reads whatever `location` prop it was first given — since
  // child effects fire before parent effects, it would otherwise capture
  // this placeholder default before a real check ever happened. Callers
  // that own a mount-once effect keyed on location should wait for
  // `resolved` before rendering that child at all.
  resolved: boolean;
}

const DEFAULT_LOCATION: RadarLocation = {
  lat: airvention.airport.lat,
  lon: airvention.airport.lon,
  label: `${airvention.airport.icao} · ${airvention.airport.name}`,
  isDefault: true,
  resolved: false,
};

// The query string never changes without a full navigation in this
// single-page app, so there's nothing to actually subscribe to.
function subscribe() {
  return () => {};
}

// getSnapshot must return a referentially-stable value when nothing has
// actually changed — a fresh object literal on every call looks like a
// perpetual external change to useSyncExternalStore and loops forever.
// The query string is effectively global browser state anyway, so caching
// it at module scope (rather than per-hook-instance) is the right shape.
let cachedSearch: string | null = null;
let cachedSnapshot: RadarLocation = { ...DEFAULT_LOCATION, resolved: true };

function getSnapshot(): RadarLocation {
  const search = window.location.search;
  if (search === cachedSearch) return cachedSnapshot;
  cachedSearch = search;

  const params = new URLSearchParams(search);
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) {
    cachedSnapshot = { ...DEFAULT_LOCATION, resolved: true };
    return cachedSnapshot;
  }

  const label = params.get("label");
  cachedSnapshot = {
    lat,
    lon,
    label: label ?? `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
    isDefault: false,
    resolved: true,
  };
  return cachedSnapshot;
}

function getServerSnapshot(): RadarLocation {
  return DEFAULT_LOCATION;
}

// Reads the URL directly via plain URLSearchParams rather than Next's
// useSearchParams(): this app is fully client-rendered (the map is
// dynamic/ssr:false and flight data is live), so there's no SSR value to
// gain, and useSearchParams would otherwise force a Suspense boundary here
// for no benefit.
//
// useSyncExternalStore (not useState+useEffect) is what keeps this
// hydration-safe: getServerSnapshot's default is used for both the server
// render and the client's first paint, and React handles resyncing to the
// real getSnapshot() value on the client without a manual setState call.
export function useLocation(): RadarLocation {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
