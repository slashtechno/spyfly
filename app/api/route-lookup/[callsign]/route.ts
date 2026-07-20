import { NextResponse } from "next/server";
import type { FlightRoute } from "@/lib/types";

export const revalidate = 0;

// Filed routes only exist publicly for scheduled airline flights (ICAO
// callsigns like UAL2835) — adsbdb resolves those against real schedule
// data. GA/warbird/homebuilt traffic (N-number callsigns) doesn't file a
// public route, so this will legitimately come back empty for most AirVenture
// arrivals; that's real, not a bug.
const cache = new Map<string, FlightRoute>();

interface AdsbdbAirport {
  icao_code: string | null;
  iata_code: string | null;
  name: string | null;
  municipality: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface AdsbdbRouteResponse {
  response:
    | {
        flightroute: {
          callsign: string;
          airline: { name: string | null } | null;
          origin: AdsbdbAirport | null;
          destination: AdsbdbAirport | null;
        };
      }
    | "unknown callsign";
}

function toRouteAirport(a: AdsbdbAirport | null) {
  if (!a) return null;
  return {
    icao: a.icao_code,
    iata: a.iata_code,
    name: a.name,
    municipality: a.municipality,
    lat: a.latitude,
    lon: a.longitude,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ callsign: string }> }) {
  const { callsign: raw } = await params;
  const callsign = raw.trim().toUpperCase();

  const cached = cache.get(callsign);
  if (cached) return NextResponse.json(cached);

  const empty: FlightRoute = {
    callsign,
    airlineName: null,
    origin: null,
    destination: null,
    found: false,
  };

  try {
    const res = await fetch(`https://api.adsbdb.com/v0/callsign/${callsign}`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      cache.set(callsign, empty);
      return NextResponse.json(empty);
    }

    const data: AdsbdbRouteResponse = await res.json();
    const route = typeof data.response === "object" ? data.response.flightroute : null;

    const result: FlightRoute = route
      ? {
          callsign,
          airlineName: route.airline?.name ?? null,
          origin: toRouteAirport(route.origin),
          destination: toRouteAirport(route.destination),
          found: true,
        }
      : empty;

    cache.set(callsign, result);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(empty);
  }
}
