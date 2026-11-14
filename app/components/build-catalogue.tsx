"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Coins, Route } from "lucide-react";
import {
  VERSION,
  CATALOG,
  money,
  type Kind,
  type Placement,
  type Run,
} from "@/lib/moon/model";

export function BuildCatalogue({
  run,
  placement,
  onDesign,
  onPath,
}: {
  run: Run;
  placement: Placement | null;
  onDesign: (kind: Kind) => void;
  onPath: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: true, right: false });
  const [tip, setTip] = useState<{
    text: string;
    x: number;
    y: number;
    id: string;
  } | null>(null);
  const stage = run.opening_stage ?? 3;
  const items =
    stage === 0
      ? CATALOG.filter((a) => a.kind === "coaster")
      : stage === 1
        ? CATALOG.filter((a) => a.kind === "food")
        : CATALOG;
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () =>
      setEdges({
        left: el.scrollLeft <= 2,
        right: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
      });
    const wheel = (e: WheelEvent) => {
      if (
        el.scrollWidth <= el.clientWidth ||
        Math.abs(e.deltaX) > Math.abs(e.deltaY)
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      const unit =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientWidth : 1;
      el.scrollLeft += e.deltaY * unit;
      setTip(null);
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    update();
    el.addEventListener("wheel", wheel, { passive: false });
    el.addEventListener("scroll", update, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("wheel", wheel);
      el.removeEventListener("scroll", update);
    };
  }, [stage]);
  const show = (el: HTMLElement, text: string, id: string) => {
    const box = el.getBoundingClientRect();
    setTip({
      text,
      id,
      x: Math.max(108, Math.min(innerWidth - 108, box.left + box.width / 2)),
      y: box.top - 8,
    });
  };
  return (
    <div className={`mp-catalogue-wrap ${stage < 2 ? "guided" : ""}`}>
      {stage >= 2 && (
        <button
          className="mp-catalogue-arrow"
          aria-label="Previous buildings"
          disabled={edges.left}
          onClick={() =>
            scroller.current?.scrollBy({ left: -350, behavior: "smooth" })
          }
        >
          <ChevronLeft size={20} />
        </button>
      )}
      <div
        ref={scroller}
        className="mp-build-dock"
        aria-label="Building catalogue"
      >
        {items.map((a) => (
          <button
            className={`mp-blueprint ${placement?.kind === a.kind ? "selected" : ""}`}
            key={a.kind}
            disabled={run.cash < a.cost}
            onClick={() => {
              setTip(null);
              onDesign(a.kind);
            }}
            aria-label={`Build ${a.name}`}
            aria-describedby={
              tip?.id === a.kind ? `catalogue-${a.kind}` : undefined
            }
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse")
                show(
                  e.currentTarget,
                  a.kind === "solar" && run.version !== VERSION
                    ? "Four extra units of clean power for this earlier park."
                    : a.description,
                  a.kind,
                );
            }}
            onPointerLeave={() => setTip(null)}
            onFocus={(e) => {
              e.currentTarget.scrollIntoView({
                block: "nearest",
                inline: "nearest",
              });
              show(
                e.currentTarget,
                a.kind === "solar" && run.version !== VERSION
                  ? "Four extra units of clean power for this earlier park."
                  : a.description,
                a.kind,
              );
            }}
            onBlur={() => setTip(null)}
          >
            <span className="mp-blueprint-art" style={{ color: a.color }}>
              <img src={`/art/${a.kind}-s0-v4.webp`} alt="" draggable={false} />
            </span>
            <strong>{a.name}</strong>
            <small>
              <Coins size={11} />
              {money(a.cost)}
            </small>
          </button>
        ))}
        {stage >= 2 && (
          <button
            className={`mp-blueprint ${placement?.kind === "path" ? "selected" : ""}`}
            onClick={onPath}
            aria-label="Build path"
            onPointerEnter={(e) => {
              if (e.pointerType === "mouse")
                show(
                  e.currentTarget,
                  "Connect entrances with lunar boardwalks. 2 credits per tile.",
                  "paths",
                );
            }}
            onPointerLeave={() => setTip(null)}
            onFocus={(e) =>
              show(
                e.currentTarget,
                "Connect entrances with lunar boardwalks. 2 credits per tile.",
                "paths",
              )
            }
            onBlur={() => setTip(null)}
          >
            <span className="mp-blueprint-art">
              <Route size={27} />
            </span>
            <strong>Paths</strong>
            <small>
              <Coins size={11} />2 / tile
            </small>
          </button>
        )}
      </div>
      {stage >= 2 && (
        <button
          className="mp-catalogue-arrow"
          aria-label="More buildings"
          disabled={edges.right}
          onClick={() =>
            scroller.current?.scrollBy({ left: 350, behavior: "smooth" })
          }
        >
          <ChevronRight size={20} />
        </button>
      )}
      {tip &&
        createPortal(
          <div
            id={`catalogue-${tip.id}`}
            className="mp-catalogue-tooltip"
            role="tooltip"
            style={{ left: tip.x, top: tip.y }}
          >
            {tip.text}
          </div>,
          document.body,
        )}
    </div>
  );
}
