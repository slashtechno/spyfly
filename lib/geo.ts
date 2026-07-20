// Great-circle interpolation (slerp along the sphere) between two lng/lat
// points. Used to draw a curved "flight so far" line instead of a straight
// rhumb segment — this is the standard approximation every flight tracker
// uses for a filed route, since real routing/weather deviation isn't public
// data anywhere for free.
export function greatCirclePoints(
  from: [number, number],
  to: [number, number],
  steps = 48,
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const [lon1, lat1] = from.map(toRad) as [number, number];
  const [lon2, lat2] = to.map(toRad) as [number, number];

  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2,
      ),
    );

  if (d === 0) return [from, to];

  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const a = Math.sin((1 - f) * d) / Math.sin(d);
    const b = Math.sin(f * d) / Math.sin(d);
    const x = a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
    const y = a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);
    points.push([toDeg(lon), toDeg(lat)]);
  }
  return points;
}

// Dead-reckons a lon/lat forward by ms milliseconds at a given ground speed
// (knots) and true heading. Used so an aircraft's animation target always
// reflects its reported speed, even on a poll where the upstream feed
// happens to report the same (or barely different) position as last time —
// without this, the icon visibly freezes despite a nonzero speed readout.
export function projectForward(
  lon: number,
  lat: number,
  speedKt: number,
  headingDeg: number,
  ms: number,
): [number, number] {
  const distNm = speedKt * (ms / 3_600_000);
  const headingRad = (headingDeg * Math.PI) / 180;
  const dLat = (distNm / 60) * Math.cos(headingRad);
  const dLon = (distNm / 60) * Math.sin(headingRad) / Math.cos((lat * Math.PI) / 180);
  return [lon + dLon, lat + dLat];
}

// Smoothly extends a line from its last real point to a live "tip" position,
// continuing the heading implied by the last two real points instead of
// jumping there in a straight segment. This is what keeps the line looking
// continuous every animation frame even though the underlying history only
// refreshes every ~45s — no need to re-poll the track API to avoid a visible
// straight-line seam where the real history ends and the live position is.
export function smoothExtension(
  prev: [number, number],
  last: [number, number],
  tip: [number, number],
  steps = 12,
): [number, number][] {
  const dx = last[0] - prev[0];
  const dy = last[1] - prev[1];
  const dirLen = Math.hypot(dx, dy) || 1;
  const dist = Math.hypot(tip[0] - last[0], tip[1] - last[1]);
  const control: [number, number] = [
    last[0] + (dx / dirLen) * dist * 0.5,
    last[1] + (dy / dirLen) * dist * 0.5,
  ];

  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = (1 - t) ** 2 * last[0] + 2 * (1 - t) * t * control[0] + t ** 2 * tip[0];
    const y = (1 - t) ** 2 * last[1] + 2 * (1 - t) * t * control[1] + t ** 2 * tip[1];
    points.push([x, y]);
  }
  return points;
}
