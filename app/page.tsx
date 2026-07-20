"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { useFlights } from "@/lib/useFlights";
import Header from "@/components/Header";
import TrafficTape from "@/components/TrafficTape";
import AircraftPanel from "@/components/AircraftPanel";
import RadioStack from "@/components/RadioStack";
import MobileSheet from "@/components/MobileSheet";

const Map3D = dynamic(() => import("@/components/Map3D"), { ssr: false });

const EASE = [0.16, 1, 0.3, 1] as const;

export default function Home() {
  const { flights, status } = useFlights();
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<"traffic" | "aircraft">("traffic");

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
        <Map3D flights={flights} selectedIcao={selectedIcao} onSelect={handleSelect} />
      </div>

      {/* Overlay layer floats on top; only its children are interactive. */}
      <div className="pointer-events-none relative z-10 flex h-full flex-col">
        <div className="safe-top safe-left safe-right pointer-events-auto bg-gradient-to-b from-bg/90 via-bg/40 to-transparent">
          <Header count={flights.length} status={status} />
        </div>

        <div className="safe-left safe-right relative flex-1">
          <motion.aside
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
            className="pointer-events-auto absolute bottom-4 left-3 top-4 hidden w-[260px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-panel-0/75 backdrop-blur-xl lg:flex xl:w-[300px]"
          >
            <TrafficTape
              flights={flights}
              selectedIcao={selectedIcao}
              onSelect={handleSelect}
              status={status}
            />
          </motion.aside>

          <div className="pointer-events-none absolute left-3 top-4 hidden rounded-full border border-white/10 bg-panel-0/70 px-3 py-1.5 backdrop-blur-xl sm:block lg:left-[292px] xl:left-[332px]">
            <p className="font-mono text-[10px] text-ink-2">
              Live traffic near KOSH · <span className="text-ink-1">airplanes.live</span>
            </p>
          </div>

          <AnimatePresence>
            {selectedFlight && (
              <motion.aside
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="pointer-events-auto absolute bottom-4 right-3 top-4 hidden w-[280px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-panel-0/75 backdrop-blur-xl lg:flex xl:w-[320px]"
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

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
          className={`pointer-events-auto mx-3 mb-[calc(0.75rem+env(safe-area-inset-bottom))] h-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-panel-0/75 backdrop-blur-xl safe-left safe-right sm:mx-6 sm:mb-[calc(1.5rem+env(safe-area-inset-bottom))] ${
            sheetOpen ? "max-lg:hidden" : ""
          }`}
        >
          <RadioStack />
        </motion.div>
      </div>
    </div>
  );
}
