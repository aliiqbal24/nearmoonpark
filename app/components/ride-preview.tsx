import { CatmullRomCurve3, Vector3 } from "three";
import { PALETTES } from "@/lib/moon/parks";
import type { Design, Kind } from "@/lib/moon/model";

/** The exchange previews the saved curve, including its actual footprint and height. */
export function RidePreview({
  kind,
  design,
  variant = 0,
  name,
}: {
  kind: Kind;
  design?: Design;
  variant?: number;
  name: string;
}) {
  if (kind !== "coaster" || !design?.track?.length)
    return <img src={`/art/${kind}-s${design?.style ?? 0}-v5.webp`} alt="" />;
  const colors = PALETTES[design.palette] ?? PALETTES[0];
  const width = (design.track_w ?? (variant ? 8 : 6)) * 1.25,
    depth = (design.track_h ?? (variant ? 6 : 8)) * 1.25;
  const points = design.track.map((p) =>
    design.track_w
      ? new Vector3(p.x * 0.125 - width / 2, p.y / 10, p.z * 0.125 - depth / 2)
      : new Vector3(
          (p.x / 100) * width,
          (p.y / 10) * [0.72, 1, 1.22][design.height],
          (p.z / 100) * depth,
        ),
  );
  const curve = new CatmullRomCurve3(points, true, "centripetal");
  const samples = curve.getPoints(160).map((p) => {
    p.y = Math.max(1.2, p.y);
    if (design.track_w) {
      p.x = Math.max(-width / 2 + 0.4, Math.min(width / 2 - 0.4, p.x));
      p.z = Math.max(-depth / 2 + 0.4, Math.min(depth / 2 - 0.4, p.z));
    }
    return p;
  });
  const corners = [
    new Vector3(-width / 2, 0, -depth / 2),
    new Vector3(width / 2, 0, -depth / 2),
    new Vector3(width / 2, 0, depth / 2),
    new Vector3(-width / 2, 0, depth / 2),
  ];
  const raw = (p: Vector3) => ({
    x: p.x - p.z,
    y: (p.x + p.z) * 0.45 - p.y * 1.2,
  });
  const bounds = [...samples, ...corners].map(raw);
  const minX = Math.min(...bounds.map((p) => p.x)),
    maxX = Math.max(...bounds.map((p) => p.x));
  const minY = Math.min(...bounds.map((p) => p.y)),
    maxY = Math.max(...bounds.map((p) => p.y));
  const scale = Math.min(180 / (maxX - minX), 132 / (maxY - minY));
  const project = (p: Vector3) => {
    const q = raw(p);
    return {
      x: 105 + (q.x - (minX + maxX) / 2) * scale,
      y: 80 + (q.y - (minY + maxY) / 2) * scale,
    };
  };
  const path = (p: Vector3[]) =>
    p
      .map((p, i) => {
        const q = project(p);
        return `${i ? "L" : "M"}${q.x.toFixed(2)},${q.y.toFixed(2)}`;
      })
      .join(" ") + " Z";
  return (
    <svg
      className="mp-ride-preview"
      viewBox="0 0 210 160"
      role="img"
      aria-label={`${name} authored track`}
    >
      <path d={path(corners)} fill="#d6e0d714" stroke="#d6e0d72b" />
      {points.map((point, i) => {
        const p = project(point),
          ground = project(new Vector3(point.x, 0, point.z));
        return (
          <line
            key={i}
            x1={p.x}
            y1={p.y + 2}
            x2={ground.x}
            y2={ground.y}
            stroke="#d9c5a0"
            strokeWidth="1.2"
            opacity=".8"
          />
        );
      })}
      <path
        d={path(samples)}
        fill="none"
        stroke="#0b151b"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      <path
        d={path(samples)}
        fill="none"
        stroke={colors.accent}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d={path(samples)}
        fill="none"
        stroke={colors.primary}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d={path(samples)}
        fill="none"
        stroke="#e0f4e8"
        strokeWidth=".6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
