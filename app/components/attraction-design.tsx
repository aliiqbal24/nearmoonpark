"use client";
import { useState } from "react";
import { Palette } from "lucide-react";
import {
  defaultDesign,
  type Building,
  type Command,
  type Design,
} from "@/lib/moon/model";
import { PALETTES } from "@/lib/moon/parks";
export function PalettePicker({
  value,
  inherit = false,
  onChange,
  disabled = false,
}: {
  value: number;
  inherit?: boolean;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mp-palette-picker" role="group" aria-label="Color palette">
      {inherit && (
        <button
          type="button"
          disabled={disabled}
          className="mp-palette-inherit"
          aria-pressed={value === 255}
          onClick={() => onChange(255)}
          title="Use park colors"
        >
          Park
        </button>
      )}
      {PALETTES.map((p, i) => (
        <button
          type="button"
          key={p.name}
          disabled={disabled}
          title={p.name}
          aria-label={`${p.name} colors`}
          aria-pressed={value === i}
          onClick={() => onChange(i)}
          style={{
            background: `linear-gradient(135deg, ${p.primary} 50%, ${p.accent} 50%)`,
          }}
        />
      ))}
    </div>
  );
}
export function AttractionDesign({
  building,
  finished,
  cash,
  action,
}: {
  building: Building;
  finished: boolean;
  cash: number;
  action: (c: Command) => void;
}) {
  const design = building.design ?? defaultDesign();
  const [name, setName] = useState(design.name);
  const change = (patch: Partial<Design>) =>
    action({
      kind: "design",
      building: building.id,
      design: { ...design, ...patch },
    });
  return (
    <details className="mp-design-panel">
      <summary>
        <Palette size={17} /> Customize your attraction <span>FREE</span>
      </summary>
      <div className="mp-design-controls">
        <label>
          Attraction name
          <input
            aria-label="Attraction name"
            maxLength={28}
            placeholder="Give it a name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name !== design.name) change({ name: name.trim() });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
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
              <img src={`/art/${building.kind}-s${style}-v2.webp`} alt="" />
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
        {building.kind === "coaster" && (
          <>
            <label>Coaster height</label>
            <div className="mp-segments">
              {["Low", "Classic", "Skyline"].map((name, height) => (
                <button
                  key={name}
                  disabled={
                    finished ||
                    (height > (building.height_paid ?? 1) && cash < 20000)
                  }
                  aria-pressed={design.height === height}
                  onClick={() => change({ height })}
                >
                  {name}
                  {height === 2 && (building.height_paid ?? 1) < 2
                    ? " +200"
                    : ""}
                </button>
              ))}
            </div>
            <p className="mp-fine">
              Low arcs suit families. Skyline adds thrill and uses one extra
              power. Height construction is charged once.
            </p>
          </>
        )}
        <p className="mp-fine">
          Your changes appear in the park immediately. Colors, names and styles
          are free.
        </p>
      </div>
    </details>
  );
}
