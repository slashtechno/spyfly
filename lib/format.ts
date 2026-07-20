import type { Flight } from "@/lib/types";

export function trend(f: Flight): "up" | "down" | "level" {
  const vr = f.vertRateFpm ?? 0;
  if (vr > 150) return "up";
  if (vr < -150) return "down";
  return "level";
}

export function heading(deg: number | null): string {
  if (deg === null) return "—";
  return `${Math.round(deg).toString().padStart(3, "0")}°`;
}

// ADS-B Exchange v2 emitter category encoding (letter+digit), broadcast by
// the transponder itself per the DO-260B standard — genuine standardized
// data, not a guess. A-series is fixed-wing, B-series light/other, C-series
// ground obstacles/vehicles.
const CATEGORY_LABELS: Record<string, string> = {
  A0: "No data",
  A1: "Light aircraft",
  A2: "Small aircraft",
  A3: "Large aircraft",
  A4: "High-vortex large",
  A5: "Heavy aircraft",
  A6: "High performance",
  A7: "Rotorcraft",
  B0: "No data",
  B1: "Glider / sailplane",
  B2: "Lighter-than-air",
  B3: "Skydiver",
  B4: "Ultralight / hang-glider",
  B6: "Drone (UAV)",
  B7: "Space vehicle",
  C0: "No data",
  C1: "Emergency vehicle",
  C2: "Service vehicle",
};

export function categoryLabel(category: string | null): string {
  if (!category) return "No data";
  return CATEGORY_LABELS[category] ?? "Unknown";
}

// Universally reserved emergency squawk codes — real ICAO/FAA standard, not
// specific to any one country's ATC system.
const SQUAWK_ALERTS: Record<string, string> = {
  "7500": "Hijack",
  "7600": "Radio failure",
  "7700": "General emergency",
};

export function squawkAlert(squawk: string | null): string | null {
  if (!squawk) return null;
  return SQUAWK_ALERTS[squawk] ?? null;
}

export function dataAgeLabel(lastSeenSec: number): string {
  const s = Math.round(lastSeenSec);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  return `${Math.round(s / 60)}m ago`;
}

const EARTH_RADIUS_NM = 3440.065;

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_NM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// No public API exposes a scheduled/estimated arrival time for free — this
// is a straight-line distance-remaining / current-groundspeed projection, not
// a real ETA (no wind, routing, or descent-profile accounted for). Always
// label it as an estimate in the UI.
export function estimateEtaMinutes(
  f: Flight,
  destLat: number,
  destLon: number,
): number | null {
  if (f.onGround || !f.groundSpeedKt || f.groundSpeedKt < 30) return null;
  const distNm = haversineNm(f.lat, f.lon, destLat, destLon);
  const minutes = (distNm / f.groundSpeedKt) * 60;
  return minutes > 0 && minutes < 600 ? Math.round(minutes) : null;
}
