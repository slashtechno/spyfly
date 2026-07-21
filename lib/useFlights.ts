"use client";

import { useEffect, useRef, useState } from "react";
import type { Flight } from "@/lib/types";

// airplanes.live is dynamically rate-limited; polling every ~10s keeps us
// comfortably inside that without hammering it. Fetched directly from the
// browser (airplanes.live sends Access-Control-Allow-Origin: *), so each
// visitor's own IP counts against that limit instead of one shared server
// IP taking the hit for every visitor at once.
const POLL_MS = 10000;
// Exported so the map can draw a faint ring showing the live query area.
export const FLIGHTS_RADIUS_NM = 20;

export type FlightsStatus = "loading" | "live" | "stale" | "rate-limited" | "error";

// airplanes.live v2 API — a free, keyless, community ADS-B feed compatible
// with the ADSBExchange v2 schema. See https://airplanes.live/api-guide/
// Fields are already in native aviation units (ft, kt, fpm) unlike OpenSky's
// SI units, and include registration/type/operator/year when known.
interface AirplanesLiveAircraft {
  hex: string;
  flight?: string;
  r?: string;
  t?: string;
  desc?: string;
  ownOp?: string;
  year?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | "ground";
  gs?: number;
  track?: number;
  baro_rate?: number;
  squawk?: string;
  category?: string;
  seen_pos?: number;
  seen?: number;
}

// Rounds to ~0.6nm precision (2 decimal degrees) — plenty accurate for a
// 20nm-radius traffic query, but coarse enough that a device's exact GPS
// fix (e.g. from the map's "locate me" control) never reaches this or any
// other third-party API as a precise physical location.
function roundCoord(n: number): number {
  return Math.round(n * 100) / 100;
}

function toFlight(a: AirplanesLiveAircraft): Flight {
  return {
    icao24: a.hex,
    callsign: (a.flight ?? "").trim() || a.hex.toUpperCase(),
    registration: a.r ?? null,
    icaoType: a.t ?? null,
    description: a.desc ?? null,
    operator: a.ownOp ?? null,
    yearBuilt: a.year ?? null,
    lon: a.lon as number,
    lat: a.lat as number,
    altitudeFt: a.alt_baro === "ground" || a.alt_baro === undefined ? null : a.alt_baro,
    onGround: a.alt_baro === "ground",
    groundSpeedKt: a.gs ?? null,
    trackDeg: a.track ?? null,
    vertRateFpm: a.baro_rate ?? null,
    squawk: a.squawk ?? null,
    category: a.category ?? null,
    lastSeenSec: a.seen_pos ?? a.seen ?? 0,
  };
}

export function useFlights(lat: number, lon: number) {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [status, setStatus] = useState<FlightsStatus>("loading");
  const [retryAfterSec, setRetryAfterSec] = useState<number | null>(null);
  const mounted = useRef(true);
  const cacheRef = useRef<Flight[] | null>(null);
  // If airplanes.live ever answers with a 4xx, back off for a bit rather
  // than hammering an endpoint that just told us no.
  const blockedUntilRef = useRef(0);

  useEffect(() => {
    mounted.current = true;
    const url = `https://api.airplanes.live/v2/point/${roundCoord(lat)}/${roundCoord(lon)}/${FLIGHTS_RADIUS_NM}`;

    async function poll() {
      if (Date.now() < blockedUntilRef.current) {
        if (!mounted.current) return;
        if (cacheRef.current) {
          setFlights(cacheRef.current);
          setStatus("stale");
        } else {
          setStatus("rate-limited");
          setRetryAfterSec(Math.ceil((blockedUntilRef.current - Date.now()) / 1000));
        }
        return;
      }

      try {
        const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });

        if (res.status === 429 || res.status === 403) {
          blockedUntilRef.current = Date.now() + 30_000;
          throw new Error(`airplanes.live responded ${res.status}`);
        }
        if (!res.ok) throw new Error(`airplanes.live responded ${res.status}`);

        const data: { ac?: AirplanesLiveAircraft[] } = await res.json();
        const mapped = (data.ac ?? [])
          .filter((a) => typeof a.lat === "number" && typeof a.lon === "number")
          .map(toFlight);

        if (!mounted.current) return;
        cacheRef.current = mapped;
        setFlights(mapped);
        setFetchedAt(Date.now());
        setRetryAfterSec(null);
        setStatus("live");
      } catch {
        if (!mounted.current) return;
        if (cacheRef.current) {
          setFlights(cacheRef.current);
          setStatus("stale");
        } else {
          setStatus("error");
        }
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, [lat, lon]);

  return { flights, fetchedAt, status, retryAfterSec, pollMs: POLL_MS };
}
