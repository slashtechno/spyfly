import { NextResponse } from "next/server";
import { loadAirports, type Airport, type ParsedAirport } from "@/lib/airportsData";

export type AirportResult = Airport;

const MAX_RESULTS = 8;

function rank(a: ParsedAirport, q: string): number {
  if (a.icao.toLowerCase() === q || a.iata?.toLowerCase() === q) return 0;
  if (a.icao.toLowerCase().startsWith(q) || a.iata?.toLowerCase().startsWith(q)) return 1;
  if (a.name.toLowerCase().startsWith(q)) return 2;
  return 3;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  if (q.length < 2) return NextResponse.json({ airports: [] });

  const airports = await loadAirports();
  const matches = airports
    .filter((a) => a.searchText.includes(q))
    .sort((a, b) => rank(a, q) - rank(b, q))
    .slice(0, MAX_RESULTS)
    .map(({ icao, iata, name, municipality, lat, lon }): AirportResult => ({
      icao,
      iata,
      name,
      municipality,
      lat,
      lon,
    }));

  return NextResponse.json(
    { airports: matches },
    { headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
