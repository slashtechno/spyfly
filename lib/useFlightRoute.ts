"use client";

import { useEffect, useState } from "react";
import type { FlightRoute } from "@/lib/types";

const cache = new Map<string, FlightRoute>();

export function useFlightRoute(callsign: string | null) {
  const [route, setRoute] = useState<FlightRoute | null>(null);

  useEffect(() => {
    if (!callsign) return;

    const cached = cache.get(callsign);
    if (cached) {
      // Synchronous cache hit, not a derived side effect — intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRoute(cached);
      return;
    }

    let cancelled = false;
    fetch(`/api/route-lookup/${callsign}`)
      .then((res) => res.json())
      .then((data: FlightRoute) => {
        if (cancelled) return;
        cache.set(callsign, data);
        setRoute(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [callsign]);

  return callsign && route?.callsign === callsign ? route : null;
}
