"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  RotateCw,
  Undo2,
  X,
  Pencil,
  MousePointer2,
  Trash2,
} from "lucide-react";
import {
  buildingCells,
  defaultDesign,
  money,
  previewBuilding,
  tileLine,
  type Building,
  type Design,
  type Run,
  type TrackPoint,
} from "@/lib/moon/model";
import {
  mapTrackError,
  packMapTrack,
  mapTrackEntry,
  stationBounds,
  stationPoints,
  unpackMapTrack,
  type MapTrackDraft,
  type TrackGesture,
} from "@/lib/moon/map-track";
import { simulate } from "@/lib/moon/engine";
import type { MoonWorld } from "@/lib/moon/world";
import { PalettePicker } from "./attraction-design";

type State = MapTrackDraft & { design: Design; height: number };
export function MapCoasterDesigner({
  run,
  building,
  world,
  draftKey,
  onCancel,
  onApply,
}: {
  run: Run;
  building?: Building;
  world: React.RefObject<MoonWorld | null>;
  draftKey: string;
  onCancel: () => void;
  onApply: (plan: ReturnType<typeof packMapTrack>) => Promise<void>;
}) {
  const [initial] = useState<State>(() => {
    const base: State = {
      points: building ? unpackMapTrack(building) : [],
      closed: !!building,
      selected: building ? 2 : -1,
      mode: building ? "adjust" : "station",
      rotation: 0,
      editingId: building?.id,
      design: building?.design ?? defaultDesign(),
      height: 120,
    };
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey) || "null");
      if (
        saved?.format === "moon-map-v1" &&
        saved.revision === building?.design_revision &&
        Array.isArray(saved.state?.points) &&
        saved.state.points.length <= 256 &&
        (saved.state.points.length === 0 ||
          !!stationBounds(saved.state.points)) &&
        saved.state.points.every(
          (p: TrackPoint) =>
            Number.isInteger(p.x) &&
            p.x >= 4 &&
            p.x <= 476 &&
            Number.isInteger(p.z) &&
            p.z >= 4 &&
            p.z <= 476 &&
            Number.isInteger(p.y) &&
            p.y >= 12 &&
            p.y <= 600,
        )
      ) {
        const d = saved.state.design;
        if (
          typeof d?.name === "string" &&
          d.name.length <= 28 &&
          [0, 1, 2, 3, 4, 5, 255].includes(d.palette) &&
          [0, 1, 2].includes(d.style) &&
          [0, 1, 2].includes(d.lights)
        )
          return {
            ...base,
            ...saved.state,
            selected: Math.max(
              -1,
              Math.min(
                saved.state.points.length - 1,
                Number.isInteger(saved.state.selected)
                  ? saved.state.selected
                  : -1,
              ),
            ),
            mode: ["station", "draw", "adjust"].includes(saved.state.mode)
              ? saved.state.mode
              : base.mode,
            rotation: [0, 1, 2, 3].includes(saved.state.rotation)
              ? saved.state.rotation
              : 0,
            height: Math.max(
              12,
              Math.min(
                600,
                Number.isInteger(saved.state.height) ? saved.state.height : 120,
              ),
            ),
            editingId: building?.id,
          };
      }
    } catch {
      /* Begin with the confirmed route when a draft is incomplete. */
    }
    return base;
  });
  const [state, setState] = useState(initial);
  const current = useRef(state);
  const history = useRef<State[]>([]);
  const [historySize, setHistorySize] = useState(0);
  const [problem, setProblem] = useState("");
  const [validation, setValidation] = useState({ key: "", error: "" });
  const [busy, setBusy] = useState(false);
  const committed = useRef(false);
  const update = (next: State) => {
    current.current = next;
    setProblem("");
    setState(next);
  };
  const remember = () => {
    history.current = [
      ...history.current.slice(-39),
      structuredClone(current.current),
    ];
    setHistorySize(history.current.length);
  };
  const plan = useMemo(
    () =>
      state.points.length >= 2
        ? packMapTrack(state.points, state.design)
        : null,
    [state.points, state.design],
  );
  const basicError = mapTrackError(state.points, state.closed);
  const validationKey = JSON.stringify([run.hash, building?.id, plan]);
  const validating = !!plan && !basicError && validation.key !== validationKey;
  const error =
    problem ||
    basicError ||
    (validation.key === validationKey ? validation.error : "");
  useEffect(() => {
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({
          format: "moon-map-v1",
          revision: building?.design_revision,
          state,
        }),
      );
    } catch {
      /* The confirmed park is saved separately. */
    }
  }, [state, draftKey, building?.design_revision]);
  useEffect(() => {
    if (!plan || basicError) return;
    let active = true;
    const timer = setTimeout(() => {
      const command = building
        ? {
            kind: "design" as const,
            building: building.id,
            design: plan.design,
            x: plan.x,
            z: plan.z,
            relocate: true,
          }
        : { kind: "build" as const, item: "coaster" as const, ...plan };
      void simulate({ op: "step", run, commands: [command], ticks: 0 }).then(
        () => {
          if (active) {
            setValidation({ key: validationKey, error: "" });
          }
        },
        (error) => {
          if (active) {
            setValidation({ key: validationKey, error: error.message });
          }
        },
      );
    }, 160);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [plan, basicError, run, building, validationKey]);
  const gesture = (event: TrackGesture) => {
    const s = current.current;
    if (event.phase === "start") remember();
    if (s.mode === "station") {
      if (
        event.phase !== "end" ||
        event.cell.x < 0 ||
        event.cell.z < 0 ||
        event.cell.x >= 48 ||
        event.cell.z >= 48
      )
        return;
      const points = stationPoints(event.cell, s.rotation);
      const candidate = packMapTrack(points, s.design);
      const b = {
        ...previewBuilding("coaster", candidate.design),
        x: candidate.x,
        z: candidate.z,
      };
      const occupied = new Set(
        run.buildings
          .filter((other) => !other.sold && other.id !== building?.id)
          .flatMap((other) => buildingCells(other)),
      );
      const station = stationBounds(points)!;
      const entry = mapTrackEntry(b);
      if (entry.x < 0 || entry.z < 0 || entry.x >= 48 || entry.z >= 48) {
        setProblem("Leave room for the station entrance inside the park.");
        return;
      }
      if (
        station.left < 0 ||
        station.top < 0 ||
        station.right > 480 ||
        station.bottom > 480 ||
        buildingCells(b).some((c) => occupied.has(c) || run.paths.includes(c))
      ) {
        setProblem("Choose clear tiles for the station and its entrance.");
        return;
      }
      update({ ...s, points, mode: "draw", selected: 1 });
      setProblem("");
      return;
    }
    const targetCell = {
      x: Math.max(0, Math.min(47, event.cell.x)),
      z: Math.max(0, Math.min(47, event.cell.z)),
    };
    if (s.mode === "adjust") {
      if (event.node === null) return;
      const selected = event.node;
      if (selected < 2 || event.phase === "start") {
        update({ ...s, selected });
        return;
      }
      update({
        ...s,
        selected,
        points: s.points.map((p, i) =>
          i === selected
            ? { ...p, x: targetCell.x * 10 + 5, z: targetCell.z * 10 + 5 }
            : p,
        ),
      });
      return;
    }
    if (s.closed) return;
    const target = { x: targetCell.x * 10 + 5, z: targetCell.z * 10 + 5 };
    if (
      s.points.length >= 4 &&
      Math.hypot(target.x - s.points[0].x, target.z - s.points[0].z) <= 15
    ) {
      update({
        ...s,
        closed: true,
        mode: "adjust",
        selected: s.points.length - 1,
      });
      return;
    }
    const last = s.points.at(-1)!;
    const station = stationBounds(s.points)!;
    const points = [...s.points];
    for (const cell of tileLine(
      { x: Math.floor(last.x / 10), z: Math.floor(last.z / 10) },
      targetCell,
    ).slice(1)) {
      const x = cell.x * 10 + 5,
        z = cell.z * 10 + 5;
      if (
        x >= station.left &&
        x < station.right &&
        z >= station.top &&
        z < station.bottom
      )
        continue;
      const previous = points.at(-1)!;
      const p = { x, z, y: Math.max(12, Math.min(s.height, previous.y + 60)) };
      if (Math.hypot(previous.x - x, previous.z - z) < 5) continue;
      const a = points.at(-2);
      if (
        points.length > 2 &&
        a &&
        a.y === previous.y &&
        previous.y === p.y &&
        (previous.x - a.x) * (p.z - previous.z) ===
          (previous.z - a.z) * (p.x - previous.x) &&
        (previous.x - a.x) * (p.x - previous.x) +
          (previous.z - a.z) * (p.z - previous.z) >
          0
      )
        points.pop();
      points.push(p);
      if (points.length >= 256) break;
    }
    update({ ...s, points, selected: points.length - 1 });
  };
  const gestureRef = useRef(gesture);
  useLayoutEffect(() => {
    gestureRef.current = gesture;
  });
  useLayoutEffect(() => {
    world.current?.setTrackDesigner(
      { ...state, invalid: !!error && state.closed },
      (event) => gestureRef.current(event),
    );
  }, [state, world, error]);
  useEffect(() => {
    const instance = world.current;
    return () => instance?.endTrackDesigner(committed.current);
  }, [world]);
  const undo = () => {
    const previous = history.current.pop();
    if (previous) {
      update(previous);
      setHistorySize(history.current.length);
    }
  };
  const setHeight = (value: number) => {
    const s = current.current;
    update({
      ...s,
      height: value,
      points: s.points.map((p, i) =>
        i === s.selected && i >= 2 ? { ...p, y: value } : p,
      ),
    });
  };
  const selectedHeight =
    state.selected >= 2
      ? (state.points[state.selected]?.y ?? state.height)
      : state.height;
  return (
    <section className="mp-map-designer" aria-label="Coaster map designer">
      <header>
        <div>
          <span className="mp-eyebrow">MASS-DRIVER WORKSHOP</span>
          <h2>{building ? "Reshape your ride" : "Draw your coaster"}</h2>
        </div>
        <button aria-label="Cancel coaster design" onClick={onCancel}>
          <X size={18} />
        </button>
      </header>
      <p className="mp-map-instruction">
        {state.mode === "station"
          ? "Choose a station location on the park’s tiles."
          : !state.closed
            ? "Drag from the station. Return to its golden connection to close the loop."
            : "Your loop is closed. Drag its turns to reshape it, then build."}
      </p>
      <div className="mp-map-actions">
        {state.mode === "station" ? (
          <button
            onClick={() =>
              update({ ...state, rotation: (state.rotation + 1) % 4 })
            }
          >
            <RotateCw size={15} />
            Rotate station
          </button>
        ) : (
          <>
            <button
              aria-pressed={state.mode === "draw"}
              onClick={() => {
                remember();
                update({ ...state, closed: false, mode: "draw" });
              }}
            >
              <Pencil size={15} />
              Draw
            </button>
            <button
              aria-pressed={state.mode === "adjust"}
              onClick={() => update({ ...state, mode: "adjust" })}
            >
              <MousePointer2 size={15} />
              Adjust
            </button>
          </>
        )}
        <button
          aria-label="Undo coaster stroke"
          disabled={!historySize}
          onClick={undo}
        >
          <Undo2 size={16} />
        </button>
        <button
          aria-label="Reset coaster"
          onClick={() => {
            remember();
            update({
              ...state,
              points: [],
              closed: false,
              mode: "station",
              selected: -1,
            });
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
      {state.mode === "adjust" &&
        state.selected >= 2 &&
        state.points.length > 4 && (
          <button
            className="mp-secondary full"
            onClick={() => {
              remember();
              update({
                ...state,
                points: state.points.filter((_, i) => i !== state.selected),
                selected: Math.max(2, state.selected - 1),
              });
            }}
          >
            <Trash2 size={15} />
            Remove selected turn
          </button>
        )}
      <label htmlFor="map-coaster-height">
        {state.selected >= 2 ? "Selected turn height" : "Drawing height"}
        <strong>{(selectedHeight / 10).toFixed(1)} m</strong>
      </label>
      <input
        id="map-coaster-height"
        aria-label="Track height"
        type="range"
        min={12}
        max={600}
        step={1}
        value={selectedHeight}
        onPointerDown={remember}
        onChange={(e) => setHeight(+e.target.value)}
      />
      <label htmlFor="map-coaster-name">Attraction name</label>
      <input
        id="map-coaster-name"
        value={state.design.name}
        maxLength={28}
        placeholder="Mass-Driver Coaster"
        onChange={(e) =>
          update({
            ...state,
            design: { ...state.design, name: e.target.value },
          })
        }
      />
      <label>Colors</label>
      <PalettePicker
        value={state.design.palette}
        onChange={(palette) =>
          update({ ...state, design: { ...state.design, palette } })
        }
      />
      <label>Design</label>
      <div className="mp-style-picker">
        {["Retro Resort", "Orbital", "Expedition"].map((name, style) => (
          <button
            key={name}
            aria-pressed={state.design.style === style}
            onClick={() =>
              update({ ...state, design: { ...state.design, style } })
            }
          >
            <img src={`/art/coaster-s${style}-v5.webp`} alt="" />
            {name}
          </button>
        ))}
      </div>
      {!state.closed && state.points.length >= 4 && (
        <button
          className="mp-secondary full"
          onClick={() => {
            remember();
            update({ ...state, closed: true, mode: "adjust" });
          }}
        >
          <Check size={15} />
          Close loop to station
        </button>
      )}
      <p className="mp-map-feedback" role="status">
        {validating
          ? "Checking the route…"
          : error || `${state.points.length} turns · Ready to build`}
      </p>
      <button
        className="mp-primary full"
        disabled={busy || validating || !!error || !plan}
        onClick={async () => {
          if (!plan) return;
          setBusy(true);
          try {
            committed.current = true;
            await onApply(plan);
            localStorage.removeItem(draftKey);
          } catch (e) {
            committed.current = false;
            setProblem(
              e instanceof Error ? e.message : "This track cannot be built.",
            );
            setBusy(false);
          }
        }}
      >
        {building ? "Save track" : `Build coaster · ${money(120000)}`}
        <Check size={16} />
      </button>
      <p className="mp-fine">
        {building
          ? "Track editing is free."
          : "Pay when built. Track length and appearance are included."}{" "}
        Space-drag or middle-drag to pan. Scroll to zoom. Two fingers pan and
        zoom.
      </p>
    </section>
  );
}
