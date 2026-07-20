import { NextResponse } from "next/server";
import type { AircraftInfo } from "@/lib/types";

export const revalidate = 0;

// Registration/type/operator/year now come straight from the airplanes.live
// feed — this route exists purely to resolve a photo via adsbdb.com (free,
// no-key), which pulls from airport-data.com's registry photo archive.
// Photos never change for a given airframe, so we cache indefinitely.
const cache = new Map<string, AircraftInfo>();

interface AdsbdbResponse {
  response:
    | { aircraft: { url_photo: string | null; url_photo_thumbnail: string | null } }
    | "unknown icao24";
}

export async function GET(_req: Request, { params }: { params: Promise<{ icao24: string }> }) {
  const { icao24 } = await params;
  const key = icao24.toLowerCase();

  const cached = cache.get(key);
  if (cached) return NextResponse.json(cached);

  const empty: AircraftInfo = {
    icao24: key,
    photoUrl: null,
    photoThumbUrl: null,
    found: false,
  };

  try {
    const res = await fetch(`https://api.adsbdb.com/v0/aircraft/${key}`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      cache.set(key, empty);
      return NextResponse.json(empty);
    }

    const data: AdsbdbResponse = await res.json();
    const aircraft = typeof data.response === "object" ? data.response.aircraft : null;

    const info: AircraftInfo = {
      icao24: key,
      photoUrl: aircraft?.url_photo ?? null,
      photoThumbUrl: aircraft?.url_photo_thumbnail ?? null,
      found: !!aircraft,
    };

    cache.set(key, info);
    return NextResponse.json(info);
  } catch {
    return NextResponse.json(empty);
  }
}
