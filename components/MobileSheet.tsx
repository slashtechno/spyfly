"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronUp } from "lucide-react";

export default function MobileSheet({
  tab,
  onTabChange,
  open,
  onOpenChange,
  trafficCount,
  hasSelected,
  trafficSlot,
  aircraftSlot,
}: {
  tab: "traffic" | "aircraft";
  onTabChange: (tab: "traffic" | "aircraft") => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trafficCount: number;
  hasSelected: boolean;
  trafficSlot: ReactNode;
  aircraftSlot: ReactNode;
}) {
  return (
    <motion.div
      initial={false}
      animate={{ height: open ? "60vh" : 56 }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="pointer-events-auto flex flex-col overflow-hidden rounded-t-2xl border-t border-x border-hairline bg-panel-0/95 backdrop-blur-md lg:hidden"
    >
      <button
        onClick={() => onOpenChange(!open)}
        className="flex h-14 shrink-0 items-center justify-between px-4"
      >
        <div className="flex items-center gap-1 rounded-full bg-panel-1 p-1">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onTabChange("traffic");
              onOpenChange(true);
            }}
            className={`rounded-full px-3 py-1 font-display text-[11px] font-bold uppercase tracking-wide transition-colors ${
              tab === "traffic" ? "bg-gold text-bg" : "text-ink-1"
            }`}
          >
            Traffic · {trafficCount}
          </span>
          {hasSelected && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onTabChange("aircraft");
                onOpenChange(true);
              }}
              className={`rounded-full px-3 py-1 font-display text-[11px] font-bold uppercase tracking-wide transition-colors ${
                tab === "aircraft" ? "bg-gold text-bg" : "text-ink-1"
              }`}
            >
              Selected
            </span>
          )}
        </div>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-ink-2" aria-hidden>
          <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
        </motion.span>
      </button>
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "traffic" ? trafficSlot : aircraftSlot}
      </div>
    </motion.div>
  );
}
