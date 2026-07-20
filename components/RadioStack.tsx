"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import airvention from "@/data/airvention.json";

const feeds = airvention.atcFeeds;

function Bars() {
  return (
    <div className="flex h-4 items-end gap-[2px]">
      {[3, 7, 5, 9, 4, 6].map((h, i) => (
        <motion.span
          key={i}
          className="w-[2px] rounded-full bg-gold"
          animate={{ height: [h * 0.4, h, h * 0.3, h * 0.8] }}
          transition={{ duration: 0.9 + i * 0.07, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

export default function RadioStack() {
  const [activeId, setActiveId] = useState(feeds[0].id);
  const active = feeds.find((f) => f.id === activeId)!;

  return (
    <div className="flex h-full items-center gap-3 px-4 sm:px-6">
      <div className="hidden min-w-[170px] shrink-0 flex-col justify-center gap-0.5 sm:flex">
        <span className="font-display text-[9px] font-bold uppercase tracking-[0.14em] text-ink-2">
          Active Channel
        </span>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-2xl font-extrabold tabular text-gold">
            {active.freqMhz}
          </span>
          <Bars />
        </div>
      </div>

      <div className="hide-scrollbar flex flex-1 gap-2 overflow-x-auto py-2">
        {feeds.map((f) => {
          const isActive = f.id === activeId;
          return (
            <button
              key={f.id}
              onClick={() => setActiveId(f.id)}
              className={`flex shrink-0 flex-col items-start gap-0.5 rounded-xl border px-3 py-1.5 text-left transition-colors ${
                isActive
                  ? "border-gold/60 bg-gold/10"
                  : "border-hairline/60 bg-panel-1 hover:bg-panel-2"
              }`}
            >
              <div className="flex w-full items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isActive ? "bg-gold animate-pulse-dot" : "bg-ink-2"
                  }`}
                />
                <span className="font-display text-[11px] font-semibold leading-tight text-ink-0">
                  {f.label}
                </span>
              </div>
              <span className="font-mono text-[9px] text-ink-2">{f.sublabel}</span>
            </button>
          );
        })}
      </div>

      <a
        href={active.listenUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex shrink-0 items-center gap-2 rounded-full bg-gold px-4 py-2 text-bg transition-transform hover:scale-105"
      >
        <span className="font-display text-xs font-bold tracking-wide">▸ Listen</span>
      </a>
    </div>
  );
}
