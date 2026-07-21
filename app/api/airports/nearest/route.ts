import { NextResponse } from "next/server";
import { loadAirports, type Airport } from "@/lib/airportsData";
import { haversineNm } from "@/lib/geo";

export type NearestAirport = Airport;

// Beyond this, "nearest airport" stops meaning anything useful — you're
// just between fields, and guessing one would be more confusing than
// showing nothing.
const MAX_NM = 15;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ airport: null }, { status: 400 });
  }

  const airports = await loadAirports();
  let nearest: Airport | null = null;
  let nearestNm = Infinity;
  for (const a of airports) {
    const d = haversineNm(lat, lon, a.lat, a.lon);
    if (d < nearestNm) {
      nearestNm = d;
      nearest = a;
    }
  }

  if (!nearest || nearestNm > MAX_NM) {
    return NextResponse.json({ airport: null }, { headers: { "Cache-Control": "public, max-age=3600" } });
  }

  const { icao, iata, name, municipality, lat: aLat, lon: aLon } = nearest;
  return NextResponse.json(
    { airport: { icao, iata, name, municipality, lat: aLat, lon: aLon } satisfies NearestAirport },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
