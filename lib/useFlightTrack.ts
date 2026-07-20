"use client";

import { useEffect, useState } from "react";
import type { FlightTrack } from "@/lib/types";

const TTL_MS = 45_000;
const cache = new Map<string, { data: FlightTrack; expiresAt: number }>();

export function useFlightTrack(icao24: string | null) {
  const [track, setTrack] = useState<FlightTrack | null>(null);

  useEffect(() => {
    if (!icao24) return;

    const cached = cache.get(icao24);
    if (cached && cached.expiresAt > Date.now()) {
      // Synchronous cache hit, not a derived side effect — intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTrack(cached.data);
      return;
    }

    let cancelled = false;
    fetch(`/api/track/${icao24}`)
      .then((res) => res.json())
      .then((data: FlightTrack) => {
        if (cancelled) return;
        cache.set(icao24, { data, expiresAt: Date.now() + TTL_MS });
        setTrack(data);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [icao24]);

  return icao24 && track?.icao24 === icao24 ? track : null;
}
