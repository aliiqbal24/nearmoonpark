"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Rocket,
  Orbit,
  FerrisWheel,
  Car,
  Store,
  CupSoda,
  Wrench,
  Zap,
  Route,
  Coins,
  Users,
  Star,
  Trophy,
  Volume2,
  VolumeX,
  Plus,
  Minus,
  Home,
  BookOpen,
  ReceiptText,
  X,
  RotateCw,
  ArrowUpRight,
  Play,
  ShieldCheck,
  Eye,
} from "lucide-react";
import MoonWorld from "./components/moon-world";
import {
  Dialog,
  Inspector,
  Leaderboard,
  ScoreBreakdown,
  Results,
  Ledger,
} from "./components/moon-panels";
import { simulate } from "@/lib/moon/engine";
import { ParkSession, type Snapshot } from "@/lib/moon/session";
import {
  config as nearConfig,
  provision,
  leaderboard,
  view,
  type Config,
  type Credentials,
} from "@/lib/moon/near";
import { MoonAudio } from "@/lib/moon/audio";
import {
  CATALOG,
  blueprint,
  footprint,
  isRide,
  money,
  clock,
  guestName,
  type Run,
  type Command,
  type Placement,
  type Detail,
  type Entry,
  type Kind,
} from "@/lib/moon/model";
import type { MoonWorld as World } from "@/lib/moon/world";
import "./moonpark.css";

const ICONS = {
  bounce: Orbit,
  wheel: FerrisWheel,
  rover: Car,
  coaster: Rocket,
  food: Store,
  drink: CupSoda,
  depot: Wrench,
  solar: Zap,
};
type Player = { player_id: string; display_name: string };
type Screen = "title" | "intro" | "playing" | "results";
type Panel = "leaderboard" | "ledger" | "help" | "score" | null;
function dreamPark(initial: Run): Run {
  const r = structuredClone(initial);
  const base = r.buildings[0];
  r.tick = 40;
  const kinds: [Kind, number, number][] = [
    ["coaster", 3, 5],
    ["wheel", 22, 5],
    ["rover", 22, 12],
    ["drink", 23, 17],
    ["depot", 27, 17],
    ["solar", 16, 6],
    ["bounce", 15, 11],
  ];
  for (const [k, x, z] of kinds) {
    const a = blueprint(k);
    r.buildings.push({
      ...structuredClone(base),
      id: r.buildings.length + 1,
      kind: k,
      x,
      z,
      price: a.price,
      invested: a.cost,
      ready_at: 0,
      powered: true,
      connected: true,
      stock: 16,
      riders: isRide(k) ? [0, 1, 2, 3] : [],
    });
  }
  for (const b of r.buildings) {
    b.powered = true;
    b.connected = true;
    const { w, h } = footprint(b);
    const x = b.x + Math.floor(w / 2);
    for (let z = b.z + h; z <= 20; z++) {
      const c = z * 32 + x;
      if (!r.paths.includes(c)) r.paths.push(c);
    }
  }
  for (let i = 0; i < 24; i++) {
    r.guests[i].status = "walking";
    r.guests[i].cell = 20 * 32 + 4 + i;
  }
  return r;
}
function download(value: unknown, name: string) {
  const u = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}

export default function Game() {
  const [initial, setInitial] = useState<Run | null>(null),
    [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [screen, setScreen] = useState<Screen>("title"),
    [speed, setSpeed] = useState(1),
    [placement, setPlacement] = useState<Placement | null>(null),
    [selection, setSelection] = useState<Detail | null>(null),
    [hover, setHover] = useState<Detail | null>(null),
    [panel, setPanel] = useState<Panel>(null),
    [toast, setToast] = useState(""),
    [muted, setMuted] = useState(true),
    [introTime, setIntroTime] = useState(0),
    [launching, setLaunching] = useState(false),
    [resumeAvailable, setResumeAvailable] = useState(false),
    [rideId, setRideId] = useState<number | null>(null),
    [showResults, setShowResults] = useState(true),
    [entries, setEntries] = useState<Entry[]>([]),
    [prizeEntries, setPrizeEntries] = useState<Entry[]>([]),
    [challengeOpen, setChallengeOpen] = useState(false),
    [authConfigured, setAuthConfigured] = useState(false),
    [player, setPlayer] = useState<Player | null>(null),
    [wallLeft, setWallLeft] = useState(540);
  const [cfg, setCfg] = useState<Config | null>(null),
    [chosenMode, setChosenMode] = useState<"practice" | "near">("practice");
  const worldRef = useRef<World | null>(null),
    session = useRef<ParkSession | null>(null),
    audio = useRef<MoonAudio | null>(null),
    audioStarted = useRef(false),
    pendingNear = useRef<Promise<Credentials> | null>(null),
    finishing = useRef(false),
    finishedRef = useRef(false),
    generation = useRef(0),
    lastWave = useRef(0),
    finishIntroRef = useRef<() => void>(() => {});
  const dream = useMemo(() => (initial ? dreamPark(initial) : null), [initial]);
  const run = snapshot?.run ?? initial;
  const worldRun = screen === "title" || screen === "intro" ? dream : run;
  const receive = useCallback((s: Snapshot) => {
    setSnapshot(s);
    if (s.run.finished && !finishedRef.current) {
      setScreen("results");
      setShowResults(true);
      setPlacement(null);
      audio.current?.effect("finish");
    }
    finishedRef.current = s.run.finished;
    const wave = Math.floor(Math.max(0, s.run.tick - 1) / 90) + 1;
    if (wave > lastWave.current && s.run.tick < 540) {
      lastWave.current = wave;
      audio.current?.effect("rocket");
    }
  }, []);
  useEffect(() => {
    audio.current = new MoonAudio();
    void simulate({ op: "new" })
      .then((run) => {
        setInitial(run);
        try {
          const saved = JSON.parse(
            localStorage.getItem("moonpark-current") || "null",
          );
          setResumeAvailable(!!saved?.state?.run);
        } catch {}
      })
      .catch((e) => setToast(String(e)));
    void nearConfig().then((c) => {
      setCfg(c);
      if (c)
        void Promise.all([
          leaderboard(c),
          view<{ entries: Entry[] }>(c, "get_prize_snapshot"),
        ])
          .then(([l, p]) => {
            setEntries(l.entries);
            setChallengeOpen(l.open);
            setPrizeEntries(p.entries);
          })
          .catch(() => {});
    });
    void fetch("/api/moon/profile")
      .then(
        (r) =>
          r.json() as Promise<{ configured: boolean; player: Player | null }>,
      )
      .then((v) => {
        setAuthConfigured(v.configured);
        setPlayer(v.player);
        if (new URLSearchParams(location.search).has("ranked"))
          setPanel("leaderboard");
      })
      .catch(() => {});
    return () => {
      session.current?.dispose();
      audio.current?.dispose();
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    if (screen !== "playing") return;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now(),
        dt = (now - last) / 1000;
      last = now;
      const s = session.current;
      if (s) {
        setWallLeft(Math.max(0, (s.state.deadline - now) / 1000));
        void s.update(dt, speed).catch((e) => setToast(String(e)));
      }
    }, 200);
    return () => clearInterval(timer);
  }, [screen, speed]);
  useEffect(() => {
    if (screen !== "intro") return;
    const start = performance.now();
    const t = setInterval(() => {
      const elapsed = (performance.now() - start) / 1000;
      setIntroTime(Math.min(40, elapsed));
      if (elapsed >= 40) {
        clearInterval(t);
        finishIntroRef.current();
      }
    }, 80);
    return () => clearInterval(t);
  }, [screen]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.matches("input,textarea")) return;
      if (e.key === "Escape") {
        setPlacement(null);
        setRideId(null);
        worldRef.current?.home();
      }
      if (e.key.toLowerCase() === "r")
        setPlacement((p) => (p ? { ...p, rotation: (p.rotation + 1) % 4 } : p));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (panel !== "leaderboard" || !cfg) return;
    let active = true;
    const load = () => {
      if (cfg)
        void Promise.all([
          leaderboard(cfg),
          view<{ entries: Entry[] }>(cfg, "get_prize_snapshot"),
        ])
          .then(([l, p]) => {
            if (active) {
              setEntries(l.entries);
              setChallengeOpen(l.open);
              setPrizeEntries(p.entries);
            }
          })
          .catch(() => {});
    };
    load();
    const timer = setInterval(load, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [panel, cfg]);
  const start = (mode: "practice" | "near", ranked = false) => {
    if (!initial) return;
    if (mode === "near" && !cfg) {
      setToast("The NEAR connection is loading. Practice is ready now.");
      return;
    }
    if (ranked && !player) {
      setPanel("leaderboard");
      return;
    }
    if (!audioStarted.current) {
      setMuted(audio.current?.toggle() ?? true);
      audioStarted.current = true;
      audio.current?.effect("rocket");
    }
    session.current?.dispose();
    session.current = null;
    generation.current++;
    setSnapshot(null);
    setPlacement(null);
    setSelection(null);
    setRideId(null);
    setPanel(null);
    setSpeed(1);
    setIntroTime(0);
    setScreen("intro");
    setLaunching(false);
    finishing.current = false;
    finishedRef.current = false;
    lastWave.current = 0;
    setChosenMode(mode);
    pendingNear.current =
      mode === "near"
        ? provision(
            cfg!,
            ranked ? player!.player_id : "guest",
            ranked,
            ranked ? player!.display_name : "Moon Explorer",
          )
        : null;
    pendingNear.current?.catch(() => {});
  };
  const finishIntro = async () => {
    if (finishing.current) return;
    finishing.current = true;
    setLaunching(true);
    try {
      const g = generation.current;
      const credentials = await pendingNear.current;
      const next = await ParkSession.start(
        (s) => {
          if (g === generation.current) receive(s);
        },
        credentials ?? undefined,
        credentials ? cfg! : undefined,
      );
      session.current = next;
      setScreen("playing");
      setWallLeft(540);
      setLaunching(false);
      worldRef.current?.home();
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not open the park.");
      setLaunching(false);
      finishing.current = false;
    }
  };
  useEffect(() => {
    finishIntroRef.current = () => void finishIntro();
  });
  const resume = async () => {
    setLaunching(true);
    try {
      finishedRef.current = false;
      const next = await ParkSession.resume(receive);
      if (next) {
        session.current = next;
        setScreen(next.state.run.finished ? "results" : "playing");
        setShowResults(true);
        worldRef.current?.home();
      } else setToast("No saved park found.");
    } catch (e) {
      setToast(String(e));
    } finally {
      setLaunching(false);
    }
  };
  const action = async (command: Command) => {
    if (!session.current || screen !== "playing") return;
    try {
      await session.current.action(command);
      audio.current?.effect(command.kind === "build" ? "build" : "cash");
      if (command.kind === "build") {
        const b = session.current.state.run.buildings.at(-1)!;
        setSelection({ kind: "building", id: b.id, x: 0, y: 0 });
        setPlacement(null);
      }
    } catch (e) {
      setToast(e instanceof Error ? e.message : "That action is unavailable.");
      audio.current?.effect("error");
    }
  };
  const place = (x: number, z: number) => {
    if (!placement) return;
    void action(
      placement.kind === "path" || placement.kind === "erase"
        ? { kind: placement.kind === "erase" ? "erase_path" : "path", x, z }
        : {
            kind: "build",
            item: placement.kind,
            x,
            z,
            rotation: placement.rotation,
            variant: placement.variant,
          },
    );
  };
  const pick = (d: Detail | null) => {
    if (screen === "playing" || screen === "results") {
      setSelection(d);
      setPlacement(null);
    }
  };
  const toggleAudio = () => {
    audioStarted.current = true;
    setMuted(audio.current?.toggle() ?? true);
  };
  const signIn = async () => {
    try {
      const r = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider: "google",
          callbackURL: location.origin + "/?ranked=1",
        }),
      });
      const data = (await r.json()) as { url?: string; error?: string };
      if (!r.ok || !data.url)
        throw Error(data.error || "Google sign-in is not configured yet.");
      location.assign(data.url);
    } catch (e) {
      setToast(String(e));
    }
  };
  const closePanel = useCallback(() => setPanel(null), []);
  const selectedBuilding = run?.buildings.find(
      (b) => selection?.kind === "building" && b.id === selection.id && !b.sold,
    ),
    selectedGuest = run?.guests.find(
      (g) => selection?.kind === "guest" && g.id === selection.id,
    );
  const hoverGuest = run?.guests.find(
      (g) => hover?.kind === "guest" && g.id === hover.id,
    ),
    hoverBuilding = run?.buildings.find(
      (b) => hover?.kind === "building" && b.id === hover.id && !b.sold,
    );
  const active =
    run?.guests.filter((g) => !["upcoming", "gone"].includes(g.status))
      .length ?? 0;
  const power = useMemo(() => {
    if (!run) return { used: 0, cap: 8 };
    return {
      used: run.buildings
        .filter((b) => b.powered)
        .reduce(
          (n, b) =>
            n +
            (b.kind === "coaster" ? b.launch + 1 : blueprint(b.kind).power) +
            b.level,
          0,
        ),
      cap:
        8 +
        run.buildings.filter(
          (b) =>
            b.kind === "solar" &&
            !b.sold &&
            b.connected &&
            b.ready_at <= run.tick,
        ).length *
          4,
    };
  }, [run]);
  const nextRocket = run
    ? run.tick < 451
      ? 90 - (Math.max(0, run.tick - 1) % 90)
      : 0
    : 90;
  const hint = run
    ? !run.buildings.some((b) => b.kind === "coaster" && !b.sold)
      ? "Build a mass-driver coaster. Your first visitors deserve a story to take home."
      : run.buildings.some((b) => !b.sold && !b.connected)
        ? "Select the new building and connect its entrance. Guests follow paths, not dreams."
        : !run.buildings.some((b) => b.kind === "drink" && !b.sold)
          ? "A coaster is thirsty work. Give Mina a spot for Crater Coolers."
          : power.used >= power.cap
            ? "Your power grid is getting busy. A solar canopy adds four units."
            : run.buildings.filter((b) => isRide(b.kind) && !b.sold).length < 3
              ? "Different visitors love different rides. An Earthrise Wheel gives families a beautiful second stop."
              : !run.buildings.some((b) => b.kind === "depot" && !b.sold)
                ? "A Lunar Care Depot keeps your rides healthy while you grow."
                : "Watch the queues. New attractions, good value and fresh stock make happy visitors."
    : "";
  const introBeat =
    introTime < 9
      ? {
          k: "THE NEXT GREAT ADVENTURE",
          title: "We learned to live on the Moon.",
          text: "Now, let's give people a reason to love it.",
        }
      : introTime < 17
        ? {
            k: "A NEAR FUTURE",
            title: "Welcome to the best day off Earth.",
            text: "At least, that's what the brochure promises.",
          }
        : introTime < 30
          ? {
              k: "THE MASS DRIVER",
              title: "Please keep all dreams inside the vehicle.",
              text: "Industrial launch technology. Recreational screaming.",
            }
          : introTime < 35
            ? {
                k: "SMALL LEAPS. BIG AMBITIONS.",
                title: "Somebody should probably hire a mechanic.",
                text: "The Moon has no shortage of possibilities.",
              }
            : {
                k: "YOUR PARK. YOUR OPENING DAY.",
                title: "Let's make it happen.",
                text: "Nine minutes. Six rockets. One extraordinary day out.",
              };
  return (
    <main
      className="moonpark"
      data-tick={run?.tick ?? 0}
      data-cash={run?.cash ?? 0}
      data-finished={!!run?.finished}
    >
      <MoonWorld
        run={worldRun}
        speed={screen === "playing" ? speed : 0.4}
        placement={screen === "playing" ? placement : null}
        selected={selectedBuilding?.id ?? null}
        cinematic={screen === "intro" ? introTime : null}
        rideId={rideId}
        onPick={pick}
        onHover={setHover}
        onPlace={place}
        worldRef={worldRef}
      />
      {screen === "title" && (
        <div className="mp-title">
          <div className="mp-title-content">
            <div className="mp-title-top">
              <span className="mp-near">N</span>
              <span>AN OPTIMISTIC LITTLE MOON ECONOMY</span>
            </div>
            <p className="mp-eyebrow">WELCOME TO YOUR NEXT GREAT IDEA</p>
            <h1>
              MOON
              <span>
                PARK<span className="mp-title-star">✦</span>
              </span>
            </h1>
            <p className="mp-title-tagline">
              The Moon&apos;s best day out.
              <br />
              Built by you.
            </p>
            <p className="mp-title-description">
              Launch a coaster. Welcome the rockets.
              <br />
              Build a little place worth travelling 384,400 km for.
            </p>
            <div className="mp-title-actions">
              <button
                className="mp-primary"
                disabled={!initial || launching}
                onClick={() => start("practice")}
              >
                <Play size={18} />
                {initial ? "Open your park" : "Preparing your lunar plot…"}
                <ArrowUpRight size={18} />
              </button>
              <button
                className="mp-secondary"
                disabled={!initial}
                onClick={() => start("near")}
              >
                <ShieldCheck size={17} />
                Play on NEAR
              </button>
              {resumeAvailable && (
                <button
                  className="mp-resume"
                  disabled={launching}
                  onClick={() => void resume()}
                >
                  Return to your park →
                </button>
              )}
            </div>
            <div className="mp-title-details">
              <span>
                <Rocket size={15} /> Six rocket arrivals
              </span>
              <span>
                <Orbit size={15} /> Under 10 minutes
              </span>
              <span>
                <Users size={15} /> A living NPC economy
              </span>
            </div>
            <div className="mp-title-links">
              <button onClick={() => setPanel("leaderboard")}>
                <Trophy size={15} /> Top five & conditional prizes
              </button>
              <button onClick={() => setPanel("help")}>How to play</button>
            </div>
            <span className="mp-title-built">
              BUILT ON NEAR <i /> GAMEPLAY PLAYTEST · ORIGINAL ASSETS IN
              PROGRESS
            </span>
          </div>
          <div className="mp-title-caption">
            <span>YOUR FUTURE PARK</span>
            <p>
              One small step for guests.
              <br />
              One giant leap for the gift shop.
            </p>
          </div>
        </div>
      )}
      {screen === "intro" && (
        <div className="mp-intro">
          <div className="mp-cinema-top">
            <span className="mp-wordmark">
              MOONPARK <small>A NEAR FUTURE</small>
            </span>
            <button
              onClick={toggleAudio}
              aria-label={muted ? "Enable sound" : "Mute sound"}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
          <div className="mp-intro-captions">
            <span className="mp-eyebrow">{introBeat.k}</span>
            <h1>{introBeat.title}</h1>
            <p>{introBeat.text}</p>
          </div>
          <div className="mp-intro-bottom">
            <span>
              {launching
                ? "Preparing your park…"
                : "THE DREAM / A LUNAR OPENING DAY"}
            </span>
            <button
              className="mp-secondary"
              disabled={launching}
              onClick={() => void finishIntro()}
            >
              {launching ? "Opening…" : "Skip intro"}
              <ArrowUpRight size={16} />
            </button>
            {!launching && toast && chosenMode === "near" && (
              <button onClick={() => start("practice")}>
                Play practice instead
              </button>
            )}
          </div>
          <div
            className="mp-intro-progress"
            style={{ width: `${(introTime / 40) * 100}%` }}
          />
        </div>
      )}
      {(screen === "playing" || screen === "results") && run && (
        <>
          <header className="mp-hud">
            <button
              className="mp-brand"
              onClick={() => {
                setPanel("help");
              }}
            >
              <span>☾</span>
              <strong>
                MOONPARK<small>A NEAR FUTURE</small>
              </strong>
            </button>
            <div className="mp-hud-stat mp-cash">
              <Coins size={21} />
              <div>
                <small>LUNAR CREDITS</small>
                <strong>{money(run.cash)}</strong>
              </div>
            </div>
            <div className="mp-hud-stat">
              <Users size={20} />
              <div>
                <small>IN YOUR PARK</small>
                <strong>
                  {active}
                  <em> / 96 guests</em>
                </strong>
              </div>
            </div>
            <button
              className="mp-hud-stat mp-score"
              onClick={() => setPanel("score")}
            >
              <Star size={21} />
              <div>
                <small>OPENING DAY SCORE</small>
                <strong>
                  {run.score.total.toLocaleString()}
                  <em> / 10,000</em>
                </strong>
              </div>
            </button>
            <div className="mp-time">
              <span>
                <span className="mp-live-dot" />{" "}
                {run.finished ? "PARK CLOSED" : "OPENING DAY"}
              </span>
              <strong>{clock(Math.min(540 - run.tick, wallLeft))}</strong>
              <div className="mp-speeds">
                {[1, 2, 4].map((n) => (
                  <button
                    key={n}
                    disabled={run.finished}
                    aria-pressed={speed === n}
                    onClick={() => setSpeed(n)}
                  >
                    {n}×
                  </button>
                ))}
              </div>
            </div>
          </header>
          <div className="mp-subhud">
            <span className={power.used >= power.cap ? "mp-power-tight" : ""}>
              <Zap size={14} />
              {power.used}/{power.cap} power
            </span>
            <span>
              <Rocket size={14} />
              {nextRocket
                ? `Next rocket in ${clock(nextRocket)}`
                : "Last rocket has landed"}
            </span>
            <span className="mp-chain">
              <span
                className={`mp-live-dot ${snapshot?.mode === "near" ? "chain" : "practice"}`}
              />
              {snapshot?.mode === "near"
                ? snapshot.pending
                  ? `NEAR · ${snapshot.pending} saving`
                  : snapshot.record?.ranked
                    ? "NEAR · RANKED"
                    : "NEAR · PLAYTEST"
                : "LOCAL PRACTICE"}
            </span>
          </div>
          {screen === "playing" && !selection && !placement && !rideId && (
            <div className="mp-advisor">
              <span className="mp-advisor-avatar">◉</span>
              <div>
                <strong>MAKE IT A DAY TO REMEMBER</strong>
                <p>{hint}</p>
              </div>
            </div>
          )}
          <nav className="mp-map-tools" aria-label="Park tools">
            <button
              aria-label="Leaderboard"
              onClick={() => setPanel("leaderboard")}
            >
              <Trophy size={20} />
            </button>
            <button
              aria-label="Economy ledger"
              onClick={() => setPanel("ledger")}
            >
              <ReceiptText size={20} />
            </button>
            <button aria-label="How to play" onClick={() => setPanel("help")}>
              <BookOpen size={20} />
            </button>
            <button
              aria-label={muted ? "Enable sound" : "Mute sound"}
              onClick={toggleAudio}
            >
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            <span />
            <button
              aria-label="Zoom in"
              onClick={() => worldRef.current?.zoom(0.8)}
            >
              <Plus size={19} />
            </button>
            <button
              aria-label="Zoom out"
              onClick={() => worldRef.current?.zoom(1.25)}
            >
              <Minus size={19} />
            </button>
            <button
              aria-label="Reset camera"
              onClick={() => worldRef.current?.home()}
            >
              <Home size={19} />
            </button>
          </nav>
          {selection && !rideId && (
            <Inspector
              key={`${selection?.kind}:${selection?.id}`}
              run={run}
              building={selectedBuilding}
              guest={selectedGuest}
              action={(c) => void action(c)}
              onClose={() => setSelection(null)}
              onRide={(id) => {
                setRideId(id);
                setSelection(null);
              }}
            />
          )}
          {screen === "playing" && !rideId && (
            <div className={`mp-build-area ${selection ? "inspecting" : ""}`}>
              <div className="mp-build-heading">
                <span>
                  <span className="mp-eyebrow">
                    BUILD SOMETHING EXTRAORDINARY
                  </span>
                  <small>Pick a blueprint. Click your plot.</small>
                </span>
                {placement && (
                  <div className="mp-placement-tools">
                    <button
                      onClick={() =>
                        setPlacement((p) =>
                          p ? { ...p, rotation: (p.rotation + 1) % 4 } : p,
                        )
                      }
                    >
                      <RotateCw size={15} /> Rotate [R]
                    </button>
                    {(placement.kind === "path" ||
                      placement.kind === "erase") && (
                      <button
                        onClick={() =>
                          setPlacement((p) =>
                            p
                              ? {
                                  ...p,
                                  kind: p.kind === "path" ? "erase" : "path",
                                }
                              : p,
                          )
                        }
                      >
                        {placement.kind === "path"
                          ? "Erase paths"
                          : "Draw paths"}
                      </button>
                    )}
                    {placement.kind === "coaster" && (
                      <button
                        onClick={() =>
                          setPlacement((p) =>
                            p ? { ...p, variant: p.variant ? 0 : 1 } : p,
                          )
                        }
                      >
                        Layout {placement.variant ? "B" : "A"}
                      </button>
                    )}
                    <button
                      aria-label="Cancel placement"
                      onClick={() => setPlacement(null)}
                    >
                      <X size={17} />
                    </button>
                  </div>
                )}
              </div>
              <div className="mp-build-dock">
                {CATALOG.map((a) => {
                  const Icon = ICONS[a.kind];
                  return (
                    <button
                      className={`mp-blueprint ${placement?.kind === a.kind ? "selected" : ""}`}
                      key={a.kind}
                      disabled={run.cash < a.cost}
                      onClick={() => {
                        setSelection(null);
                        setPlacement((p) =>
                          p?.kind === a.kind
                            ? null
                            : { kind: a.kind, rotation: 0, variant: 0 },
                        );
                      }}
                      aria-label={`Build ${a.name}`}
                      title={a.description}
                    >
                      <span
                        className="mp-blueprint-art"
                        style={{ color: a.color }}
                      >
                        <Icon size={27} />
                      </span>
                      <strong>{a.name}</strong>
                      <small>
                        <Coins size={11} />
                        {money(a.cost)}
                      </small>
                    </button>
                  );
                })}
                <button
                  className={`mp-blueprint ${placement?.kind === "path" ? "selected" : ""}`}
                  onClick={() => {
                    setSelection(null);
                    setPlacement({ kind: "path", rotation: 0, variant: 0 });
                  }}
                  aria-label="Build path"
                >
                  <span className="mp-blueprint-art">
                    <Route size={27} />
                  </span>
                  <strong>Paths</strong>
                  <small>
                    <Coins size={11} />2 / tile
                  </small>
                </button>
              </div>
            </div>
          )}
          {rideId !== null && (
            <div className="mp-ride-controls">
              <span>
                <Eye size={17} /> FRONT SEAT / MASS DRIVER
              </span>
              <button
                className="mp-primary"
                onClick={() => {
                  setRideId(null);
                  worldRef.current?.home();
                }}
              >
                Back to your park <X size={16} />
              </button>
            </div>
          )}
          {hover && !placement && !rideId && (hoverGuest || hoverBuilding) && (
            <div
              className="mp-hover"
              style={{
                left: Math.min(
                  hover.x + 16,
                  typeof window !== "undefined" ? window.innerWidth - 270 : 0,
                ),
                top: Math.max(100, hover.y - 25),
              }}
            >
              {hoverGuest ? (
                <>
                  <strong>{guestName(hoverGuest.id)}</strong>
                  <p>{hoverGuest.thought}</p>
                  <small>
                    {money(hoverGuest.cash)} credits · {hoverGuest.satisfaction}
                    % happy
                  </small>
                </>
              ) : hoverBuilding ? (
                <>
                  <strong>{blueprint(hoverBuilding.kind).name}</strong>
                  <p>
                    {hoverBuilding.powered
                      ? `${hoverBuilding.queue.length} waiting · ${hoverBuilding.served} served`
                      : hoverBuilding.connected
                        ? "Check power and opening status"
                        : "Connect the entrance to a path"}
                  </p>
                  <small>Click to inspect</small>
                </>
              ) : null}
            </div>
          )}
          {snapshot?.error && (
            <div className="mp-network-status">
              Reconnecting to NEAR. Your round clock continues; unconfirmed
              changes are not ranked yet.
            </div>
          )}
          {screen === "results" && showResults && snapshot && (
            <div className="mp-ending-scrim">
              <Results
                state={snapshot}
                onReplay={() => start(snapshot.mode, snapshot.record?.ranked)}
                onExplore={() => setShowResults(false)}
                onLeaders={() => setPanel("leaderboard")}
                onExport={() =>
                  download(
                    {
                      run: snapshot.run,
                      record: snapshot.record,
                      transactions: snapshot.txs,
                    },
                    "moonpark-opening-day.json",
                  )
                }
              />
            </div>
          )}
          {screen === "results" && !showResults && (
            <button
              className="mp-return-results mp-primary"
              onClick={() => setShowResults(true)}
            >
              <Trophy size={17} /> Opening day results
            </button>
          )}
        </>
      )}
      {panel && (
        <Dialog
          title={
            panel === "leaderboard"
              ? "The Moon's finest five"
              : panel === "ledger"
                ? "Follow the lunar credits"
                : panel === "score"
                  ? "A great park earns its stars"
                  : "Your first day on the Moon"
          }
          onClose={closePanel}
        >
          {panel === "leaderboard" ? (
            <Leaderboard
              key={player?.display_name ?? "guest"}
              entries={entries}
              prizeEntries={prizeEntries}
              open={challengeOpen}
              configured={authConfigured}
              player={player}
              onSignIn={() => void signIn()}
              onRanked={() => start("near", true)}
              onSaveName={(name) => {
                void fetch("/api/moon/profile", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({ display_name: name }),
                })
                  .then(async (r) => {
                    if (!r.ok) throw Error("Could not save the player name.");
                    setPlayer((p) => (p ? { ...p, display_name: name } : p));
                    setToast("Your name is ready for your next ranked run.");
                  })
                  .catch((e) => setToast(String(e)));
              }}
              onSignOut={() => {
                void fetch("/api/auth/sign-out", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: "{}",
                })
                  .then((r) => {
                    if (!r.ok) throw Error("Could not sign out.");
                    setPlayer(null);
                    setToast("Signed out of Moonpark.");
                  })
                  .catch((e) => setToast(String(e)));
              }}
            />
          ) : panel === "ledger" && run ? (
            <Ledger
              run={run}
              txs={snapshot?.txs ?? []}
              contractId={
                snapshot?.mode === "near" ? cfg?.contractId : undefined
              }
            />
          ) : panel === "score" && run ? (
            <>
              <ScoreBreakdown run={run} />
              <p className="mp-subtle">
                Bronze 3,500 · Silver 5,500 · Gold 7,000. Every run has the same
                arrivals, budgets and nine-minute opening day.
              </p>
            </>
          ) : (
            <div className="mp-help">
              <p className="mp-subtle">
                The colony has a home. Give it somewhere wonderful to go.
              </p>
              <ol>
                <li>
                  <strong>Build a reason to visit.</strong> Pick a ride, place
                  its blueprint and connect its entrance. Guests arrive by
                  rocket every 90 simulation seconds.
                </li>
                <li>
                  <strong>Watch what people do.</strong> Queues, thirst, budgets
                  and thrill preferences affect their choices. Hover or click a
                  visitor to understand why.
                </li>
                <li>
                  <strong>Help the park flourish.</strong> Add food and drinks,
                  keep power available and let the maintenance robots look after
                  your rides.
                </li>
                <li>
                  <strong>Make your opening day count.</strong> Happy visitors,
                  a healthy business and new experiences earn points. Use 2× or
                  4× to reach closing time sooner.
                </li>
              </ol>
              <p>
                Drag to pan · Scroll to zoom · Right-drag to orbit · R rotates a
                blueprint · Esc leaves a tool · Home resets the view.
              </p>
              <p className="mp-fine">
                Concessionaires hold their own cash and inventory, choose prices
                and pay suppliers. NEAR validates this economy and computes
                ranked scores. Practice runs locally using the same Rust/WASM
                engine.
              </p>
              <div className="mp-callout">
                <div>
                  <strong>Prototype first. Moon magic next.</strong>
                  <p>
                    This version tests the complete game. Final characters,
                    assets, sound and the cinematic receive their full
                    production pass after playtesting.
                  </p>
                </div>
              </div>
              <p className="mp-fine">
                <a href="/privacy">Privacy</a> ·{" "}
                <a href="/terms">Competition terms</a> ·{" "}
                <a href="/legacy">Earlier Mars prototype</a>
              </p>
            </div>
          )}
        </Dialog>
      )}
      {toast && (
        <div className="mp-toast" role="status">
          {toast}
          <button onClick={() => setToast("")} aria-label="Dismiss message">
            <X size={15} />
          </button>
        </div>
      )}
    </main>
  );
}
