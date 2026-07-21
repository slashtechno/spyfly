"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { setLocation } from "@/lib/useLocation";
import type { AirportResult } from "@/app/api/airports/search/route";

export default function AirportSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AirportResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    // Nothing to clean up when the query is too short to search: the
    // dropdown below is already gated on query.length >= 2, so stale
    // results/loading state just sits there unused and unrendered.
    if (query.trim().length < 2) return;

    const id = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/airports/search?q=${encodeURIComponent(query)}`);
        const data: { airports: AirportResult[] } = await res.json();
        setResults(data.airports);
        setActiveIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIndex(-1);
  }

  function select(a: AirportResult) {
    setLocation({
      lat: a.lat,
      lon: a.lon,
      label: `${a.icao} · ${a.name}`,
      icao: a.icao,
    });
    close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0 && results[activeIndex]) {
      select(results[activeIndex]);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-sm border border-hairline bg-panel-1 text-ink-1 transition-colors hover:bg-panel-2 hover:text-ink-0"
          aria-label="Search airports"
        >
          <Search className="h-3.5 w-3.5" />
        </button>
      ) : (
        <div className="flex items-center gap-1.5 rounded-sm border border-gold/50 bg-panel-1 px-2 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-ink-2" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="ICAO, IATA, or airport name"
            className="w-36 bg-transparent font-mono text-[11px] text-ink-0 placeholder:text-ink-2 focus:outline-none sm:w-52"
          />
          <button onClick={close} className="shrink-0 text-ink-2 hover:text-ink-0" aria-label="Close search">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {open && query.length >= 2 && (
        <div className="hud-frame absolute left-0 top-full z-20 mt-1.5 w-64 overflow-hidden rounded bg-panel-0/95 backdrop-blur-md sm:w-72">
          {loading && results.length === 0 && (
            <div className="px-3 py-2.5 font-mono text-[11px] text-ink-2">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2.5 font-mono text-[11px] text-ink-2">No airports found.</div>
          )}
          {results.map((a, i) => (
            <button
              key={a.icao}
              onClick={() => select(a)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex w-full flex-col items-start gap-0.5 border-b border-hairline/40 px-3 py-2 text-left last:border-b-0 ${
                i === activeIndex ? "bg-gold/10" : "hover:bg-panel-2"
              }`}
            >
              <span className="font-display text-xs font-bold text-ink-0">
                {a.icao}
                {a.iata ? ` · ${a.iata}` : ""}
              </span>
              <span className="font-mono text-[10px] text-ink-2">
                {a.name}
                {a.municipality ? ` — ${a.municipality}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
