// Server-only: loads and caches the full OurAirports worldwide airport list
// for both /api/airports/search (text search) and /api/airports/nearest
// (pan-follow). ~80k rows, ~13MB — fetched once per warm server instance
// and kept in memory, never shipped to the browser.
const AIRPORTS_CSV_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const SEARCHABLE_TYPES = new Set(["large_airport", "medium_airport", "small_airport"]);

export interface Airport {
  icao: string;
  iata: string | null;
  name: string;
  municipality: string | null;
  lat: number;
  lon: number;
}

export interface ParsedAirport extends Airport {
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

export async function loadAirports(): Promise<ParsedAirport[]> {
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
