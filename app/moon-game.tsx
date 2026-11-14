"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Coins,
  Users,
  Star,
  Trophy,
  Volume2,
  VolumeX,
  Home,
  BookOpen,
  X,
  RotateCw,
  ArrowUpRight,
  Play,
  Eye,
  Palette,
  LogIn,
  Share2,
  Zap,
} from "lucide-react";
import {
  CashNumber,
  MoneyFeedback,
  ShuttleStatus,
} from "./components/moon-experience";
import MoonWorld from "./components/moon-world";
import { ParkHub, type ParkIdentity } from "./components/park-hub";
import { NearMark } from "./components/near-economy";
import { VendorWallets } from "./components/vendor-wallets";
import {
  STAFF,
  StaffPortraits,
  StaffStatus,
  type StaffRole,
} from "./components/staff-status";
import {
  Dialog,
  Inspector,
  Leaderboard,
  ScoreBreakdown,
  Results,
} from "./components/moon-panels";
import { restoreCloudPark, saveCloudRecovery } from "@/lib/moon/cloud";
import { dreamPark } from "@/lib/moon/dream";
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
  VERSION,
  isPersistent,
  workshopRules,
  parkClosed,
  parkWidth,
  type Building,
  type Kind,
  type Design,
  previewBuilding,
  END,
  LANDING,
  blueprint,
  money,
  clock,
  guestName,
  type Run,
  type Command,
  type Placement,
  type Detail,
  type Entry,
  type PrizeStatus,
} from "@/lib/moon/model";
import type { MoonWorld as World } from "@/lib/moon/world";
import { LegacyCoasterEditor } from "./components/legacy-coaster-editor";
import { BuildDesigner } from "./components/build-designer";
import { MapCoasterDesigner } from "./components/map-coaster-designer";
import { BuildCatalogue } from "./components/build-catalogue";
import openingStory from "@/public/video/moonpark-opening-v7-story.json";
import archivedV5 from "@/public/moon-v5-config.json";
import archivedV8 from "@/public/moon-v8-config.json";
import archivedV7 from "@/public/moon-v7-config.json";
import archivedV6 from "@/public/moon-v6-config.json";
import archivedV4 from "@/public/moon-v4-config.json";
import "./moonpark.css";

type Player = { player_id: string; display_name: string };
type Screen = "title" | "intro" | "playing" | "results";
type Panel = "leaderboard" | "help" | "score" | "near" | "staff" | null;
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
    [cloudStatus, setCloudStatus] = useState<
      "local" | "saving" | "ready" | "error"
    >("local"),
    [cloudRetry, setCloudRetry] = useState(0),
    [placement, setPlacement] = useState<Placement | null>(null),
    [pathPreview, setPathPreview] = useState<{
      cells: number;
      cost: number;
      valid: boolean;
    } | null>(null),
    [selection, setSelection] = useState<Detail | null>(null),
    [hover, setHover] = useState<Detail | null>(null),
    [panel, setPanel] = useState<Panel>(null),
    [staffRole, setStaffRole] = useState<StaffRole>("omar"),
    [toast, setToast] = useState<React.ReactNode>(""),
    [muted, setMuted] = useState(true),
    [introTime, setIntroTime] = useState(0),
    [videoFailed, setVideoFailed] = useState(false),
    [introLeaving, setIntroLeaving] = useState(false),
    [launching, setLaunching] = useState(false),
    [openingError, setOpeningError] = useState(false),
    [resumeAvailable, setResumeAvailable] = useState(false),
    [editingCoaster, setEditingCoaster] = useState<Building | null>(null),
    [designingKind, setDesigningKind] = useState<Kind | null>(null),
    [draftDesign, setDraftDesign] = useState<Design | undefined>(),
    [economyUnderstood, setEconomyUnderstood] = useState(false),
    [worldReady, setWorldReady] = useState(false),
    [rideId, setRideId] = useState<number | null>(null),
    [showResults, setShowResults] = useState(true),
    [entries, setEntries] = useState<Entry[]>([]),
    [prizeEntries, setPrizeEntries] = useState<Entry[]>([]),
    [challengeOpen, setChallengeOpen] = useState(false),
    [authConfigured, setAuthConfigured] = useState(false),
    [authLinks, setAuthLinks] = useState<{
      signInUrl?: string;
      signOutUrl?: string;
    }>({}),
    [prizeStatus, setPrizeStatus] = useState<PrizeStatus | null>(null),
    [player, setPlayer] = useState<Player | null>(null),
    [wallLeft, setWallLeft] = useState(540);
  const [cfg, setCfg] = useState<Config | null>(null),
    [chosenMode, setChosenMode] = useState<"practice" | "near">("practice");
  const [parkIdentity, setParkIdentity] = useState<ParkIdentity>({
    name: "My Moonpark",
    emblem: 0,
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const worldRef = useRef<World | null>(null),
    session = useRef<ParkSession | null>(null),
    audio = useRef<MoonAudio | null>(null),
    audioStarted = useRef(false),
    pendingNear = useRef<Promise<Credentials> | null>(null),
    entryIdentity = useRef({
      playerId: "guest",
      ranked: false,
      displayName: "Moon Explorer",
    }),
    finishing = useRef(false),
    finishedRef = useRef(false),
    generation = useRef(0),
    lastWave = useRef(0),
    lastNotice = useRef(""),
    finishIntroRef = useRef<() => void>(() => {});
  const dream = useMemo(() => (initial ? dreamPark(initial) : null), [initial]);
  const run = snapshot?.run ?? initial;
  const worldRun = screen === "title" || screen === "intro" ? dream : run;
  const receive = useCallback((s: Snapshot) => {
    setSnapshot(s);
    if (s.notice && s.notice !== lastNotice.current) {
      lastNotice.current = s.notice;
      setToast(s.notice);
    }
    if (s.run.finished && !finishedRef.current) {
      setScreen(isPersistent(s.run) ? "playing" : "results");
      setShowResults(true);
      setPlacement(null);
      audio.current?.effect("finish");
    }
    finishedRef.current = s.run.finished;
    const wave = s.run.tick < 11 ? 0 : Math.floor((s.run.tick - 11) / 40) + 1;
    if (wave > lastWave.current) {
      lastWave.current = wave;
      audio.current?.effect("rocket");
    }
  }, []);
  useEffect(() => {
    let active = true;
    audio.current = new MoonAudio();
    void simulate({ op: "new" })
      .then(async (run) => {
        if (!active) return;
        try {
          await restoreCloudPark(
            new URLSearchParams(location.search).get("resumeVersion") ??
              undefined,
          );
        } catch (e) {
          if (active)
            setToast(
              e instanceof Error
                ? e.message
                : "Could not load your saved park.",
            );
        }
        if (!active) return;
        setInitial(run);
        try {
          const identity = JSON.parse(
            localStorage.getItem("moonpark-identity") || "null",
          );
          if (identity?.name) setParkIdentity(identity);
        } catch {}
        if (new URLSearchParams(location.search).has("parkdesk"))
          setPanel("near");
        try {
          const saved = JSON.parse(
            localStorage.getItem("moonpark-current") || "null",
          );
          setResumeAvailable(
            [
              VERSION,
              "moonpark-v8",
              "moonpark-v7",
              "moonpark-v6",
              "moonpark-v5",
              "moonpark-v4",
            ].includes(saved?.state?.run?.version),
          );
          if (
            (saved?.state?.run?.version === VERSION ||
              new URLSearchParams(location.search).has("resumeVersion")) &&
            !parkClosed(saved.state.run)
          ) {
            const bootGeneration = generation.current;
            const restored = await ParkSession.resume(
              receive,
              () => active && generation.current === bootGeneration,
              new URLSearchParams(location.search).get("resumeVersion") ??
                undefined,
            );
            if (restored && active) {
              session.current = restored;
              setShowResults(false);
              setEconomyUnderstood(
                localStorage.getItem(
                  `moonpark-tutorial:${restored.state.localId}`,
                ) === "done",
              );
              setScreen(parkClosed(restored.state.run) ? "results" : "playing");
              setWallLeft(
                Math.max(0, (restored.state.deadline - Date.now()) / 1000),
              );
              setToast(
                restored.state.notice ||
                  "Welcome back. Your park has been restored.",
              );
            }
          }
        } catch (error) {
          if (active)
            setToast(
              error instanceof Error
                ? error.message
                : "Your saved park is available through Resume.",
            );
        }
      })
      .catch((e) => setToast(String(e)));
    void nearConfig().then((c) => {
      setCfg(c);
      if (c)
        void Promise.all([
          leaderboard(c),
          view<PrizeStatus>(c, "get_prize_snapshot"),
        ])
          .then(([l, p]) => {
            setEntries(l.entries);
            setChallengeOpen(l.open);
            setPrizeEntries(p.entries);
            setPrizeStatus(p);
          })
          .catch(() => {});
    });
    void fetch("/api/moon/profile")
      .then(
        (r) =>
          r.json() as Promise<{
            configured: boolean;
            player: Player | null;
            signInUrl?: string;
            signOutUrl?: string;
          }>,
      )
      .then((v) => {
        setAuthConfigured(v.configured);
        setPlayer(v.player);
        setAuthLinks({ signInUrl: v.signInUrl, signOutUrl: v.signOutUrl });
        if (new URLSearchParams(location.search).has("ranked"))
          setPanel("leaderboard");
      })
      .catch(() => {});
    return () => {
      active = false;
      session.current?.dispose();
      audio.current?.dispose();
    };
  }, [receive]);
  const cloudPersistent = snapshot ? isPersistent(snapshot.run) : false;
  const cloudName = parkIdentity.name,
    cloudEmblem = parkIdentity.emblem;
  useEffect(() => {
    if (!player || snapshot?.mode !== "near") return;
    if (!cloudPersistent) return;
    const current = session.current;
    if (!current) return;
    let active = true;
    setCloudStatus("saving");
    void current
      .cloudRecovery({ name: cloudName, emblem: cloudEmblem })
      .then((recovery) => (recovery ? saveCloudRecovery(recovery) : undefined))
      .then(() => {
        if (active) setCloudStatus("ready");
      })
      .catch((error) => {
        if (active) {
          setCloudStatus("error");
          setToast(
            error instanceof Error
              ? error.message
              : "Your account recovery could not be saved. Retry the account save.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [
    player,
    snapshot?.mode,
    snapshot?.record?.owner,
    snapshot?.record?.run_id,
    cloudName,
    cloudEmblem,
    cloudPersistent,
    cloudRetry,
  ]);
  useEffect(() => {
    audio.current?.setCinematic(screen === "intro" && !videoFailed);
  }, [screen, videoFailed]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  const simulationPaused = !!(
    designingKind ||
    editingCoaster ||
    panel ||
    (run?.finished && showResults)
  );
  useEffect(() => {
    if (screen !== "playing" || introLeaving) return;
    let last = Date.now();
    const resetClock = () => {
      last = Date.now();
    };
    document.addEventListener("visibilitychange", resetClock);
    const timer = setInterval(() => {
      const now = Date.now(),
        dt = (now - last) / 1000;
      last = now;
      const s = session.current;
      if (s && !document.hidden) {
        if (!isPersistent(s.state.run))
          setWallLeft(Math.max(0, (s.state.deadline - now) / 1000));
        void s
          .update(dt, simulationPaused ? 0 : 1)
          .catch((e) => setToast(String(e)));
      }
    }, 200);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", resetClock);
    };
  }, [screen, introLeaving, simulationPaused]);
  useEffect(() => {
    if (screen !== "intro" || !videoFailed) return;
    const start = performance.now(),
      offset = videoRef.current?.currentTime ?? 0;
    const t = setInterval(() => {
      const elapsed = offset + (performance.now() - start) / 1000;
      setIntroTime(Math.min(40, elapsed));
      if (elapsed >= 40) {
        clearInterval(t);
        finishIntroRef.current();
      }
    }, 80);
    return () => clearInterval(t);
  }, [screen, videoFailed]);
  useEffect(() => {
    if (screen !== "intro" || videoFailed) return;
    let time = videoRef.current?.currentTime ?? 0,
      progressAt = performance.now();
    const timer = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;
      const now = performance.now();
      if (video.currentTime > time + 0.02) {
        time = video.currentTime;
        progressAt = now;
      }
      if (
        video.error ||
        video.networkState === 3 ||
        (!video.ended && now - progressAt > 8000)
      ) {
        video.pause();
        setVideoFailed(true);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [screen, videoFailed]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        document.querySelector('[role="dialog"]') ||
        (e.target as HTMLElement)?.matches("input,textarea")
      )
        return;
      if (e.key === "Escape") {
        setPlacement(null);
        setRideId(null);
        setEditingCoaster(null);
        setDesigningKind(null);
        worldRef.current?.setDesignPreview(null);
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
          view<PrizeStatus>(cfg, "get_prize_snapshot"),
        ])
          .then(([l, p]) => {
            if (active) {
              setEntries(l.entries);
              setChallengeOpen(l.open);
              setPrizeEntries(p.entries);
              setPrizeStatus(p);
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
    }
    audio.current?.setCinematic(true);
    if (videoRef.current) {
      videoRef.current.volume = 1;
      videoRef.current.currentTime = 0;
      void videoRef.current.play().catch((e) => {
        if (e.name !== "AbortError") setVideoFailed(true);
      });
    }
    session.current?.dispose();
    session.current = null;
    generation.current++;
    setSnapshot(null);
    setEconomyUnderstood(false);
    setPlacement(null);
    setSelection(null);
    setRideId(null);
    setPanel(null);
    setIntroTime(0);
    setScreen("intro");
    setLaunching(false);
    setOpeningError(false);
    finishing.current = false;
    finishedRef.current = false;
    lastWave.current = 0;
    setChosenMode(mode);
    entryIdentity.current = {
      playerId: ranked ? player!.player_id : "guest",
      ranked,
      displayName: ranked ? player!.display_name : "Moon Explorer",
    };
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
  const finishIntro = async (practice = false) => {
    if (finishing.current) return;
    finishing.current = true;
    setLaunching(true);
    try {
      const g = generation.current;
      if (openingError && !practice && cfg) {
        const entry = entryIdentity.current;
        pendingNear.current = provision(
          cfg,
          entry.playerId,
          entry.ranked,
          entry.displayName,
        );
      }
      setOpeningError(false);
      const credentials = practice ? null : await pendingNear.current;
      const next = await ParkSession.start(
        (s) => {
          if (g === generation.current) receive(s);
        },
        credentials ?? undefined,
        credentials ? cfg! : undefined,
      );
      session.current = next;
      if (practice) {
        pendingNear.current = null;
        setChosenMode("practice");
        setToast(
          "Your park is open in practice mode. NEAR play can be retried from the opening screen.",
        );
      }
      setScreen("playing");
      setIntroLeaving(true);
      const fadeStart = performance.now();
      const fade = (now: number) => {
        if (videoRef.current)
          videoRef.current.volume = Math.min(
            1,
            Math.max(0, 1 - (now - fadeStart) / 650),
          );
        if (now - fadeStart < 650) requestAnimationFrame(fade);
      };
      requestAnimationFrame(fade);
      setTimeout(() => {
        setIntroLeaving(false);
        videoRef.current?.pause();
        if (videoRef.current) videoRef.current.volume = 1;
      }, 650);
      audio.current?.setCinematic(false);
      if (credentials) audio.current?.effect("contract");
      setWallLeft(540);
      setLaunching(false);
      worldRef.current?.home();
    } catch (e) {
      setOpeningError(true);
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
      if (!audioStarted.current) {
        setMuted(audio.current?.toggle() ?? true);
        audioStarted.current = true;
      }
      audio.current?.setCinematic(false);
      finishedRef.current = false;
      const next = await ParkSession.resume(receive);
      if (next) {
        session.current = next;
        setScreen(parkClosed(next.state.run) ? "results" : "playing");
        setShowResults(!isPersistent(next.state.run));
        worldRef.current?.home();
      } else setToast("No saved park found.");
    } catch (e) {
      setToast(String(e));
    } finally {
      setLaunching(false);
    }
  };
  const action = async (command: Command) => {
    if (
      !session.current ||
      (screen !== "playing" && !["design", "theme"].includes(command.kind))
    )
      return;
    try {
      await session.current.action(command);
      if (command.kind === "sell") {
        setSelection(null);
        const sold = session.current.state.run.buildings.find(
          (b) => b.id === command.building,
        );
        if (sold?.pending_sale)
          setToast(
            "The current passengers will finish their ride, then half your construction credits return automatically.",
          );
      }
      if (command.kind === "build") audio.current?.effect("build");
      if (command.kind === "build") {
        localStorage.removeItem(
          `moonpark-draft:${session.current.state.localId}:${command.item}`,
        );
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
            design: placement.design,
            blueprint_id: placement.blueprint_id,
            value: placement.launch,
          },
    );
  };
  const drawPaths = async (cells: number[], erase: boolean) => {
    const s = session.current;
    if (!s || screen !== "playing") return;
    const width = parkWidth(s.state.run);
    try {
      if (s.state.run.version === VERSION) {
        await s.action({ kind: erase ? "erase_paths" : "paint_paths", cells });
      } else
        await s.actions(
          cells.map((cell) => ({
            kind: erase ? "erase_path" : "path",
            x: cell % width,
            z: Math.floor(cell / width),
          })),
        );
      audio.current?.effect("build");
    } catch (error) {
      setToast(
        error instanceof Error ? error.message : "That path cannot be built.",
      );
      audio.current?.effect("error");
    }
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
          callbackURL: location.origin + "/?account=1",
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
    run?.guests.filter(
      (g) => !["upcoming", "gone", "cancelled"].includes(g.status),
    ).length ?? 0;
  const legacyPower = useMemo(() => {
    if (!run || workshopRules(run.version)) return null;
    return {
      used: run.buildings
        .filter((b) => b.powered)
        .reduce(
          (n, b) =>
            n +
            (b.kind === "coaster"
              ? b.launch + 1 + (b.design?.height === 2 ? 1 : 0)
              : blueprint(b.kind).power) +
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
  const openingStage = run?.opening_stage ?? 3;
  const hint =
    openingStage === 0
      ? run?.version === VERSION
        ? "Choose a station on the map, then draw your first mass-driver loop. Illia, Mert and Haseeb are ready for opening day."
        : "Your first attraction starts on the drawing board. Design a mass-driver loop, then choose its spot."
      : openingStage === 1
        ? "Every great day needs lunch. Design Attention Kitchen and Illia will take care of his business."
        : openingStage === 2
          ? "The first rocket is arriving. Watch a guest buy a meal. Illia pays your park a share and buys fresh stock through NEAR."
          : run?.buildings.some((b) => !b.sold && !b.connected)
            ? "Connect each new entrance to a boardwalk so visitors can find it."
            : !run?.buildings.some((b) => b.kind === "drink" && !b.sold)
              ? "Guests are getting thirsty. Give Mert a place for Finality Fizz."
              : "Keep an eye on your visitors. Add variety, design another wild ride or visit a friend’s park.";
  const spokenLine = openingStory.segments.find(
    (line) => introTime >= line.start && introTime < line.end + 0.3,
  );
  const introBeat = {
    k:
      introTime < 4
        ? "A NEAR PROTOCOL PRESENTATION"
        : introTime >= 35.5
          ? "YOUR PARK. YOUR CREATIONS. ON NEAR."
          : "",
    title: introTime >= 35.5 ? "MOONPARK" : "",
    text: spokenLine?.text ?? "",
  };
  const activeConfig =
    snapshot?.run.version === "moonpark-v4"
      ? (archivedV4 as Config)
      : snapshot?.run.version === "moonpark-v5"
        ? (archivedV5 as Config)
        : snapshot?.run.version === "moonpark-v6"
          ? (archivedV6 as Config)
          : snapshot?.run.version === "moonpark-v8"
            ? (archivedV8 as Config)
            : snapshot?.run.version === "moonpark-v7"
              ? (archivedV7 as Config)
              : cfg;
  return (
    <main
      className="moonpark"
      data-tick={run?.tick ?? 0}
      data-cash={run?.cash ?? 0}
      data-finished={!!run?.finished}
    >
      <MoonWorld
        onReady={() => setWorldReady(true)}
        run={worldRun}
        identity={parkIdentity}
        speed={
          screen === "playing"
            ? simulationPaused || openingStage < 2
              ? 0
              : 1
            : 0.4
        }
        placement={screen === "playing" ? placement : null}
        onPathStroke={(cells, erase) => void drawPaths(cells, erase)}
        onPathPreview={(preview) =>
          setPathPreview((previous) =>
            previous?.cells === preview?.cells &&
            previous?.cost === preview?.cost &&
            previous?.valid === preview?.valid
              ? previous
              : preview,
          )
        }
        selected={selectedBuilding?.id ?? null}
        cinematic={screen === "intro" && videoFailed ? introTime : null}
        paused={screen === "title" || (screen === "intro" && !videoFailed)}
        attractMode={screen === "title"}
        rideId={rideId}
        onPick={pick}
        onHover={setHover}
        onPlace={place}
        worldRef={worldRef}
      />
      <video
        ref={videoRef}
        className={`mp-opening-film ${screen === "intro" && !videoFailed ? "playing" : ""} ${introLeaving ? "leaving" : ""}`}
        poster="/video/moonpark-opening-v7-poster.jpg"
        preload="auto"
        playsInline
        muted={muted}
        aria-hidden="true"
        onError={() => setVideoFailed(true)}
        onTimeUpdate={(e) => {
          if (screen === "intro" && !videoFailed)
            setIntroTime(e.currentTarget.currentTime);
        }}
        onEnded={() => {
          if (screen === "intro") finishIntroRef.current();
        }}
      >
        <source
          src="/video/moonpark-opening-v7-mobile.mp4"
          media="(max-width: 800px)"
          type="video/mp4"
        />
        <source
          src="/video/moonpark-opening-v7.mp4"
          type="video/mp4"
          onError={() => setVideoFailed(true)}
        />
      </video>
      {screen === "intro" && !videoFailed && (
        <img
          className="mp-opening-still"
          src="/video/moonpark-opening-v7-poster.jpg"
          alt="A lunar park under the stars"
        />
      )}
      <MoneyFeedback state={snapshot} worldRef={worldRef} audio={audio} />
      {screen === "title" && (
        <section className="mp-title" aria-label="Welcome to Moonpark">
          <header className="mp-title-masthead">
            <button
              className="mp-title-protocol"
              onClick={() => setPanel("near")}
              aria-label="Explore NEAR Protocol"
            >
              <NearMark word />
              <span>PROTOCOL</span>
            </button>
            <nav aria-label="Welcome menu">
              {authConfigured && (
                <button
                  disabled={launching}
                  aria-label={
                    player
                      ? `Continue saved park as ${player.display_name}`
                      : "Sign in to save your park across devices"
                  }
                  onClick={() => (player ? void resume() : void signIn())}
                >
                  <LogIn size={16} />
                  <span>
                    {player
                      ? player.display_name
                      : "Sign in · your park on any device"}
                  </span>
                </button>
              )}
              <button disabled={!initial} onClick={() => setPanel("help")}>
                <BookOpen size={16} /> <span>How to play</span>
              </button>
              <button
                disabled={!initial}
                onClick={() => setPanel("leaderboard")}
                aria-label="Top five & conditional prizes"
              >
                <Trophy size={16} /> <span>Leaderboard & prizes</span>
              </button>
              <button
                className="mp-title-sound"
                onClick={toggleAudio}
                aria-label={muted ? "Enable sound" : "Mute sound"}
                title={muted ? "Enable sound" : "Mute sound"}
              >
                {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
            </nav>
          </header>
          <div className="mp-title-content">
            <img
              className="mp-title-art"
              src="/art/moonpark-cover-v1.webp"
              width={1672}
              height={941}
              fetchPriority="high"
              alt="Moonpark cover artwork with a teal mass-driver coaster, a golden observation wheel and a rocket arriving at a luminous lunar resort."
            />
            <div className="mp-title-wordmark">
              <h1>MOONPARK</h1>
              <p>Your theme park. On the Moon.</p>
            </div>
            <div className="mp-title-launch">
              <div className="mp-title-pitch">
                <h2>
                  Build the Moon’s
                  <br />
                  best day out.
                </h2>
                <p>
                  Dream up wild rides. Welcome rocketloads of guests. Make
                  opening day unforgettable.
                </p>
              </div>
              <div className="mp-title-entry">
                <p className="mp-title-details">
                  Free to play <span aria-hidden="true">·</span> Your own lunar
                  park
                </p>
                <button
                  className="mp-primary"
                  disabled={!initial || !cfg || launching}
                  onClick={() => start("near", !!player && challengeOpen)}
                >
                  <span>
                    {initial ? "Open your park" : "Loading your park…"}
                  </span>
                  <span className="mp-title-play-icon" aria-hidden="true">
                    <ArrowUpRight size={22} />
                  </span>
                </button>
                <button
                  className="mp-secondary"
                  disabled={!initial || launching}
                  onClick={() => start("practice")}
                >
                  <Play size={13} /> Practice offline
                </button>
                {resumeAvailable && (
                  <button
                    className="mp-resume"
                    disabled={launching}
                    onClick={() => void resume()}
                  >
                    Continue saved park <ArrowUpRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
          <footer className="mp-title-footer">
            <div className="mp-title-ownership">
              <NearMark />
              <div>
                <strong>Your park. Your designs. Yours on NEAR.</strong>
                <p>
                  Real vendor wallets, ride licenses and verified scores.
                  Account and gas included.
                </p>
              </div>
            </div>
            <button
              className="mp-title-economy"
              aria-label="How NEAR drives your park"
              disabled={!initial}
              onClick={() => setPanel("near")}
            >
              Explore the economy <ArrowUpRight size={17} />
            </button>
            <small className="mp-title-built">
              NEAR testnet · Test currency has no cash value
            </small>
          </footer>
        </section>
      )}
      {screen === "intro" && (
        <div className={`mp-intro${videoFailed ? "" : " with-film"}`}>
          <div className="mp-cinema-top">
            <div className="mp-film-credit">
              {videoFailed && (
                <>
                  <NearMark word />
                  <span>
                    PROTOCOL<small>PRESENTS MOONPARK</small>
                  </span>
                </>
              )}
            </div>
            <button
              onClick={toggleAudio}
              aria-label={muted ? "Enable sound" : "Mute sound"}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
          <div
            className={`mp-intro-captions${introTime >= 35.5 ? " is-finale" : ""}${videoFailed ? "" : " film-subtitles"}`}
            key={introBeat.k}
          >
            <span className="mp-eyebrow">{introBeat.k}</span>
            <h1>{introBeat.title}</h1>
            <p>{introBeat.text}</p>
          </div>
          <div className="mp-intro-bottom">
            <span>
              {launching
                ? "Preparing your park…"
                : openingError
                  ? "Retry NEAR or open your park in practice."
                  : "THE DREAM / A LUNAR OPENING DAY"}
            </span>
            <button
              className="mp-secondary"
              disabled={launching}
              onClick={() => void finishIntro()}
            >
              {launching
                ? "Opening…"
                : openingError
                  ? "Retry NEAR"
                  : "Skip intro"}
              <ArrowUpRight size={16} />
            </button>
            {!launching && openingError && chosenMode === "near" && (
              <button
                className="mp-primary"
                onClick={() => void finishIntro(true)}
              >
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
                MOONPARK<small>BUILT ON NEAR PROTOCOL</small>
              </strong>
            </button>
            <div className="mp-hud-stat mp-cash">
              <Coins size={21} />
              <div>
                <small>LUNAR CREDITS</small>
                <strong>
                  <CashNumber value={run.cash} />
                </strong>
              </div>
            </div>
            <div className="mp-hud-stat">
              <Users size={20} />
              <div>
                <small>IN YOUR PARK</small>
                <strong>
                  {active}
                  {!isPersistent(run) && <em> / 96 guests</em>}
                </strong>
              </div>
            </div>
            <button
              className="mp-hud-stat mp-score"
              onClick={() => setPanel("score")}
            >
              <Star size={21} />
              <div>
                <small>
                  {run.finished && isPersistent(run)
                    ? "SEALED OPENING SCORE"
                    : "OPENING COHORT SCORE"}
                </small>
                <strong>
                  {run.score.total.toLocaleString()}
                  <em> / 10,000</em>
                </strong>
              </div>
            </button>
            <div className="mp-time">
              <span>
                <span className="mp-live-dot" />{" "}
                {run.finished
                  ? isPersistent(run)
                    ? "YOUR PARK KEEPS GROWING"
                    : "PARK CLOSED"
                  : run.tick < LANDING
                    ? "FIRST LANDING"
                    : "OPENING DAY"}
              </span>
              <strong data-testid="opening-day-clock">
                {isPersistent(run)
                  ? openingStage < 2
                    ? "Rocket on standby"
                    : run.tick < LANDING
                      ? "First landing"
                      : run.finished
                        ? "Score sealed"
                        : `${run.guests.slice(0, 96).filter((g) => ["gone", "cancelled"].includes(g.status)).length} / 96 completed`
                  : clock(
                      run.tick < LANDING
                        ? 540
                        : Math.min(END - run.tick, wallLeft),
                    )}
              </strong>
            </div>
          </header>
          <div className="mp-subhud">
            {legacyPower && (
              <span>
                <Zap size={14} />
                {legacyPower.used}/{legacyPower.cap} power · earlier rules
              </span>
            )}
            {snapshot?.mode === "practice" ? (
              <span className="mp-cloud-save">
                Practice · saved on this device
              </span>
            ) : (
              authConfigured && (
                <button
                  className="mp-cloud-save"
                  onClick={() =>
                    player
                      ? cloudStatus === "error"
                        ? setCloudRetry((n) => n + 1)
                        : setPanel("near")
                      : void signIn()
                  }
                >
                  <LogIn size={14} />
                  {player
                    ? cloudStatus === "ready"
                      ? "Saved to your account"
                      : cloudStatus === "saving"
                        ? "Linking park…"
                        : cloudStatus === "error"
                          ? "Retry account save"
                          : "Account connected"
                    : "Sign in to save across devices"}
                </button>
              )
            )}
            <ShuttleStatus run={run} />
            <span
              className="mp-reputation"
              title="Guest satisfaction reflects their rides, queues, food and drinks"
            >
              ★ {run.reputation ?? 65}% word of mouth
            </span>
            <button
              className="mp-chain"
              aria-label="View NEAR economy"
              onClick={() => setPanel("near")}
            >
              <NearMark />
              <span
                className={`mp-live-dot ${snapshot?.mode === "near" ? "chain" : "practice"}`}
              />
              {snapshot?.mode === "near"
                ? snapshot.pending
                  ? `NEAR Protocol · ${snapshot.pending} saving`
                  : snapshot.record?.ranked && run.version === VERSION
                    ? "NEAR Protocol · RANKED"
                    : "NEAR Protocol · LIVE ECONOMY"
                : "LOCAL PRACTICE"}
            </button>
          </div>
          {run.version !== VERSION &&
            !panel &&
            !designingKind &&
            !editingCoaster && (
              <div className="mp-archive-notice">
                Your earlier park is saved.
                <button
                  onClick={() =>
                    start(
                      snapshot?.mode ?? "practice",
                      !!player && challengeOpen,
                    )
                  }
                >
                  Start a new park
                </button>
              </div>
            )}
          {screen === "playing" &&
            !(
              run.version === VERSION &&
              openingStage === 3 &&
              !economyUnderstood
            ) &&
            !selection &&
            !placement &&
            !rideId &&
            !panel &&
            !designingKind &&
            !editingCoaster && (
              <div className="mp-advisor">
                <span className="mp-advisor-avatar">
                  <img src="/art/advisor-v3.webp" alt="" />
                </span>
                <div>
                  <strong>
                    {openingStage === 0
                      ? "FIRST, YOUR SIGNATURE COASTER"
                      : openingStage === 1
                        ? "NEXT, YOUR FIRST RESTAURANT"
                        : openingStage === 2
                          ? "YOUR FIRST NEAR ECONOMY"
                          : "MAKE IT A DAY TO REMEMBER"}
                  </strong>
                  <p>{hint}</p>
                </div>
              </div>
            )}
          {run.version === VERSION &&
            openingStage === 3 &&
            !economyUnderstood &&
            !placement &&
            !panel &&
            !designingKind &&
            !editingCoaster &&
            !rideId && (
              <div className="mp-economy-lesson" role="status">
                <strong>
                  <NearMark /> YOUR FIRST MEAL, REAL VENDOR WALLETS
                </strong>
                <p>
                  A guest paid Illia for a meal. He keeps the business cash,
                  buys fresh ingredients and sends 10% of each sale to your
                  park.
                </p>
                <p>
                  {snapshot?.mode === "near"
                    ? snapshot.pending
                      ? "NEAR is confirming these wallet transfers."
                      : "These wallet transfers are confirmed on NEAR testnet."
                    : "Practice simulates the same economy. NEAR play settles its vendor wallets on testnet."}
                </p>
                <button onClick={() => setPanel("near")}>
                  View NEAR wallets
                </button>
                <button
                  onClick={() => {
                    setEconomyUnderstood(true);
                    localStorage.setItem(
                      `moonpark-tutorial:${snapshot?.localId}`,
                      "done",
                    );
                  }}
                >
                  Got it · let’s build
                </button>
              </div>
            )}
          <nav className="mp-map-tools" aria-label="Park tools">
            <button
              aria-label="Share your park"
              onClick={() => setPanel("near")}
            >
              <Share2 size={20} />
            </button>
            <button
              aria-label="My park and ride exchange"
              onClick={() => setPanel("near")}
            >
              <Palette size={20} />
            </button>
            <button
              aria-label="Leaderboard"
              onClick={() => setPanel("leaderboard")}
            >
              <Trophy size={20} />
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
              aria-label="Reset camera"
              onClick={() => worldRef.current?.home()}
            >
              <Home size={19} />
            </button>
          </nav>
          {run.version === VERSION &&
            (designingKind === "coaster" || editingCoaster) && (
              <MapCoasterDesigner
                key={editingCoaster?.id ?? "new-map-track"}
                run={run}
                building={editingCoaster ?? undefined}
                world={worldRef}
                draftKey={`moonpark-draft:${snapshot?.localId}:${editingCoaster ? `building:${editingCoaster.id}` : "map-coaster"}`}
                onCancel={() => {
                  setDesigningKind(null);
                  setEditingCoaster(null);
                }}
                onApply={async (plan) => {
                  const s = session.current;
                  if (!s) throw Error("Your park is still loading.");
                  await s.action(
                    editingCoaster
                      ? {
                          kind: "design",
                          building: editingCoaster.id,
                          ...plan,
                          relocate: true,
                        }
                      : { kind: "build", item: "coaster", ...plan },
                  );
                  audio.current?.effect("build");
                  localStorage.removeItem(
                    `moonpark-draft:${s.state.localId}:map-coaster`,
                  );
                  setDesigningKind(null);
                  setEditingCoaster(null);
                  setSelection(null);
                  setToast(
                    editingCoaster
                      ? "Your new track is ready. Take the front seat to try it."
                      : "Your coaster is built. The entrance connects automatically when there is a clear route.",
                  );
                }}
              />
            )}
          {!workshopRules(run.version) && designingKind === "coaster" && (
            <LegacyCoasterEditor
              building={previewBuilding("coaster", draftDesign)}
              cash={run.cash}
              onPreview={() => {}}
              onCancel={() => setDesigningKind(null)}
              onApply={async (design) => {
                setPlacement({
                  kind: "coaster",
                  design,
                  rotation: 0,
                  variant: 0,
                });
                setDesigningKind(null);
              }}
            />
          )}
          {designingKind &&
            (designingKind !== "coaster" || run.version === "moonpark-v8") && (
              <BuildDesigner
                key={designingKind}
                kind={designingKind}
                cash={run.cash}
                palette={run.palette ?? 0}
                version={run.version}
                draftKey={`moonpark-draft:${snapshot?.localId}:${designingKind}`}
                initialDesign={draftDesign}
                onCancel={() => setDesigningKind(null)}
                onApply={(design) => {
                  setPlacement({
                    kind: designingKind,
                    rotation: 0,
                    variant: 0,
                    design,
                  });
                  setDesigningKind(null);
                  worldRef.current?.home();
                  setToast(
                    "Move your design over the plot. Click a clear spot to build. The golden tile marks its entrance.",
                  );
                }}
              />
            )}
          {editingCoaster && run.version === "moonpark-v8" && (
            <BuildDesigner
              kind="coaster"
              draftKey={`moonpark-draft:${snapshot?.localId}:building:${editingCoaster.id}`}
              building={editingCoaster}
              cash={run.cash}
              palette={run.palette ?? 0}
              onCancel={() => {
                worldRef.current?.setDesignPreview(null);
                setEditingCoaster(null);
              }}
              onPreview={(design) =>
                worldRef.current?.setDesignPreview(
                  design ? { id: editingCoaster.id, design } : null,
                )
              }
              onApply={async (design) => {
                await session.current?.action({
                  kind: "design",
                  building: editingCoaster.id,
                  design,
                });
                worldRef.current?.setDesignPreview(null);
                setEditingCoaster(null);
                setToast(
                  "Your new track is ready. Take the front seat to try it.",
                );
              }}
            />
          )}
          {editingCoaster && !workshopRules(run.version) && (
            <LegacyCoasterEditor
              building={editingCoaster}
              cash={run.cash}
              onPreview={(design) =>
                worldRef.current?.setDesignPreview(
                  design ? { id: editingCoaster.id, design } : null,
                )
              }
              onCancel={() => {
                worldRef.current?.setDesignPreview(null);
                setEditingCoaster(null);
              }}
              onApply={async (design) => {
                if (!session.current) return;
                await session.current.action({
                  kind: "design",
                  building: editingCoaster.id,
                  design,
                });
                setEditingCoaster(null);
                setToast(
                  "Your coaster is ready. Open it when you are happy with the test ride.",
                );
              }}
            />
          )}
          {selection && !rideId && !editingCoaster && !designingKind && (
            <Inspector
              key={`${selection?.kind}:${selection?.id}`}
              run={run}
              building={selectedBuilding}
              guest={selectedGuest}
              action={(c) => void action(c)}
              config={snapshot?.mode === "near" ? activeConfig : null}
              onClose={() => setSelection(null)}
              onEditCoaster={
                isPersistent(run)
                  ? async (b) => {
                      if (workshopRules(run.version)) {
                        setEditingCoaster(b);
                        return;
                      }
                      if (b.riders.length) {
                        if (b.enabled)
                          await action({ kind: "toggle", building: b.id });
                        setToast(
                          "The coaster is closing. Let its current passengers finish, then open the designer.",
                        );
                        return;
                      }
                      if (b.enabled)
                        await action({ kind: "toggle", building: b.id });
                      setEditingCoaster(b);
                    }
                  : undefined
              }
              onRide={(id) => {
                setRideId(id);
                setSelection(null);
              }}
            />
          )}
          {(openingStage >= 2 || run.version === VERSION) &&
            !rideId &&
            !editingCoaster &&
            !designingKind && (
              <StaffPortraits
                run={run}
                onSelect={(role) => {
                  setStaffRole(role);
                  setPanel("staff");
                }}
              />
            )}
          {screen === "playing" &&
            worldReady &&
            !rideId &&
            !editingCoaster &&
            !designingKind && (
              <div className={`mp-build-area ${selection ? "inspecting" : ""}`}>
                <div className="mp-build-heading">
                  <span>
                    <span className="mp-eyebrow">
                      BUILD SOMETHING EXTRAORDINARY
                    </span>
                    <small>
                      {openingStage < 2
                        ? run.version === VERSION
                          ? "Choose a station and draw a loop. Its first entrance connects automatically."
                          : "Design it first. Place it next. Paths are included for your first two buildings."
                        : "Design an attraction, then choose its spot. Scroll for more."}
                    </small>
                  </span>
                  {placement && (
                    <div className="mp-placement-tools">
                      {pathPreview && (
                        <span
                          className={
                            pathPreview.valid
                              ? "mp-path-preview"
                              : "mp-path-preview invalid"
                          }
                        >
                          {pathPreview.cells} tiles · {money(pathPreview.cost)}{" "}
                          credits
                        </span>
                      )}
                      {(placement.kind === "path" ||
                        placement.kind === "erase") && (
                        <small>Drag to paint · Space-drag to pan</small>
                      )}
                      {placement.kind !== "path" &&
                        placement.kind !== "erase" && (
                          <button
                            onClick={() =>
                              setPlacement((p) =>
                                p
                                  ? { ...p, rotation: (p.rotation + 1) % 4 }
                                  : p,
                              )
                            }
                          >
                            <RotateCw size={15} /> Rotate [R]
                          </button>
                        )}
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
                      {placement.kind !== "path" &&
                        placement.kind !== "erase" && (
                          <button
                            onClick={() => {
                              setDraftDesign(placement.design);
                              setDesigningKind(placement.kind as Kind);
                              setPlacement(null);
                            }}
                          >
                            Edit design
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
                <BuildCatalogue
                  run={run}
                  placement={placement}
                  onDesign={(kind) => {
                    setSelection(null);
                    setPlacement(null);
                    setDraftDesign(undefined);
                    setDesigningKind(kind);
                  }}
                  onPath={() => {
                    setSelection(null);
                    setPlacement({ kind: "path", rotation: 0, variant: 0 });
                  }}
                />
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
                        ? "Preparing to welcome guests"
                        : "Connect the entrance to a path"}
                  </p>
                  <small>Click to inspect</small>
                </>
              ) : null}
            </div>
          )}
          {snapshot?.error && (
            <div className="mp-network-status">
              Reconnecting to NEAR. Your park is saved locally while its pending
              changes confirm.
            </div>
          )}
          {(screen === "results" || (run.finished && isPersistent(run))) &&
            showResults &&
            snapshot && (
              <div className="mp-ending-scrim">
                <Results
                  state={snapshot}
                  onReplay={() => start(snapshot.mode, snapshot.record?.ranked)}
                  onExplore={() => setShowResults(false)}
                  onLeaders={() => setPanel("leaderboard")}
                  onOwnership={() => setPanel("near")}
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
          {(screen === "results" || (run.finished && isPersistent(run))) &&
            !showResults && (
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
            panel === "near"
              ? "Your economy. Secured by NEAR."
              : panel === "staff"
                ? STAFF[staffRole].name
                : panel === "leaderboard"
                  ? "The Moon's finest five"
                  : panel === "score"
                    ? "A great park earns its stars"
                    : "Your first day on the Moon"
          }
          onClose={closePanel}
        >
          {panel === "near" ? (
            <>
              <ParkHub
                onConfirm={async () => {
                  await session.current?.confirm();
                }}
                cfg={activeConfig}
                state={snapshot}
                identity={parkIdentity}
                onIdentity={setParkIdentity}
                action={(c) => void action(c)}
                onPlay={() => start("near", !!player && challengeOpen)}
                onUse={(b, receipt) => {
                  if (receipt) audio.current?.effect("contract");
                  setPlacement({
                    kind: b.kind,
                    rotation: 0,
                    variant: b.variant,
                    design: b.design,
                    launch: b.launch,
                    blueprint_id: b.id,
                  });
                  setPanel(null);
                  setSelection(null);
                  setToast(
                    receipt ? (
                      <>
                        NEAR license confirmed. 90% credited to its creator.{" "}
                        <a
                          href={`https://testnet.nearblocks.io/txns/${receipt}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View receipt
                        </a>{" "}
                        · Place {b.name}.
                      </>
                    ) : (
                      `Place ${b.name}. Construction uses your park-credit budget.`
                    ),
                  );
                }}
              />
              {snapshot?.mode === "near" &&
                activeConfig?.vendors &&
                snapshot.record && (
                  <VendorWallets
                    key={snapshot.record.run_id}
                    cfg={activeConfig}
                    runId={snapshot.record.run_id}
                  />
                )}
              <div className="mp-hub-footer">
                <button
                  className="mp-secondary"
                  onClick={() => setPanel("leaderboard")}
                >
                  <Trophy size={16} /> Rankings & prize escrow
                </button>
                <a href="/archive/v8">Earlier parks & earnings</a>
                <a href="/legacy-claims">Earlier concession claims</a>
                <a
                  href={
                    cfg
                      ? `https://testnet.nearblocks.io/address/${cfg.contractId}`
                      : "https://near.org"
                  }
                  target="_blank"
                  rel="noreferrer"
                >
                  NEAR contract <ArrowUpRight size={13} />
                </a>
              </div>
            </>
          ) : panel === "leaderboard" ? (
            <Leaderboard
              key={player?.display_name ?? "guest"}
              entries={entries}
              prizeEntries={prizeEntries}
              open={challengeOpen}
              configured={authConfigured}
              authLinks={authLinks}
              prizeStatus={prizeStatus}
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
          ) : panel === "staff" && run ? (
            <StaffStatus
              role={staffRole}
              run={run}
              config={snapshot?.mode === "near" ? activeConfig : null}
              runId={snapshot?.record?.run_id}
            />
          ) : panel === "score" && run ? (
            <>
              <ScoreBreakdown run={run} />
              <p className="mp-subtle">
                Bronze 3,500 · Silver 5,500 · Gold 7,000. Every run has the same
                opening visitors and budgets. Your first 96 guests determine the
                sealed score. Keep building and earning afterwards.
              </p>
            </>
          ) : (
            <div className="mp-help">
              <p className="mp-subtle">
                The colony has a home. Give it somewhere wonderful to go.
              </p>
              <p>
                Sign in with Google to return to your NEAR park on another
                device. Your sponsored account recovery is encrypted in
                Moonpark’s database. Confirmed layouts and finances are stored
                on NEAR. Offline practice saves on this device.
              </p>
              <ol>
                <li>
                  <strong>Build a reason to visit.</strong> Design your mass
                  driver directly over the park’s tiles and close its loop. Your
                  kitchen, drinks stall and garage are ready from the start. The
                  first coaster entrance connects automatically. Guests arrive
                  by shuttle every 40 simulation seconds. Watch them disembark
                  and catch their ride home. Your opening cohort begins at the
                  first landing.
                </li>
                <li>
                  <strong>Watch what people do.</strong> Queues, thirst, budgets
                  and thrill preferences affect their choices. Hover or click a
                  visitor to understand why.
                </li>
                <li>
                  <strong>Help the park flourish.</strong> Add food and drinks,
                  and let the maintenance robots look after your rides. Solar
                  canopies earn steady export income.
                </li>
                <li>
                  <strong>Make your opening day count.</strong> Happy visitors,
                  a healthy business and new experiences earn points. The first
                  96 visitors seal your score when they depart. Later rockets
                  keep your park earning. Designing a ride or opening a panel
                  gives you time to plan.
                </li>
              </ol>
              <p>
                Drag to pan · Scroll to zoom · Right-drag to orbit · R rotates a
                blueprint · Esc leaves a tool · Home resets the view.
              </p>
              <p className="mp-fine">
                Two independent vendors hold credits and stock in real testnet
                accounts. Prices, deliveries and the fixed 10% park share run
                automatically. Park robots handle maintenance. NEAR validates
                this economy and computes ranked scores. Practice runs locally
                using the same Rust/WASM engine.
              </p>
              <div className="mp-callout">
                <div>
                  <strong>Your park can start something bigger.</strong>
                  <p>
                    Give your park its own identity and claim it with your NEAR
                    account. Customize a signature ride, then publish it on the
                    ride exchange once guests have tested it. Other parks can
                    license the design. NEAR records the license and credits its
                    creator.
                  </p>
                </div>
              </div>
              <p className="mp-fine">
                <a href="/privacy">Privacy</a> ·{" "}
                <a href="/terms">Competition terms</a> ·{" "}
                <a href="/legacy">Earlier Mars prototype</a>
              </p>
              <p className="mp-fine">
                Scenery:{" "}
                <a
                  href="https://svs.gsfc.nasa.gov/4851/"
                  target="_blank"
                  rel="noreferrer"
                >
                  NASA/Goddard SVS · ESA/Gaia/DPAC
                </a>{" "}
                Milky Way map; original rendered stars;{" "}
                <a
                  href="https://www.solarsystemscope.com/textures/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Solar System Scope
                </a>{" "}
                Earth maps ({" "}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noreferrer"
                >
                  CC BY 4.0
                </a>
                , resized and encoded for the game);{" "}
                <a
                  href="https://polyhaven.com/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Poly Haven
                </a>{" "}
                lunar soil and scanned rocks (CC0).
              </p>
              <p className="mp-fine">
                Opening music is “Helios” by Scott Buckley, edited with original
                sound effects and narration. Released under CC BY 4.0.{" "}
                <a
                  href="https://www.scottbuckley.com.au/library/helios/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Music source
                </a>
                {" · "}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noreferrer"
                >
                  License
                </a>
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
