"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import type { Flight as FlightT } from "@/lib/types";
import { squawkAlert, trend } from "@/lib/format";
import { flightCategory, type FlightCategory } from "@/lib/aircraftClass";
import type { FlightsStatus } from "@/lib/useFlights";

const trendIcon: Record<string, typeof ArrowUp> = { up: ArrowUp, down: ArrowDown, level: ArrowRight };
const trendColor: Record<string, string> = {
  up: "text-ice",
  down: "text-ink-1",
  level: "text-ink-2",
};

const FILTERS: { id: FlightCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "commercial", label: "Commercial" },
  { id: "military", label: "Military" },
  { id: "ga", label: "Hobby / GA" },
];

export default function TrafficTape({
  flights,
  selectedIcao,
  onSelect,
  status,
}: {
  flights: FlightT[];
  selectedIcao: string | null;
  onSelect: (icao: string) => void;
  status?: FlightsStatus;
}) {
  const [filter, setFilter] = useState<FlightCategory | "all">("all");

  const filtered =
    filter === "all" ? flights : flights.filter((f) => flightCategory(f) === filter);
  const airborne = filtered
    .filter((f) => !f.onGround)
    .sort((a, b) => (b.altitudeFt ?? 0) - (a.altitudeFt ?? 0));
  // The live feed only sees aircraft with a live transponder — this is
  // taxiing/holding traffic, not the thousands of powered-down static
  // showplanes on static display.
  const grounded = filtered.filter((f) => f.onGround);
  const sorted = [...airborne, ...grounded];

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between px-4 pb-3 pt-4">
        <h2 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-ink-1">
          Traffic
        </h2>
        <span className="font-mono text-[11px] tabular text-ink-2">
          {airborne.length} airborne · {grounded.length} on ground
        </span>
      </div>
      <div className="hide-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-3">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wide transition-colors ${
              filter === f.id
                ? "border-gold/60 bg-gold/10 text-gold"
                : "border-hairline/60 text-ink-1 hover:bg-panel-2"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto px-3 pb-4">
        <AnimatePresence initial={false}>
          {sorted.map((f, i) => {
            const active = f.icao24 === selectedIcao;
            const alt = f.altitudeFt;
            const kt = f.groundSpeedKt !== null ? Math.round(f.groundSpeedKt) : null;
            const t = trend(f);
            const alert = squawkAlert(f.squawk);
            return (
              <motion.button
                key={f.icao24}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: f.onGround ? 0.6 : 1,
                  x: 0,
                  transition: { delay: Math.min(i, 8) * 0.02 },
                }}
                exit={{ opacity: 0, x: 10 }}
                whileHover={{ x: 2 }}
                transition={{ duration: 0.22 }}
                onClick={() => onSelect(f.icao24)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors ${
                  alert
                    ? "border-red/60 bg-red/10"
                    : active
                      ? "border-gold/50 bg-gold/10"
                      : "border-hairline/60 bg-panel-1/80 hover:bg-panel-2/80"
                }`}
              >
                <div className="flex flex-col">
                  <span className="flex items-center gap-1.5 font-mono text-[13px] font-semibold text-ink-0">
                    {alert && <span className="h-1.5 w-1.5 rounded-full bg-red animate-pulse-dot" />}
                    {f.callsign}
                  </span>
                  <span className="font-mono text-[10px] text-ink-2">
                    {alert ? (
                      <span className="text-red">{alert}</span>
                    ) : (
                      f.registration ?? f.description ?? f.icaoType ?? "—"
                    )}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  {f.onGround ? (
                    <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-ink-1">
                      On ground
                    </span>
                  ) : (
                    <span className="font-mono text-[13px] font-medium tabular text-ink-0">
                      {alt !== null ? alt.toLocaleString() : "—"}
                      <span className="text-ink-2"> ft</span>
                    </span>
                  )}
                  <span className="flex items-center gap-0.5 font-mono text-[10px] tabular text-ink-2">
                    {!f.onGround &&
                      (() => {
                        const TrendIcon = trendIcon[t];
                        return <TrendIcon className={`h-2.5 w-2.5 ${trendColor[t]}`} strokeWidth={3} />;
                      })()}
                    {kt !== null ? `${kt}kt` : "—"}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
        {sorted.length === 0 && status === "rate-limited" && (
          <p className="px-2 py-6 text-center font-mono text-xs text-ink-2">
            The live feed rate-limited us — showing the last known traffic until it clears.
          </p>
        )}
        {sorted.length === 0 && status !== "rate-limited" && flights.length > 0 && (
          <p className="px-2 py-6 text-center font-mono text-xs text-ink-2">
            No {filter === "all" ? "" : FILTERS.find((f) => f.id === filter)?.label.toLowerCase()}{" "}
            traffic in range right now.
          </p>
        )}
        {sorted.length === 0 && status !== "rate-limited" && flights.length === 0 && (
          <p className="px-2 py-6 text-center font-mono text-xs text-ink-2">
            No tracked traffic in range.
          </p>
        )}
      </div>
    </div>
  );
}
