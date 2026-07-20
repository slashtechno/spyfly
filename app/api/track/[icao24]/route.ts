import { NextResponse } from "next/server";
import type { FlightTrack } from "@/lib/types";

export const revalidate = 0;

// Real server-side flight history, not something reconstructed from
// whatever a browser tab happened to observe while open. OpenSky's
// /tracks/all returns the actual recorded path for one icao24 — evidently
// rate-limited separately from /states/all (still working here even while
// our states/all polling was 429'd), but we still fetch it lazily (only for
// the selected aircraft, on selection) and cache briefly to keep volume low.
const TTL_MS = 45_000;
const cache = new Map<string, { data: FlightTrack; expiresAt: number }>();
let blockedUntil = 0;

interface OpenSkyTrackResponse {
  path: [number, number, number, number, number, boolean][] | null; // time, lat, lon, baro_alt, heading, on_ground
}

export async function GET(_req: Request, { params }: { params: Promise<{ icao24: string }> }) {
  const { icao24 } = await params;
  const key = icao24.toLowerCase();

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return NextResponse.json(cached.data);

  const empty: FlightTrack = { icao24: key, points: [], found: false };

  if (Date.now() < blockedUntil) return NextResponse.json(empty);

  try {
    const res = await fetch(
      `https://opensky-network.org/api/tracks/all?icao24=${key}&time=0`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    );

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("x-rate-limit-retry-after-seconds") ?? "60");
      blockedUntil = Date.now() + retryAfter * 1000;
      return NextResponse.json(empty);
    }
    if (!res.ok) return NextResponse.json(empty);

    const data: OpenSkyTrackResponse = await res.json();
    const points: [number, number][] = (data.path ?? []).map((p) => [p[2], p[1]]);

    const result: FlightTrack = { icao24: key, points, found: points.length > 1 };
    cache.set(key, { data: result, expiresAt: Date.now() + TTL_MS });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(empty);
  }
}
