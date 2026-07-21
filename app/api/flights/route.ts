import { NextResponse } from "next/server";
import airventionData from "@/data/airvention.json";
import type { Flight, FlightsResponse } from "@/lib/types";

export const revalidate = 0;

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

const RADIUS_NM = 20;

let cache: FlightsResponse | null = null;
// airplanes.live is dynamically rate-limited under load; if we ever get a
// 4xx, back off for a bit rather than hammering an endpoint that just told
// us no — same pattern as the earlier OpenSky integration, kept as a
// defensive measure even though this API has been far more generous.
let blockedUntil = 0;

export async function GET() {
  const { lat, lon } = airventionData.airport;
  const url = `https://api.airplanes.live/v2/point/${lat}/${lon}/${RADIUS_NM}`;

  if (Date.now() < blockedUntil) {
    if (cache) return NextResponse.json({ ...cache, source: "stale-cache" as const });
    return NextResponse.json({
      fetchedAt: Date.now(),
      source: "rate-limited" as const,
      count: 0,
      flights: [],
      retryAfterSec: Math.ceil((blockedUntil - Date.now()) / 1000),
    });
  }

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "SpyFly/1.0" },
      cache: "no-store",
    });

    if (res.status === 429 || res.status === 403) {
      blockedUntil = Date.now() + 30_000;
      throw new Error(`airplanes.live responded ${res.status}`);
    }
    if (!res.ok) {
      throw new Error(`airplanes.live responded ${res.status}`);
    }

    const data: { ac?: AirplanesLiveAircraft[] } = await res.json();

    const flights: Flight[] = (data.ac ?? [])
      .filter((a) => typeof a.lat === "number" && typeof a.lon === "number")
      .map((a) => ({
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
      }));

    const payload: FlightsResponse = {
      fetchedAt: Date.now(),
      source: "airplanes-live",
      count: flights.length,
      flights,
    };

    cache = payload;
    return NextResponse.json(payload);
  } catch (err) {
    if (cache) {
      return NextResponse.json({ ...cache, source: "stale-cache" as const });
    }
    return NextResponse.json(
      { fetchedAt: Date.now(), source: "airplanes-live", count: 0, flights: [], error: String(err) },
      { status: 502 },
    );
  }
}
