"use client";
import { useEffect, useRef, useState } from "react";
import { Coins, Rocket } from "lucide-react";
import { footprint, money, type Run } from "@/lib/moon/model";
import type { Snapshot } from "@/lib/moon/session";
import type { MoonWorld } from "@/lib/moon/world";
import type { MoonAudio } from "@/lib/moon/audio";

export function CashNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value),
    current = useRef(value);
  useEffect(() => {
    const from = current.current,
      start = performance.now();
    let frame = 0;
    const step = (t: number) => {
      const u = Math.max(0, Math.min(1, (t - start) / 550)),
        v = from + (value - from) * (1 - (1 - u) ** 3);
      current.current = v;
      setDisplay(Math.round(v));
      if (u < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return (
    <span className={display < value ? "mp-cash-credit" : ""}>
      {money(display)}
    </span>
  );
}
type Burst = {
  id: number;
  amount: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  label: string;
  big: boolean;
  group: string;
  created: number;
};
export function MoneyFeedback({
  state,
  worldRef,
  audio,
}: {
  state: Snapshot | null;
  worldRef: React.RefObject<MoonWorld | null>;
  audio: React.RefObject<MoonAudio | null>;
}) {
  const [bursts, setBursts] = useState<Burst[]>([]),
    seen = useRef({ identity: "", count: 0 }),
    serial = useRef(0),
    lastSound = useRef(0);
  useEffect(() => {
    if (!state) return;
    const r = state.run,
      identity = state.record
        ? `${state.record.owner}:${state.record.run_id}`
        : String(state.deadline);
    if (seen.current.identity !== identity) {
      seen.current = { identity, count: r.trade_count };
      return;
    }
    const floor = r.trade_count - r.trades.length,
      fresh = r.trades.filter((_, i) => floor + i + 1 > seen.current.count);
    seen.current.count = Math.max(seen.current.count, r.trade_count);
    const groups = new Map<
      string,
      { amount: number; building: number; label: string }
    >();
    for (const t of fresh) {
      if (t.to !== "Park" || t.amount <= 0) continue;
      const building = t.from.startsWith("business:")
        ? Number(t.from.split(":")[1])
        : t.from.startsWith("guest:")
          ? (r.guests[Number(t.from.split(":")[1])]?.target ?? 0)
          : 0;
      const key = `${building}:${t.good}`;
      const label =
        t.good === "revenue share"
          ? "Your revenue share"
          : t.good === "resale"
            ? "Ride sold"
            : "Tickets sold";
      const old = groups.get(key);
      if (old) old.amount += t.amount;
      else groups.set(key, { amount: t.amount, building, label });
    }
    if (!groups.size) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hud = document.querySelector(".mp-cash")?.getBoundingClientRect();
    const additions = [...groups.values()].slice(0, 3).map((g) => {
      const b = r.buildings.find((b) => b.id === g.building),
        f = b ? footprint(b) : null;
      const origin =
        b && f
          ? worldRef.current?.project(b.x + f.w / 2 - 0.5, b.z + f.h / 2 - 0.5)
          : null;
      const x = origin?.x ?? innerWidth / 2,
        y = Math.min(
          innerHeight - 180,
          Math.max(150, (origin?.y ?? innerHeight * 0.35) - 40),
        );
      return {
        ...g,
        id: ++serial.current,
        x,
        y,
        dx: (hud ? hud.left + hud.width * 0.6 : innerWidth * 0.3) - x,
        dy: (hud ? hud.top + hud.height * 0.55 : 50) - y,
        big: !reduced && g.amount >= 3000,
        group: `${g.building}:${g.label}`,
        created: performance.now(),
      };
    });
    setBursts((old) => {
      const next = [...old];
      for (const addition of additions) {
        const i = next.findIndex(
          (b) =>
            b.group === addition.group && addition.created - b.created < 700,
        );
        if (i >= 0)
          next[i] = { ...next[i], amount: next[i].amount + addition.amount };
        else next.push(addition);
      }
      return next.slice(-8);
    });
    if (performance.now() - lastSound.current > 650) {
      audio.current?.effect("cash");
      lastSound.current = performance.now();
    }
  }, [state, worldRef, audio]);
  useEffect(() => {
    if (!bursts.length) return;
    const timer = setTimeout(() => setBursts((old) => old.slice(1)), 1900);
    return () => clearTimeout(timer);
  }, [bursts]);
  return (
    <div className="mp-income-effects" aria-hidden="true">
      {bursts.map((b) => (
        <div
          key={b.id}
          className={`mp-income ${b.big ? "jackpot" : ""}`}
          style={
            {
              left: b.x,
              top: b.y,
              "--coin-x": `${b.dx}px`,
              "--coin-y": `${b.dy}px`,
            } as React.CSSProperties
          }
        >
          <span className="mp-income-words">
            <small>{b.label}</small>
            <strong>
              +{money(b.amount)}
              <Coins size={16} />
            </strong>
          </span>
          {[0, 1, 2].map((n) => (
            <i key={n} style={{ animationDelay: `${n * 90}ms` }}>
              ¢
            </i>
          ))}
        </div>
      ))}
    </div>
  );
}
export function ShuttleStatus({ run }: { run: Run }) {
  const phase = run.tick % 40,
    flight = Math.floor(run.tick / 40),
    waiting = run.guests.filter((g) => g.status === "boarding").length;
  const text = run.finished
    ? "Evening shuttles · opening day complete"
    : phase < 10
      ? `Shuttle inbound · docking in ${10 - phase}s`
      : phase < 30
        ? `${flight < 12 ? `${run.bookings?.[flight] ?? 8} new explorers` : "Return shuttle"} · ${waiting} homebound`
        : phase < 38
          ? `Shuttle departing · ${run.departures[flight] ?? 0} aboard`
          : `Next shuttle in ${40 - phase}s`;
  return (
    <span
      className={`mp-shuttle-status phase-${phase < 10 ? "inbound" : phase < 30 ? "docked" : "outbound"}`}
    >
      <Rocket size={14} />
      {text}
    </span>
  );
}
