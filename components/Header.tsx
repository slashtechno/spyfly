"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Compass, Plane } from "lucide-react";
import airvention from "@/data/airvention.json";
import AnimatedNumber from "@/components/AnimatedNumber";
import AirportSearch from "@/components/AirportSearch";
import InstallPwa from "@/components/InstallPwa";
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
  followNearest,
  onToggleFollowNearest,
}: {
  count: number;
  status: FlightsStatus;
  location: RadarLocation;
  followNearest: boolean;
  onToggleFollowNearest: () => void;
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
        <button
          onClick={onToggleFollowNearest}
          title={followNearest ? "Following nearest airport while panning" : "Not following pan — label stays fixed"}
          aria-pressed={followNearest}
          className={`flex h-8 w-8 items-center justify-center rounded-sm border transition-colors ${
            followNearest
              ? "border-gold/60 bg-gold/10 text-gold"
              : "border-hairline bg-panel-1 text-ink-1 hover:bg-panel-2 hover:text-ink-0"
          }`}
        >
          <Compass className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <a
          href="https://github.com/slashtechno/spyfly"
          target="_blank"
          rel="noopener noreferrer"
          title="View source on GitHub"
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-hairline bg-panel-1 text-ink-1 transition-colors hover:bg-panel-2 hover:text-ink-0"
        >
          {/* lucide-react dropped brand icons — an inline mark is more
              reliable than depending on it reappearing in a future version. */}
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.09 3.29 9.4 7.86 10.93.57.1.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.18-3.09-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.24 2.76.12 3.05.74.8 1.18 1.83 1.18 3.09 0 4.43-2.69 5.4-5.26 5.69.42.36.78 1.07.78 2.15 0 1.56-.01 2.81-.01 3.19 0 .31.21.66.8.55A10.51 10.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
          </svg>
        </a>
        <InstallPwa />
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
            · <AnimatedNumber value={count} /> aircraft
          </span>
        </div>
      </div>
    </motion.header>
  );
}
