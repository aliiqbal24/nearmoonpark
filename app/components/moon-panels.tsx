"use client";
import { useEffect, useRef, useState } from "react";
import {
  X,
  Link2,
  Play,
  Pause,
  ArrowUpRight,
  Coins,
  Users,
  Package,
  Heart,
  Zap,
  Trophy,
  ExternalLink,
  Ticket,
  ShieldCheck,
} from "lucide-react";
import {
  blueprint,
  isRide,
  isTenant,
  money,
  clock,
  guestName,
  connectionCost,
  GOLD_SCORE,
  resaleValue,
  type Run,
  type Building,
  type Guest,
  type Command,
  type Entry,
} from "@/lib/moon/model";
import type { Snapshot } from "@/lib/moon/session";

export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = ref.current;
    el?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && el) {
        const controls = [
          ...el.querySelectorAll<HTMLElement>(
            'button:not([disabled]),a[href],input,select,[tabindex="0"]',
          ),
        ];
        const first = controls[0],
          last = controls.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="mp-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="mp-dialog"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header>
          <span className="mp-eyebrow">MOONPARK / FLIGHT DESK</span>
          <button onClick={onClose} aria-label="Close panel">
            <X size={19} />
          </button>
        </header>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Inspector({
  run,
  building,
  guest,
  action,
  onClose,
  onRide,
}: {
  run: Run;
  building?: Building;
  guest?: Guest;
  action: (c: Command) => void;
  onClose: () => void;
  onRide: (id: number) => void;
}) {
  const actionRef = useRef(action);
  useEffect(() => {
    actionRef.current = action;
  }, [action]);
  const price = building?.price ?? 0,
    rent = building?.rent ?? 0,
    id = building?.id,
    kind = building?.kind;
  const [priceEdit, setPriceDraft] = useState({ base: price, value: price }),
    [rentEdit, setRentDraft] = useState({ base: rent, value: rent });
  const priceDraft = priceEdit.base === price ? priceEdit.value : price,
    rentDraft = rentEdit.base === rent ? rentEdit.value : rent;
  useEffect(() => {
    if (id === undefined || !kind || priceDraft === price || !isRide(kind))
      return;
    const timer = setTimeout(
      () =>
        actionRef.current({
          kind: "price",
          building: id,
          value: priceDraft,
        }),
      250,
    );
    return () => clearTimeout(timer);
  }, [id, price, kind, priceDraft]);
  useEffect(() => {
    if (id === undefined || !kind || rentDraft === rent || !isTenant(kind))
      return;
    const timer = setTimeout(
      () =>
        actionRef.current({
          kind: "rent",
          building: id,
          value: rentDraft,
        }),
      250,
    );
    return () => clearTimeout(timer);
  }, [id, rent, kind, rentDraft]);
  if (guest)
    return (
      <aside className="mp-inspector">
        <div className="mp-inspector-top">
          <span className="mp-eyebrow">YOUR VISITORS</span>
          <button onClick={onClose} aria-label="Close inspector">
            <X size={17} />
          </button>
        </div>
        <div className={`mp-avatar group-${guest.group}`}>◉</div>
        <h2>{guestName(guest.id)}</h2>
        <p className="mp-subtle">
          {["Family explorer", "Colony worker", "Thrill seeker"][guest.group]} ·
          Rocket {Math.floor(guest.id / 16) + 1}
        </p>
        <blockquote>“{guest.thought}”</blockquote>
        <div className="mp-stats">
          <span>
            <Coins size={16} /> {money(guest.cash)} credits
          </span>
          <span>
            <Heart size={16} /> {guest.satisfaction}% happy
          </span>
          <span>
            <Ticket size={16} /> {guest.visits} rides taken
          </span>
        </div>
        <div className="mp-meter-label">
          Thirst <span>{guest.thirst}%</span>
        </div>
        <progress max="100" value={guest.thirst} />
        <div className="mp-meter-label">
          Hunger <span>{guest.hunger}%</span>
        </div>
        <progress max="100" value={guest.hunger} />
        <p className="mp-fine">
          Their budget, needs and preferences decide where they go next.
        </p>
      </aside>
    );
  if (!building) return null;
  const b = building,
    a = blueprint(b.kind),
    ride = isRide(b.kind),
    tenant = isTenant(b.kind),
    disabled = run.finished;
  const seats = a.seats + Math.floor((a.seats * b.level) / 2),
    duration = b.kind === "coaster" ? [36, 30, 24][b.launch - 1] : a.cycle;
  const connectCost = connectionCost(run, b);
  const status =
    b.ready_at > run.tick
      ? `Opening in ${b.ready_at - run.tick}s`
      : !b.connected
        ? "Needs a path"
        : b.insolvent
          ? "Closed · needs working capital"
          : !b.enabled
            ? "Closed by owner"
            : !b.powered
              ? b.condition <= 0
                ? "Needs maintenance"
                : "Needs more power"
              : "Open for business";
  return (
    <aside className="mp-inspector" data-testid="building-inspector">
      <div className="mp-inspector-top">
        <span className="mp-eyebrow">
          {tenant ? "INDEPENDENT BUSINESS" : "YOUR ATTRACTION"}
        </span>
        <button onClick={onClose} aria-label="Close inspector">
          <X size={17} />
        </button>
      </div>
      <div className="mp-building-icon" style={{ color: a.color }}>
        {b.kind === "coaster"
          ? "↗"
          : b.kind === "wheel"
            ? "◉"
            : b.kind === "solar"
              ? "☀"
              : b.kind === "food"
                ? "◒"
                : "✦"}
      </div>
      <h2>{a.name}</h2>
      <span className={`mp-status ${b.powered ? "open" : ""}`}>{status}</span>
      <p className="mp-subtle">{a.description}</p>
      {!b.connected && (
        <button
          className="mp-primary full"
          disabled={
            disabled || connectCost === null || run.cash < (connectCost ?? 0)
          }
          onClick={() => action({ kind: "connect", building: b.id })}
        >
          <Link2 size={16} /> Connect entrance ·{" "}
          {connectCost === null ? "blocked" : money(connectCost)} credits
        </button>
      )}
      <div className="mp-stats">
        <span>
          <Users size={16} /> {b.queue.length} waiting
        </span>
        <span>
          <Ticket size={16} /> {b.served} served
        </span>
        {ride && (
          <span>
            <Users size={16} />
            {seats} seats · {duration}s cycle
          </span>
        )}
        <span>
          <Coins size={16} /> {money(b.revenue)} sales
        </span>
        {tenant && (
          <>
            <span>
              <Coins size={16} /> {money(b.cash)} business cash
            </span>
            <span>
              <Package size={16} /> {b.stock} in stock
            </span>
          </>
        )}
      </div>
      {ride && (
        <>
          <label className="mp-control-label" htmlFor="ticket-price">
            Ticket price <strong>{money(priceDraft)} credits</strong>
          </label>
          <input
            id="ticket-price"
            aria-label="Ticket price"
            type="range"
            min="100"
            max="2000"
            step="100"
            value={priceDraft}
            disabled={disabled}
            onChange={(e) =>
              setPriceDraft({ base: price, value: Number(e.target.value) })
            }
            onPointerUp={() => {
              if (priceDraft !== b.price)
                action({ kind: "price", building: b.id, value: priceDraft });
            }}
            onBlur={() => {
              if (priceDraft !== b.price)
                action({ kind: "price", building: b.id, value: priceDraft });
            }}
          />
          <p className="mp-fine">
            Higher prices earn more per ticket. Visitors compare value, queues
            and their remaining budget.
          </p>
          {b.kind === "coaster" && (
            <>
              <p className="mp-control-label">Launch setting</p>
              <div className="mp-segment">
                {["Gentle", "Standard", "Boosted"].map((n, i) => (
                  <button
                    key={n}
                    aria-pressed={b.launch === i + 1}
                    disabled={disabled}
                    onClick={() =>
                      action({ kind: "launch", building: b.id, value: i + 1 })
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="mp-fine">
                More launch power means more thrills, wear and power use.
                Families prefer a gentler ride.
              </p>
              <button
                className="mp-secondary full"
                onClick={() => onRide(b.id)}
              >
                <Play size={16} /> Ride the mass driver
              </button>
            </>
          )}
          <div className="mp-meter-label">
            Condition <span>{b.condition}%</span>
          </div>
          <progress
            className={b.condition < 40 ? "warning" : ""}
            max="100"
            value={b.condition}
          />
          <button
            className="mp-secondary full"
            disabled={disabled || b.level > 0 || run.cash < a.cost / 2}
            onClick={() => action({ kind: "upgrade", building: b.id })}
          >
            <ArrowUpRight size={16} />
            {b.level
              ? "Capacity upgraded"
              : `+50% seats · ${money(a.cost / 2)}`}
          </button>
        </>
      )}
      {tenant && (
        <>
          <blockquote>“{b.reason}”</blockquote>
          {b.delivery_qty > 0 && (
            <p className="mp-delivery">
              <Package size={16} /> {b.delivery_qty} units arrive in{" "}
              {Math.max(0, b.delivery_at - run.tick)}s
            </p>
          )}
          {b.kind !== "depot" && (
            <>
              <label className="mp-control-label" htmlFor="revenue-share">
                Your revenue share <strong>{rentDraft}%</strong>
              </label>
              <input
                id="revenue-share"
                aria-label="Revenue share"
                type="range"
                min="0"
                max="30"
                step="5"
                value={rentDraft}
                disabled={disabled}
                onChange={(e) =>
                  setRentDraft({ base: rent, value: Number(e.target.value) })
                }
                onPointerUp={() => {
                  if (rentDraft !== b.rent)
                    action({ kind: "rent", building: b.id, value: rentDraft });
                }}
                onBlur={() => {
                  if (rentDraft !== b.rent)
                    action({ kind: "rent", building: b.id, value: rentDraft });
                }}
              />
              <p className="mp-fine">
                The owner sets prices and buys stock. A larger share leaves less
                cash to restock.
              </p>
            </>
          )}
          <button
            className="mp-secondary full"
            disabled={disabled || run.cash < 10000}
            onClick={() =>
              action({ kind: "invest", building: b.id, value: 10000 })
            }
          >
            <Coins size={16} /> Invest 100 credits
          </button>
        </>
      )}
      {!disabled && (
        <div className="mp-inspector-bottom">
          <button onClick={() => action({ kind: "toggle", building: b.id })}>
            {b.enabled ? <Pause size={14} /> : <Play size={14} />}{" "}
            {b.enabled ? "Close" : "Open"}
          </button>
          <button
            disabled={!!b.riders.length}
            onClick={() => action({ kind: "sell", building: b.id })}
          >
            Sell · {money(resaleValue(b))}
          </button>
        </div>
      )}
    </aside>
  );
}

export function Leaderboard({
  entries,
  prizeEntries,
  open,
  configured,
  player,
  onSignIn,
  onRanked,
  onSaveName,
  onSignOut,
}: {
  entries: Entry[];
  prizeEntries: Entry[];
  open: boolean;
  configured: boolean;
  player: { display_name: string } | null;
  onSignIn: () => void;
  onRanked: () => void;
  onSaveName: (name: string) => void;
  onSignOut: () => void;
}) {
  const [name, setName] = useState(player?.display_name ?? "");
  return (
    <>
      <p className="mp-subtle">
        One opening day. One best score per player. Every listed score is
        calculated by the NEAR contract.
      </p>
      <div className="mp-leaders">
        {Array.from({ length: 5 }, (_, i) => {
          const e = entries[i];
          return (
            <div className="mp-leader" key={i}>
              <span className="mp-rank">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <strong>{e?.display_name || "Your name could be here"}</strong>
                <small>
                  {e
                    ? "Verified on NEAR"
                    : "Waiting for a verified opening day"}
                </small>
              </div>
              <b>{e ? e.score.total.toLocaleString() : "—"}</b>
            </div>
          );
        })}
      </div>
      {player ? (
        <div className="mp-callout">
          <ShieldCheck size={20} />
          <div>
            Signed in as <strong>{player.display_name}</strong>
            <p>
              {open
                ? "Your best ranked run can enter the top five."
                : "The prize challenge opens after gameplay playtesting. The conditional pledge is already public."}
            </p>
          </div>
          {open && (
            <button className="mp-primary" onClick={onRanked}>
              Play ranked
            </button>
          )}
        </div>
      ) : (
        <div className="mp-callout">
          <div>
            <strong>Sign in to compete</strong>
            <p>
              {configured
                ? "Bring your Google account. We take care of the NEAR account and gas."
                : "Google sign-in is awaiting configuration. Practice and NEAR playtesting are available."}
            </p>
          </div>
          <button
            className="mp-primary"
            disabled={!configured}
            onClick={onSignIn}
          >
            Continue with Google
          </button>
        </div>
      )}
      {player && (
        <form
          className="mp-player-name"
          onSubmit={(e) => {
            e.preventDefault();
            onSaveName(name);
          }}
        >
          <label htmlFor="moon-player-name">Your public player name</label>
          <div>
            <input
              id="moon-player-name"
              value={name}
              maxLength={24}
              onChange={(e) => setName(e.target.value)}
              autoComplete="nickname"
            />
            <button
              disabled={!name.trim() || name === player.display_name}
              type="submit"
            >
              Save name
            </button>
            <button type="button" onClick={onSignOut}>
              Sign out
            </button>
          </div>
          <small>
            Your email stays private. Name changes apply to future ranked runs.
          </small>
        </form>
      )}
      <div className="mp-prize">
        <span className="mp-eyebrow">
          THE MOONPARK PROMISE / CONDITIONAL GIVEAWAY
        </span>
        <h3>If we win, you win.</h3>
        <p>
          If Moonpark wins first place in the Games track, the top four eligible
          players share US$1,000. If it wins the overall grand prize, they share
          US$5,000 instead.
        </p>
        <div className="mp-prize-grid">
          {[400, 300, 200, 100].map((n, i) => (
            <div key={n}>
              <small>#{i + 1}</small>
              <strong>${n}</strong>
              <span>${n * 5} for grand prize</span>
            </div>
          ))}
        </div>
        <p className="mp-fine">
          The larger pool replaces the smaller. Conditional, not funded or
          escrowed. No qualifying win means no payout. The creator will verify
          winners and send prizes manually. No entry fee. One prize per eligible
          person; automated and duplicate-person entries are ineligible.
        </p>
        <p className="mp-fine">
          Prize scores close November 18, 2026 · 23:59 UTC. The live leaderboard
          continues afterward. Gameplay rules freeze before the public prize
          challenge opens.
        </p>
        {prizeEntries.length > 0 && (
          <p className="mp-fine">
            Prize-eligible standings:{" "}
            {prizeEntries.map((e) => e.display_name).join(", ")}.
          </p>
        )}
      </div>
    </>
  );
}

export function ScoreBreakdown({ run }: { run: Run }) {
  return (
    <div className="mp-score-breakdown">
      {[
        ["Happy visitors", run.score.guests, 6000],
        ["Sustainable profit", run.score.finance, 2500],
        ["New ride experiences", run.score.variety, 1500],
      ].map(([name, value, max]) => (
        <div key={String(name)}>
          <label>
            {name}
            <strong>
              {Number(value).toLocaleString()} / {Number(max).toLocaleString()}
            </strong>
          </label>
          <progress max={Number(max)} value={Number(value)} />
        </div>
      ))}
      <p className="mp-fine">
        Profit measures cash plus the resale value of owned assets, adjusted for
        ride condition, compared with opening equity. Full finance credit
        requires a gain of 1,500 credits.
      </p>
    </div>
  );
}
export function Results({
  state,
  onReplay,
  onExplore,
  onLeaders,
  onExport,
}: {
  state: Snapshot;
  onReplay: () => void;
  onExplore: () => void;
  onLeaders: () => void;
  onExport: () => void;
}) {
  const r = state.run,
    badge =
      r.score.total >= GOLD_SCORE
        ? "GOLD"
        : r.score.total >= 5500
          ? "SILVER"
          : r.score.total >= 3500
            ? "BRONZE"
            : "FIRST FLIGHT",
    verified =
      state.mode === "near" &&
      state.record?.run.finished &&
      state.pending === 0;
  return (
    <div className="mp-results">
      <span className="mp-eyebrow">
        LAST ROCKET HOME / OPENING DAY COMPLETE
      </span>
      <div className="mp-medal">
        <Trophy size={34} />
      </div>
      <h1>A little closer to the stars.</h1>
      <div className="mp-final-score">
        {r.score.total.toLocaleString()}
        <small>{badge} OPENING DAY</small>
      </div>
      <p>
        {r.score.happy} delighted visitors. {r.trade_count} market transfers.
        <br />A whole new reason to visit the Moon.
      </p>
      <ScoreBreakdown run={r} />
      <div className="mp-verification">
        {verified ? (
          <>
            <ShieldCheck size={16} />{" "}
            {state.record?.ranked
              ? "Ranked score verified on NEAR"
              : "NEAR playtest verified · not prize eligible"}
          </>
        ) : state.mode === "near" ? (
          <>
            <Zap size={16} /> Confirming your result on NEAR…
          </>
        ) : (
          <>LOCAL PRACTICE · not a ranked score</>
        )}
      </div>
      {state.notice && <p className="mp-fine">{state.notice}</p>}
      <div className="mp-result-actions">
        <button
          className="mp-primary"
          onClick={onReplay}
          disabled={
            state.mode === "near" &&
            (!state.record?.run.finished || state.pending > 0)
          }
        >
          Build a better opening day <ArrowUpRight size={16} />
        </button>
        <button onClick={onExplore}>Look around your park</button>
        <button onClick={onLeaders}>Top five</button>
        <button onClick={onExport}>Export run</button>
      </div>
    </div>
  );
}

export function Ledger({
  run,
  txs,
  contractId,
}: {
  run: Run;
  txs: string[];
  contractId?: string;
}) {
  const actor = (s: string) =>
    s.startsWith("guest:")
      ? guestName(Number(s.split(":")[1]))
      : s.startsWith("business:")
        ? blueprint(
            run.buildings.find((b) => b.id === Number(s.split(":")[1]))?.kind ||
              "food",
          ).name
        : s;
  return (
    <>
      <p className="mp-subtle">
        Visitors spend finite budgets. Businesses pay for stock, maintenance and
        rent. These are actual simulation transfers, in lunar credits.
      </p>
      <div className="mp-ledger">
        {run.trades
          .slice(-22)
          .reverse()
          .map((t, i) => (
            <div key={i}>
              <small>{clock(t.tick)}</small>
              <span>
                <strong>{actor(t.from)}</strong> → {actor(t.to)}
                <em>
                  {t.good} · {t.qty} unit{t.qty === 1 ? "" : "s"}
                </em>
              </span>
              <b>{money(t.amount)}</b>
            </div>
          ))}
      </div>
      {contractId && (
        <a
          target="_blank"
          rel="noreferrer"
          href={`https://testnet.nearblocks.io/address/${contractId}`}
        >
          Inspect the NEAR contract <ExternalLink size={13} />
        </a>
      )}
      {txs
        .slice(-3)
        .reverse()
        .map((tx) => (
          <a
            className="mp-tx"
            key={tx}
            href={`https://testnet.nearblocks.io/txns/${tx}`}
            target="_blank"
            rel="noreferrer"
          >
            Confirmed transaction {tx.slice(0, 12)}… <ExternalLink size={12} />
          </a>
        ))}
      <p className="mp-fine">
        NPC treasuries are contract-managed balances. Lunar credits are game
        currency. Gas uses sponsored testnet NEAR.
      </p>
    </>
  );
}
