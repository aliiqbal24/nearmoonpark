"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Check, Home, Pause, Play } from "lucide-react";
import { NearMark } from "@/app/components/near-economy";
import { blueprint, type Detail, type Run } from "@/lib/moon/model";
import type { MoonWorld } from "@/lib/moon/world";
import "./preview.css";

export default function CameraPreview() {
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<MoonWorld | null>(null);
  const [scenes, setScenes] = useState<{
    opening: Run;
    established: Run;
  } | null>(null);
  const ready = scenes !== null;
  const [error, setError] = useState("");
  const [projection, setProjection] = useState<"isometric" | "perspective">(
    "isometric",
  );
  const [layout, setLayout] = useState<"opening" | "established">(
    "established",
  );
  const [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState<Detail | null>(null);

  useEffect(() => {
    let cancelled = false;
    let instance: MoonWorld | undefined;
    void Promise.all([
      import("@/lib/moon/world"),
      import("@/lib/moon/engine"),
      import("@/lib/moon/dream"),
    ])
      .then(async ([{ MoonWorld }, { simulate }, { dreamPark }]) => {
        const initial = await simulate({ op: "new" });
        if (cancelled || !host.current) return;
        const loadedScenes = {
          opening: initial,
          established: dreamPark(initial),
        };
        instance = new MoonWorld(host.current, {
          preview: true,
          onPick: setSelected,
          onHover() {},
          onPlace() {},
          onReady() {},
        });
        world.current = instance;
        instance.setIsometric(true);
        instance.update(loadedScenes.established, 1, null, null, null, null);
        setScenes(loadedScenes);
      })
      .catch((reason: unknown) => {
        if (!cancelled)
          setError(
            reason instanceof Error
              ? reason.message
              : "The preview could not load.",
          );
      });
    return () => {
      cancelled = true;
      instance?.dispose();
      world.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    world.current?.setIsometric(projection === "isometric");
  }, [ready, projection]);

  useEffect(() => {
    if (!scenes) return;
    world.current?.update(
      scenes[layout],
      speed,
      null,
      selected?.kind === "building" ? selected.id : null,
      null,
      null,
    );
  }, [scenes, layout, speed, selected]);

  const building =
    selected?.kind === "building"
      ? scenes?.[layout].buildings.find((item) => item.id === selected.id)
      : null;
  return (
    <main
      className="camera-preview"
      data-projection={projection}
      data-ready={ready}
    >
      <div
        ref={host}
        className="camera-preview-world"
        aria-label="Interactive Moonpark camera preview"
      />
      <header className="camera-preview-header">
        <Link
          className="camera-preview-identity"
          href="/"
          aria-label="Moonpark home"
        >
          <NearMark />
          <span>
            MOONPARK<small>CAMERA PREVIEW</small>
          </span>
        </Link>
        <div
          className="camera-preview-projections"
          role="group"
          aria-label="Camera projection"
        >
          <button
            aria-pressed={projection === "isometric"}
            onClick={() => setProjection("isometric")}
          >
            {projection === "isometric" && <Check size={14} />} Isometric
          </button>
          <button
            aria-pressed={projection === "perspective"}
            onClick={() => setProjection("perspective")}
          >
            {projection === "perspective" && <Check size={14} />} Perspective
          </button>
        </div>
        <a
          className="camera-preview-live"
          href="https://nearmoonpark.vercel.app/"
        >
          Live game <ArrowUpRight size={15} />
        </a>
      </header>
      <aside className="camera-preview-scene">
        <label htmlFor="camera-preview-layout">Park layout</label>
        <select
          id="camera-preview-layout"
          value={layout}
          onChange={(event) => {
            setSelected(null);
            setLayout(event.target.value as "opening" | "established");
          }}
        >
          <option value="established">Established park</option>
          <option value="opening">Opening day</option>
        </select>
        <div
          className="camera-preview-time"
          role="group"
          aria-label="Preview animation speed"
        >
          <button
            aria-label={speed === 0 ? "Play animation" : "Pause animation"}
            onClick={() => setSpeed(speed === 0 ? 1 : 0)}
          >
            {speed === 0 ? <Play size={15} /> : <Pause size={15} />}
          </button>
          {[1, 2, 4].map((value) => (
            <button
              key={value}
              aria-pressed={speed === value}
              onClick={() => setSpeed(value)}
            >
              {value}×
            </button>
          ))}
        </div>
      </aside>
      {selected && (
        <aside className="camera-preview-selection" aria-live="polite">
          <span>{building ? "ATTRACTION" : "PARK VISITOR"}</span>
          <strong>
            {building
              ? building.design?.name || blueprint(building.kind).name
              : `Visitor ${selected.id + 1}`}
          </strong>
          <button
            onClick={() => setSelected(null)}
            aria-label="Clear selection"
          >
            ×
          </button>
        </aside>
      )}
      <footer className="camera-preview-footer">
        <div>
          <strong>
            {projection === "isometric" ? "Isometric view" : "Perspective view"}
          </strong>
          <p>
            Drag to pan · Scroll or pinch to zoom
            {projection === "perspective" ? " · Right-drag to orbit" : ""}
          </p>
        </div>
        <button
          onClick={() => world.current?.home()}
          aria-label="Reset preview camera"
        >
          <Home size={18} />
        </button>
      </footer>
      {!ready && (
        <div className="camera-preview-loading" role="status">
          {error || "Preparing the park…"}
        </div>
      )}
    </main>
  );
}
