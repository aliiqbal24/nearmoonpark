"use client";
import { useEffect, useRef, useState, lazy, Suspense } from "react";
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
  Users,
  Coins,
  MessageCircle,
  MapPin,
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
import ColonyWorld from "./components/colony-world";
const Opening = lazy(() => import("./components/opening"));
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
  const [councilOpen, setCouncilOpen] = useState(true),
    [inspectOpen, setInspectOpen] = useState(false),
    [focusToken, setFocusToken] = useState(0),
    [playbackSpeed, setPlaybackSpeed] = useState(1);
  const inspect = (i: number) => {
    if (i < 0) {
      setInspectOpen(false);
      return;
    }
    setSelected(i);
    setInspectOpen(true);
    setFocusToken((t) => t + 1);
  };
  const dialogRef = useRef<HTMLElement>(null);
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const run = saved?.record.run,
    chapter = run ? Math.min(7, Math.floor(run.sol / 3)) : 0;
  useEffect(() => {
    if (run?.pending || run?.ending) setCouncilOpen(true);
  }, [run?.pending, run?.sol, run?.ending]);
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
        setCouncilOpen(false);
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
    const timer = setTimeout(() => {
      void act({ kind: "advance" }, 1);
    }, 6000 / playbackSpeed);
    return () => clearTimeout(timer);
  }, [running, busy, run?.revision, playbackSpeed, screen]);
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
          <span>LIVE COLONY PLAYTEST</span>
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
            <br />A living colony. An economy in your hands.
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
  if (screen === "intro")
    return (
      <Suspense
        fallback={
          <main className="opening">
            <div className="world-loading">
              Arriving at the observation deck…
            </div>
          </main>
        }
      >
        <Opening
          ready={!busy && !!saved}
          onComplete={() => {
            setScreen("game");
            setCouncilOpen(true);
          }}
        />
      </Suspense>
    );
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
    <main className="world-game">
      <ColonyWorld
        run={run}
        speed={running && !run.pending && !run.ending ? playbackSpeed : 0.42}
        selected={inspectOpen ? selected : -1}
        focusToken={focusToken}
        onSelect={inspect}
      />
      <div className="world-vignette" aria-hidden="true" />
      <header className="hud-header">
        <button
          className="wordmark"
          onClick={() => {
            setRunning(false);
            setScreen("title");
          }}
        >
          <Radio size={20} />
          <span>
            LAST SIGNAL<span className="orange">.</span>
          </span>
        </button>
        <div className="colony-name">
          <span>ARES SETTLEMENT</span>
          <strong>
            SOL {String(Math.min(24, run.sol + 1)).padStart(2, "0")}{" "}
            <small>/ 24</small>
          </strong>
        </div>
        <button
          className={`network ${saved.mode}`}
          onClick={() => setPanel("log")}
        >
          <i />
          {status}
        </button>
      </header>
      <div className="hud-resources">
        {[0, 1, 2].map((g) => {
          const Icon = ICONS[g],
            days = stock[g] / need[g];
          return (
            <div
              className={`vital-pill ${days < 1 ? "danger" : ""}`}
              key={g}
              title={`${stock[g]} units of ${GOODS[g]}; ${need[g]} needed per normal sol`}
            >
              <span className={`vital-icon vital-${g}`}>
                <Icon size={20} />
              </span>
              <div>
                <span>{GOODS[g]}</span>
                <strong>
                  {days.toFixed(1)}
                  <small> sols</small>
                </strong>
              </div>
              <div className="vital-fill">
                <i style={{ width: `${Math.min(100, days * 22)}%` }} />
              </div>
            </div>
          );
        })}
        <div className="vital-pill wallet">
          <span className="vital-icon">
            <Coins size={20} />
          </span>
          <div>
            <span>public funds</span>
            <strong>
              {run.actors[8].credits.toLocaleString()}
              <small> cr</small>
            </strong>
          </div>
        </div>
      </div>
      <div className="settlement-health">
        <span>
          <Users size={14} />
          <strong>{run.population}</strong> residents
        </span>
        <span>
          <Activity size={14} />
          <strong>{run.wellbeing}</strong> wellbeing
        </span>
      </div>
      <div
        className={`world-mission ${run.sol >= 18 && run.sol <= 21 ? "storm" : ""}`}
      >
        <span className={run.sol >= 18 ? "storm-dot" : "live-dot"} />
        {run.sol < 18
          ? `Prepare for dust season · ${18 - run.sol} sols remaining`
          : run.sol <= 21
            ? "Dust front overhead · protect essential services"
            : "A new tomorrow · keep the colony thriving"}
      </div>
      {error && (
        <div role="alert" className="world-error error">
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
      <nav className="building-dock" aria-label="Colony institutions">
        {INSTITUTIONS.map((name, i) => {
          const Icon = ICONS[[4, 1, 0, 2, 3][i]];
          return (
            <button
              key={name}
              className={inspectOpen && selected === i ? "active" : ""}
              onClick={() => inspect(i)}
              title={name}
              aria-label={`Inspect ${name}`}
            >
              <Icon size={20} />
              <span>{["Power", "Water", "Food", "Oxygen", "Parts"][i]}</span>
              {run.actors[i].shortfall > 0 && <i className="problem-dot" />}
            </button>
          );
        })}
      </nav>
      <div className="world-overlays">
        {inspectOpen && (
          <aside className="building-inspector">
            <button
              className="close-small"
              aria-label="Close building inspector"
              onClick={() => setInspectOpen(false)}
            >
              <X size={16} />
            </button>
            <p className="eyebrow">COLONY INSTITUTION</p>
            <h2>{actor.name}</h2>
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
                ? "PAYROLL DISTRESS"
                : actor.shortfall
                  ? "POWER LIMITED"
                  : "OPERATING"}
            </span>
            <div className="inspector-values">
              <div>
                <span>Condition</span>
                <strong>{actor.condition}%</strong>
              </div>
              <div>
                <span>Treasury</span>
                <strong>{actor.credits} cr</strong>
              </div>
              <div>
                <span>Last output</span>
                <strong>{actor.output}</strong>
              </div>
              <div>
                <span>Price / unit</span>
                <strong>{actor.price} cr</strong>
              </div>
            </div>
            <p className="reason">{actor.reason}</p>
            <button className="text-button" onClick={() => setPanel("economy")}>
              Inspect inventory & trades
              <ChevronRight size={14} />
            </button>
            <button
              className="inspector-aid"
              disabled={!hasAid || busy || !!run.ending}
              onClick={() => {
                setAid(!aid);
                setRunning(false);
              }}
            >
              <Wrench size={14} />
              Help this institution
            </button>
          </aside>
        )}
        <button
          className={`council-tab ${run.pending ? "waiting" : ""}`}
          onClick={() => setCouncilOpen(!councilOpen)}
          aria-expanded={councilOpen}
        >
          <MessageCircle size={18} />
          <span>
            {run.ending
              ? "Colony outcome"
              : run.pending
                ? "Your decision is needed"
                : "Colony council"}
          </span>
          <strong>{chapter + 1}/8</strong>
          {councilOpen ? <X size={16} /> : <ChevronRight size={16} />}
        </button>
        <aside
          className={`story-panel council-panel ${councilOpen ? "open" : ""}`}
          aria-hidden={!councilOpen}
        >
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
                <div className="council-operations">
                  <p>
                    The colony is following your order. Watch the supply routes,
                    inspect a building, or provide limited aid.
                  </p>
                  <button
                    className="primary"
                    onClick={() => setCouncilOpen(false)}
                  >
                    Watch the colony
                    <ArrowRight size={16} />
                  </button>
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
      <div className="colony-utility">
        <button
          className={aid ? "active" : ""}
          onClick={() => {
            setAid(!aid);
            setRunning(false);
          }}
          disabled={!!run.ending || busy || !hasAid}
        >
          <Shield size={19} />
          <span>Colony aid</span>
          <strong>{run.aid_left}/3</strong>
        </button>
        <button
          onClick={() => setPanel("why")}
          title="Trace economic consequences"
          aria-label="Why did this happen?"
        >
          <Activity size={19} />
        </button>
        <button
          onClick={() => setPanel("help")}
          title="Mission brief"
          aria-label="How to play"
        >
          <CircleHelp size={19} />
        </button>
      </div>
      {aid && hasAid && (
        <div className="world-aid-panel">
          <button
            className="close-small"
            aria-label="Close colony aid"
            onClick={() => setAid(false)}
          >
            <X size={15} />
          </button>
          <p className="eyebrow">COLONY AID · ONE USE THIS CHAPTER</p>
          <h3>A little help, where it matters.</h3>
          <p>Selected: {actor.name}. Supplies are finite.</p>
          <button
            disabled={busy || run.emergency.every((n) => n === 0)}
            onClick={() =>
              void act({ kind: "aid", option: 0, target: selected })
            }
          >
            <Package size={16} />
            <span>
              Release emergency supplies
              <small>One sol of essentials from the reserve</small>
            </span>
          </button>
          <button
            disabled={busy || run.actors[4].inventory[3] < 5}
            onClick={() =>
              void act({ kind: "aid", option: 1, target: selected })
            }
          >
            <Wrench size={16} />
            <span>
              Repair {actor.name}
              <small>5 parts · +20 condition</small>
            </span>
          </button>
          <button
            disabled={busy || selected === 0 || run.battery < 40}
            onClick={() =>
              void act({ kind: "aid", option: 2, target: selected })
            }
          >
            <Zap size={16} />
            <span>
              Deploy portable power<small>40 stored battery energy</small>
            </span>
          </button>
        </div>
      )}
      <div className="time-console">
        <button
          className="play-toggle"
          disabled={busy || run.pending || !!run.ending || chainIssue}
          onClick={() => setRunning(!running)}
          aria-label={running ? "Pause colony" : "Run colony"}
        >
          {running ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <div className="time-state">
          <strong>
            {run.ending
              ? "Campaign complete"
              : run.pending
                ? "Awaiting your decision"
                : busy
                  ? "Confirming this sol…"
                  : running
                    ? "Colony is operating"
                    : "Colony paused"}
          </strong>
          <span>
            {run.pending
              ? "Explore freely. Choose when you are ready."
              : `Sol ${run.sol} confirmed · ${3 - (run.sol % 3)} to next decision`}
          </span>
        </div>
        <div className="speed-controls">
          <label htmlFor="simulation-speed">{playbackSpeed}×</label>
          <input
            id="simulation-speed"
            aria-label="Simulation speed"
            type="range"
            min="1"
            max="4"
            step="1"
            value={playbackSpeed}
            onChange={(e) => {
              const n = Number(e.target.value);
              setPlaybackSpeed(n);
              setFast(n > 1);
            }}
          />
          <button
            className={fast ? "active" : ""}
            onClick={() => {
              const next = fast ? 1 : 4;
              setPlaybackSpeed(next);
              setFast(!fast);
              if (!run.pending) setRunning(true);
            }}
            aria-pressed={fast}
            aria-label="Fast"
          >
            <FastForward size={19} />
          </button>
        </div>
        <button
          className="step-button"
          disabled={busy || run.pending || !!run.ending || chainIssue}
          onClick={() => void act({ kind: "advance" }, 1)}
          aria-label="Advance one sol"
        >
          <ArrowRight size={19} />
        </button>
      </div>
      <button className="world-record" onClick={() => setPanel("log")}>
        Mission record
        <ExternalLink size={12} />
      </button>
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
