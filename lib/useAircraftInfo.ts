"use client";

import { useEffect, useState } from "react";
import type { AircraftInfo } from "@/lib/types";

const cache = new Map<string, AircraftInfo>();

export function useAircraftInfo(icao24: string | null) {
  const [info, setInfo] = useState<AircraftInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!icao24) return;

    const cached = cache.get(icao24);
    if (cached) {
      // Synchronous cache hit, not a derived side effect — intentional.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInfo(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/aircraft/${icao24}`)
      .then((res) => res.json())
      .then((data: AircraftInfo) => {
        if (cancelled) return;
        cache.set(icao24, data);
        setInfo(data);
      })
      .catch(() => {
        if (!cancelled) setInfo(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [icao24]);

  // Derived rather than reset-in-effect: only ever show info that actually
  // matches the currently selected aircraft, so switching selection can't
  // briefly flash the previous aircraft's photo/registration.
  const current = icao24 && info?.icao24 === icao24 ? info : null;
  return { info: current, loading: loading && !current };
}
