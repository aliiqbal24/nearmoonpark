"use client";
import { useEffect, useRef, useState } from "react";
import { X, RotateCcw, Check, Mountain } from "lucide-react";
import {
  defaultDesign,
  money,
  type Building,
  type Design,
  type TrackPoint,
} from "@/lib/moon/model";

export const STARTER_TRACK: TrackPoint[] = [
  { x: -32, y: 12, z: 34 },
  { x: 30, y: 12, z: 34 },
  { x: 39, y: 36, z: 0 },
  { x: 28, y: 95, z: -32 },
  { x: -12, y: 105, z: -34 },
  { x: -39, y: 35, z: -16 },
  { x: -18, y: 48, z: 9 },
  { x: 12, y: 24, z: 15 },
];
const constructionCost = (d: Design) =>
  Math.max(0, d.height - 1) * 20000 +
  (d.track ?? []).reduce((n, p) => n + Math.max(0, p.y - 35) * 100, 0);
export function CoasterEditor({
  building,
  cash,
  onPreview,
  onApply,
  onCancel,
}: {
  building: Building;
  cash: number;
  onPreview: (design: Design | null) => void;
  onApply: (design: Design) => Promise<void>;
  onCancel: () => void;
}) {
  const [design, setDesign] = useState<Design>(() => ({
    ...defaultDesign(),
    ...building.design,
    track: structuredClone(
      building.design?.track?.length ? building.design.track : STARTER_TRACK,
    ),
  }));
  const [selected, setSelected] = useState(3),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const dragging = useRef<number | null>(null),
    svg = useRef<SVGSVGElement>(null),
    preview = useRef(onPreview);
  useEffect(() => {
    preview.current = onPreview;
  }, [onPreview]);
  useEffect(() => {
    const timer = setTimeout(() => preview.current(design), 140);
    return () => clearTimeout(timer);
  }, [design]);
  useEffect(() => () => preview.current(null), []);
  const points = design.track!,
    point = points[selected];
  const cost = Math.max(
    0,
    constructionCost(design) - (building.design_paid ?? 0),
  );
  const change = (index: number, patch: Partial<TrackPoint>) => {
    if (index < 2) return;
    setError("");
    setDesign((d) => ({
      ...d,
      track: d.track!.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));
  };
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragging.current === null || !svg.current) return;
    const matrix = svg.current.getScreenCTM();
    if (!matrix) return;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      matrix.inverse(),
    );
    change(dragging.current, {
      x: Math.round(Math.max(-40, Math.min(40, p.x))),
      z: Math.round(Math.max(-40, Math.min(40, p.y))),
    });
  };
  return (
    <aside className="mp-coaster-editor" aria-label="Coaster designer">
      <header>
        <span className="mp-eyebrow">MASS DRIVER / DESIGN STUDIO</span>
        <button aria-label="Cancel coaster editing" onClick={onCancel}>
          <X size={20} />
        </button>
      </header>
      <h2>Your signature ride.</h2>
      <p>
        Drag the six route handles. Lift a hill. The loop, banking and supports
        take care of themselves.
      </p>
      <svg
        ref={svg}
        viewBox="-50 -50 100 100"
        role="group"
        aria-label="Coaster route handles"
        onPointerMove={move}
        onPointerUp={() => {
          dragging.current = null;
        }}
        onPointerCancel={() => {
          dragging.current = null;
        }}
      >
        <defs>
          <pattern
            id="track-grid"
            width="10"
            height="10"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 10 0 L 0 0 0 10"
              fill="none"
              stroke="#ffffff12"
              strokeWidth="0.4"
            />
          </pattern>
        </defs>
        <rect
          x="-44"
          y="-44"
          width="88"
          height="88"
          rx="4"
          fill="url(#track-grid)"
          stroke="#d7b88755"
          strokeWidth="0.5"
        />
        <path
          d={`M ${points.map((p) => `${p.x},${p.z}`).join(" L ")} Z`}
          fill="#69d4ca10"
          stroke="#8ae8da"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.z}
            r={i < 2 ? 2 : selected === i ? 3.6 : 2.8}
            fill={i < 2 ? "#eac381" : selected === i ? "#fff3cd" : "#64cbbf"}
            stroke="#12302f"
            strokeWidth="0.8"
            role={i < 2 ? undefined : "button"}
            tabIndex={i < 2 ? undefined : 0}
            aria-label={i < 2 ? "Fixed station" : `Track handle ${i - 1}`}
            aria-pressed={i < 2 ? undefined : selected === i}
            onPointerDown={(e) => {
              if (i < 2) return;
              setSelected(i);
              dragging.current = i;
              svg.current?.setPointerCapture(e.pointerId);
            }}
            onClick={() => i >= 2 && setSelected(i)}
            onKeyDown={(e) => {
              const delta = (
                {
                  ArrowLeft: [-1, 0],
                  ArrowRight: [1, 0],
                  ArrowUp: [0, -1],
                  ArrowDown: [0, 1],
                } as Record<string, number[]>
              )[e.key];
              if (delta) {
                e.preventDefault();
                setSelected(i);
                change(i, {
                  x: Math.max(-40, Math.min(40, p.x + delta[0])),
                  z: Math.max(-40, Math.min(40, p.z + delta[1])),
                });
              }
            }}
          />
        ))}
        <text x="0" y="46" textAnchor="middle" fill="#eac381" fontSize="3">
          STATION · FIXED CONNECTION
        </text>
      </svg>
      <label htmlFor="track-height">
        <Mountain size={17} /> Hill {selected - 1}
        <strong>
          {((point.y / 10) * [0.72, 1, 1.22][design.height]).toFixed(1)} m
        </strong>
      </label>
      <input
        id="track-height"
        type="range"
        min="12"
        max="110"
        step="1"
        value={point.y}
        onChange={(e) => change(selected, { y: +e.target.value })}
      />
      <div className="mp-track-summary">
        <span>
          Construction<strong>{cost ? money(cost) : "Included"}</strong>
        </span>
        <span>
          Ownership<strong>Saved with your park</strong>
        </span>
      </div>
      {error && (
        <p role="alert" className="mp-error">
          {error}
        </p>
      )}
      <button
        className="mp-primary full"
        disabled={saving || cost > cash}
        onClick={async () => {
          setSaving(true);
          try {
            await onApply(design);
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "The track could not be applied.",
            );
          } finally {
            setSaving(false);
          }
        }}
      >
        <Check size={18} />{" "}
        {saving
          ? "Saving design…"
          : cost > cash
            ? "More credits needed"
            : "Apply track design"}
      </button>
      <button
        className="mp-secondary full"
        onClick={() =>
          setDesign({ ...design, track: structuredClone(STARTER_TRACK) })
        }
      >
        <RotateCcw size={15} /> Reset loop
      </button>
      <p className="mp-fine">
        The game is paused while you design. Apply, take a front-seat test ride,
        then open it to guests. Guest-tested designs can be published and
        licensed on NEAR.
      </p>
    </aside>
  );
}
