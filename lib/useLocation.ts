"use client";

import { useSyncExternalStore } from "react";
import airvention from "@/data/airvention.json";

export interface RadarLocation {
  lat: number;
  lon: number;
  label: string;
  // The Fisk VFR corridor, its checkpoints, and the "day of AirVenture"
  // counter are Oshkosh-specific — they only make sense for the default
  // AirVenture location, not a searched or panned-to airport.
  isDefault: boolean;
  // False only for the one SSR/first-paint snapshot, before the URL has
  // actually been checked. A mount-once effect keyed on location (Map3D's
  // map setup) would otherwise capture this placeholder before the real
  // value is known, since child effects fire before parent effects.
  resolved: boolean;
}

const DEFAULT_LOCATION: RadarLocation = {
  lat: airvention.airport.lat,
  lon: airvention.airport.lon,
  label: `${airvention.airport.icao} · ${airvention.airport.name}`,
  isDefault: true,
  resolved: false,
};

// Module-scope external store: the current radar location is effectively
// global browser state (mirrored in the URL for shareable links), not
// per-component state, so it lives here rather than in a useState — search
// selection and map-pan tracking both need to be able to update it from
// anywhere without prop-drilling a setter through every consumer.
let current: RadarLocation | null = null;
const listeners = new Set<() => void>();

function readFromUrl(): RadarLocation {
  const params = new URLSearchParams(window.location.search);
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) {
    return { ...DEFAULT_LOCATION, resolved: true };
  }
  const label = params.get("label");
  return {
    lat,
    lon,
    label: label ?? `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
    isDefault: false,
    resolved: true,
  };
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): RadarLocation {
  if (!current) current = readFromUrl();
  return current;
}

function getServerSnapshot(): RadarLocation {
  return DEFAULT_LOCATION;
}

// Explicitly set the radar's location — from search selection or a "go
// here" affordance. Distinct from the pan-driven flight/runway refetching
// (see Map3D's onCenterChange), which keeps live data relevant to what's
// on screen without renaming "where you are" or touching the URL.
export function setLocation(loc: { lat: number; lon: number; label: string; icao?: string | null }) {
  current = {
    lat: loc.lat,
    lon: loc.lon,
    label: loc.label,
    isDefault: loc.icao === airvention.airport.icao,
    resolved: true,
  };

  const url = new URL(window.location.href);
  if (current.isDefault) {
    url.searchParams.delete("lat");
    url.searchParams.delete("lon");
    url.searchParams.delete("label");
  } else {
    url.searchParams.set("lat", String(loc.lat));
    url.searchParams.set("lon", String(loc.lon));
    url.searchParams.set("label", loc.label);
  }
  window.history.replaceState(null, "", url);

  for (const cb of listeners) cb();
}

// Reads the URL directly via plain URLSearchParams rather than Next's
// useSearchParams(): this app is fully client-rendered (the map is
// dynamic/ssr:false and flight data is live), so there's no SSR value to
// gain, and useSearchParams would otherwise force a Suspense boundary here
// for no benefit.
//
// useSyncExternalStore (not useState+useEffect) is what keeps the initial
// read hydration-safe: getServerSnapshot's default is used for both the
// server render and the client's first paint, and React handles resyncing
// to the real getSnapshot() value without a manual setState call that
// would otherwise trip React's set-state-in-effect lint rule or, without
// care, loop forever on a non-memoized snapshot.
export function useLocation(): RadarLocation {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
