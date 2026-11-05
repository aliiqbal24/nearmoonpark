"use client";
import { useEffect, useRef, useState } from "react";
import {
  Home,
  Minus,
  Plus,
  Move,
  UserRound,
  Package,
  MapPin,
  X,
} from "lucide-react";
import type { Run } from "@/lib/model";
import type { Detail } from "@/lib/world/colony";

type WorldApi = ReturnType<
  (typeof import("@/lib/world/colony"))["createColony"]
>;
export default function ColonyWorld({
  run,
  speed,
  selected,
  onSelect,
  focusToken,
}: {
  run: Run;
  speed: number;
  selected: number;
  onSelect: (i: number) => void;
  focusToken: number;
}) {
  const host = useRef<HTMLDivElement>(null),
    api = useRef<WorldApi | null>(null),
    runRef = useRef(run),
    speedRef = useRef(speed),
    selectRef = useRef(onSelect);
  runRef.current = run;
  speedRef.current = speed;
  selectRef.current = onSelect;
  const [hover, setHover] = useState<Detail | null>(null),
    [pinned, setPinned] = useState<Detail | null>(null),
    [failed, setFailed] = useState(false),
    [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let instance: WorldApi | null = null;
    import("@/lib/world/colony").then(({ createColony }) => {
      if (cancelled || !host.current) return;
      try {
        instance = createColony(
          host.current,
          () => runRef.current,
          () => speedRef.current,
          setHover,
          (i) => {
            setPinned(null);
            selectRef.current(i);
          },
          (detail) => {
            setPinned(detail);
            selectRef.current(-1);
          },
        );
        api.current = instance;
        setLoaded(true);
      } catch (error) {
        console.error("Colony renderer:", error);
        setFailed(true);
      }
    });
    return () => {
      cancelled = true;
      instance?.dispose();
      api.current = null;
    };
  }, []);
  useEffect(() => {
    if (focusToken > 0 && selected >= 0) api.current?.focus(selected);
  }, [focusToken, selected, loaded]);
  const cohort =
    hover?.kind === "person" ? run.actors[5 + (hover.index % 3)] : null;
  return (
    <div
      className={`world-layer ${run.sol >= 19 && run.sol <= 21 ? "storm" : ""}`}
    >
      <div ref={host} className="world-canvas" data-testid="colony-world" />
      {!loaded && !failed && (
        <div className="world-loading">
          <i />
          Arriving at Ares…
        </div>
      )}
      {failed && (
        <div className="world-loading">
          The 3D colony needs WebGL 2. Enable hardware acceleration in your
          browser to explore the settlement.
        </div>
      )}
      {hover && (
        <div
          className={`world-tooltip ${hover.kind}`}
          style={{
            left: Math.min(
              hover.x + 18,
              Math.max(15, (host.current?.clientWidth || 800) - 270),
            ),
            top: Math.min(
              hover.y - 20,
              Math.max(100, (host.current?.clientHeight || 600) - 170),
            ),
          }}
        >
          <span className="tooltip-kind">
            {hover.kind === "person" ? (
              <UserRound size={12} />
            ) : hover.kind === "rover" ? (
              <Package size={12} />
            ) : (
              <MapPin size={12} />
            )}{" "}
            {hover.role}
          </span>
          <strong>{hover.name}</strong>
          {hover.kind === "building" && hover.index < 5 ? (
            <>
              <p>
                {run.actors[hover.index].shortfall > 0
                  ? "Power limited. Production is below its requested level."
                  : run.actors[hover.index].unpaid >= 2
                    ? "Payroll distress. Production has slowed."
                    : "Operating. Select to inspect supplies and maintenance."}
              </p>
              <div>
                <span>{run.actors[hover.index].condition}% condition</span>
                <span>{run.actors[hover.index].credits} cr</span>
              </div>
            </>
          ) : (
            <p>{hover.task}</p>
          )}
          {cohort && (
            <div>
              <span>{cohort.name}</span>
              <span>{cohort.credits} cr shared</span>
            </div>
          )}
        </div>
      )}
      {pinned && (
        <aside className="resident-card">
          <button
            className="close-small"
            aria-label="Close resident details"
            onClick={() => setPinned(null)}
          >
            <X size={15} />
          </button>
          <span className="tooltip-kind">
            {pinned.kind === "person" ? (
              <UserRound size={14} />
            ) : (
              <Package size={14} />
            )}{" "}
            {pinned.role}
          </span>
          <h3>{pinned.name}</h3>
          <p>{pinned.task}</p>
          {pinned.kind === "person" && (
            <small>
              Household group: {run.actors[5 + (pinned.index % 3)].name}
              <br />
              {run.actors[5 + (pinned.index % 3)].credits} shared credits
              available
            </small>
          )}
        </aside>
      )}
      <div className="camera-tools">
        <button onClick={() => api.current?.zoom(1.22)} aria-label="Zoom in">
          <Plus size={19} />
        </button>
        <button onClick={() => api.current?.zoom(0.82)} aria-label="Zoom out">
          <Minus size={19} />
        </button>
        <button
          onClick={() => api.current?.home()}
          aria-label="Return to colony overview"
        >
          <Home size={18} />
        </button>
      </div>
      <div className="world-hint">
        <Move size={13} />
        <span>Drag to explore · Scroll to zoom · Select to inspect</span>
      </div>
      <div className="compass" aria-hidden="true">
        <span>N</span>
        <i />
      </div>
    </div>
  );
}
