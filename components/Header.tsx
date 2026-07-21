"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plane } from "lucide-react";
import airvention from "@/data/airvention.json";
import AnimatedNumber from "@/components/AnimatedNumber";
import AirportSearch from "@/components/AirportSearch";
import type { FlightsStatus } from "@/lib/useFlights";
import type { RadarLocation } from "@/lib/useLocation";

function useUtcClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function dayOfEvent(now: Date | null): number | null {
  if (!now) return null;
  const start = new Date(`${airvention.event.start}T00:00:00-05:00`);
  const diff = Math.floor((now.getTime() - start.getTime()) / 86400000) + 1;
  return diff >= 1 && diff <= 7 ? diff : null;
}

export default function Header({
  count,
  status,
  location,
}: {
  count: number;
  status: FlightsStatus;
  location: RadarLocation;
}) {
  const now = useUtcClock();
  const day = location.isDefault ? dayOfEvent(now) : null;

  const statusMeta: Record<FlightsStatus, { label: string; color: string }> = {
    loading: { label: "CONNECTING", color: "bg-ink-2" },
    live: { label: "LIVE", color: "bg-gold" },
    stale: { label: "CACHED", color: "bg-ink-1" },
    "rate-limited": { label: "RATE LIMITED", color: "bg-red" },
    error: { label: "OFFLINE", color: "bg-red" },
  };
  const meta = statusMeta[status];

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6"
    >
      <div className="flex items-center gap-3">
        <Plane className="h-5 w-5 -rotate-45 text-gold" strokeWidth={2.25} />
        <div className="leading-none">
          <h1 className="font-display text-lg font-extrabold tracking-tight text-ink-0">
            Spy<span className="text-gold">Fly</span>
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-2">
            {location.label}
          </p>
        </div>
        <AirportSearch />
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {day && (
          <div className="hidden items-baseline gap-1.5 rounded-sm border border-hairline bg-panel-1 px-3 py-1.5 sm:flex">
            <span className="font-display text-sm font-extrabold leading-none tabular text-ink-0">
              <AnimatedNumber value={day} />
            </span>
            <span className="font-mono text-[10px] text-ink-2">/ 7 days</span>
          </div>
        )}
        <div className="hidden items-baseline gap-1.5 rounded-sm border border-hairline bg-panel-1 px-3 py-1.5 md:flex">
          <span className="font-mono text-xs tabular text-ink-0">
            {now ? now.toISOString().slice(11, 19) : "--:--:--"}Z
          </span>
          <span className="font-mono text-[9px] text-ink-2">UTC</span>
        </div>
        <div className="flex items-center gap-2 rounded-sm border border-hairline bg-panel-1 px-3 py-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${meta.color} animate-pulse-dot`} />
          <span className="font-mono text-[10px] font-medium tracking-wide text-ink-0">
            {meta.label}
          </span>
          <span className="font-mono text-[10px] tabular text-ink-2">
            · <AnimatedNumber value={count} /> apt
          </span>
        </div>
      </div>
    </motion.header>
  );
}
