"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Flight } from "@/lib/types";
import { dataAgeLabel, estimateEtaMinutes, heading, squawkAlert } from "@/lib/format";
import { sizeClass } from "@/lib/aircraftClass";
import AnimatedNumber from "@/components/AnimatedNumber";
import { useAircraftInfo } from "@/lib/useAircraftInfo";
import { useFlightRoute } from "@/lib/useFlightRoute";

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-hairline/60 bg-panel-1 px-3 py-2.5">
      <span className="font-display text-[9px] font-bold uppercase tracking-[0.14em] text-ink-2">
        {label}
      </span>
      <span className="font-mono text-base font-semibold tabular text-ink-0">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-ink-2">{unit}</span>}
      </span>
    </div>
  );
}

function AircraftPhoto({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // Photo hosts vary per-aircraft (airport-data.com, jetphotos mirrors,
    // etc.) — an unconfigured external domain per image rules out
    // next/image's remotePatterns allowlist, so a plain <img> with a
    // graceful failure state is the pragmatic choice here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-36 w-full rounded-xl border border-hairline/60 object-cover"
    />
  );
}

function ageFromYear(yearBuilt: string | null): string | null {
  const year = yearBuilt ? parseInt(yearBuilt, 10) : NaN;
  if (!year || Number.isNaN(year)) return null;
  const age = new Date().getFullYear() - year;
  return age >= 0 ? `${age} yr${age === 1 ? "" : "s"} old` : null;
}

export default function AircraftPanel({ flight }: { flight: Flight | null }) {
  const { info, loading } = useAircraftInfo(flight?.icao24 ?? null);
  const route = useFlightRoute(flight?.callsign ?? null);
  const alert = flight ? squawkAlert(flight.squawk) : null;
  const age = flight ? ageFromYear(flight.yearBuilt) : null;

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-3 pt-4">
        <h2 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-ink-1">
          Selected Aircraft
        </h2>
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <AnimatePresence mode="wait">
          {flight ? (
            <motion.div
              key={flight.icao24}
              initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ duration: 0.25 }}
              className="flex flex-col gap-3"
            >
              {alert && (
                <div className="flex items-center gap-2 rounded-xl border border-red/50 bg-red/10 px-3 py-2">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-red animate-pulse-dot" />
                  <span className="font-display text-xs font-bold uppercase tracking-wide text-red">
                    Squawk {flight.squawk} · {alert}
                  </span>
                </div>
              )}

              <div>
                <div className="font-display text-3xl font-extrabold tracking-tight text-ink-0">
                  {flight.callsign}
                </div>
                <div className="font-mono text-xs text-ink-2">
                  {flight.icao24.toUpperCase()} · {dataAgeLabel(flight.lastSeenSec)}
                </div>
              </div>

              {route?.found && (route.origin || route.destination) && (
                <div className="rounded-2xl border border-ice/30 bg-ice/5 px-4 py-3">
                  {route.airlineName && (
                    <div className="font-mono text-[10px] uppercase tracking-wide text-ice">
                      {route.airlineName}
                    </div>
                  )}
                  <div className="flex items-center gap-2 font-display text-lg font-bold text-ink-0">
                    <span>{route.origin?.municipality ?? route.origin?.iata ?? "—"}</span>
                    <span className="text-ice">→</span>
                    <span>{route.destination?.municipality ?? route.destination?.iata ?? "—"}</span>
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-ink-2">
                    {[route.origin?.name, route.destination?.name].filter(Boolean).join(" → ")}
                  </div>
                  {route.destination?.lat != null && route.destination?.lon != null && (() => {
                    const eta = estimateEtaMinutes(flight, route.destination.lat, route.destination.lon);
                    return eta ? (
                      <div className="mt-1.5 border-t border-ice/20 pt-1.5 font-mono text-[11px] text-ice">
                        Est. arrival in ~{eta} min{" "}
                        <span className="text-ink-2">
                          (straight-line at current speed, not a schedule)
                        </span>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              {loading && (
                <div className="h-36 w-full animate-pulse rounded-xl border border-hairline/60 bg-panel-1" />
              )}
              {info?.photoUrl && <AircraftPhoto url={info.photoUrl} alt={flight.callsign} />}

              <div className="rounded-xl border border-hairline/60 bg-panel-1 px-3 py-2.5">
                <span className="font-display text-[9px] font-bold uppercase tracking-[0.14em] text-ink-2">
                  What is it
                </span>
                <div className="mt-0.5 font-display text-sm font-semibold text-ink-0">
                  {flight.description ?? sizeClass(flight)}
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-ink-2">
                  {[flight.registration, flight.icaoType].filter(Boolean).join(" · ") || "—"}
                </div>
                {flight.operator && (
                  <div className="font-mono text-[11px] text-ink-2">{flight.operator}</div>
                )}
                {age && (
                  <div className="mt-1 inline-block rounded-full bg-gold/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-gold">
                    Built {flight.yearBuilt} · {age}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-hairline/60 bg-gradient-to-br from-panel-2 to-panel-1 px-4 py-4">
                <span className="font-display text-[9px] font-bold uppercase tracking-[0.14em] text-ink-2">
                  Altitude
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-5xl font-extrabold tabular text-gold">
                    <AnimatedNumber value={flight.altitudeFt ?? 0} />
                  </span>
                  <span className="font-mono text-sm text-ink-2">ft</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Stat
                  label="Ground Spd"
                  value={
                    flight.groundSpeedKt !== null ? Math.round(flight.groundSpeedKt).toString() : "—"
                  }
                  unit="kt"
                />
                <Stat label="Heading" value={heading(flight.trackDeg)} />
                <Stat
                  label="Vert Rate"
                  value={flight.vertRateFpm?.toLocaleString() ?? "0"}
                  unit="fpm"
                />
                <Stat label="Squawk" value={flight.squawk ?? "—"} />
              </div>

              <div className="rounded-xl border border-hairline/60 bg-panel-1 px-3 py-2.5">
                <span className="font-display text-[9px] font-bold uppercase tracking-[0.14em] text-ink-2">
                  Size class
                </span>
                <div className="mt-0.5 font-mono text-xs tabular text-ink-0">
                  {sizeClass(flight)}
                </div>
              </div>

              <div className="rounded-xl border border-hairline/60 bg-panel-1 px-3 py-2.5">
                <span className="font-display text-[9px] font-bold uppercase tracking-[0.14em] text-ink-2">
                  Status
                </span>
                <div className="mt-0.5 font-mono text-xs tabular text-ink-0">
                  {flight.onGround ? "ON GROUND" : "AIRBORNE"} · {flight.lat.toFixed(3)},{" "}
                  {flight.lon.toFixed(3)}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-6 text-center font-mono text-xs text-ink-2"
            >
              Select an aircraft on the map or in the traffic list.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
