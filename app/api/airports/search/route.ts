import { NextResponse } from "next/server";

// Same OurAirports dataset family as /api/runways, fetched and cached the
// same way — full worldwide airport list (~80k rows, ~13MB), so this stays
// server-side and only ever ships the browser a handful of matches.
const AIRPORTS_CSV_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const SEARCHABLE_TYPES = new Set(["large_airport", "medium_airport", "small_airport"]);
const MAX_RESULTS = 8;

export interface AirportResult {
  icao: string;
  iata: string | null;
  name: string;
  municipality: string | null;
  lat: number;
  lon: number;
}

interface ParsedAirport extends AirportResult {
  searchText: string;
}

// Minimal CSV row splitter — good enough for this dataset. Names can
// contain commas inside quotes (e.g. "Springfield, IL"), so this isn't a
// plain split(",") like the simpler runways route can get away with.
function splitRow(row: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const ch = row[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

let cachedAirports: ParsedAirport[] | null = null;

async function loadAirports(): Promise<ParsedAirport[]> {
  if (cachedAirports) return cachedAirports;

  const res = await fetch(AIRPORTS_CSV_URL, { next: { revalidate: 60 * 60 * 24 } });
  if (!res.ok) return [];

  const text = await res.text();
  const lines = text.split("\n");
  const header = splitRow(lines[0]);
  const col = (name: string) => header.indexOf(name);
  const typeIdx = col("type");
  const nameIdx = col("name");
  const latIdx = col("latitude_deg");
  const lonIdx = col("longitude_deg");
  const municipalityIdx = col("municipality");
  const icaoIdx = col("icao_code");
  const iataIdx = col("iata_code");
  const identIdx = col("ident");

  const airports: ParsedAirport[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const cells = splitRow(lines[i]);
    if (!SEARCHABLE_TYPES.has(cells[typeIdx])) continue;

    const lat = Number(cells[latIdx]);
    const lon = Number(cells[lonIdx]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const icao = cells[icaoIdx] || cells[identIdx];
    if (!icao) continue;

    const iata = cells[iataIdx] || null;
    const name = cells[nameIdx];
    const municipality = cells[municipalityIdx] || null;

    airports.push({
      icao,
      iata,
      name,
      municipality,
      lat,
      lon,
      searchText: `${icao} ${iata ?? ""} ${name} ${municipality ?? ""}`.toLowerCase(),
    });
  }

  cachedAirports = airports;
  return airports;
}

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
