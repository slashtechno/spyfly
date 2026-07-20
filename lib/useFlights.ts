"use client";

import { useEffect, useRef, useState } from "react";
import type { Flight, FlightsResponse } from "@/lib/types";

// airplanes.live is dynamically rate-limited; polling every ~10s keeps us
// comfortably inside that without hammering it (the API route also falls
// back to its last good cache on any failure).
const POLL_MS = 10000;

export type FlightsStatus = "loading" | "live" | "stale" | "rate-limited" | "error";

export function useFlights() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [status, setStatus] = useState<FlightsStatus>("loading");
  const [retryAfterSec, setRetryAfterSec] = useState<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    async function poll() {
      try {
        const res = await fetch("/api/flights", { cache: "no-store" });
        const data: FlightsResponse = await res.json();
        if (!mounted.current) return;
        setFlights(data.flights);
        setFetchedAt(data.fetchedAt);
        setRetryAfterSec(data.retryAfterSec ?? null);
        setStatus(
          data.source === "airplanes-live"
            ? "live"
            : data.source === "rate-limited"
              ? "rate-limited"
              : "stale",
        );
      } catch {
        if (mounted.current) setStatus("error");
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      mounted.current = false;
      clearInterval(id);
    };
  }, []);

  return { flights, fetchedAt, status, retryAfterSec, pollMs: POLL_MS };
}
