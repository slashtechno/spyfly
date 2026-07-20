import type { Flight } from "@/lib/types";
import { categoryLabel } from "@/lib/format";

// ADS-B category is authoritative when broadcast, but a lot of GA/vintage/
// warbird transponders at AirVenture never set it. Fall back to a keyword
// heuristic over the real description/type/operator string airplanes.live
// resolves for the airframe. Best-effort, not a standardized field — kept
// separate from categoryLabel().
const AIRLINER_KEYWORDS = ["airbus a3", "boeing 7", "embraer e", "crj", "dh8", "md-8"];
const BIZJET_KEYWORDS = ["citation", "challenger", "gulfstream", "learjet", "global", "falcon", "legacy", "phenom", "hondajet"];
const HELI_KEYWORDS = ["robinson r", "bell 2", "bell 4", "sikorsky", "eurocopter", "airbus h", "md 500", "enstrom"];
const WARBIRD_KEYWORDS = ["mustang", "corsair", "warhawk", "hellcat", "skyraider", "t-6", "t6 texan", "b-17", "b-25", "b-29", "p-51", "p-40", "f4u", "spitfire", "avenger", "wildcat"];
const LIGHT_GA_KEYWORDS = ["cessna", "piper", "beech", "cirrus", "mooney", "diamond", "vans ", "van's", "champion", "aviat", "maule", "cub", "tecnam", "cirrus vision"];

function matches(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

const MILITARY_KEYWORDS = [
  "air force",
  "navy",
  "marine",
  "army",
  "coast guard",
  "usaf",
  "usmc",
  "department of defense",
  "royal air force",
  "national guard",
];

export type FlightCategory = "commercial" | "military" | "ga";

// Airline ICAO callsigns are 3 letters + 1-4 digits (e.g. UAL2003); GA
// N-numbers never take that shape. Military ownership is only inferred from
// the actual registry text airplanes.live resolves — a warbird's aircraft
// type (P-51, B-17, ...) doesn't make its current civilian owner "military".
const AIRLINE_CALLSIGN = /^[A-Z]{3}\d{1,4}$/;

export function flightCategory(f: Flight): FlightCategory {
  const registryText = `${f.operator ?? ""} ${f.description ?? ""}`.toLowerCase();
  if (matches(registryText, MILITARY_KEYWORDS)) return "military";
  if (AIRLINE_CALLSIGN.test(f.callsign)) return "commercial";
  return "ga";
}

export function sizeClass(f: Flight): string {
  const authoritative = categoryLabel(f.category);
  if (authoritative !== "No data") return authoritative;

  const combined = `${f.description ?? ""} ${f.operator ?? ""}`.toLowerCase();
  if (!combined.trim()) return "Unknown — no transponder or registry data";

  if (matches(combined, WARBIRD_KEYWORDS)) return "Warbird / military";
  if (matches(combined, HELI_KEYWORDS)) return "Helicopter";
  if (matches(combined, BIZJET_KEYWORDS)) return "Business jet";
  if (matches(combined, AIRLINER_KEYWORDS)) return "Airliner";
  if (matches(combined, LIGHT_GA_KEYWORDS)) return "Light GA aircraft";
  return "General aviation aircraft";
}
