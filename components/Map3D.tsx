"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Flight } from "@/lib/types";
import airvention from "@/data/airvention.json";
import airfield from "@/data/kosh-airfield.json";
import { useFlightRoute } from "@/lib/useFlightRoute";
import { useFlightTrack } from "@/lib/useFlightTrack";
import { greatCirclePoints, projectForward, smoothExtension } from "@/lib/geo";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
const POLL_MS = 9000;

interface TrackedMarker {
  marker: maplibregl.Marker;
  el: HTMLDivElement;
  plane: HTMLDivElement;
  from: { lng: number; lat: number; rot: number };
  to: { lng: number; lat: number; rot: number };
  animStart: number;
}

function altitudeColor(f: Flight): string {
  if (f.onGround) return "#4d5262";
  const vr = f.vertRateFpm ?? 0;
  if (vr > 150) return "#8fcbff"; // climbing -> ice
  if (vr < -150) return "#8b90a0"; // descending -> muted (gold is reserved for selection/live)
  return "#f2f3f5"; // cruise -> neutral white
}

function shortestRotation(from: number, to: number): number {
  let delta = ((to - from + 180) % 360) - 180;
  if (delta < -180) delta += 360;
  return from + delta;
}

function planeElement(color: string): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = "26px";
  el.style.height = "26px";
  el.style.willChange = "transform";
  el.innerHTML = `
    <svg width="26" height="26" viewBox="0 0 32 32" style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.65)) drop-shadow(0 0 5px ${color}99)">
      <path d="M16 1
        C17 1 17.6 2 17.6 3.6
        L17.6 11.8
        L29.5 18.6
        C30.2 19 30.2 20.4 29.5 20.8
        L17.6 18.4
        L17.6 24.6
        L21.4 27.6
        C21.9 28 21.9 29 21.4 29.3
        L16 27.9
        L10.6 29.3
        C10.1 29 10.1 28 10.6 27.6
        L14.4 24.6
        L14.4 18.4
        L2.5 20.8
        C1.8 20.4 1.8 19 2.5 18.6
        L14.4 11.8
        L14.4 3.6
        C14.4 2 15 1 16 1 Z"
        fill="${color}" stroke="#05060a" stroke-width="0.5"/>
    </svg>`;
  return el;
}

export default function Map3D({
  flights,
  selectedIcao,
  onSelect,
}: {
  flights: Flight[];
  selectedIcao: string | null;
  onSelect: (icao: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, TrackedMarker>>(new Map());
  const rafRef = useRef<number | null>(null);
  const selectedRef = useRef<string | null>(selectedIcao);

  const selectedFlight = flights.find((f) => f.icao24 === selectedIcao) ?? null;
  // Reuses useAircraftInfo/useFlightRoute's shared module-level cache, so
  // this is a cache hit (not a duplicate network call) whenever
  // AircraftPanel has already resolved the same callsign.
  const selectedRoute = useFlightRoute(selectedFlight?.callsign ?? null);
  // Real recorded history from OpenSky's /tracks/all — server-side, not
  // reconstructed from whatever this browser tab happened to observe.
  const selectedTrack = useFlightTrack(selectedIcao);
  // Base points (up to, not including, the current position) for whichever
  // line is active; the live tip gets appended each animation frame from the
  // interpolated marker position instead of redoing the fetch/trig there.
  // "real" = OpenSky's actual recorded path (solid gold). "synthetic" = a
  // great-circle approximation from the filed route's origin airport, used
  // only when no real track exists (dashed ice, visually marked as a guess).
  const activeLineRef = useRef<{ kind: "real" | "synthetic"; base: [number, number][] } | null>(
    null,
  );

  useEffect(() => {
    selectedRef.current = selectedIcao;
    for (const [icao, tm] of markersRef.current) {
      tm.el.dataset.selected = icao === selectedIcao ? "true" : "false";
    }
    if (selectedIcao) {
      const tm = markersRef.current.get(selectedIcao);
      const map = mapRef.current;
      if (tm && map) {
        map.easeTo({ center: tm.marker.getLngLat(), zoom: Math.max(map.getZoom(), 11.5), duration: 900 });
      }
    }
  }, [selectedIcao]);

  // Flight-so-far line: OpenSky's real recorded track when available, or a
  // great-circle approximation from the filed route's origin as a fallback.
  // No free public API gives the exact flown path for every aircraft — this
  // mirrors what every flight tracker does when real history isn't there.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const routeSource = map.getSource("selected-route") as maplibregl.GeoJSONSource | undefined;
    const trailSource = map.getSource("selected-trail") as maplibregl.GeoJSONSource | undefined;
    if (!routeSource || !trailSource) return;

    if (!selectedFlight) {
      activeLineRef.current = null;
      routeSource.setData({ type: "FeatureCollection", features: [] });
      trailSource.setData({ type: "FeatureCollection", features: [] });
      return;
    }

    if (selectedTrack?.found && selectedTrack.points.length > 1) {
      activeLineRef.current = { kind: "real", base: selectedTrack.points.slice(0, -1) };
      trailSource.setData({ type: "FeatureCollection", features: [] });
      routeSource.setData({
        type: "FeatureCollection",
        features: [
          { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: selectedTrack.points } },
        ],
      });
      return;
    }

    const origin = selectedRoute?.origin;
    if (origin?.lat && origin?.lon) {
      const arc = greatCirclePoints([origin.lon, origin.lat], [selectedFlight.lon, selectedFlight.lat]);
      activeLineRef.current = { kind: "synthetic", base: arc.slice(0, -1) };
      routeSource.setData({ type: "FeatureCollection", features: [] });
      trailSource.setData({
        type: "FeatureCollection",
        features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: arc } }],
      });
      return;
    }

    activeLineRef.current = null;
    routeSource.setData({ type: "FeatureCollection", features: [] });
    trailSource.setData({ type: "FeatureCollection", features: [] });
  }, [selectedFlight, selectedRoute, selectedTrack]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE,
      center: [airvention.airport.lon, airvention.airport.lat],
      zoom: 12.3,
      pitch: 0,
      bearing: -25,
      attributionControl: { compact: true },
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
    map.scrollZoom.setWheelZoomRate(1 / 300);

    // The container's real size can change after MapLibre's own initial
    // measurement (Framer Motion layout, flex reflow, viewport rotation) —
    // trackResize only listens for window resize events, not container
    // resizes, so without this the canvas can get stuck at a stale size.
    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    map.on("load", () => {
      map.setSky({
        "sky-color": "#0a1120",
        "sky-horizon-blend": 0.6,
        "horizon-color": "#1a2536",
        "horizon-fog-blend": 0.5,
      });

      // Keep the base map quiet — hide minor/service streets and paths so
      // the runways, corridor, and traffic stay the visual focus. Primary
      // roads, highways, and rail (relevant to the Fisk RR-track arrival)
      // stay visible.
      const minorRoadLayers = [
        "road_minor_case",
        "road_minor_fill",
        "road_service_case",
        "road_service_fill",
        "road_path",
        "bridge_minor_case",
        "bridge_minor_fill",
        "bridge_service_case",
        "bridge_service_fill",
        "tunnel_minor_case",
        "tunnel_minor_fill",
        "tunnel_service_case",
        "tunnel_service_fill",
        "roadname_minor",
      ];
      for (const id of minorRoadLayers) {
        if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none");
      }

      // lineMetrics enables line-gradient, which fades the line in along its
      // length instead of ending in a hard, abrupt cut at the aircraft.
      map.addSource("selected-route", {
        type: "geojson",
        lineMetrics: true,
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "selected-route-line",
        type: "line",
        source: "selected-route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-width": 2.5,
          "line-gradient": [
            "interpolate",
            ["linear"],
            ["line-progress"],
            0,
            "rgba(217,164,65,0)",
            0.15,
            "rgba(217,164,65,0.85)",
            1,
            "rgba(217,164,65,0.85)",
          ],
        },
      });

      // Fallback when OpenSky has no real recorded track: a synthetic
      // great-circle estimate from the filed route's origin airport, styled
      // distinctly (thinner, cooler, dashed) so it never reads as confirmed
      // history the way the real-track line does.
      map.addSource("selected-trail", {
        type: "geojson",
        lineMetrics: true,
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "selected-trail-line",
        type: "line",
        source: "selected-trail",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-width": 1.6,
          "line-gradient": [
            "interpolate",
            ["linear"],
            ["line-progress"],
            0,
            "rgba(143,203,255,0)",
            1,
            "rgba(143,203,255,0.75)",
          ],
        },
      });

      // Real runway geometry (OurAirports) — drawn as an actual paved strip
      // with a dashed centerline, not a schematic stand-in.
      map.addSource("runways", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: airfield.runways.map((r) => ({
            type: "Feature" as const,
            properties: { ident: r.ident, lengthFt: r.lengthFt },
            geometry: {
              type: "LineString" as const,
              coordinates: [
                [r.ends[0].lon, r.ends[0].lat],
                [r.ends[1].lon, r.ends[1].lat],
              ],
            },
          })),
        },
      });
      map.addLayer({
        id: "runway-surface",
        type: "line",
        source: "runways",
        layout: { "line-cap": "square" },
        paint: {
          "line-color": "#20242c",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 3, 16, 22],
          "line-opacity": 0.95,
        },
      });
      map.addLayer({
        id: "runway-centerline",
        type: "line",
        source: "runways",
        layout: { "line-cap": "butt" },
        paint: {
          "line-color": "#d9a441",
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.6, 16, 2],
          "line-dasharray": [3, 3],
          "line-opacity": 0.85,
        },
      });
      map.addLayer({
        id: "runway-idents",
        type: "symbol",
        source: "runways",
        layout: {
          "symbol-placement": "line-center",
          "text-field": ["get", "ident"],
          "text-size": 12,
          "text-font": ["Noto Sans Bold"],
          "text-letter-spacing": 0.05,
        },
        paint: {
          "text-color": "#f2f3f5",
          "text-halo-color": "#05060a",
          "text-halo-width": 1.4,
        },
      });

      // Fisk arrival corridor — the famous railroad-track VFR line pilots
      // fly single-file into the show.
      map.addSource("corridor", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [
              ...airfield.arrivalCorridor.checkpoints.map((c) => [c.lon, c.lat]).reverse(),
              [airvention.airport.lon, airvention.airport.lat],
            ],
          },
        },
      });
      map.addLayer({
        id: "corridor-line",
        type: "line",
        source: "corridor",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": "#8fcbff",
          "line-width": 1.5,
          "line-dasharray": [1, 2],
          "line-opacity": 0.55,
        },
      });

      // VFR checkpoints along the Fisk arrival — styled as wayfinding flags,
      // deliberately quieter than the plane/selection treatment so they
      // don't read as an alert. Hover/tap shows what they actually are.
      for (const cp of airfield.arrivalCorridor.checkpoints) {
        const el = document.createElement("div");
        el.title = `${cp.name} — VFR checkpoint, ${cp.distanceNmToField} nm from the field\n${cp.note}`;
        el.style.display = "flex";
        el.style.flexDirection = "column";
        el.style.alignItems = "center";
        el.style.gap = "3px";
        el.style.cursor = "help";
        el.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 14 14" style="opacity:0.9">
            <path d="M7 1 L13 7 L7 13 L1 7 Z" fill="#0d1520" stroke="#8fcbff" stroke-width="1.4" />
          </svg>
          <span style="
            font:600 10px var(--font-mono, monospace);
            color:#c7d3de;
            background:rgba(10,14,20,0.55);
            padding:1px 6px;
            border-radius:999px;
            white-space:nowrap;
            letter-spacing:0.03em;
          ">${cp.name}</span>`;

        new maplibregl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([cp.lon, cp.lat])
          .addTo(map);
      }

      // Establishing shot: start already framing the airfield, then settle
      // into the pitched 3D view pilots actually see flying the pattern.
      map.easeTo({
        center: [airvention.airport.lon, airvention.airport.lat],
        zoom: 15.3,
        pitch: 55,
        bearing: 0,
        duration: 3200,
        easing: (t) => 1 - Math.pow(1 - t, 3),
      });
    });

    mapRef.current = map;

    return () => {
      resizeObserver.disconnect();
      // React (Strict Mode in dev) tears this effect down and re-runs it
      // once to surface cleanup bugs. Without clearing marker tracking here,
      // markers created against this (about-to-be-destroyed) map instance
      // get silently reused — position-updated in place rather than
      // recreated — against the *next* map instance, so nothing ever
      // actually attaches to the map that's really on screen.
      // markersRef is mutable instance state, not a DOM-node ref — reading
      // its live value at cleanup time is exactly what's needed here.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      for (const tm of markersRef.current.values()) tm.marker.remove();
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const now = performance.now();
    const seen = new Set<string>();

    for (const f of flights) {
      seen.add(f.icao24);
      const color = altitudeColor(f);
      const rotation = f.trackDeg ?? 0;
      const existing = markersRef.current.get(f.icao24);

      if (!existing) {
        const el = document.createElement("div");
        el.style.cursor = "pointer";
        // Deliberately no inline `position` here: maplibre-gl.css sets this
        // element's position to `absolute` (required for its lng/lat
        // transform math) and an inline style would silently win over that
        // rule, same class of bug as the map container fix above. Absolute
        // also already gives the ring child a valid containing block.
        el.dataset.selected = f.icao24 === selectedRef.current ? "true" : "false";

        const ring = document.createElement("div");
        ring.className = "map-select-ring";
        ring.style.cssText =
          "position:absolute;inset:-10px;border-radius:999px;border:2px solid #d9a441;opacity:0;transition:opacity .2s;pointer-events:none;box-shadow:0 0 14px rgba(217,164,65,0.55);";

        const plane = planeElement(color);
        plane.style.transition = "transform 60ms linear";
        el.appendChild(ring);
        el.appendChild(plane);

        el.addEventListener("click", (e) => {
          e.stopPropagation();
          onSelect(f.icao24);
        });

        const marker = new maplibregl.Marker({ element: el, rotationAlignment: "map" })
          .setLngLat([f.lon, f.lat])
          .addTo(map);

        markersRef.current.set(f.icao24, {
          marker,
          el,
          plane,
          from: { lng: f.lon, lat: f.lat, rot: rotation },
          to: { lng: f.lon, lat: f.lat, rot: rotation },
          animStart: now,
        });
      } else {
        const svgColorTarget = existing.plane.querySelector("path");
        if (svgColorTarget) svgColorTarget.setAttribute("fill", color);
        existing.from = interpolatedPosition(existing, now);
        // Dead-reckon the animation target forward using reported speed／
        // heading rather than the raw reported position — otherwise, if two
        // consecutive polls happen to report the same (or barely different)
        // position, the icon visibly freezes despite a nonzero speed.
        const [targetLng, targetLat] =
          !f.onGround && f.groundSpeedKt && f.groundSpeedKt > 5
            ? projectForward(f.lon, f.lat, f.groundSpeedKt, rotation, POLL_MS)
            : [f.lon, f.lat];
        existing.to = {
          lng: targetLng,
          lat: targetLat,
          rot: shortestRotation(existing.from.rot, rotation),
        };
        existing.animStart = now;
      }
    }

    for (const [icao, tm] of markersRef.current) {
      if (!seen.has(icao)) {
        tm.marker.remove();
        markersRef.current.delete(icao);
      }
    }

    function interpolatedPosition(tm: TrackedMarker, t: number) {
      const p = Math.min(1, (t - tm.animStart) / POLL_MS);
      return {
        lng: tm.from.lng + (tm.to.lng - tm.from.lng) * p,
        lat: tm.from.lat + (tm.to.lat - tm.from.lat) * p,
        rot: tm.from.rot + (tm.to.rot - tm.from.rot) * p,
      };
    }
  }, [flights, onSelect]);

  useEffect(() => {
    function tick() {
      const now = performance.now();
      const map = mapRef.current;
      let selectedTm: TrackedMarker | null = null;

      for (const tm of markersRef.current.values()) {
        const p = Math.min(1, (now - tm.animStart) / POLL_MS);
        const eased = 1 - Math.pow(1 - p, 2);
        const lng = tm.from.lng + (tm.to.lng - tm.from.lng) * eased;
        const lat = tm.from.lat + (tm.to.lat - tm.from.lat) * eased;
        const rot = tm.from.rot + (tm.to.rot - tm.from.rot) * eased;
        tm.marker.setLngLat([lng, lat]);
        tm.plane.style.transform = `rotate(${rot}deg)`;
        const ring = tm.el.firstElementChild as HTMLDivElement | null;
        if (ring) ring.style.opacity = tm.el.dataset.selected === "true" ? "1" : "0";
        if (tm.el.dataset.selected === "true") selectedTm = tm;
      }

      // Keep whichever line is active (real track or synthetic fallback)
      // glued to the aircraft's live interpolated position every frame, not
      // just once per poll — this is what makes the tip feel attached to
      // the plane instead of lagging behind it.
      const active = activeLineRef.current;
      if (map && selectedTm && active) {
        const lngLat = selectedTm.marker.getLngLat();
        const tip: [number, number] = [lngLat.lng, lngLat.lat];
        const sourceId = active.kind === "real" ? "selected-route" : "selected-trail";
        const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;

        const base = active.base;
        const coordinates: [number, number][] =
          base.length >= 2
            ? [...base.slice(0, -1), ...smoothExtension(base[base.length - 2], base[base.length - 1], tip)]
            : [...base, tip];

        source?.setData({
          type: "FeatureCollection",
          features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } }],
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Inline styles beat maplibre-gl.css's own `.maplibregl-map { position:
  // relative }` rule, which otherwise collides with this same element's
  // Tailwind `absolute` class and silently collapses its height.
  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  );
}
