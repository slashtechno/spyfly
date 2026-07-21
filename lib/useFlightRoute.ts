"use client";

import { useEffect, useState } from "react";
import type { FlightRoute } from "@/lib/types";

const cache = new Map<string, FlightRoute>();
const inflight = new Map<string, Promise<FlightRoute>>();

// Plain, non-hook fetcher sharing the same cache as useFlightRoute below —
// used by Map3D's imperative marker code (route labels on commercial
// flights), which creates markers via raw maplibregl.Marker/DOM, not React
// components, so it can't call a hook per aircraft. In-flight requests are
// deduplicated too, since many markers can ask for the same callsign at
// once right after a poll refresh repopulates the map.
export function getFlightRoute(callsign: string): Promise<FlightRoute> {
  const cached = cache.get(callsign);
  if (cached) return Promise.resolve(cached);

  const pending = inflight.get(callsign);
  if (pending) return pending;

  const promise = fetch(`/api/route-lookup/${callsign}`)
    .then((res) => res.json())
    .then((data: FlightRoute) => {
      cache.set(callsign, data);
      inflight.delete(callsign);
      return data;
    })
    .catch((err) => {
      inflight.delete(callsign);
      throw err;
    });
  inflight.set(callsign, promise);
  return promise;
}

export function useFlightRoute(callsign: string | null) {
  const [route, setRoute] = useState<FlightRoute | null>(null);

  useEffect(() => {
    if (!callsign) return;
    let cancelled = false;
    getFlightRoute(callsign)
      .then((data) => {
        if (!cancelled) setRoute(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [callsign]);

  return callsign && route?.callsign === callsign ? route : null;
}
