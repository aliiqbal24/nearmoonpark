"use client";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Check,
  Coins,
  MousePointer2,
  Pencil,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";
import {
  VERSION,
  blueprint,
  defaultDesign,
  money,
  type Building,
  type Design,
  type Kind,
  type TrackPoint,
} from "@/lib/moon/model";
import {
  MAX_TRACK_HEIGHT,
  STATION,
  STARTER_ROUTE,
  packTrack,
  planPath,
  trackError,
  unpackTrack,
} from "@/lib/moon/coaster";
import { PalettePicker } from "./attraction-design";
import { AttractionPreview } from "./attraction-preview";
import { Dialog } from "./moon-panels";

type RouteState = { points: TrackPoint[]; closed: boolean };
export function BuildDesigner({
  kind,
  building,
  initialDesign,
  palette = 0,
  version = VERSION,
  draftKey,
  cash,
  onCancel,
  onApply,
  onPreview,
}: {
  kind: Kind;
  building?: Building;
  initialDesign?: Design;
  palette?: number;
  version?: string;
  draftKey?: string;
  cash: number;
  onCancel: () => void;
  onApply: (design: Design) => void | Promise<void>;
  onPreview?: (design: Design | null) => void;
}) {
  const [restored] = useState(() => {
    if (!draftKey) return null;
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || "null") as {
        kind: Kind;
        design: Design;
        route: RouteState;
        selected: number;
        revision?: number;
      } | null;
      if (
        !saved ||
        saved.kind !== kind ||
        (building && saved.revision !== (building.design_revision ?? 0))
      )
        return null;
      if (
        typeof saved.design?.name !== "string" ||
        saved.design.name.length > 28 ||
        ![0, 1, 2, 3, 4, 5, 255].includes(saved.design.palette) ||
        ![0, 1, 2].includes(saved.design.style) ||
        ![0, 1, 2].includes(saved.design.lights) ||
        !Array.isArray(saved.route?.points) ||
        saved.route.points.length < 2 ||
        saved.route.points.length > 32 ||
        saved.route.points.some(
          (p) =>
            !Number.isInteger(p.x) ||
            p.x < 5 ||
            p.x > 295 ||
            !Number.isInteger(p.z) ||
            p.z < 5 ||
            p.z > 285 ||
            !Number.isInteger(p.y) ||
            p.y < 12 ||
            p.y > 600,
        )
      )
        return null;
      return saved;
    } catch {
      return null;
    }
  });
  const [design, setDesign] = useState<Design>(
    () =>
      restored?.design ?? building?.design ?? initialDesign ?? defaultDesign(),
  );
  const [route, setRoute] = useState<RouteState>(
    () =>
      restored?.route ?? {
        points: unpackTrack(
          building?.design ?? initialDesign ?? defaultDesign(),
        ),
        closed: true,
      },
  );
  const [selected, setSelected] = useState(() =>
      Math.min(restored?.selected ?? 3, route.points.length - 1),
    ),
    [cursor, setCursor] = useState<TrackPoint | null>(null);
  useEffect(() => {
    if (!draftKey) return;
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          kind,
          design,
          route,
          selected,
          revision: building?.design_revision ?? 0,
        }),
      );
    } catch {
      /* The park itself is saved independently. */
    }
  }, [draftKey, kind, design, route, selected, building?.design_revision]);
  const [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const [history, setHistory] = useState<RouteState[]>([]);
  const drag = useRef<number | null>(null),
    svg = useRef<SVGSVGElement>(null);
  const gridId = useId().replaceAll(":", "");
  const coaster = kind === "coaster",
    a = blueprint(kind);
  const packed = useMemo(
    () => (coaster ? packTrack(route.points, design) : design),
    [coaster, route.points, design],
  );
  const routeProblem = coaster ? trackError(route.points, route.closed) : null;
  const cost = building ? 0 : a.cost;
  const previewRef = useRef(onPreview);
  useEffect(() => {
    previewRef.current = onPreview;
  }, [onPreview]);
  const signature = JSON.stringify(packed);
  useEffect(() => {
    if (routeProblem) return;
    const timer = setTimeout(
      () => previewRef.current?.(JSON.parse(signature)),
      180,
    );
    return () => clearTimeout(timer);
  }, [signature, routeProblem]);
  useEffect(() => () => previewRef.current?.(null), []);
  const remember = () => {
    setHistory((previous) => [...previous.slice(-23), structuredClone(route)]);
  };
  const change = (patch: Partial<Design>) =>
    setDesign((d) => ({ ...d, ...patch }));
  const pointAt = (event: React.PointerEvent<SVGSVGElement>): TrackPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = Math.min(rect.width, rect.height) / 320;
    const left = rect.left + (rect.width - 320 * scale) / 2;
    const top = rect.top + (rect.height - 320 * scale) / 2;
    return {
      x: Math.max(
        5,
        Math.min(295, Math.round((event.clientX - left) / scale - 10)),
      ),
      z: Math.max(
        5,
        Math.min(285, Math.round((event.clientY - top) / scale - 10)),
      ),
      y: route.points[selected]?.y ?? 120,
    };
  };
  const undo = () => {
    const previous = history.at(-1);
    setHistory((previous) => previous.slice(0, -1));
    if (previous) {
      setRoute(previous);
      setSelected(Math.min(selected, previous.points.length - 1));
    }
  };
  const remove = () => {
    if (selected < 2 || route.points.length <= 4) return;
    remember();
    setRoute((r) => ({
      ...r,
      points: r.points.filter((_, i) => i !== selected),
    }));
    setSelected(Math.max(2, selected - 1));
  };
  const apply = async () => {
    if (routeProblem || saving) return;
    setSaving(true);
    setError("");
    try {
      await onApply({ ...packed, name: packed.name.trim() });
      if (building && draftKey) localStorage.removeItem(draftKey);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not apply this design.");
    } finally {
      setSaving(false);
    }
  };
  const cancel = useCallback(() => {
    if (!saving) onCancel();
  }, [onCancel, saving]);
  return (
    <Dialog
      title={
        building
          ? "Your coaster workshop"
          : `Design your ${coaster ? "mass driver" : a.name}`
      }
      onClose={cancel}
    >
      <div className={`mp-build-studio ${coaster ? "with-track" : ""}`}>
        <div className="mp-studio-main">
          {coaster ? (
            <>
              <div className="mp-track-intro">
                <MousePointer2 size={17} />
                <p>Drag the turns. Raise a hill. Make it yours.</p>
                <span>Up to 30 × 30 tiles · 60 m high</span>
              </div>
              <div className="mp-track-tools">
                <button
                  onClick={() => {
                    remember();
                    setRoute({
                      points: structuredClone(STARTER_ROUTE),
                      closed: true,
                    });
                    setSelected(3);
                  }}
                >
                  <RotateCcw size={14} /> Starter loop
                </button>
                <button
                  aria-pressed={!route.closed}
                  onClick={() => {
                    remember();
                    setRoute({
                      points: structuredClone(STATION),
                      closed: false,
                    });
                    setSelected(1);
                  }}
                >
                  <Pencil size={14} /> Draw your own
                </button>
                <button
                  disabled={!history.length}
                  onClick={undo}
                  aria-label="Undo track edit"
                >
                  <Undo2 size={15} />
                </button>
                <button
                  disabled={selected < 2 || route.points.length <= 4}
                  onClick={remove}
                  aria-label="Delete selected turn"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <svg
                ref={svg}
                className={`mp-track-plan ${route.closed ? "" : "drawing"}`}
                viewBox="-10 -10 320 320"
                role="group"
                aria-label="Coaster track schematic"
                onPointerDown={(e) => {
                  if (e.button !== 0 || drag.current !== null) return;
                  const p = pointAt(e);
                  if (!route.closed) {
                    if (
                      route.points.length >= 4 &&
                      Math.hypot(p.x - 120, p.z - 285) < 16
                    ) {
                      remember();
                      setRoute((r) => ({ ...r, closed: true }));
                      return;
                    }
                    if (route.points.length >= 32) return;
                    remember();
                    setRoute((r) => ({ ...r, points: [...r.points, p] }));
                    setSelected(route.points.length);
                  }
                }}
                onPointerMove={(e) => {
                  const p = pointAt(e);
                  if (!route.closed) setCursor(p);
                  if (drag.current !== null) {
                    const index = drag.current;
                    setRoute((r) => ({
                      ...r,
                      points: r.points.map((old, i) =>
                        i === index ? { ...old, x: p.x, z: p.z } : old,
                      ),
                    }));
                  }
                }}
                onPointerUp={() => {
                  drag.current = null;
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
                onPointerLeave={() => setCursor(null)}
              >
                <defs>
                  <pattern
                    id={gridId}
                    width="10"
                    height="10"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M10 0H0V10"
                      fill="none"
                      stroke="#b8ded91a"
                      strokeWidth="0.5"
                    />
                  </pattern>
                </defs>
                <rect
                  x="0"
                  y="0"
                  width="300"
                  height="300"
                  rx="5"
                  fill="#0a2029"
                  stroke="#8dded55c"
                />
                <rect
                  width="300"
                  height="300"
                  fill={`url(#${gridId})`}
                  pointerEvents="none"
                />
                <path
                  d={planPath(route.points, route.closed)}
                  className="mp-track-shadow"
                />
                <path
                  d={planPath(route.points, route.closed)}
                  className="mp-track-rail"
                />
                {route.closed && (
                  <path
                    d={planPath(route.points, true)}
                    stroke="transparent"
                    strokeWidth="12"
                    fill="none"
                    className="mp-track-insert"
                    aria-label="Click the track to add a turn"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      if (route.points.length >= 32) return;
                      const rect = svg.current!.getBoundingClientRect(),
                        sc = Math.min(rect.width, rect.height) / 320;
                      const p = {
                        x: Math.round(
                          (e.clientX -
                            rect.left -
                            (rect.width - 320 * sc) / 2) /
                            sc -
                            10,
                        ),
                        z: Math.round(
                          (e.clientY -
                            rect.top -
                            (rect.height - 320 * sc) / 2) /
                            sc -
                            10,
                        ),
                        y: 120,
                      };
                      let at = 1,
                        distance = Infinity;
                      for (let i = 1; i < route.points.length; i++) {
                        const a = route.points[i],
                          b = route.points[(i + 1) % route.points.length];
                        const dx = b.x - a.x,
                          dz = b.z - a.z,
                          t = Math.max(
                            0,
                            Math.min(
                              1,
                              ((p.x - a.x) * dx + (p.z - a.z) * dz) /
                                (dx * dx + dz * dz || 1),
                            ),
                          );
                        const d = Math.hypot(
                          p.x - a.x - t * dx,
                          p.z - a.z - t * dz,
                        );
                        if (d < distance) {
                          distance = d;
                          at = i;
                          p.y = Math.round(a.y + t * (b.y - a.y));
                        }
                      }
                      remember();
                      const points = [...route.points];
                      points.splice(at + 1, 0, p);
                      setRoute({ points, closed: true });
                      setSelected(at + 1);
                      drag.current = at + 1;
                      svg.current!.setPointerCapture(e.pointerId);
                    }}
                  />
                )}
                {!route.closed && cursor && (
                  <path
                    d={`M${route.points.at(-1)!.x},${route.points.at(-1)!.z} L${cursor.x},${cursor.z}`}
                    fill="none"
                    stroke="#efce87"
                    strokeDasharray="3 3"
                    strokeWidth="1.5"
                  />
                )}
                <rect
                  x="115"
                  y="277"
                  width="70"
                  height="16"
                  rx="4"
                  fill="#e8d8ab"
                  opacity="0.2"
                />
                <text
                  x="150"
                  y="306"
                  textAnchor="middle"
                  className="mp-plan-label"
                >
                  STATION & PARK ENTRANCE
                </text>
                {route.points.map((p, i) => (
                  <g key={i}>
                    <circle
                      cx={p.x}
                      cy={p.z}
                      r={i < 2 ? 5 : 7}
                      fill={
                        selected === i
                          ? "#fff2d3"
                          : i < 2
                            ? "#e8c77e"
                            : "#0f716b"
                      }
                      stroke="#aeefe0"
                      strokeWidth="1.3"
                      className={i < 2 ? "mp-station-point" : "mp-track-point"}
                      tabIndex={0}
                      role="button"
                      aria-label={
                        i < 2
                          ? `Station connection ${i + 1}`
                          : `Track point ${i + 1}, ${(p.y / 10).toFixed(1)} metres`
                      }
                      onFocus={() => setSelected(i)}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelected(i);
                        if (i < 2) {
                          if (
                            i === 0 &&
                            !route.closed &&
                            route.points.length >= 4
                          ) {
                            remember();
                            setRoute((r) => ({ ...r, closed: true }));
                          }
                          return;
                        }
                        remember();
                        drag.current = i;
                        svg.current!.setPointerCapture(e.pointerId);
                      }}
                      onKeyDown={(e) => {
                        if (i < 2) return;
                        if (e.key === "Delete" || e.key === "Backspace") {
                          e.preventDefault();
                          remove();
                          return;
                        }
                        const delta = {
                          ArrowLeft: [-5, 0],
                          ArrowRight: [5, 0],
                          ArrowUp: [0, -5],
                          ArrowDown: [0, 5],
                        }[e.key];
                        if (!delta) return;
                        e.preventDefault();
                        remember();
                        setRoute((r) => ({
                          ...r,
                          points: r.points.map((p, n) =>
                            n === i
                              ? {
                                  ...p,
                                  x: Math.max(5, Math.min(295, p.x + delta[0])),
                                  z: Math.max(5, Math.min(285, p.z + delta[1])),
                                }
                              : p,
                          ),
                        }));
                      }}
                    />
                    {i >= 2 && (
                      <text
                        x={p.x}
                        y={p.z - 11}
                        textAnchor="middle"
                        className="mp-point-height"
                      >
                        {(p.y / 10).toFixed(0)} m
                      </text>
                    )}
                  </g>
                ))}
              </svg>
              <div className="mp-height-control">
                <label htmlFor="track-height">
                  {selected < 2 ? "Station height" : "Selected turn height"}
                  <strong>
                    {((route.points[selected]?.y ?? 12) / 10).toFixed(1)} m
                  </strong>
                </label>
                <input
                  id="track-height"
                  aria-label="Selected turn height"
                  type="range"
                  min="12"
                  max={MAX_TRACK_HEIGHT}
                  step="1"
                  disabled={selected < 2}
                  value={route.points[selected]?.y ?? 12}
                  onPointerDown={remember}
                  onChange={(e) => {
                    const y = +e.target.value;
                    setRoute((r) => ({
                      ...r,
                      points: r.points.map((p, i) =>
                        i === selected ? { ...p, y } : p,
                      ),
                    }));
                  }}
                />
              </div>
              {!route.closed && (
                <button
                  className="mp-primary full"
                  disabled={route.points.length < 4}
                  onClick={() => {
                    remember();
                    setRoute((r) => ({ ...r, closed: true }));
                  }}
                >
                  <Check size={16} /> Join back to station
                </button>
              )}
              <p className="mp-fine">
                {route.closed
                  ? "Drag a turn or click the track to add one. Arrow keys move a focused turn."
                  : "Click to lay your route. Finish by clicking the golden station or joining the loop."}
              </p>
            </>
          ) : (
            <p className="mp-subtle">
              {kind === "solar" && version !== VERSION
                ? "Four extra units of clean power for this earlier park."
                : a.description}{" "}
              Choose its look before it joins your park.
            </p>
          )}
        </div>
        <div className="mp-studio-options">
          {restored && (
            <small className="mp-fine" role="status">
              Your unfinished design was restored.
            </small>
          )}
          <AttractionPreview
            kind={kind}
            design={routeProblem ? design : packed}
            palette={palette}
          />
          {coaster && (
            <div className="mp-plan-dimensions">
              <span>
                {packed.track_w} × {packed.track_h} tiles
              </span>
              <span>{route.points.length} / 32 points</span>
              <span>
                {Math.max(...route.points.map((p) => p.y)) / 10} m peak
              </span>
            </div>
          )}
          <label>
            Attraction name
            <input
              aria-label="Attraction name"
              maxLength={28}
              placeholder={a.name}
              value={design.name}
              onChange={(e) => change({ name: e.target.value })}
            />
          </label>
          <label>Colors</label>
          <PalettePicker
            value={design.palette}
            inherit
            onChange={(palette) => change({ palette })}
          />
          <label>Design</label>
          <div
            className="mp-design-families"
            role="group"
            aria-label="Architectural design"
          >
            {["Retro Resort", "Orbital", "Expedition"].map((name, style) => (
              <button
                key={name}
                aria-pressed={design.style === style}
                onClick={() => change({ style })}
              >
                <img src={`/art/${kind}-s${style}-v4.webp`} alt="" />
                <span>{name}</span>
              </button>
            ))}
          </div>
          <label>Lighting</label>
          <div className="mp-segments">
            {["Soft", "Golden", "Neon"].map((name, lights) => (
              <button
                key={name}
                aria-pressed={design.lights === lights}
                onClick={() => change({ lights })}
              >
                {name}
              </button>
            ))}
          </div>
          <div className="mp-studio-price">
            <Coins size={17} />
            <strong>
              {building ? "Free redesign" : `${money(cost)} credits`}
            </strong>
            <small>
              {building
                ? "Your park is paused while you design."
                : "Colors, design and track included. Pay when placed."}
            </small>
          </div>
          {(error || routeProblem) && (
            <p className="mp-studio-error" role="status">
              {error || routeProblem}
            </p>
          )}
          <button
            className="mp-primary full"
            disabled={saving || !!routeProblem || cash < cost}
            onClick={() => void apply()}
          >
            {saving
              ? "Applying…"
              : building
                ? "Apply design"
                : `Place ${coaster ? "coaster" : "attraction"}`}
            <Check size={16} />
          </button>
          <button
            className="mp-secondary full"
            disabled={saving}
            onClick={cancel}
          >
            Back to park
          </button>
        </div>
      </div>
    </Dialog>
  );
}
