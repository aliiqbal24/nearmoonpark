import {
  WIDTH,
  HEIGHT,
  defaultDesign,
  type Building,
  type Design,
  type Tile,
  type TrackPoint,
} from "./model";
export type MapTrackDraft = {
  points: TrackPoint[];
  closed: boolean;
  selected: number;
  mode: "station" | "draw" | "adjust";
  rotation: number;
  editingId?: number;
  invalid?: boolean;
};
export type TrackGesture = {
  phase: "start" | "move" | "end";
  cell: Tile;
  node: number | null;
};
export function stationPoints(tile: Tile, rotation = 0): TrackPoint[] {
  return [
    { x: 10, y: 12, z: 15 },
    { x: 70, y: 12, z: 15 },
  ].map((p) => {
    const [x, z] =
      rotation === 1
        ? [30 - p.z, p.x]
        : rotation === 2
          ? [80 - p.x, 30 - p.z]
          : rotation === 3
            ? [p.z, 80 - p.x]
            : [p.x, p.z];
    return { x: tile.x * 10 + x, y: 12, z: tile.z * 10 + z };
  });
}
export function stationBounds(points: TrackPoint[]) {
  if (points.length < 2) return null;
  const [a, b] = points;
  return a.z === b.z && Math.abs(a.x - b.x) === 60
    ? {
        left: Math.min(a.x, b.x) - 10,
        top: a.z - 15,
        right: Math.max(a.x, b.x) + 10,
        bottom: a.z + 15,
      }
    : a.x === b.x && Math.abs(a.z - b.z) === 60
      ? {
          left: a.x - 15,
          top: Math.min(a.z, b.z) - 10,
          right: a.x + 15,
          bottom: Math.max(a.z, b.z) + 10,
        }
      : null;
}
export function packMapTrack(points: TrackPoint[], base = defaultDesign()) {
  const station = stationBounds(points);
  if (!station) throw Error("Choose a station location first.");
  const x = Math.floor(
    Math.min(station.left, ...points.map((p) => p.x - 4)) / 10,
  );
  const z = Math.floor(
    Math.min(station.top, ...points.map((p) => p.z - 4)) / 10,
  );
  const right = Math.ceil(
    Math.max(station.right, ...points.map((p) => p.x + 4)) / 10,
  );
  const bottom = Math.ceil(
    Math.max(station.bottom, ...points.map((p) => p.z + 4)) / 10,
  );
  return {
    x,
    z,
    design: {
      ...base,
      height: 1,
      map_track: true,
      track_w: right - x,
      track_h: bottom - z,
      track: points.map((p) => ({ ...p, x: p.x - x * 10, z: p.z - z * 10 })),
    } as Design,
  };
}
export function unpackMapTrack(
  building: Pick<Building, "x" | "z" | "design">,
): TrackPoint[] {
  return (building.design?.track ?? []).map((p) => ({
    ...p,
    x: p.x + building.x * 10,
    z: p.z + building.z * 10,
  }));
}
export function mapTrackError(
  points: TrackPoint[],
  closed: boolean,
): string | null {
  const station = stationBounds(points);
  if (!station) return "Choose a clear station location on the map.";
  if (
    station.left < 0 ||
    station.top < 0 ||
    station.right > WIDTH * 10 ||
    station.bottom > HEIGHT * 10
  )
    return "Keep the station inside the park.";
  const [a, b] = points;
  const entry =
    b.x > a.x
      ? { x: (a.x + b.x) / 20, z: station.bottom / 10 }
      : b.x < a.x
        ? { x: (a.x + b.x) / 20, z: station.top / 10 - 1 }
        : b.z > a.z
          ? { x: station.left / 10 - 1, z: (a.z + b.z) / 20 }
          : { x: station.right / 10, z: (a.z + b.z) / 20 };
  if (entry.x < 0 || entry.z < 0 || entry.x >= WIDTH || entry.z >= HEIGHT)
    return "Leave room for the station entrance inside the park.";
  if (
    points.some(
      (p) =>
        p.x < 4 ||
        p.z < 4 ||
        p.x > WIDTH * 10 - 4 ||
        p.z > HEIGHT * 10 - 4 ||
        p.y < 12 ||
        p.y > 600,
    )
  )
    return "Keep the track inside the park boundary.";
  if (points.length > 256)
    return "Close this loop or undo a few turns before extending it.";
  if (!closed || points.length < 4)
    return "Draw from the station and join its other end to close your loop.";
  if (
    points.some((p, i) => {
      const q = points[(i + 1) % points.length];
      return Math.hypot(p.x - q.x, p.z - q.z) < 5;
    })
  )
    return "Give neighbouring turns half a tile of space.";
  return null;
}
function sample(
  a: number,
  b: number,
  c: number,
  d: number,
  k: number,
  n: number,
) {
  return (
    4 * b * n ** 3 +
    (c - a) * k * n ** 2 +
    (-12 * b + 12 * c - 2 * (c - a) - (d - b)) * k ** 2 * n +
    (8 * b - 8 * c + (c - a) + (d - b)) * k ** 3
  );
}
export function mapTrackCells(
  building: Building,
  forPaths = false,
  width = WIDTH,
): number[] {
  const d = building.design!,
    points = d.track!,
    station = stationBounds(points);
  const occupied = new Set<number>();
  const mark = (x: number, z: number) => {
    x += building.x;
    z += building.z;
    if (x >= 0 && z >= 0 && x < width && z < HEIGHT)
      occupied.add(z * width + x);
  };
  if (station)
    for (let z = station.top / 10; z < station.bottom / 10; z++)
      for (let x = station.left / 10; x < station.right / 10; x++) mark(x, z);
  for (let i = 0; i < points.length; i++) {
    const p0 = points[(i + points.length - 1) % points.length],
      p1 = points[i],
      p2 = points[(i + 1) % points.length],
      p3 = points[(i + 2) % points.length];
    const n = Math.max(
        8,
        Math.floor((Math.abs(p1.x - p2.x) + Math.abs(p1.z - p2.z)) / 3),
      ),
      den = 4 * n ** 3;
    for (let k = 0; k <= n; k++) {
      const axis = (key: "x" | "y" | "z") =>
        i === 0
          ? (p1[key] * (n - k) + p2[key] * k) * 4 * n ** 2
          : sample(p0[key], p1[key], p2[key], p3[key], k, n);
      if (
        forPaths &&
        Math.max(12 * den, Math.min(600 * den, axis("y"))) >= 25 * den
      )
        continue;
      const x = Math.max(
          4 * den,
          Math.min((d.track_w! * 10 - 4) * den, axis("x")),
        ),
        z = Math.max(4 * den, Math.min((d.track_h! * 10 - 4) * den, axis("z")));
      for (const dx of [-3, 0, 3])
        for (const dz of [-3, 0, 3])
          mark(
            Math.floor((x + dx * den) / (10 * den)),
            Math.floor((z + dz * den) / (10 * den)),
          );
    }
  }
  return [...occupied].sort((a, b) => a - b);
}
export function mapTrackEntry(b: Pick<Building, "x" | "z" | "design">) {
  const points = b.design?.track ?? [],
    s = stationBounds(points);
  if (!s) return { x: b.x, z: b.z };
  const [a, c] = points;
  const entry =
    c.x > a.x
      ? { x: (a.x + c.x) / 20, z: s.bottom / 10 }
      : c.x < a.x
        ? { x: (a.x + c.x) / 20, z: s.top / 10 - 1 }
        : c.z > a.z
          ? { x: s.left / 10 - 1, z: (a.z + c.z) / 20 }
          : { x: s.right / 10, z: (a.z + c.z) / 20 };
  return { x: b.x + entry.x, z: b.z + entry.z };
}
