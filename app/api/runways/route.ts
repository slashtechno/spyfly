import { NextResponse } from "next/server";

// The full OurAirports runways dataset (~46k runways worldwide, ~4MB) —
// same source used for the hand-picked KOSH data in data/kosh-airfield.json,
// but fetched live and filtered here so a visitor's browser only ever
// downloads the handful of runways near the point they asked about, not the
// whole file. Rarely changes, so cache it hard.
const RUNWAYS_CSV_URL = "https://davidmegginson.github.io/ourairports-data/runways.csv";
const RADIUS_NM = 8;

interface Runway {
  ident: string;
  lengthFt: number;
  ends: [{ lat: number; lon: number }, { lat: number; lon: number }];
}

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R_NM = 3440.065;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R_NM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Minimal CSV row splitter — good enough for this dataset, which only
// quotes plain alphanumeric fields (idents, surface codes) with no embedded
// commas or quotes to escape.
function splitRow(row: string): string[] {
  return row.split(",").map((cell) => cell.replace(/^"|"$/g, ""));
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lon = Number(searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ runways: [] }, { status: 400 });
  }

  const res = await fetch(RUNWAYS_CSV_URL, { next: { revalidate: 60 * 60 * 24 } });
  if (!res.ok) return NextResponse.json({ runways: [] }, { status: 502 });

  const text = await res.text();
  const lines = text.split("\n");
  const header = splitRow(lines[0]);
  const col = (name: string) => header.indexOf(name);
  const idIdx = col("airport_ident");
  const lenIdx = col("length_ft");
  const leIdent = col("le_ident");
  const leLat = col("le_latitude_deg");
  const leLon = col("le_longitude_deg");
  const heIdent = col("he_ident");
  const heLat = col("he_latitude_deg");
  const heLon = col("he_longitude_deg");

  const runways: Runway[] = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const cells = splitRow(lines[i]);
    const lat1 = Number(cells[leLat]);
    const lon1 = Number(cells[leLon]);
    const lat2 = Number(cells[heLat]);
    const lon2 = Number(cells[heLon]);
    if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
      continue;
    }
    const midLat = (lat1 + lat2) / 2;
    const midLon = (lon1 + lon2) / 2;
    if (haversineNm(lat, lon, midLat, midLon) > RADIUS_NM) continue;

    runways.push({
      ident: `${cells[idIdx]} ${cells[leIdent]}/${cells[heIdent]}`,
      lengthFt: Number(cells[lenIdx]) || 0,
      ends: [
        { lat: lat1, lon: lon1 },
        { lat: lat2, lon: lon2 },
      ],
    });
  }

  return NextResponse.json({ runways }, { headers: { "Cache-Control": "public, max-age=86400" } });
}
