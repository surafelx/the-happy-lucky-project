/**
 * A small map of Ethiopia without a map library: the border as lon/lat points
 * (Natural Earth, 1:110m, public domain), a flat projection that is accurate
 * enough at this latitude, and helpers for placing pins.
 */

export type LonLat = readonly [number, number];

export const ETHIOPIA_BORDER: readonly LonLat[] = [
  [37.906, 14.959], [38.513, 14.505], [39.099, 14.741], [39.341, 14.532], [40.026, 14.52], [40.897, 14.119], [41.155, 13.773],
  [41.599, 13.452], [42.01, 12.866], [42.352, 12.542], [42.0, 12.1], [41.662, 11.631], [41.74, 11.355], [41.756, 11.051],
  [42.314, 11.034], [42.555, 11.105], [42.777, 10.927], [42.559, 10.573], [42.928, 10.022], [43.297, 9.54], [43.679, 9.184],
  [46.948, 7.997], [47.789, 8.003], [44.964, 5.002], [43.661, 4.958], [42.77, 4.253], [42.129, 4.234], [41.855, 3.919],
  [41.172, 3.919], [40.768, 4.257], [39.855, 3.839], [39.559, 3.422], [38.893, 3.501], [38.671, 3.616], [38.437, 3.589],
  [38.121, 3.599], [36.855, 4.448], [36.159, 4.448], [35.817, 4.777], [35.817, 5.338], [35.298, 5.506], [34.707, 6.594],
  [34.25, 6.826], [34.075, 7.226], [33.568, 7.713], [32.954, 7.785], [33.295, 8.355], [33.826, 8.379], [33.975, 8.685],
  [33.962, 9.584], [34.257, 10.63], [34.731, 10.91], [34.832, 11.319], [35.26, 12.083], [35.864, 12.578], [36.27, 13.563],
  [36.43, 14.422], [37.594, 14.213],
];

/** Lake Tana, roughly: a landmark that makes the outline read as Ethiopia at a glance. */
export const LAKE_TANA: readonly LonLat[] = [
  [37.0, 11.75], [37.12, 12.15], [37.3, 12.3], [37.55, 12.2], [37.62, 11.9], [37.5, 11.65], [37.25, 11.6],
];

export const VIEW = { w: 800, h: 640, pad: 30 } as const;
const BOX = { lon0: 32.8, lon1: 48.2, lat0: 3.2, lat1: 15.2 } as const;
const K = Math.cos((9.2 * Math.PI) / 180); // a degree of longitude is a little shorter than one of latitude here
const SCALE = Math.min((VIEW.w - 2 * VIEW.pad) / ((BOX.lon1 - BOX.lon0) * K), (VIEW.h - 2 * VIEW.pad) / (BOX.lat1 - BOX.lat0));
const round = (n: number) => Math.round(n * 10) / 10;

/** Longitude/latitude to SVG coordinates in the VIEW box. North is up. */
export function project([lon, lat]: LonLat): { x: number; y: number } {
  return { x: round(VIEW.pad + (lon - BOX.lon0) * K * SCALE), y: round(VIEW.pad + (BOX.lat1 - lat) * SCALE) };
}

/** A closed SVG path through the given points. */
export function toPath(points: readonly LonLat[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${project(p).x} ${project(p).y}`).join(" ") + " Z";
}

/** Ray casting: is this point inside the polygon? Used to catch a pin typed with the wrong coordinates. */
export function inside(point: LonLat, polygon: readonly LonLat[] = ETHIOPIA_BORDER): boolean {
  const [x, y] = point;
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}

/**
 * Pins in the same town would sit on top of each other. Any group closer than
 * `near` pixels is fanned out in a small circle around its shared centre.
 */
export function spread<T extends { x: number; y: number }>(pins: readonly T[], near = 14, radius = 17): T[] {
  const out = pins.map((p) => ({ ...p }));
  const seen = new Set<number>();
  for (let i = 0; i < out.length; i++) {
    if (seen.has(i)) continue;
    const group = [i];
    for (let j = i + 1; j < out.length; j++) {
      if (!seen.has(j) && Math.hypot(pins[i].x - pins[j].x, pins[i].y - pins[j].y) < near) group.push(j);
    }
    group.forEach((g) => seen.add(g));
    if (group.length < 2) continue;
    const cx = group.reduce((s, g) => s + pins[g].x, 0) / group.length;
    const cy = group.reduce((s, g) => s + pins[g].y, 0) / group.length;
    group.forEach((g, n) => {
      const a = (n / group.length) * Math.PI * 2 - Math.PI / 2;
      out[g].x = round(cx + Math.cos(a) * radius);
      out[g].y = round(cy + Math.sin(a) * radius);
    });
  }
  return out;
}
