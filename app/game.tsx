"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  FastForward,
  Pause,
  Play,
  Radio,
  Shield,
  Wrench,
  Zap,
  Leaf,
  Droplets,
  Wind,
  Package,
  Activity,
  ChevronRight,
  X,
  Download,
  RotateCcw,
  CircleHelp,
  Check,
  ExternalLink,
} from "lucide-react";
import {
  Run,
  Command,
  RecordState,
  GOODS,
  INSTITUTIONS,
  reserves,
  demand,
  VERSION,
} from "@/lib/model";
import { simulate } from "@/lib/engine";
import {
  BEATS,
  PEOPLE,
  beatFor,
  reaction,
  ENDINGS,
  unavailable,
  endingVoices,
} from "@/lib/story";
import {
  Credentials,
  Config,
  nearConfig,
  provision,
  newNearRun,
  nearStep,
  readRun,
} from "@/lib/near";

type Saved = { record: RecordState; mode: "practice" | "near"; txs: string[] };
const STORAGE = "last-signal-save-v1";
const ICONS = [Leaf, Droplets, Wind, Package, Zap];
const COORDS = [
  [150, 110],
  [110, 280],
  [360, 140],
  [530, 290],
  [350, 365],
];
function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function Game() {
  const [saved, setSaved] = useState<Saved | null>(null),
    [config, setConfig] = useState<Config | null>(null),
    [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<"title" | "intro" | "game">("title"),
    [intro, setIntro] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [running, setRunning] = useState(false),
    [fast, setFast] = useState(false),
    [selected, setSelected] = useState(2),
    [panel, setPanel] = useState<
      "none" | "economy" | "why" | "log" | "help" | "compare"
    >("none");
  const [aid, setAid] = useState(false),
    [forecast, setForecast] = useState<Run | null>(null),
    [previous, setPrevious] = useState<Saved | null>(null),
    [chainIssue, setChainIssue] = useState(false);
  const [newSeed, setNewSeed] = useState(42),
    [preferNear, setPreferNear] = useState(true),
    [feedback, setFeedback] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const run = saved?.record.run,
    chapter = run ? Math.min(7, Math.floor(run.sol / 3)) : 0;
  const commit = (value: Saved) => {
    setSaved(value);
    localStorage.setItem(STORAGE, JSON.stringify(value));
    const archive = JSON.parse(
      localStorage.getItem("last-signal-archive") || "[]",
    ) as Saved[];
    const remaining = archive.filter(
      (s) => s.record.run_id !== value.record.run_id,
    );
    localStorage.setItem(
      "last-signal-archive",
      JSON.stringify([...remaining, value].slice(-8)),
    );
  };
  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE);
      if (s) {
        const value = JSON.parse(s);
        if (value.record.run.version === VERSION) setSaved(value);
      }
      const prev = localStorage.getItem("last-signal-previous");
      if (prev) setPrevious(JSON.parse(prev));
    } catch {
      setError(
        "The saved session could not be read. You can start a new colony.",
      );
    }
    nearConfig()
      .then(setConfig)
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!run || !saved || saved.mode !== "near" || !config) return;
    readRun(saved.record.run_id, config)
      .then((record) => {
        setSaved((s) => {
          if (!s || s.record.run_id !== record.run_id) return s;
          const value = { ...s, record };
          localStorage.setItem(STORAGE, JSON.stringify(value));
          return value;
        });
      })
      .catch(() => setChainIssue(true));
  }, [config, saved?.record.run_id]);
  useEffect(() => {
    if (panel === "none" || !dialogRef.current) return;
    setRunning(false);
    const old = document.activeElement as HTMLElement;
    const root = dialogRef.current;
    root.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPanel("none");
        return;
      }
      if (e.key === "Tab") {
        const all = Array.from(
          root.querySelectorAll<HTMLElement>(
            "button:not(:disabled),a[href],input,textarea",
          ),
        );
        const first = all[0],
          last = all.at(-1);
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
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
      old?.focus();
    };
  }, [panel]);
  async function start(
    seed = newSeed,
    mode: "practice" | "near" = preferNear && config ? "near" : "practice",
  ) {
    setBusy(true);
    setError("");
    setRunning(false);
    setForecast(null);
    setScreen("intro");
    setIntro(0);
    try {
      let record: RecordState;
      if (mode === "near" && config) {
        let c: Credentials;
        const raw = localStorage.getItem("last-signal-credentials");
        c = raw ? JSON.parse(raw) : await provision(config);
        if (c.contractId !== config.contractId)
          throw Error(
            "Account belongs to an older deployment. Import a matching recovery file or use practice.",
          );
        const pendingRequest = JSON.parse(
          localStorage.getItem("last-signal-new-request") || "null",
        );
        const requestId =
          pendingRequest?.seed === seed
            ? pendingRequest.id
            : crypto.randomUUID();
        localStorage.setItem(
          "last-signal-new-request",
          JSON.stringify({ id: requestId, seed }),
        );
        record = await newNearRun(c, config, seed, requestId);
        localStorage.removeItem("last-signal-new-request");
      } else {
        record = {
          run: await simulate({ op: "new", seed }),
          run_id: crypto.randomUUID(),
          owner: "local-practice",
        };
        mode = "practice";
      }
      const old = savedRef.current;
      if (old?.record.run.ending) {
        setPrevious(old);
        localStorage.setItem("last-signal-previous", JSON.stringify(old));
      }
      commit({ record, mode, txs: [] });
      setPanel("none");
      setAid(false);
      setChainIssue(false);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setScreen("title");
    } finally {
      setBusy(false);
    }
  }
  async function act(command: Command, sols = 0) {
    if (!saved || busy || chainIssue) return;
    setBusy(true);
    setError("");
    setForecast(null);
    try {
      if (saved.mode === "near" && config) {
        const credentials = JSON.parse(
          localStorage.getItem("last-signal-credentials") || "null",
        );
        if (!credentials)
          throw Error("Import your recovery file to regain control.");
        try {
          const { record, hash } = await nearStep(
            credentials,
            config,
            saved.record,
            command,
            sols,
          );
          commit({ ...saved, record, txs: [...saved.txs, hash] });
        } catch (e) {
          const record = await readRun(saved.record.run_id, config);
          commit({ ...saved, record });
          if (record.run.revision === saved.record.run.revision) throw e;
          setError(
            "The action was confirmed after a delayed response. Your colony has been synchronized.",
          );
        }
      } else {
        const next = await simulate({
          op: "step",
          run: saved.record.run,
          command,
          max_sols: sols,
        });
        commit({ ...saved, record: { ...saved.record, run: next } });
      }
      if (command.kind === "choice") {
        setRunning(true);
        setAid(false);
      }
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
      setRunning(false);
      if (saved.mode === "near") setChainIssue(true);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (
      !running ||
      busy ||
      !run ||
      run.pending ||
      run.ending ||
      screen !== "game" ||
      document.hidden
    )
      return;
    const timer = setTimeout(
      () => {
        void act({ kind: "advance" }, fast ? 3 : 1);
      },
      fast ? 500 : 6000,
    );
    return () => clearTimeout(timer);
  }, [running, busy, run?.revision, fast, screen]);
  useEffect(() => {
    const pause = () => {
      if (document.hidden) setRunning(false);
    };
    document.addEventListener("visibilitychange", pause);
    return () => document.removeEventListener("visibilitychange", pause);
  }, []);
  async function preview(option: number) {
    if (!run) return;
    try {
      setForecast(
        await simulate({
          op: "step",
          run,
          command: { kind: "choice", option },
          max_sols: 3,
        }),
      );
      setError("");
    } catch (e) {
      setForecast(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  }
  async function reconnect() {
    if (!saved || !config) return;
    setBusy(true);
    try {
      const record = await readRun(saved.record.run_id, config);
      commit({ ...saved, record });
      setChainIssue(false);
      setError("");
    } catch {
      setError("NEAR is still unavailable. Your confirmed colony is saved.");
    } finally {
      setBusy(false);
    }
  }
  async function importRecovery(file: File) {
    try {
      const c = JSON.parse(await file.text());
      if (
        typeof c.secretKey !== "string" ||
        typeof c.recoveryKey !== "string" ||
        !c.accountId ||
        c.contractId !== config?.contractId
      )
        throw Error(
          "This recovery file does not match the current testnet game.",
        );
      if (c.runId) {
        const record = await readRun(c.runId, config!);
        if (record.owner !== c.accountId)
          throw Error("Recovery account does not own this colony.");
        localStorage.setItem("last-signal-credentials", JSON.stringify(c));
        commit({
          record,
          mode: "near",
          txs: Array.isArray(c.txs)
            ? c.txs.filter((t: unknown) => typeof t === "string")
            : [],
        });
        setScreen("game");
        setPanel("none");
        setError("");
      } else {
        localStorage.setItem("last-signal-credentials", JSON.stringify(c));
        setError("Account recovery loaded. Start or resume a colony.");
      }
    } catch (e) {
      setError(String(e));
    }
  }
  function exportFeedback() {
    if (!saved) return;
    download("last-signal-playtest.json", {
      scenario: VERSION,
      seed: run?.seed,
      run: saved.record,
      mode: saved.mode,
      transactions: saved.txs,
      feedback,
      exportedAt: new Date().toISOString(),
    });
  }
  const status = saved?.mode === "near" ? "NEAR TESTNET" : "LOCAL PRACTICE";
  if (screen === "title")
    return (
      <main className="title-screen">
        <div className="orbital" aria-hidden="true">
          <div className="planet" />
          <div className="orbit" />
        </div>
        <nav className="title-nav">
          <span className="brand-small">
            <Radio size={17} /> SIGNAL / 001
          </span>
          <span>SCRAPPY PLAYTEST · v1</span>
        </nav>
        <section className="title-copy">
          <p className="eyebrow">EARTH IS GONE. WE ARE STILL HERE.</p>
          <h1>
            LAST
            <br />
            <em>SIGNAL</em>
            <span className="title-dot">.</span>
          </h1>
          <p className="title-description">
            One colony. One last chance.
            <br />
            Build an economy that can keep humanity alive.
          </p>
          <div className="title-actions">
            <button
              className="primary"
              disabled={busy || !ready}
              onClick={() => void start()}
            >
              {busy
                ? "Establishing your colony…"
                : saved
                  ? "Start a new colony"
                  : "Take command"}
              <ArrowRight size={18} />
            </button>
            {saved && (
              <button className="secondary" onClick={() => setScreen("game")}>
                Resume · Sol {saved.record.run.sol}/24
              </button>
            )}
          </div>
          <div className="title-meta">
            <span>01 PLAYER</span>
            <span>08 DECISIONS</span>
            <span>08–10 MINUTES</span>
          </div>
          <p className="small muted">
            Governor of 120 people. Institutions run themselves. Your choices
            shape their survival.
          </p>
          {config && (
            <label className="mode-switch">
              <input
                type="checkbox"
                checked={preferNear}
                onChange={(e) => setPreferNear(e.target.checked)}
              />{" "}
              Play on NEAR testnet · sponsored, no wallet needed
            </label>
          )}
          <p className="small muted">
            {preferNear && config
              ? "A testnet account is created in this browser. Export recovery in the game to keep access."
              : "Practice uses the same Rust simulation locally. It creates no blockchain transactions."}
          </p>
          {config && (
            <label className="recovery-import">
              Restore a colony from its private recovery file
              <input
                type="file"
                accept="application/json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importRecovery(f);
                }}
              />
            </label>
          )}
          {error && (
            <div role="alert" className="error">
              {error}
              <button onClick={() => void start(newSeed, "practice")}>
                Start local practice
              </button>
            </div>
          )}
        </section>
        <footer className="title-footer">
          <span>ARES SETTLEMENT / VALLES MARINERIS</span>
          <span>GAMES WITH REAL ECONOMIES ↗</span>
        </footer>
      </main>
    );
  if (screen === "intro") {
    const slides = [
      {
        label: "EARTH UPLINK / FINAL PACKET",
        title: "Eleven minutes too late.",
        text: "The final transmission arrived eleven minutes after the asteroid hit. Earth was gone. Every city. Every ocean. Everyone who had ever told you to come home.",
        quote: "“Cancel the return flight. Take care of each other.”",
      },
      {
        label: "SUPPLY MANIFEST / UPDATED",
        title: "There is no next ship.",
        text: "120 people in the settlement. Twelve surveyors stranded on the northern ridge. A greenhouse, an ice pump, an oxygen plant, a workshop. Dust season in eighteen sols.",
        quote: "RESUPPLY: CANCELLED",
      },
      {
        label: "GOVERNOR / EMERGENCY AUTHORITY",
        title: "Make a home.",
        text: "Choose how the colony spends, builds, and shares. Institutions buy resources and pay wages on their own. Protect essential access and prepare for the storm. Survive 24 sols.",
        quote: "Your first decision is waiting.",
      },
    ];
    const s = slides[intro];
    return (
      <main className="intro-screen">
        <div className="intro-signal">
          <Radio size={28} />
          <span>LAST SIGNAL</span>
        </div>
        <section key={intro} className="intro-card">
          <p className="eyebrow">{s.label}</p>
          <h1>{s.title}</h1>
          <p>{s.text}</p>
          <blockquote>{s.quote}</blockquote>
          <div className="intro-controls">
            <span>0{intro + 1} / 03</span>
            <button
              className="primary"
              disabled={busy && intro === 2}
              onClick={() =>
                intro < 2 ? setIntro(intro + 1) : setScreen("game")
              }
            >
              {intro < 2 ? "Continue" : "Take command"}
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
        {busy && (
          <p className="small muted" role="status">
            Establishing your sponsored testnet colony…
          </p>
        )}
        <button
          className="text-button"
          disabled={busy}
          onClick={() => setScreen("game")}
        >
          Skip transmission
        </button>
      </main>
    );
  }
  if (!run || !saved) return null;
  const stock = reserves(run),
    need = demand(run),
    beat = beatFor(run),
    reply = reaction(run),
    person = PEOPLE[run.pending ? beat.speaker : reply.speaker],
    actor = run.actors[selected];
  const ending = run.ending ? ENDINGS[run.ending] : null;
  const hasAid =
    run.aid_left > 0 && run.aid_chapter !== Math.floor(run.sol / 3);
  return (
    <main className="game-shell">
      <header className="game-header">
        <button
          className="wordmark"
          onClick={() => {
            setRunning(false);
            setScreen("title");
          }}
        >
          <Radio size={19} />
          <span>
            LAST SIGNAL<span className="orange">.</span>
          </span>
        </button>
        <div className="settlement-label">
          ARES SETTLEMENT <span> / HUMANITY'S LAST HOME</span>
        </div>
        <button
          className={`network ${saved.mode}`}
          onClick={() => setPanel("log")}
        >
          <i />
          {status}
        </button>
      </header>
      <div className="resource-bar">
        <div className="sol-block">
          <span className="eyebrow">MISSION TIME</span>
          <strong>
            SOL {String(run.sol + (!run.ending ? 1 : 0)).padStart(2, "0")}
            <small> / 24</small>
          </strong>
        </div>
        {[0, 1, 2].map((g) => {
          const Icon = ICONS[g];
          const days = stock[g] / need[g];
          return (
            <div className={`resource ${days < 1 ? "danger" : ""}`} key={g}>
              <Icon size={19} />
              <div>
                <span>{GOODS[g]}</span>
                <strong>
                  {days.toFixed(1)}
                  <small> sols</small>
                </strong>
              </div>
              <div className="mini-bar">
                <i style={{ width: `${Math.min(100, days * 20)}%` }} />
              </div>
            </div>
          );
        })}
        <div className="resource">
          <Activity size={18} />
          <div>
            <span>wellbeing</span>
            <strong>
              {run.wellbeing}
              <small> /100</small>
            </strong>
          </div>
        </div>
        <div className="resource people">
          <div>
            <span>people</span>
            <strong>
              {run.population}
              <small>
                {run.rescued > 0 && run.sol >= run.rescue_eta
                  ? " + survey team"
                  : ""}
              </small>
            </strong>
          </div>
        </div>
        <div className="resource budget">
          <div>
            <span>public treasury</span>
            <strong>
              {run.actors[8].credits.toLocaleString()}
              <small> cr</small>
            </strong>
          </div>
        </div>
      </div>
      <div className="mission-strip">
        <span>
          <i className={run.sol >= 18 ? "storm-dot" : "live-dot"} />
          {run.sol < 18
            ? `DUST FRONT EXPECTED · SOL 19 · ${18 - run.sol} SOLS TO PREPARE`
            : run.sol <= 21
              ? "DUST FRONT ACTIVE · SOLAR POWER REDUCED"
              : "THE DUST IS LIFTING · BUILD A FUTURE"}
        </span>
        <button onClick={() => setPanel("help")}>
          <CircleHelp size={14} /> Mission brief
        </button>
      </div>
      {error && (
        <div role="alert" className="error inline-error">
          {error}
          {chainIssue && (
            <button disabled={busy} onClick={() => void reconnect()}>
              Synchronize colony
            </button>
          )}
          <button aria-label="Dismiss message" onClick={() => setError("")}>
            <X size={14} />
          </button>
        </div>
      )}
      <div className="game-grid">
        <section className="colony-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">COLONY OVERVIEW</p>
              <h2>All we have is here.</h2>
            </div>
            <span className="map-label">37.2° S / 57.3° W</span>
          </div>
          <div
            className={`colony-map ${run.sol >= 19 && run.sol <= 21 ? "dust" : ""}`}
          >
            <svg
              viewBox="0 0 660 480"
              role="img"
              aria-label="Ares settlement map. Select an institution below to inspect it."
            >
              <defs>
                <pattern
                  id="grid"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M40 0H0V40"
                    fill="none"
                    stroke="#ffffff"
                    strokeOpacity=".035"
                  />
                </pattern>
                <radialGradient id="ground">
                  <stop stopColor="#6d3b29" stopOpacity=".5" />
                  <stop offset="1" stopColor="#1a201e" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="660" height="480" fill="url(#grid)" />
              <ellipse
                cx="330"
                cy="250"
                rx="320"
                ry="220"
                fill="url(#ground)"
              />
              <g
                stroke="#7d7761"
                strokeWidth="2"
                fill="none"
                strokeDasharray="5 7"
                opacity=".45"
              >
                {COORDS.map(([x, y], i) => (
                  <path key={i} d={`M330 245L${x} ${y}`} />
                ))}
              </g>
              <g transform="translate(330 245)">
                <ellipse rx="52" ry="25" fill="#1c2928" stroke="#97a49a" />
                <path
                  d="M-43 0Q0-75 43 0"
                  fill="#7e998f"
                  fillOpacity=".2"
                  stroke="#97a49a"
                />
                <text
                  y="51"
                  textAnchor="middle"
                  fill="#d6d9ce"
                  fontSize="10"
                  letterSpacing="2"
                >
                  HABITAT / {run.population}
                </text>
                <circle r="4" fill="#cde6a0" className="beacon" />
              </g>
              {COORDS.map(([x, y], i) => {
                const a = run.actors[i];
                return (
                  <g
                    key={i}
                    transform={`translate(${x} ${y})`}
                    className={`building ${selected === i ? "selected" : ""} ${a.shortfall > 0 ? "constrained" : ""}`}
                    onClick={() => setSelected(i)}
                  >
                    <ellipse rx="54" ry="29" className="building-halo" />
                    {i === 0 ? (
                      <g fill="#456368" stroke="#8ca6a6">
                        <path d="M-37-10l22-20 31 5-22 22zM3 5l22-20 31 5-22 22z" />
                        <path d="M-16 0v19M24 16v16" />
                      </g>
                    ) : i === 2 ? (
                      <g>
                        <path
                          d="M-46 12Q-45-53 0-53Q45-53 46 12Z"
                          fill="#627a49"
                          fillOpacity=".4"
                          stroke="#bed28c"
                        />
                        <path
                          d="M-29 12Q-25-41 0-53Q25-41 29 12M-44-7h88"
                          fill="none"
                          stroke="#bed28c"
                          strokeOpacity=".5"
                        />
                        <path d="M-35 9h70" stroke="#9bbc69" strokeWidth="5" />
                      </g>
                    ) : (
                      <g
                        fill={i === 4 ? "#806346" : "#526760"}
                        stroke="#b2b7a2"
                      >
                        <path d="M-35 8v-33l20-12 48 9v34l-20 12z" />
                        <path d="M-35-25l48 10 20-13M13-15v33" fill="none" />
                        <rect
                          x="-25"
                          y="-15"
                          width="8"
                          height="10"
                          fill="#cfdaa8"
                          stroke="none"
                        />
                      </g>
                    )}
                    <text
                      y="47"
                      textAnchor="middle"
                      fill="#d6d9ce"
                      fontSize="10"
                    >
                      {
                        [
                          "SOLAR ARRAY",
                          "ICE WORKS",
                          "GREENHOUSE",
                          "OXYGEN PLANT",
                          "WORKSHOP",
                        ][i]
                      }
                    </text>
                    <circle
                      cx="45"
                      cy="-30"
                      r="4"
                      fill={
                        a.unpaid >= 2
                          ? "#e37e65"
                          : a.shortfall > 0
                            ? "#e3ac63"
                            : "#a8bf88"
                      }
                    />
                  </g>
                );
              })}
              {[0, 1, 2].map((i) => (
                <circle
                  key={i}
                  cx={280 + i * 13}
                  cy={290 + i * 8}
                  r="2.5"
                  fill="#d4bba0"
                  className="colonist"
                />
              ))}
              <text
                x="22"
                y="450"
                fill="#8f998c"
                fontSize="10"
                letterSpacing="2"
              >
                N ↑
              </text>
              <text
                x="638"
                y="450"
                textAnchor="end"
                fill="#8f998c"
                fontSize="9"
              >
                SELECT A BUILDING TO INSPECT
              </text>
            </svg>
            <div className="map-legend">
              <span>
                <i /> operational
              </span>
              <span>
                <i className="amber" /> constrained
              </span>
            </div>
          </div>
          <div className="building-tabs">
            {INSTITUTIONS.map((n, i) => {
              const Icon = ICONS[[4, 1, 0, 2, 3][i]];
              return (
                <button
                  key={n}
                  className={selected === i ? "active" : ""}
                  onClick={() => setSelected(i)}
                  aria-pressed={selected === i}
                >
                  <Icon size={15} />
                  {["Power", "Water", "Food", "Oxygen", "Parts"][i]}
                </button>
              );
            })}
          </div>
          <div className="institution-card">
            <div className="institution-title">
              <div>
                <p className="eyebrow">
                  NPC INSTITUTION / AUTONOMOUS OPERATIONS
                </p>
                <h3>{actor.name}</h3>
              </div>
              <span
                className={
                  actor.unpaid >= 2
                    ? "tag red"
                    : actor.shortfall
                      ? "tag amber"
                      : "tag"
                }
              >
                {actor.unpaid >= 2
                  ? "DISTRESSED"
                  : actor.shortfall
                    ? "POWER LIMITED"
                    : "OPERATING"}
              </span>
            </div>
            <div className="institution-stats">
              <div>
                <span>treasury</span>
                <strong>{actor.credits} cr</strong>
              </div>
              <div>
                <span>equipment</span>
                <strong>{actor.condition}%</strong>
              </div>
              <div>
                <span>last output</span>
                <strong>{actor.output} units</strong>
              </div>
              <div>
                <span>posted price</span>
                <strong>{actor.price} cr</strong>
              </div>
            </div>
            <p className="reason">{actor.reason}</p>
            <button className="text-button" onClick={() => setPanel("economy")}>
              Inspect inventory & trades <ChevronRight size={14} />
            </button>
          </div>
          <div className="colony-tools">
            <button
              onClick={() => {
                setAid(!aid);
                setRunning(false);
              }}
              disabled={!!run.ending || busy || !hasAid}
            >
              <Shield size={16} /> Colony aid <span>{run.aid_left}/3</span>
            </button>
            <button onClick={() => setPanel("why")}>
              <Activity size={16} /> Why did this happen?
            </button>
          </div>
          {aid && hasAid && (
            <div className="aid-panel">
              <p className="eyebrow">ONE USE THIS CHAPTER · THREE TOTAL</p>
              <p className="small">
                Target: {actor.name}. Aid affects the next uncommitted sol.
              </p>
              <button
                disabled={busy || run.emergency.every((x) => x === 0)}
                onClick={() =>
                  void act({ kind: "aid", option: 0, target: selected })
                }
              >
                <Package size={15} /> Release an emergency ration cache
              </button>
              <button
                disabled={busy || run.actors[4].inventory[3] < 5}
                onClick={() =>
                  void act({ kind: "aid", option: 1, target: selected })
                }
              >
                <Wrench size={15} /> Repair {actor.name} · 5 parts
              </button>
              <button
                disabled={busy || selected === 0 || run.battery < 40}
                onClick={() =>
                  void act({ kind: "aid", option: 2, target: selected })
                }
              >
                <Zap size={15} /> Portable power · 40 battery energy
              </button>
            </div>
          )}
        </section>
        <aside className="story-panel">
          {ending ? (
            <section className="ending">
              <p className="eyebrow">{ending.subtitle}</p>
              <h1>{run.ending}</h1>
              <p>{ending.body}</p>
              <div className="ending-stats">
                <div>
                  <strong>{run.population}</strong>
                  <span>people alive</span>
                </div>
                <div>
                  <strong>
                    {run.sol >= run.rescue_eta ? Math.max(0, run.rescued) : 0}
                  </strong>
                  <span>surveyors returned</span>
                </div>
                <div>
                  <strong>{run.wellbeing}</strong>
                  <span>wellbeing</span>
                </div>
              </div>
              <blockquote>
                “{reply.text}”<cite>— {PEOPLE[reply.speaker].name}</cite>
              </blockquote>
              <div className="ending-voices">
                {endingVoices(run).map((voice, i) => (
                  <p key={i}>
                    <strong>{PEOPLE[i].name}</strong>
                    {voice}
                  </p>
                ))}
              </div>
              <p className="eyebrow">YOUR RECORD</p>
              {run.decisions
                .filter((d) => [1, 4, 5].includes(d.chapter))
                .map((d) => (
                  <div className="record-choice" key={d.chapter}>
                    <Check size={14} />
                    <div>
                      {BEATS[d.chapter].options[d.option].title}
                      <small>
                        {BEATS[d.chapter].options[d.option].consequence}
                      </small>
                    </div>
                  </div>
                ))}
              <button
                className="primary"
                disabled={busy}
                onClick={() => void start(run.seed, saved.mode)}
              >
                Replay this scenario
                <RotateCcw size={16} />
              </button>
              <div className="ending-actions">
                <button
                  onClick={() => {
                    setNewSeed(run.seed + 1);
                    void start(run.seed + 1, saved.mode);
                  }}
                  disabled={busy}
                >
                  Try another scenario
                </button>
                <button onClick={() => setPanel("compare")}>
                  Compare runs
                </button>
              </div>
              <button className="text-button" onClick={() => setPanel("log")}>
                Inspect the recorded economy <ArrowRight size={14} />
              </button>
            </section>
          ) : (
            <>
              <div className="chapter-progress">
                {BEATS.map((_, i) => (
                  <i
                    key={i}
                    className={
                      i < chapter ? "complete" : i === chapter ? "current" : ""
                    }
                  />
                ))}
                <span>{chapter + 1} / 8</span>
              </div>
              <p className="eyebrow chapter-kicker">
                {run.pending ? beat.kicker : "COLONY OPERATIONS / IN PROGRESS"}
              </p>
              <div className="speaker">
                <span
                  className="avatar"
                  style={{
                    color: person.color,
                    borderColor: person.color + "55",
                  }}
                >
                  {person.initials}
                </span>
                <div>
                  <strong>{person.name}</strong>
                  <span>{person.role}</span>
                </div>
                <Radio size={16} />
              </div>
              <h1>{run.pending ? beat.title : "A colony in motion."}</h1>
              <p className="story-text">
                {run.pending ? beat.text : reply.text}
              </p>
              {run.pending ? (
                <>
                  <p className="decision-label">
                    YOUR DECISION{" "}
                    <span>Choose one. The colony will respond.</span>
                  </p>
                  <div className="choices">
                    {beat.options.map((o, i) => (
                      <div key={`${chapter}-${i}`} className="choice-wrap">
                        <button
                          className="choice"
                          disabled={busy || chainIssue || !!unavailable(run, i)}
                          onClick={() =>
                            void act({ kind: "choice", option: i })
                          }
                        >
                          <span className="choice-number">0{i + 1}</span>
                          <div>
                            <strong>{o.title}</strong>
                            <p>{o.description}</p>
                            <span className="choice-cost">
                              {unavailable(run, i) || o.cost}
                            </span>
                          </div>
                          <ArrowRight size={17} />
                        </button>
                        <div className="choice-bottom">
                          <span>{o.consequence}</span>
                          <button
                            disabled={busy}
                            onClick={() => void preview(i)}
                          >
                            Forecast ↗
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="operations">
                  <div className="operations-status">
                    <i className={running ? "live-dot" : ""} />
                    <span>
                      {busy
                        ? "Confirming on NEAR…"
                        : running
                          ? "Colony is operating"
                          : "Colony paused"}
                    </span>
                    <strong>
                      {3 - (run.sol % 3)} sol
                      {3 - (run.sol % 3) !== 1 ? "s" : ""} to next decision
                    </strong>
                  </div>
                  <p>
                    The institutions are buying inputs, paying wages, and
                    producing essentials. Inspect the colony or deploy aid.
                    Advance whenever you are ready.
                  </p>
                  <div className="playback-controls">
                    <button
                      className="primary"
                      disabled={busy || chainIssue}
                      onClick={() => setRunning(!running)}
                    >
                      {running ? <Pause size={16} /> : <Play size={16} />}{" "}
                      {running ? "Pause" : "Continue"}
                    </button>
                    <button
                      className={fast ? "active" : ""}
                      onClick={() => {
                        setFast(!fast);
                        setRunning(true);
                      }}
                      aria-pressed={fast}
                    >
                      <FastForward size={18} /> Fast
                    </button>
                    <button
                      disabled={busy || chainIssue}
                      onClick={() =>
                        void act({ kind: "advance" }, fast ? 3 : 1)
                      }
                    >
                      Next {fast ? "chapter" : "sol"}
                      <ArrowRight size={16} />
                    </button>
                  </div>
                  <p className="small muted">
                    Fast-forward always pauses for decisions. Nothing progresses
                    while this tab is closed.
                  </p>
                </div>
              )}
              {forecast && (
                <div className="forecast">
                  <button
                    aria-label="Close forecast"
                    className="close-small"
                    onClick={() => setForecast(null)}
                  >
                    <X size={14} />
                  </button>
                  <p className="eyebrow">THREE-SOL CONDITIONAL FORECAST</p>
                  <div className="forecast-numbers">
                    {reserves(forecast).map((n, i) => (
                      <span key={i}>
                        {GOODS[i]} <strong>{n}</strong>
                      </span>
                    ))}
                    <span>
                      wellbeing <strong>{forecast.wellbeing}</strong>
                    </span>
                  </div>
                  <p>
                    Same rules, current scenario. Future event details are
                    omitted from this preview.
                  </p>
                </div>
              )}
              {(run.wellbeing < 50 || run.life_debt > 60) && (
                <div className="survival-warning" role="alert">
                  Critical warning: households are missing essentials. Check
                  their budgets and life-support stocks. Prolonged deprivation
                  can end this colony.
                </div>
              )}
              <div className="recent-events">
                <p className="eyebrow">FROM THE COLONY</p>
                {run.events
                  .slice(-3)
                  .reverse()
                  .map((e) => (
                    <div key={e.id}>
                      <span>S{e.sol.toString().padStart(2, "0")}</span>
                      <p>{e.text}</p>
                    </div>
                  ))}
              </div>
            </>
          )}
        </aside>
      </div>
      <footer className="game-footer">
        <span>
          ALL SYSTEMS ACCOUNTED FOR{" "}
          <span className="muted">
            {" "}
            / {run.version} · SEED {run.seed}
          </span>
        </span>
        <div>
          <button onClick={() => setPanel("log")}>Mission record</button>
          <button
            onClick={() => {
              setRunning(false);
              setPanel("help");
            }}
          >
            How to play
          </button>
          <span className="hash">{run.hash.slice(0, 12)}</span>
        </div>
      </footer>
      {busy && (
        <div className="busy-indicator" role="status">
          <i className="live-dot" />
          {saved.mode === "near"
            ? "Confirming colony state on NEAR…"
            : "Settling the colony…"}
        </div>
      )}
      {panel !== "none" && (
        <div className="modal-backdrop" onClick={() => setPanel("none")}>
          <section
            ref={dialogRef}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="panel-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Close panel"
              onClick={() => setPanel("none")}
            >
              <X size={20} />
            </button>
            <p className="eyebrow">ARES / GOVERNOR'S CONSOLE</p>
            <h2 id="panel-title">
              {
                {
                  economy: "Inside the economy",
                  why: "Every consequence has a cause",
                  log: "The mission record",
                  help: "Keep humanity alive",
                  compare: "Another possible tomorrow",
                }[panel]
              }
            </h2>
            {panel === "economy" && (
              <>
                <p>
                  Each institution has its own finite budget. Prices respond to
                  stocks and operating costs. Household access depends on both
                  supplies and money.
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Institution / group</th>
                        <th>Credits</th>
                        <th>Food</th>
                        <th>Water</th>
                        <th>O₂</th>
                        <th>Parts</th>
                      </tr>
                    </thead>
                    <tbody>
                      {run.actors.map((a, i) => (
                        <tr key={i}>
                          <td>{a.name}</td>
                          <td>{a.credits}</td>
                          {a.inventory.slice(0, 4).map((n, j) => (
                            <td key={j}>{n}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h3>Actual trades · last sol</h3>
                {run.days.at(-1)?.trades.map((t, i) => (
                  <p className="trade-row" key={i}>
                    <span>
                      {run.actors[t.from].name} → {run.actors[t.to].name}
                    </span>
                    <strong>
                      {t.qty} {GOODS[t.good]} / {t.paid} cr
                    </strong>
                  </p>
                ))}
                {!run.days.length && (
                  <p>The first market settles after your first decision.</p>
                )}
                <p className="small muted">
                  Credits are game accounting units. Resources are tracked
                  inside one NEAR contract. NPC treasuries are managed by its
                  simulation rules.
                </p>
              </>
            )}
            {panel === "why" && (
              <>
                <p>
                  These links come from the simulation's recorded events.
                  Decisions, power shortages, maintenance, and household access
                  share the same history.
                </p>
                {run.events
                  .filter((e) =>
                    [
                      "shortage",
                      "maintenance",
                      "households",
                      "fault",
                      "loss",
                      "weather",
                      "rescue",
                      "project",
                    ].includes(e.kind),
                  )
                  .slice(-18)
                  .reverse()
                  .map((e) => (
                    <article className="cause-event" key={e.id}>
                      <p className="eyebrow">
                        SOL {e.sol} / {e.kind}
                      </p>
                      <strong>{e.text}</strong>
                      {e.causes.map((id) => {
                        const cause = run.events.find((x) => x.id === id);
                        return cause ? (
                          <p key={id}>
                            ↳ S{cause.sol}:{" "}
                            {cause.kind === "decision"
                              ? (() => {
                                  const d = run.decisions.find(
                                    (d) => d.event === id,
                                  );
                                  return d
                                    ? BEATS[d.chapter].options[d.option].title
                                    : cause.text;
                                })()
                              : cause.text}
                          </p>
                        ) : null;
                      })}
                    </article>
                  ))}
                {run.events.length < 3 && (
                  <p>Advance the colony to see economic consequences.</p>
                )}
              </>
            )}
            {panel === "log" && (
              <>
                <div className="record-summary">
                  <span className="tag">{status}</span>
                  <p>
                    Run {saved.record.run_id} · Seed {run.seed} · Revision{" "}
                    {run.revision}
                  </p>
                  <p className="small break">State hash: {run.hash}</p>
                  {config && saved.mode === "near" && (
                    <a
                      href={`https://testnet.nearblocks.io/address/${config.contractId}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Inspect the contract <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <h3>Decisions</h3>
                {run.decisions.map((d) => (
                  <p key={d.chapter}>
                    Sol {d.sol + 1} · {BEATS[d.chapter].title} →{" "}
                    <strong>{BEATS[d.chapter].options[d.option].title}</strong>
                  </p>
                ))}
                <h3>Confirmed transactions</h3>
                {saved.txs.map((tx) => (
                  <p key={tx}>
                    <a
                      className="break small"
                      target="_blank"
                      rel="noreferrer"
                      href={`https://testnet.nearblocks.io/txns/${tx}`}
                    >
                      {tx} ↗
                    </a>
                  </p>
                ))}
                {saved.mode === "practice" && (
                  <p>Local practice has no blockchain transactions.</p>
                )}
                <div className="export-actions">
                  <button
                    onClick={() => download("last-signal-record.json", saved)}
                  >
                    <Download size={15} /> Export mission record
                  </button>
                  {saved.mode === "near" && (
                    <button
                      onClick={() =>
                        download("last-signal-recovery-private.json", {
                          ...JSON.parse(
                            localStorage.getItem("last-signal-credentials") ||
                              "null",
                          ),
                          runId: saved.record.run_id,
                          txs: saved.txs,
                        })
                      }
                    >
                      Export private recovery
                    </button>
                  )}
                </div>
                <label className="small">
                  Import private account recovery{" "}
                  <input
                    type="file"
                    accept="application/json"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void importRecovery(f);
                    }}
                  />
                </label>
                <h3>Playtest feedback</h3>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What felt interesting? What confused you?"
                />
                <button onClick={exportFeedback}>
                  Export feedback + playthrough
                </button>
              </>
            )}
            {panel === "help" && (
              <>
                <p>
                  You govern the settlement. Everyone else is an NPC. Choose a
                  response at eight turning points, then let the institutions
                  operate.
                </p>
                <ul>
                  <li>
                    <strong>Survive 24 sols.</strong> Build reliable food,
                    water, and oxygen production before dust season.
                  </li>
                  <li>
                    <strong>Stocks are only half the story.</strong> A family
                    can go without food even when a business has full shelves.
                  </li>
                  <li>
                    <strong>Parts keep the economy alive.</strong> Deferred
                    maintenance lowers output and can deepen shortages.
                  </li>
                  <li>
                    <strong>Aid is finite.</strong> Three uses in the campaign,
                    at most one per chapter. Select a building before targeting
                    repairs or power.
                  </li>
                  <li>
                    <strong>Protect the future.</strong> The strongest ending
                    requires at least 108 initial settlers surviving, wellbeing
                    ≥60, two sols of reserves, and sustainable normal
                    production.
                  </li>
                  <li>
                    <strong>Pause freely.</strong> Advance one sol or use
                    fast-forward. Decisions always stop the clock.
                  </li>
                </ul>
                <p>
                  The opening emergency cache protects essentials for the first
                  12 sols, while its stocks last. Later shortages can kill.
                  Inspect the warning signs and household budgets before
                  advancing.
                </p>
                <p className="small muted">
                  This is a fictional economic game. Resource units and
                  production rates are tuned for play.
                </p>
                <button className="primary" onClick={() => setPanel("none")}>
                  Return to the colony
                  <ArrowRight size={16} />
                </button>
              </>
            )}
            {panel === "compare" && (
              <>
                {previous ? (
                  <>
                    <p>
                      {previous.record.run.seed === run.seed
                        ? "Same external scenario. Different decisions."
                        : "Different scenario seeds; external events may differ."}
                    </p>
                    <table>
                      <thead>
                        <tr>
                          <th>Outcome</th>
                          <th>Previous run</th>
                          <th>This run</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Ending</td>
                          <td>{previous.record.run.ending || "In progress"}</td>
                          <td>{run.ending || "In progress"}</td>
                        </tr>
                        {[
                          [
                            "People",
                            previous.record.run.population,
                            run.population,
                          ],
                          [
                            "Wellbeing",
                            previous.record.run.wellbeing,
                            run.wellbeing,
                          ],
                          [
                            "Treasury",
                            previous.record.run.actors[8].credits,
                            run.actors[8].credits,
                          ],
                          ...GOODS.slice(0, 3).map((g, i) => [
                            g,
                            reserves(previous.record.run)[i],
                            stock[i],
                          ]),
                        ].map(([label, a, b]) => (
                          <tr key={label}>
                            <td>{label}</td>
                            <td>{a}</td>
                            <td>{b}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : (
                  <p>
                    Finish a run and replay the same scenario. Both histories
                    remain separate, and you can compare the results here.
                  </p>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
