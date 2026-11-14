import { CatmullRomCurve3, Vector3 } from "three";
import { defaultDesign, type Design, type TrackPoint } from "./model";

export const MAX_TRACK_TILES = 30;
export const MAX_TRACK_HEIGHT = 600;
export const STATION: TrackPoint[] = [
  { x: 120, y: 12, z: 285 },
  { x: 180, y: 12, z: 285 },
];
export const STARTER_ROUTE: TrackPoint[] = [
  ...STATION,
  { x: 225, y: 95, z: 235 },
  { x: 220, y: 300, z: 140 },
  { x: 145, y: 360, z: 100 },
  { x: 75, y: 150, z: 150 },
  { x: 90, y: 200, z: 220 },
  { x: 155, y: 65, z: 235 },
];

/** Crop around the entrance while keeping a fixed-size station and a tile-aligned plot. */
export function packTrack(
  points: TrackPoint[],
  base = defaultDesign(),
): Design {
  const spread = Math.max(...points.map((p) => Math.abs(p.x - 150)));
  const track_w = Math.max(8, Math.min(30, Math.ceil((spread + 5) / 10) * 2));
  const track_h = Math.max(
    8,
    Math.min(
      30,
      Math.ceil((300 - Math.min(...points.map((p) => p.z)) + 5) / 10),
    ),
  );
  return {
    ...base,
    height: 1,
    track_w,
    track_h,
    track: points.map((p) => ({
      ...p,
      x: p.x - 150 + track_w * 5,
      z: p.z - 300 + track_h * 10,
    })),
  };
}
export function unpackTrack(design: Design): TrackPoint[] {
  if (!design.track_w || !design.track?.length)
    return structuredClone(STARTER_ROUTE);
  return design.track.map((p) => ({
    ...p,
    x: p.x + 150 - design.track_w! * 5,
    z: p.z + 300 - design.track_h! * 10,
  }));
}
export const starterCoaster = () => packTrack(STARTER_ROUTE);
export function trackError(
  points: TrackPoint[],
  closed: boolean,
): string | null {
  if (!closed)
    return "Join the track back to the station to complete your loop.";
  if (points.length < 4)
    return "Add at least two turns before joining the station.";
  if (points.length > 32) return "Use up to 32 track points.";
  if (
    points.some(
      (p) =>
        p.x < 5 ||
        p.x > 295 ||
        p.z < 5 ||
        p.z > 285 ||
        p.y < 12 ||
        p.y > MAX_TRACK_HEIGHT,
    )
  )
    return "Keep your loop inside the 30×30-tile drawing area.";
  if (
    points.some((p, i) => {
      const q = points[(i + 1) % points.length];
      return Math.hypot(p.x - q.x, p.z - q.z) < 5;
    })
  )
    return "Give neighbouring points at least half a tile of space.";
  return null;
}
export function planPath(points: TrackPoint[], closed: boolean): string {
  if (points.length < 2) return "";
  const curve = new CatmullRomCurve3(
    points.map((p) => new Vector3(p.x * 0.125, p.y * 0.1, p.z * 0.125)),
    closed,
    "centripetal",
  );
  return curve
    .getPoints(160)
    .map(
      (p, i) =>
        `${i ? "L" : "M"}${Math.max(5, Math.min(295, p.x / 0.125)).toFixed(2)},${Math.max(5, Math.min(295, p.z / 0.125)).toFixed(2)}`,
    )
    .join(" ");
}
