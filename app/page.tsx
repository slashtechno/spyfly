"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useFlights } from "@/lib/useFlights";
import { useLocation } from "@/lib/useLocation";
import { haversineNm } from "@/lib/geo";
import Header from "@/components/Header";
import TrafficTape from "@/components/TrafficTape";
import AircraftPanel from "@/components/AircraftPanel";
import MobileSheet from "@/components/MobileSheet";

const Map3D = dynamic(() => import("@/components/Map3D"), { ssr: false });

const EASE = [0.16, 1, 0.3, 1] as const;
// How far the map has to pan from the last flight-data fetch point before
// live traffic follows it — big enough that scrolling/zooming in place
// doesn't restart polling constantly, small enough that panning to a
// different airport actually shows its traffic.
const FLIGHT_FOLLOW_THRESHOLD_NM = 8;

export default function Home() {
  const location = useLocation();
  // Distinct from `location`: this is what live traffic is actually
  // queried around. Starts wherever `location` is and re-centers either
  // instantly (a search picked a new airport) or once panning has moved
  // far enough to matter (see handleCenterChange) — never on every frame.
  const [flightCenter, setFlightCenter] = useState({ lat: location.lat, lon: location.lon });
  // "Adjust state during render" (not a useEffect) for the case where
  // `location` changed out from under us — the React-recommended pattern
  // for resetting derived state to follow a prop, since it bails out and
  // re-renders immediately rather than committing a stale render first.
  const [syncedLocation, setSyncedLocation] = useState(location);
  if (syncedLocation.lat !== location.lat || syncedLocation.lon !== location.lon) {
    setSyncedLocation(location);
    setFlightCenter({ lat: location.lat, lon: location.lon });
  }
  const { flights, status } = useFlights(flightCenter.lat, flightCenter.lon);
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<"traffic" | "aircraft">("traffic");

  const handleCenterChange = useCallback((lat: number, lon: number) => {
    setFlightCenter((prev) =>
      haversineNm(lat, lon, prev.lat, prev.lon) > FLIGHT_FOLLOW_THRESHOLD_NM ? { lat, lon } : prev,
    );
  }, []);

  const selectedFlight = useMemo(
    () => flights.find((f) => f.icao24 === selectedIcao) ?? null,
    [flights, selectedIcao],
  );

  const handleSelect = useCallback((icao: string) => {
    setSelectedIcao((prev) => {
      const next = prev === icao ? null : icao;
      if (next) {
        setSheetTab("aircraft");
        setSheetOpen(true);
      }
      return next;
    });
  }, []);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-bg">
      {/* Full-bleed hero: the map IS the app, not a tile inside a grid. */}
      <div className="absolute inset-0">
        {/* Map3D's own setup effect runs once on mount and reads whatever
            `location` it's first given — wait for the URL check to resolve
            before mounting it at all, so it never latches onto the default
            location and then ignores a real ?lat=&lon= override. Costs one
            extra tick, invisible to the user, and Map3D is ssr:false anyway
            so this can't introduce a hydration mismatch. */}
        {location.resolved && (
          <Map3D
            flights={flights}
            selectedIcao={selectedIcao}
            onSelect={handleSelect}
            location={location}
            queryCenter={flightCenter}
            onCenterChange={handleCenterChange}
          />
        )}
      </div>

      {/* Overlay layer floats on top; only its children are interactive. */}
      <div className="pointer-events-none relative z-10 flex h-full flex-col">
        <div className="safe-top safe-left safe-right pointer-events-auto bg-gradient-to-b from-bg/90 via-bg/40 to-transparent">
          <Header count={flights.length} status={status} location={location} />
        </div>

        <div className="safe-left safe-right relative flex-1">
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
            className="hud-frame pointer-events-auto absolute bottom-4 left-3 top-4 hidden w-[260px] flex-col overflow-hidden rounded bg-panel-0/90 backdrop-blur-md lg:flex xl:w-[300px]"
          >
            <TrafficTape
              flights={flights}
              selectedIcao={selectedIcao}
              onSelect={handleSelect}
              status={status}
            />
          </motion.aside>

          <AnimatePresence>
            {selectedFlight && (
              <motion.aside
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="hud-frame pointer-events-auto absolute bottom-4 right-3 top-4 hidden w-[280px] flex-col overflow-hidden rounded bg-panel-0/90 backdrop-blur-md lg:flex xl:w-[320px]"
              >
                <AircraftPanel flight={selectedFlight} />
              </motion.aside>
            )}
          </AnimatePresence>
        </div>

        <div className="safe-bottom safe-left safe-right pointer-events-auto lg:hidden">
          <MobileSheet
            tab={sheetTab}
            onTabChange={setSheetTab}
            open={sheetOpen}
            onOpenChange={setSheetOpen}
            trafficCount={flights.length}
            hasSelected={!!selectedFlight}
            trafficSlot={
              <TrafficTape
                flights={flights}
                selectedIcao={selectedIcao}
                onSelect={handleSelect}
                status={status}
              />
            }
            aircraftSlot={<AircraftPanel flight={selectedFlight} />}
          />
        </div>
      </div>
    </div>
  );
}
