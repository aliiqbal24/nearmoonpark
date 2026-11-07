"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Handshake,
  ShieldCheck,
  Timer,
  Coins,
  Rocket,
} from "lucide-react";
import {
  blueprint,
  footprint,
  money,
  clock,
  partnershipGoal,
  type Run,
  type Partnership,
  type Command,
} from "@/lib/moon/model";
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
      const u = Math.min(1, (t - start) / 550),
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
      { amount: number; building: number; big: boolean; label: string }
    >();
    for (const t of fresh) {
      if (t.to !== "Park" || t.amount <= 0) continue;
      const big = t.good === "partnership reward";
      const building = t.from.startsWith("business:")
        ? Number(t.from.split(":")[1])
        : t.from.startsWith("guest:")
          ? (r.guests[Number(t.from.split(":")[1])]?.target ?? 0)
          : 0;
      const key = big ? "partnership" : `${building}:${t.good}`;
      const deal = big
        ? r.partnerships.find(
            (p) => p.status === "completed" && p.settled_at === t.tick,
          )
        : null;
      const label = big
        ? `${deal?.owner ?? "Your partner"} delivered!`
        : t.good === "revenue share"
          ? "Your revenue share"
          : t.good === "resale"
            ? "Ride sold"
            : "Tickets sold";
      const old = groups.get(key);
      if (old) old.amount += t.amount;
      else groups.set(key, { amount: t.amount, building, big, label });
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
        big: g.big && !reduced,
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
    const reward = additions.some((b) => b.label.includes("delivered"));
    if (reward || performance.now() - lastSound.current > 650) {
      audio.current?.effect(reward ? "reward" : "cash");
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
        ? `${flight < 12 ? "8 new explorers" : "Return shuttle"} · ${waiting} homebound`
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
export function nextPartnership(run: Run) {
  if (run.tick < 25 && !run.partnerships.some((p) => p.status === "active"))
    return undefined;
  return (
    run.partnerships.find((p) => p.status === "active") ??
    run.partnerships.find(
      (p) =>
        p.status === "offered" &&
        p.available_at <= run.tick &&
        run.tick <= 495 &&
        run.buildings.some((b) => b.kind === p.kind && !b.sold),
    )
  );
}
const requests: Record<string, string> = {
  food: "A busy park needs a proper lunch. Back my kitchen and I’ll keep our explorers fed.",
  drink:
    "Happy riders are thirsty riders. Help me build a business that can keep up.",
  depot: "Your mass driver deserves a pit crew. Let’s keep this dream running.",
};
export function PartnershipCard({
  run,
  deal,
  near,
  pending,
  action,
  onDetails,
  compact = false,
  receipt,
}: {
  run: Run;
  deal: Partnership;
  near: boolean;
  pending: number;
  action: (c: Command) => void;
  onDetails?: () => void;
  compact?: boolean;
  receipt?: { reservation?: string; payment?: string };
}) {
  const b = run.buildings.find((b) => b.kind === deal.kind && !b.sold),
    active = deal.status === "active",
    done = deal.status === "completed",
    expired = deal.status === "expired",
    locked = run.tick < deal.available_at || !b || run.tick > 495;
  return (
    <article
      className={`mp-partnership ${compact ? "compact" : ""} merchant-${deal.kind}`}
      data-testid={`partnership-${deal.id}`}
    >
      <div className="mp-partner-heading">
        <span className="mp-owner-portrait">
          {deal.owner[0]}
          <i>✦</i>
        </span>
        <div>
          <small>
            {active
              ? "YOUR PARTNER"
              : done
                ? "A PROMISE KEPT"
                : expired
                  ? "NEXT TIME, A NEW PLAN"
                  : "A MESSAGE FROM YOUR NEIGHBOUR"}
          </small>
          <strong>
            {deal.owner}
            <em>{blueprint(deal.kind).name}</em>
          </strong>
        </div>
        {near ? <ShieldCheck size={17} /> : <Handshake size={18} />}
      </div>
      {!compact && <h3>{deal.title}</h3>}
      <p>
        {active
          ? `We’re working on ${partnershipGoal(deal)}. Your investment is buying real stock and keeping the business open.`
          : done
            ? `We did it. The Tourism Board paid ${money(deal.reward)} credits into your park.`
            : expired
              ? "The target wasn’t met in time. My business keeps its working capital; the unused grant returned to the Board."
              : requests[deal.kind]}
      </p>
      {active ? (
        <>
          <div className="mp-contract-progress">
            <span>
              {deal.progress}/{deal.target}{" "}
              {deal.kind === "depot" ? "repairs" : "sales"}
            </span>
            <span>
              <Timer size={12} />
              {clock(deal.deadline - run.tick)}
            </span>
          </div>
          <progress value={deal.progress} max={deal.target} />
          <div className="mp-contract-reward">
            <Coins size={14} />
            {money(deal.reward)} credits reserved
            {near ? " on NEAR" : " in practice"}
            {pending > 0 && near ? " · saving…" : ""}
          </div>
        </>
      ) : done ? (
        <div className="mp-contract-reward">
          <Check size={16} />
          Paid +{money(deal.reward)}
        </div>
      ) : !expired ? (
        <>
          <div className="mp-deal-terms">
            <span>
              Invest <b>{money(deal.investment)}</b>
            </span>
            <ArrowUpRight size={15} />
            <span>
              Earn <b>{money(deal.reward)}</b>
            </span>
          </div>
          <small className="mp-deal-goal">
            {partnershipGoal(deal)} in{" "}
            {clock(Math.min(deal.duration, 540 - run.tick))}. Investment stays
            with the merchant if time runs out.
          </small>
          <button
            className="mp-primary"
            disabled={
              locked ||
              run.cash < deal.investment ||
              run.partnerships.some((p) => p.status === "active")
            }
            onClick={() =>
              b && action({ kind: "partner", value: deal.id, building: b.id })
            }
            aria-label={`Partner with ${deal.owner}`}
          >
            <Handshake size={15} />
            {!b
              ? `Build ${blueprint(deal.kind).name} first`
              : run.tick < deal.available_at
                ? `Offer opens in ${clock(deal.available_at - run.tick)}`
                : `Back ${deal.owner} · ${money(deal.investment)}`}
          </button>
        </>
      ) : null}
      {onDetails && (
        <button className="mp-contract-details" onClick={onDetails}>
          All partnerships <ArrowUpRight size={12} />
        </button>
      )}
      {near && receipt && (receipt.payment || receipt.reservation) && (
        <a
          className="mp-settlement-link"
          href={`https://testnet.nearblocks.io/txns/${receipt.payment ?? receipt.reservation}`}
          target="_blank"
          rel="noreferrer"
        >
          <ShieldCheck size={12} />
          {receipt.payment
            ? "View NEAR payout receipt"
            : "View signed NEAR agreement"}
          <ArrowUpRight size={12} />
        </a>
      )}
    </article>
  );
}
export function PartnershipDesk({
  state,
  action,
}: {
  state: Snapshot;
  action: (c: Command) => void;
}) {
  return (
    <>
      <p className="mp-subtle">
        Three small businesses. Real working capital. Keep a promise together
        and the Lunar Tourism Board pays the reserved grant automatically.
      </p>
      <div className="mp-partnership-grid">
        {state.run.partnerships.map((p) => (
          <PartnershipCard
            key={p.id}
            run={state.run}
            deal={p}
            near={state.mode === "near"}
            pending={state.pending}
            action={action}
            receipt={state.receipts?.[p.id]}
          />
        ))}
      </div>
      <div className="mp-funding-note">
        <ShieldCheck size={18} />
        <p>
          {state.mode === "near"
            ? "Your signed NEAR transaction reserves the grant. The contract checks sales or repairs and releases each reward once."
            : "Local practice uses the same partnership rules. Choose Play on NEAR for signed agreements and onchain settlement."}
          <small>
            Tourism fund: {money(state.run.grant_cash)} available ·{" "}
            {money(state.run.grant_escrow)} reserved. These are virtual game
            credits, with no cash redemption.
          </small>
        </p>
      </div>
    </>
  );
}
