import { PALETTES } from "@/lib/moon/parks";
import type { Design, Kind } from "@/lib/moon/model";

/** Authored track recipes have their own preview on the ride exchange. */
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
  if (kind !== "coaster" || !design?.track?.length) {
    return <img src={`/art/${kind}-s${design?.style ?? 0}-v3.webp`} alt="" />;
  }
  const colors = PALETTES[design.palette] ?? PALETTES[0];
  const width = variant ? 8 : 6,
    depth = variant ? 6 : 8;
  const height = [0.72, 1, 1.22][design.height];
  const project = (x: number, y: number, z: number) => ({
    x: 105 + (x * width - z * depth) * 12,
    y: 112 + (x * width + z * depth) * 5 - y * 6,
  });
  const points = design.track.map((p) =>
    project(p.x / 100, (p.y / 10) * height, p.z / 100),
  );
  const ground = design.track.map((p) => project(p.x / 100, 0, p.z / 100));
  const curve = points
    .map((point, index) => {
      const previous = points[(index + points.length - 1) % points.length];
      const next = points[(index + 1) % points.length];
      const after = points[(index + 2) % points.length];
      return `C ${point.x + (next.x - previous.x) / 6},${point.y + (next.y - previous.y) / 6} ${next.x - (after.x - point.x) / 6},${next.y - (after.y - point.y) / 6} ${next.x},${next.y}`;
    })
    .join(" ");
  const route = `M ${points[0].x},${points[0].y} ${curve} Z`;
  return (
    <svg
      className="mp-ride-preview"
      viewBox="0 0 210 160"
      role="img"
      aria-label={`${name} authored track`}
    >
      <path
        d="M 24 112 L 103 80 L 187 112 L 105 145 Z"
        fill="#d6e0d714"
        stroke="#d6e0d72b"
      />
      {points.map((point, index) => (
        <line
          key={index}
          x1={point.x}
          y1={point.y + 2}
          x2={ground[index].x}
          y2={ground[index].y}
          stroke="#d9c5a0"
          strokeWidth="1.2"
          opacity="0.8"
        />
      ))}
      <path
        d={route}
        fill="none"
        stroke="#0b151b"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path
        d={route}
        fill="none"
        stroke={colors.accent}
        strokeWidth="4.5"
        strokeLinejoin="round"
      />
      <path
        d={route}
        fill="none"
        stroke={colors.primary}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d={route}
        fill="none"
        stroke="#e0f4e8"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
