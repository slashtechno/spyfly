export interface Flight {
  icao24: string;
  callsign: string;
  registration: string | null;
  icaoType: string | null;
  description: string | null;
  operator: string | null;
  yearBuilt: string | null;
  lon: number;
  lat: number;
  altitudeFt: number | null;
  onGround: boolean;
  groundSpeedKt: number | null;
  trackDeg: number | null;
  vertRateFpm: number | null;
  squawk: string | null;
  category: string | null;
  lastSeenSec: number;
}

export interface AircraftInfo {
  icao24: string;
  photoUrl: string | null;
  photoThumbUrl: string | null;
  found: boolean;
}

export interface RouteAirport {
  icao: string | null;
  iata: string | null;
  name: string | null;
  municipality: string | null;
  lat: number | null;
  lon: number | null;
}

export interface FlightRoute {
  callsign: string;
  airlineName: string | null;
  origin: RouteAirport | null;
  destination: RouteAirport | null;
  found: boolean;
}

export interface FlightTrack {
  icao24: string;
  points: [number, number][]; // [lon, lat], in chronological order
  found: boolean;
}
