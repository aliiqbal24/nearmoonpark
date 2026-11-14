"use client";
import { VendorWallets } from "./vendor-wallets";
import type { Config } from "@/lib/moon/near";
import { AttractionDesign } from "./attraction-design";
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
  coasterDuration,
  parkClosed,
  isPersistent,
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
  type PrizeStatus,
} from "@/lib/moon/model";
import type { Snapshot } from "@/lib/moon/session";
import { NearMark, testNear } from "./near-economy";

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
  onEditCoaster,
  readOnly = false,
  config,
}: {
  run: Run;
  building?: Building;
  guest?: Guest;
  action: (c: Command) => void;
  onClose: () => void;
  onRide: (id: number) => void;
  onEditCoaster?: (b: Building) => void;
  readOnly?: boolean;
  config?: Config | null;
}) {
  const actionRef = useRef(action);
  useEffect(() => {
    actionRef.current = action;
  }, [action]);
  const price = building?.price ?? 0,
    id = building?.id,
    kind = building?.kind;
  const [priceEdit, setPriceDraft] = useState({ base: price, value: price });
  const priceDraft = priceEdit.base === price ? priceEdit.value : price;
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
  if (guest)
    return (
      <aside className="mp-inspector">
        <div className="mp-inspector-top">
          <span className="mp-eyebrow">YOUR VISITORS</span>
          <button onClick={onClose} aria-label="Close inspector">
            <X size={17} />
          </button>
        </div>
        <div className={`mp-avatar group-${guest.group}`}>
          <img
            src={`/art/guest-${guest.group}-${guest.id % 6}-v3.webp`}
            alt=""
          />
        </div>
        <h2>{guestName(guest.id)}</h2>
        <p className="mp-subtle">
          {["Family explorer", "Colony worker", "Thrill seeker"][guest.group]} ·
          Rocket {Math.floor(guest.id / 8) + 1}
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
    disabled = parkClosed(run) || readOnly;
  const seats = a.seats + Math.floor((a.seats * b.level) / 2),
    duration = b.kind === "coaster" ? coasterDuration(b) : a.cycle;
  const connectCost = connectionCost(run, b);
  const status =
    b.ready_at > run.tick
      ? `Opening in ${b.ready_at - run.tick}s`
      : !b.connected
        ? "Needs a path"
        : b.insolvent
          ? "Waiting for supplies"
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
        <img src={`/art/${b.kind}-s${b.design?.style ?? 0}-v3.webp`} alt="" />
      </div>
      <h2>{b.design?.name || a.name}</h2>
      {!readOnly && (
        <AttractionDesign
          building={b}
          finished={parkClosed(run)}
          cash={run.cash}
          action={action}
        />
      )}
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
          <Ticket size={16} /> {b.served}{" "}
          {b.kind === "depot" ? "repairs" : "served"}
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
              {!readOnly && onEditCoaster && (
                <button
                  className="mp-primary full"
                  onClick={() => onEditCoaster(b)}
                >
                  Design your coaster
                </button>
              )}
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
          <div className="mp-shop-update">
            <img
              src={`/art/owner-${b.kind}-v3.webp`}
              alt={b.kind === "food" ? "Omar" : "Mina"}
            />
            <blockquote>“{b.reason}”</blockquote>
          </div>
          {b.delivery_qty > 0 && (
            <p className="mp-delivery">
              <Package size={16} /> {b.delivery_qty} units arrive in{" "}
              {Math.max(0, b.delivery_at - run.tick)}s
            </p>
          )}
          <p className="mp-fine">
            Shares <strong>{b.rent}% of sales</strong> with your park. Pricing
            and restocking are automatic.{" "}
            {run.version === "moonpark-v4"
              ? "This archived day retains its original operating costs."
              : "Running costs are paid only when a customer is served."}
          </p>
          {config?.vendors && (
            <a
              className="mp-vendor-link"
              target="_blank"
              rel="noreferrer"
              href={`https://testnet.nearblocks.io/address/${config.vendors[b.kind === "food" ? "omar" : "mina"]}`}
            >
              <NearMark /> {b.kind === "food" ? "Omar’s" : "Mina’s"} testnet
              wallet <ExternalLink size={12} />
            </a>
          )}
        </>
      )}
      {b.kind === "depot" && (
        <div className="mp-shop-update">
          <img src="/art/owner-depot-v3.webp" alt="Nia" />
          <p className="mp-fine">
            Nia’s park robots automatically repair connected rides. Parts and
            service cost 10 credits per repair, paid only when needed.
          </p>
        </div>
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
  authLinks,
  prizeStatus,
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
  authLinks: { signInUrl?: string; signOutUrl?: string };
  prizeStatus: PrizeStatus | null;
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
                    ? e.player_id.startsWith("guest:")
                      ? "NEAR verified · exhibition"
                      : "Verified on NEAR"
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
                ? "Sign in once. We take care of your NEAR account and gas."
                : "Google sign-in is awaiting configuration. Practice and NEAR playtesting are available."}
            </p>
          </div>
          {authLinks.signInUrl ? (
            <a className="mp-primary" href={authLinks.signInUrl} target="_top">
              Continue with ChatGPT
            </a>
          ) : (
            <button
              className="mp-primary"
              disabled={!configured}
              onClick={onSignIn}
            >
              Continue with Google
            </button>
          )}
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
            {authLinks.signOutUrl ? (
              <a href={authLinks.signOutUrl} target="_top">
                Sign out
              </a>
            ) : (
              <button type="button" onClick={onSignOut}>
                Sign out
              </button>
            )}
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
          The larger pool replaces the smaller. The USD pledge is conditional
          and not yet funded. No qualifying win means no payout. NEAR freezes
          eligible standings at the cutoff. After the creator attests a
          qualifying award, the funded testnet pool is allocated in rank order
          and winners collect directly. The USD pledge will be funded and
          distributed on mainnet separately if we win. No entry fee. One prize
          per eligible person; automated and duplicate-person entries are
          ineligible.
        </p>
        {prizeStatus && (
          <div className="mp-backed-note">
            <NearMark />
            <div>
              <strong>
                Testnet escrow: {testNear(prizeStatus.escrow_yocto)} tNEAR
                deposited
              </strong>
              <small>
                Proves the payout mechanism. Testnet tokens have no cash value
                and do not fund the USD pledge. Four winners split 40/30/20/10;
                fewer eligible winners split proportionally.
              </small>
            </div>
          </div>
        )}
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
  onOwnership,
}: {
  state: Snapshot;
  onReplay: () => void;
  onExplore: () => void;
  onLeaders: () => void;
  onExport: () => void;
  onOwnership: () => void;
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
      (isPersistent(r) || state.pending === 0);
  return (
    <div className="mp-results">
      <span className="mp-eyebrow">
        {isPersistent(r)
          ? "FIRST 96 VISITORS / OPENING SCORE SEALED"
          : "CLOSING TIME / OPENING DAY COMPLETE"}
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
          onClick={isPersistent(r) ? onExplore : onReplay}
          disabled={
            !isPersistent(r) &&
            state.mode === "near" &&
            (!state.record?.run.finished || state.pending > 0)
          }
        >
          {isPersistent(r)
            ? "Keep building your park"
            : "Build a better opening day"}{" "}
          <ArrowUpRight size={16} />
        </button>
        <button onClick={onExplore}>Look around your park</button>
        <button onClick={onLeaders}>Top five</button>
        {state.mode === "near" && (
          <button onClick={onOwnership}>
            <NearMark /> Publish your park & signature rides
          </button>
        )}
        <button onClick={onExport}>Export run</button>
      </div>
    </div>
  );
}

export function Ledger({
  run,
  txs,
  contractId,
  config,
  runId,
}: {
  run: Run;
  txs: string[];
  contractId?: string;
  config?: Config | null;
  runId?: string;
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
        a fixed park share. Pricing and deliveries are automatic.
        {contractId
          ? config?.vendors
            ? " NEAR confirms the game and clears its token balances together."
            : " NEAR confirms this archived simulation under its original rules."
          : " Practice uses the same rules locally."}
      </p>
      {config?.vendors && runId && (
        <VendorWallets key={runId} cfg={config} runId={runId} />
      )}
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
        Lunar credits and stock are opening-day game assets with no cash value.
        {contractId
          ? config?.vendors
            ? " The vendor accounts authorize fixed rules in the immutable contract. Testnet gas is sponsored."
            : " This earlier version uses contract-managed merchant treasuries."
          : " Offline practice has no blockchain transactions."}
      </p>
    </>
  );
}
